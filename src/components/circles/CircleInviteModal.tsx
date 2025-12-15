import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageProvider";
import { toast } from "sonner";
import bahorLogo from "@/assets/bahor-logo.png";

interface SpaceInviteModalProps {
  open: boolean;
  onClose: () => void;
  spaceId: string;
  spaceName: string;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const length = 8 + Math.floor(Math.random() * 5); // 8-12 chars
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function SpaceInviteModal({
  open,
  onClose,
  spaceId,
  spaceName,
}: SpaceInviteModalProps) {
  const { user } = useAuth();
  const { language } = useTranslation();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchOrCreateInvite = async () => {
    if (!spaceId || !user) return;

    setLoading(true);
    try {
      // Check for existing active invite
      const { data: existing, error: fetchError } = await supabase
        .from("space_invites")
        .select("code")
        .eq("space_id", spaceId)
        .eq("revoked", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existing?.code) {
        setInviteCode(existing.code);
      } else {
        // Create new invite
        const code = generateCode();
        const { error: insertError } = await supabase.from("space_invites").insert({
          space_id: spaceId,
          created_by: user.id,
          code,
        });

        if (insertError) throw insertError;
        setInviteCode(code);
      }
    } catch (err) {
      console.error("Error with invite:", err);
      toast.error("Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && spaceId) {
      fetchOrCreateInvite();
    }
  }, [open, spaceId]);

  const generateNewCode = async () => {
    if (!spaceId || !user) return;

    setLoading(true);
    try {
      // Revoke old invites
      await supabase
        .from("space_invites")
        .update({ revoked: true })
        .eq("space_id", spaceId);

      // Create new invite
      const code = generateCode();
      const { error } = await supabase.from("space_invites").insert({
        space_id: spaceId,
        created_by: user.id,
        code,
      });

      if (error) throw error;
      setInviteCode(code);
      toast.success(language === "uz" ? "Yangi kod yaratildi" : "New code generated");
    } catch (err) {
      console.error("Error generating code:", err);
      toast.error("Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const inviteLink = inviteCode ? `${window.location.origin}/circles/invite/${inviteCode}` : "";

  const copyLink = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(language === "uz" ? "Link nusxalandi" : "Link copied");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4 rounded-2xl p-0 overflow-hidden">
        {/* Header with logo */}
        <div className="bg-gradient-to-b from-primary/10 to-background px-6 pt-6 pb-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={bahorLogo} alt="Bahor AI" className="w-8 h-8 sm:w-10 sm:h-10" />
            <span className="font-semibold text-lg text-foreground">Bahor AI</span>
          </div>
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl font-bold">
              {language === "uz" ? "Doiraga taklif qilish" : "Invite to Circle"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5">
          <p className="text-sm text-muted-foreground text-center">
            {language === "uz"
              ? `"${spaceName}" doirasiga qo'shilish uchun ushbu linkni ulashing. Har bir kishi avval tasdiqlanishi kerak.`
              : `Share this link to invite people to "${spaceName}". Each person must be approved before joining.`}
          </p>

          {/* Invite link input with copy button */}
          <div className="flex gap-2">
            <Input
              value={inviteLink}
              readOnly
              className="font-mono text-sm min-h-[48px] bg-secondary/50"
              placeholder={loading ? "Loading..." : ""}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyLink}
              disabled={!inviteCode}
              className="h-12 w-12 min-h-[48px] min-w-[48px] touch-manipulation flex-shrink-0"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Code display and regenerate */}
          <div className="flex items-center justify-between bg-secondary/30 rounded-xl px-4 py-3 min-h-[56px]">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                {language === "uz" ? "Taklif kodi" : "Invite code"}
              </p>
              <p className="font-mono font-bold text-base text-foreground tracking-wider">
                {inviteCode || "..."}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={generateNewCode}
              disabled={loading}
              className="gap-2 h-11 min-h-[44px] px-4 touch-manipulation"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">
                {language === "uz" ? "Yangi kod" : "New code"}
              </span>
            </Button>
          </div>

          {/* Footer button */}
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="w-full h-12 min-h-[48px] touch-manipulation text-base font-medium"
          >
            {language === "uz" ? "Yopish" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
