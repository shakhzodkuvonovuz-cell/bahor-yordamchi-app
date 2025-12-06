import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Users, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageProvider";
import { toast } from "sonner";

interface SpaceInfo {
  id: string;
  name: string;
  template: string;
}

export default function JoinSpace() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [space, setSpace] = useState<SpaceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [existingRequest, setExistingRequest] = useState<string | null>(null);

  useEffect(() => {
    const checkInvite = async () => {
      if (!code || !user) return;

      try {
        // Find the invite
        const { data: invite, error: inviteError } = await supabase
          .from("space_invites")
          .select("space_id, revoked")
          .eq("code", code.toUpperCase())
          .single();

        if (inviteError || !invite) {
          setError(language === "uz" ? "Taklif kodi topilmadi" : "Invite code not found");
          setLoading(false);
          return;
        }

        if (invite.revoked) {
          setError(language === "uz" ? "Bu taklif kodi bekor qilingan" : "This invite has been revoked");
          setLoading(false);
          return;
        }

        // Get space info
        const { data: spaceData, error: spaceError } = await supabase
          .from("spaces")
          .select("id, name, template")
          .eq("id", invite.space_id)
          .single();

        if (spaceError || !spaceData) {
          setError(language === "uz" ? "Xona topilmadi" : "Space not found");
          setLoading(false);
          return;
        }

        setSpace(spaceData);

        // Check if already a member
        const { data: membership } = await supabase
          .from("space_members")
          .select("status")
          .eq("space_id", spaceData.id)
          .eq("user_id", user.id)
          .single();

        if (membership) {
          if (membership.status === "active") {
            setAlreadyMember(true);
          } else if (membership.status === "blocked") {
            setError(language === "uz" ? "Siz bu xonadan bloklangansiz" : "You are blocked from this space");
          }
        }

        // Check for existing request
        const { data: request } = await supabase
          .from("space_join_requests")
          .select("status")
          .eq("space_id", spaceData.id)
          .eq("requester_id", user.id)
          .single();

        if (request) {
          setExistingRequest(request.status);
        }
      } catch (err) {
        console.error("Error checking invite:", err);
        setError(language === "uz" ? "Xatolik yuz berdi" : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      checkInvite();
    } else {
      setLoading(false);
    }
  }, [code, user, language]);

  const handleSubmitRequest = async () => {
    if (!space || !user || !code) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("space_join_requests").insert({
        space_id: space.id,
        requester_id: user.id,
        invite_code: code.toUpperCase(),
        note: note.trim() || null,
        status: "pending",
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success(language === "uz" ? "So'rov yuborildi!" : "Request submitted!");
    } catch (err: any) {
      console.error("Error submitting request:", err);
      if (err.code === "23505") {
        toast.error(language === "uz" ? "Siz allaqachon so'rov yuborgansiz" : "You already submitted a request");
      } else {
        toast.error(language === "uz" ? "Xatolik yuz berdi" : "An error occurred");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <Users className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-xl font-bold text-foreground">
            {language === "uz" ? "Xonaga qo'shilish" : "Join Space"}
          </h1>
          <p className="text-muted-foreground">
            {language === "uz"
              ? "Davom etish uchun avval tizimga kiring"
              : "Please sign in to continue"}
          </p>
          <Button onClick={() => navigate(`/auth?next=/invite/${code}`)}>
            {language === "uz" ? "Kirish" : "Sign In"}
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{error}</h1>
          <Button variant="outline" onClick={() => navigate("/spaces")}>
            {language === "uz" ? "Xonalarga qaytish" : "Back to Spaces"}
          </Button>
        </div>
      </div>
    );
  }

  if (alreadyMember && space) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {language === "uz" ? "Siz allaqachon a'zosiz!" : "You're already a member!"}
          </h1>
          <p className="text-muted-foreground">{space.name}</p>
          <Button onClick={() => navigate(`/spaces/${space.id}`)}>
            {language === "uz" ? "Xonaga kirish" : "Go to Space"}
          </Button>
        </div>
      </div>
    );
  }

  if (submitted || existingRequest === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {language === "uz" ? "So'rov yuborildi!" : "Request Submitted!"}
          </h1>
          <p className="text-muted-foreground">
            {language === "uz"
              ? `"${space?.name}" xonasi admini so'rovingizni ko'rib chiqadi.`
              : `The admin of "${space?.name}" will review your request.`}
          </p>
          <Button variant="outline" onClick={() => navigate("/spaces")}>
            {language === "uz" ? "Xonalarga qaytish" : "Back to Spaces"}
          </Button>
        </div>
      </div>
    );
  }

  if (existingRequest === "rejected") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {language === "uz" ? "So'rov rad etildi" : "Request Rejected"}
          </h1>
          <p className="text-muted-foreground">
            {language === "uz"
              ? "Admin so'rovingizni rad etgan."
              : "The admin has rejected your request."}
          </p>
          <Button variant="outline" onClick={() => navigate("/spaces")}>
            {language === "uz" ? "Xonalarga qaytish" : "Back to Spaces"}
          </Button>
        </div>
      </div>
    );
  }

  if (existingRequest === "blocked") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {language === "uz" ? "Kirish taqiqlangan" : "Access Blocked"}
          </h1>
          <p className="text-muted-foreground">
            {language === "uz"
              ? "Siz bu xonaga qo'shila olmaysiz."
              : "You cannot join this Space."}
          </p>
          <Button variant="outline" onClick={() => navigate("/spaces")}>
            {language === "uz" ? "Xonalarga qaytish" : "Back to Spaces"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {language === "uz" ? "Xonaga qo'shilish" : "Join Space"}
          </h1>
          <p className="text-2xl font-bold text-primary">{space?.name}</p>
        </div>

        <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
          <p className="text-sm text-muted-foreground text-center">
            {language === "uz"
              ? "Admin so'rovingizni tasdiqlashi kerak"
              : "Admin approval is required to join"}
          </p>

          <div className="space-y-2">
            <Label htmlFor="note">
              {language === "uz" ? "Izoh (ixtiyoriy)" : "Note (optional)"}
            </Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={language === "uz" ? "Masalan: Salom, men Ali" : "e.g. Hi, I'm Ali"}
              maxLength={200}
            />
          </div>

          <Button
            onClick={handleSubmitRequest}
            disabled={submitting}
            className="w-full"
          >
            {submitting
              ? language === "uz" ? "Yuborilmoqda..." : "Submitting..."
              : language === "uz" ? "So'rov yuborish" : "Submit Request"}
          </Button>
        </div>

        <Button
          variant="ghost"
          onClick={() => navigate("/spaces")}
          className="w-full"
        >
          {language === "uz" ? "Bekor qilish" : "Cancel"}
        </Button>
      </div>
    </div>
  );
}
