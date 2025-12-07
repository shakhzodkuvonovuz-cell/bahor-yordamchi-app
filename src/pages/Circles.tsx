import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, ArrowLeft, ChevronRight, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageProvider";
import { toast } from "sonner";
import CreateCircleModal from "@/components/circles/CreateCircleModal";

interface Circle {
  id: string;
  name: string;
  template: string;
  goal: string | null;
  memberCount: number;
  role: string;
  icon_emoji: string | null;
  icon_color: string | null;
}

const TEMPLATE_LABELS: Record<string, { uz: string; en: string }> = {
  study: { uz: "O'qish", en: "Study" },
  work: { uz: "Ish", en: "Work" },
  family: { uz: "Oila", en: "Family" },
  creator: { uz: "Kreator", en: "Creator" },
  biz: { uz: "Biznes", en: "Business" },
  gaming: { uz: "O'yin", en: "Gaming" },
  general: { uz: "Umumiy", en: "General" },
};

const getColorClass = (color: string | null) => {
  if (!color) return "bg-secondary";
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/20",
    green: "bg-green-500/20",
    purple: "bg-purple-500/20",
    orange: "bg-orange-500/20",
    pink: "bg-pink-500/20",
    cyan: "bg-cyan-500/20",
    red: "bg-red-500/20",
    yellow: "bg-yellow-500/20",
  };
  return colorMap[color] || "bg-secondary";
};

export default function Circles() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, t } = useTranslation();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasteLinkModal, setShowPasteLinkModal] = useState(false);
  const [pasteLink, setPasteLink] = useState("");

  const fetchCircles = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      // Get circles where user is a member (DB table still named spaces)
      const { data: memberships, error: memberError } = await supabase
        .from("space_members")
        .select("space_id, role")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (memberError) {
        console.error("Error fetching memberships:", memberError);
        setCircles([]);
        setLoading(false);
        return;
      }
      
      if (!memberships?.length) {
        setCircles([]);
        setLoading(false);
        return;
      }

      const circleIds = memberships.map((m) => m.space_id);
      const roleMap = Object.fromEntries(memberships.map((m) => [m.space_id, m.role]));

      // Get circle details (DB table still named spaces)
      const { data: circleData, error: circleError } = await supabase
        .from("spaces")
        .select("id, name, template, goal, icon_emoji, icon_color")
        .in("id", circleIds);

      if (circleError) {
        console.error("Error fetching circles:", circleError);
        setCircles([]);
        setLoading(false);
        return;
      }

      // Get member counts
      const { data: counts, error: countError } = await supabase
        .from("space_members")
        .select("space_id")
        .in("space_id", circleIds)
        .eq("status", "active");

      if (countError) {
        console.error("Error fetching member counts:", countError);
      }

      const countMap: Record<string, number> = {};
      counts?.forEach((c) => {
        countMap[c.space_id] = (countMap[c.space_id] || 0) + 1;
      });

      const formattedCircles: Circle[] = (circleData || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        template: s.template || "general",
        goal: s.goal,
        memberCount: countMap[s.id] || 1,
        role: roleMap[s.id] || "member",
        icon_emoji: s.icon_emoji,
        icon_color: s.icon_color,
      }));

      setCircles(formattedCircles);
    } catch (err) {
      console.error("Error fetching circles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCircles();
  }, [user]);

  const getTemplateLabel = (template: string) => {
    const labels = TEMPLATE_LABELS[template] || TEMPLATE_LABELS.general;
    return language === "uz" ? labels.uz : labels.en;
  };

  const handleCircleCreated = () => {
    setShowCreateModal(false);
    fetchCircles();
  };

  const handlePasteLinkSubmit = () => {
    if (!pasteLink.trim()) return;
    
    // Extract token from URL or use directly
    let token = pasteLink.trim();
    
    // If it's a full URL, extract the token (support both old and new URLs)
    const urlPatterns = [
      /\/circles\/invite\/([A-Za-z0-9]+)/,
      /\/spaces\/invite\/([A-Za-z0-9]+)/,
      /\/invite\/([A-Za-z0-9]+)/,
      /\/join\/([A-Za-z0-9]+)/,
    ];
    
    for (const pattern of urlPatterns) {
      const match = token.match(pattern);
      if (match) {
        token = match[1];
        break;
      }
    }
    
    // Navigate to invite page
    setShowPasteLinkModal(false);
    setPasteLink("");
    navigate(`/circles/invite/${token}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/modes")}
              className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-xl font-bold text-foreground">
              {language === "uz" ? "Doiralar" : "Circles"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowPasteLinkModal(true)}
              size="sm"
              variant="outline"
              className="gap-1.5"
            >
              <Link2 className="w-4 h-4" />
              {language === "uz" ? "Kod kiritish" : "Enter Code"}
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {language === "uz" ? "Yangi" : "New"}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-secondary/50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : circles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {language === "uz" ? "Doiralar yo'q" : "No circles yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {language === "uz"
                ? "Birinchi doirangizni yarating"
                : "Create your first circle"}
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {language === "uz" ? "Doira yaratish" : "Create Circle"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {circles.map((circle) => (
              <button
                key={circle.id}
                onClick={() => navigate(`/circles/${circle.id}`)}
                className="w-full text-left p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  {/* Circle emoji icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${getColorClass(circle.icon_color)}`}>
                    {circle.icon_emoji || "💬"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {circle.name}
                      </h3>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground">
                        {getTemplateLabel(circle.template)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {circle.memberCount}
                      </span>
                      {circle.goal && (
                        <span className="truncate">{circle.goal}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <CreateCircleModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCircleCreated}
      />

      {/* Paste Link Modal */}
      <Dialog open={showPasteLinkModal} onOpenChange={setShowPasteLinkModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "uz" ? "Taklif linkini kiritish" : "Enter Invite Link"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {language === "uz"
                ? "Taklif linkini yoki kodini kiriting"
                : "Enter the invite link or code"}
            </p>
            <Input
              value={pasteLink}
              onChange={(e) => setPasteLink(e.target.value)}
              placeholder={language === "uz" ? "Link yoki kod" : "Link or code"}
              onKeyDown={(e) => e.key === "Enter" && handlePasteLinkSubmit()}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPasteLinkModal(false)}>
              {language === "uz" ? "Bekor" : "Cancel"}
            </Button>
            <Button onClick={handlePasteLinkSubmit} disabled={!pasteLink.trim()}>
              {language === "uz" ? "Davom etish" : "Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
