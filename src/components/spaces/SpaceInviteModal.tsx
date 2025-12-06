import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageProvider";
import { toast } from "sonner";

interface SpaceInviteModalProps {
  open: boolean;
  onClose: () => void;
  spaceId: string;
  spaceName: string;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
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

  const copyLink = () => {
    if (!inviteCode) return;
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(language === "uz" ? "Link nusxalandi" : "Link copied");
  };

  const inviteLink = inviteCode ? `${window.location.origin}/join/${inviteCode}` : "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === "uz" ? "Xonaga taklif qilish" : "Invite to Space"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            {language === "uz"
              ? `"${spaceName}" xonasiga qo'shilish uchun ushbu linkni ulashing. Har bir kishi avval tasdiqlanishi kerak.`
              : `Share this link to invite people to "${spaceName}". Each person must be approved before joining.`}
          </p>

          <div className="flex gap-2">
            <Input
              value={inviteLink}
              readOnly
              className="font-mono text-sm"
              placeholder={loading ? "Loading..." : ""}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyLink}
              disabled={!inviteCode}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {language === "uz" ? "Kod:" : "Code:"}{" "}
              <span className="font-mono font-bold">{inviteCode || "..."}</span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={generateNewCode}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {language === "uz" ? "Yangi kod" : "New code"}
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            {language === "uz" ? "Yopish" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
