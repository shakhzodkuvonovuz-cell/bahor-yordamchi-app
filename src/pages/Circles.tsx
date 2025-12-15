import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
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
    <>
      <SEO 
        title="Doiralar" 
        description="Bahor AI Doiralar - guruh suhbati va AI hamkorlik platformasi."
        url="/circles"
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/modes")}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 hover:bg-secondary active:bg-secondary/80 rounded-xl transition-colors touch-manipulation"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <h1 className="text-xl font-bold text-foreground">
                {t('circles.title')}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowPasteLinkModal(true)}
                size="icon"
                variant="outline"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl touch-manipulation"
              >
                <Link2 className="w-5 h-5" />
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                size="icon"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl touch-manipulation"
              >
                <Plus className="w-5 h-5" />
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
                  className="h-[76px] bg-secondary/50 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : circles.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-secondary flex items-center justify-center">
                <Users className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('circles.noCircles')}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                {t('circles.createFirst')}
              </p>
              <Button 
                onClick={() => setShowCreateModal(true)} 
                className="gap-2 h-12 min-h-[48px] px-6 rounded-xl touch-manipulation"
              >
                <Plus className="w-5 h-5" />
                {t('circles.createCircle')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {circles.map((circle) => (
                <button
                  key={circle.id}
                  onClick={() => navigate(`/circles/${circle.id}`)}
                  className="w-full text-left p-4 min-h-[76px] rounded-2xl bg-card border border-border hover:border-primary/30 active:scale-[0.98] hover:shadow-md transition-all group touch-manipulation"
                >
                  <div className="flex items-center gap-3">
                    {/* Circle emoji icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${getColorClass(circle.icon_color)}`}>
                      {circle.icon_emoji || "💬"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {circle.name}
                        </h3>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground flex-shrink-0">
                          {getTemplateLabel(circle.template)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
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
          <DialogContent className="sm:max-w-md mx-4 rounded-2xl">
            <DialogHeader className="text-center pb-2">
              <DialogTitle className="text-lg">
                {t('circles.enterInviteLink')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground text-center">
                {t('circles.enterLinkOrCode')}
              </p>
              <Input
                value={pasteLink}
                onChange={(e) => setPasteLink(e.target.value)}
                placeholder={t('circles.linkOrCode')}
                onKeyDown={(e) => e.key === "Enter" && handlePasteLinkSubmit()}
                className="h-12 min-h-[48px] rounded-xl text-base"
              />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button 
                onClick={handlePasteLinkSubmit} 
                disabled={!pasteLink.trim()}
                className="w-full h-12 min-h-[48px] rounded-xl touch-manipulation"
              >
                {t('circles.continue')}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setShowPasteLinkModal(false)}
                className="w-full h-11 min-h-[44px] rounded-xl touch-manipulation"
              >
                {t('circles.cancel')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
