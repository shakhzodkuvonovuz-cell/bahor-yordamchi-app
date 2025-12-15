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
import bahorLogo from "@/assets/bahor-logo.png";

interface CircleInfo {
  id: string;
  name: string;
  template: string;
  owner_name?: string;
}

export default function JoinCircle() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { language } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [circle, setCircle] = useState<CircleInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [existingRequest, setExistingRequest] = useState<string | null>(null);

  useEffect(() => {
    const checkInvite = async () => {
      if (!code) return;

      // Wait for auth to be determined
      if (authLoading) return;

      // If not logged in, don't fetch yet - show login prompt
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Use the RPC function to get circle info by invite code
        // This bypasses RLS and allows non-members to see basic circle info
        const { data: circleResult, error: rpcError } = await supabase.rpc(
          "get_space_by_invite_code",
          { p_code: code.toUpperCase() }
        );

        if (rpcError) {
          console.error("RPC error:", rpcError);
          setError(language === "uz" ? "Xatolik yuz berdi" : "An error occurred");
          setLoading(false);
          return;
        }

        // Handle RPC response
        const result = circleResult as { 
          error?: string; 
          id?: string; 
          name?: string; 
          template?: string;
          owner_name?: string;
        };

        if (result.error === "invite_not_found") {
          setError(language === "uz" ? "Taklif kodi topilmadi yoki bekor qilingan" : "Invite code not found or revoked");
          setLoading(false);
          return;
        }

        if (result.error === "space_not_found") {
          setError(language === "uz" ? "Doira topilmadi" : "Circle not found");
          setLoading(false);
          return;
        }

        if (!result.id) {
          setError(language === "uz" ? "Xatolik yuz berdi" : "An error occurred");
          setLoading(false);
          return;
        }

        setCircle({
          id: result.id,
          name: result.name || "Circle",
          template: result.template || "general",
          owner_name: result.owner_name,
        });

        // Check if already a member
        const { data: membership } = await supabase
          .from("space_members")
          .select("status")
          .eq("space_id", result.id)
          .eq("user_id", user.id)
          .single();

        if (membership) {
          if (membership.status === "active") {
            setAlreadyMember(true);
          } else if (membership.status === "blocked") {
            setError(language === "uz" ? "Siz bu doiradan bloklangansiz" : "You are blocked from this circle");
          }
        }

        // Check for existing request
        const { data: request } = await supabase
          .from("space_join_requests")
          .select("status")
          .eq("space_id", result.id)
          .eq("requester_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
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

    checkInvite();
  }, [code, user, authLoading, language]);

  const handleSubmitRequest = async () => {
    if (!circle || !user || !code) return;

    setSubmitting(true);
    try {
      // Fetch current user's profile for snapshot
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("user_id", user.id)
        .single();

      const requesterName = profile
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || null
        : null;

      const { error } = await supabase.from("space_join_requests").insert({
        space_id: circle.id,
        requester_id: user.id,
        invite_code: code.toUpperCase(),
        note: note.trim() || null,
        status: "pending",
        requester_name: requesterName,
        requester_avatar_url: profile?.avatar_url || null,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success(language === "uz" ? "So'rov yuborildi!" : "Request submitted!");
    } catch (err: any) {
      console.error("Error submitting request:", err);
      if (err.code === "23505") {
        toast.error(language === "uz" ? "Siz allaqachon so'rov yuborgansiz" : "You already submitted a request");
        setExistingRequest("pending");
      } else {
        toast.error(language === "uz" ? "Xatolik yuz berdi" : "An error occurred");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Logo component for reuse
  const LogoHeader = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      <img src={bahorLogo} alt="Bahor AI" className="w-8 h-8" />
      <span className="text-lg font-semibold text-foreground">Bahor AI</span>
    </div>
  );

  // Wait for auth to be determined
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <LogoHeader />
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">
              {language === "uz" ? "Doiraga qo'shilish" : "Join Circle"}
            </h1>
            <p className="text-muted-foreground">
              {language === "uz"
                ? "Davom etish uchun avval tizimga kiring"
                : "Please sign in to continue"}
            </p>
          </div>
          <Button 
            onClick={() => navigate(`/auth?next=/circles/invite/${code}`)}
            className="w-full h-12 min-h-[48px] rounded-xl touch-manipulation"
          >
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
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <LogoHeader />
          <div className="w-20 h-20 mx-auto rounded-2xl bg-destructive/20 flex items-center justify-center">
            <Users className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{error}</h1>
          <Button 
            variant="outline" 
            onClick={() => navigate("/circles")}
            className="w-full h-12 min-h-[48px] rounded-xl touch-manipulation"
          >
            {language === "uz" ? "Doiralarga qaytish" : "Back to Circles"}
          </Button>
        </div>
      </div>
    );
  }

  if (alreadyMember && circle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <LogoHeader />
          <div className="w-20 h-20 mx-auto rounded-2xl bg-green-500/20 flex items-center justify-center">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">
              {language === "uz" ? "Siz allaqachon a'zosiz!" : "You're already a member!"}
            </h1>
            <p className="text-muted-foreground text-lg">{circle.name}</p>
          </div>
          <Button 
            onClick={() => navigate(`/circles/${circle.id}`)}
            className="w-full h-12 min-h-[48px] rounded-xl touch-manipulation"
          >
            {language === "uz" ? "Doiraga kirish" : "Go to Circle"}
          </Button>
        </div>
      </div>
    );
  }

  if (submitted || existingRequest === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <LogoHeader />
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">
              {language === "uz" ? "So'rov yuborildi!" : "Request Submitted!"}
            </h1>
            <p className="text-muted-foreground">
              {language === "uz"
                ? `"${circle?.name}" doirasi admini so'rovingizni ko'rib chiqadi.`
                : `The admin of "${circle?.name}" will review your request.`}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate("/circles")}
            className="w-full h-12 min-h-[48px] rounded-xl touch-manipulation"
          >
            {language === "uz" ? "Doiralarga qaytish" : "Back to Circles"}
          </Button>
        </div>
      </div>
    );
  }

  if (existingRequest === "rejected") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <LogoHeader />
          <div className="w-20 h-20 mx-auto rounded-2xl bg-orange-500/20 flex items-center justify-center">
            <Users className="w-10 h-10 text-orange-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">
              {language === "uz" ? "So'rov rad etildi" : "Request Rejected"}
            </h1>
            <p className="text-muted-foreground">
              {language === "uz"
                ? "Admin so'rovingizni rad etgan."
                : "The admin has rejected your request."}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate("/circles")}
            className="w-full h-12 min-h-[48px] rounded-xl touch-manipulation"
          >
            {language === "uz" ? "Doiralarga qaytish" : "Back to Circles"}
          </Button>
        </div>
      </div>
    );
  }

  if (existingRequest === "blocked") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <LogoHeader />
          <div className="w-20 h-20 mx-auto rounded-2xl bg-destructive/20 flex items-center justify-center">
            <Users className="w-10 h-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">
              {language === "uz" ? "Kirish taqiqlangan" : "Access Blocked"}
            </h1>
            <p className="text-muted-foreground">
              {language === "uz"
                ? "Siz bu doiraga qo'shila olmaysiz."
                : "You cannot join this Circle."}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate("/circles")}
            className="w-full h-12 min-h-[48px] rounded-xl touch-manipulation"
          >
            {language === "uz" ? "Doiralarga qaytish" : "Back to Circles"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-6">
        <LogoHeader />
        
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {language === "uz" ? "Doiraga qo'shilish" : "Join Circle"}
          </h1>
          <p className="text-2xl font-bold text-primary">{circle?.name}</p>
          {circle?.owner_name && (
            <p className="text-sm text-muted-foreground">
              {language === "uz" ? "Yaratuvchi:" : "Owner:"} {circle.owner_name}
            </p>
          )}
        </div>

        <div className="space-y-4 p-5 rounded-2xl bg-card border border-border">
          <p className="text-sm text-muted-foreground text-center">
            {language === "uz"
              ? "Admin so'rovingizni tasdiqlashi kerak"
              : "Admin approval is required to join"}
          </p>

          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm font-medium">
              {language === "uz" ? "Izoh (ixtiyoriy)" : "Note (optional)"}
            </Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={language === "uz" ? "Masalan: Salom, men Ali" : "e.g. Hi, I'm Ali"}
              maxLength={200}
              className="h-12 min-h-[48px] rounded-xl text-base"
            />
          </div>

          <Button
            onClick={handleSubmitRequest}
            disabled={submitting}
            className="w-full h-12 min-h-[48px] rounded-xl touch-manipulation"
          >
            {submitting
              ? language === "uz" ? "Yuborilmoqda..." : "Submitting..."
              : language === "uz" ? "So'rov yuborish" : "Submit Request"}
          </Button>
        </div>

        <Button
          variant="ghost"
          onClick={() => navigate("/circles")}
          className="w-full h-11 min-h-[44px] rounded-xl touch-manipulation"
        >
          {language === "uz" ? "Bekor qilish" : "Cancel"}
        </Button>
      </div>
    </div>
  );
}
