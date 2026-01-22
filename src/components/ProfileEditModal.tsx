import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    firstName?: string | null;
    lastName?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  };
  onProfileUpdated: () => void;
}

export default function ProfileEditModal({ open, onOpenChange, profile, onProfileUpdated }: ProfileEditModalProps) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState(profile.firstName || profile.first_name || "");
  const [lastName, setLastName] = useState(profile.lastName || profile.last_name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFirstName(profile.firstName || profile.first_name || "");
    setLastName(profile.lastName || profile.last_name || "");
    setPhone(profile.phone || "");
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Get current user directly from Supabase client
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error(t('common.userNotFound'));
      }

      // Update profile directly using Supabase client (bypasses service worker issues)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error(updateError.message);
      }

      // Update phone in the private table (owner-only)
      const trimmedPhone = phone.trim() || null;
      const { error: phoneError } = await supabase
        .from('profiles_private')
        .upsert(
          { user_id: user.id, phone: trimmedPhone },
          { onConflict: 'user_id' }
        );

      if (phoneError) {
        console.error('Profile phone update error:', phoneError);
        throw new Error(phoneError.message);
      }

      toast({
        title: t('profileEdit.saveSuccess'),
        description: t('profileEdit.profileSaved'),
      });

      onProfileUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: t('common.error'),
        description: error.message || t('profileEdit.updateFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{t('profileEdit.title')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t('profileEdit.firstName')}</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t('profileEdit.firstNamePlaceholder')}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">{t('profileEdit.lastName')}</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t('profileEdit.lastNamePlaceholder')}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('profileEdit.phone')}</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
              maxLength={20}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}