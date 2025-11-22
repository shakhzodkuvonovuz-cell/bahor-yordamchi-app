import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      // Call edge function to update profile
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/profile`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: firstName.trim() || null,
            lastName: lastName.trim() || null,
            phone: phone.trim() || null,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Update failed");
      }

      toast({
        title: "✅ Muvaffaqiyatli!",
        description: "Profil ma'lumotlari yangilandi",
      });

      onProfileUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Xatolik",
        description: error.message || "Profil yangilanmadi",
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
          <DialogTitle className="text-xl font-bold">Profilni tahrirlash</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Ism</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ismingizni kiriting"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Familiya</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Familiyangizni kiriting"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon raqam (ixtiyoriy)</Label>
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
            Bekor qilish
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
