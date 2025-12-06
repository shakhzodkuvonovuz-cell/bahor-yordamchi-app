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
import CreateSpaceModal from "@/components/spaces/CreateSpaceModal";

interface Space {
  id: string;
  name: string;
  template: string;
  goal: string | null;
  memberCount: number;
  role: string;
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

export default function Spaces() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, t } = useTranslation();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasteLinkModal, setShowPasteLinkModal] = useState(false);
  const [pasteLink, setPasteLink] = useState("");

  const fetchSpaces = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      // Get spaces where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from("space_members")
        .select("space_id, role")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (memberError) {
        console.error("Error fetching memberships:", memberError);
        setSpaces([]);
        setLoading(false);
        return;
      }
      
      if (!memberships?.length) {
        setSpaces([]);
        setLoading(false);
        return;
      }

      const spaceIds = memberships.map((m) => m.space_id);
      const roleMap = Object.fromEntries(memberships.map((m) => [m.space_id, m.role]));

      // Get space details
      const { data: spaceData, error: spaceError } = await supabase
        .from("spaces")
        .select("id, name, template, goal")
        .in("id", spaceIds);

      if (spaceError) {
        console.error("Error fetching spaces:", spaceError);
        setSpaces([]);
        setLoading(false);
        return;
      }

      // Get member counts
      const { data: counts, error: countError } = await supabase
        .from("space_members")
        .select("space_id")
        .in("space_id", spaceIds)
        .eq("status", "active");

      if (countError) {
        console.error("Error fetching member counts:", countError);
      }

      const countMap: Record<string, number> = {};
      counts?.forEach((c) => {
        countMap[c.space_id] = (countMap[c.space_id] || 0) + 1;
      });

      const formattedSpaces: Space[] = (spaceData || []).map((s) => ({
        id: s.id,
        name: s.name,
        template: s.template || "general",
        goal: s.goal,
        memberCount: countMap[s.id] || 1,
        role: roleMap[s.id] || "member",
      }));

      setSpaces(formattedSpaces);
    } catch (err) {
      console.error("Error fetching spaces:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, [user]);

  const getTemplateLabel = (template: string) => {
    const labels = TEMPLATE_LABELS[template] || TEMPLATE_LABELS.general;
    return language === "uz" ? labels.uz : labels.en;
  };

  const handleSpaceCreated = () => {
    setShowCreateModal(false);
    fetchSpaces();
  };

  const handlePasteLinkSubmit = () => {
    if (!pasteLink.trim()) return;
    
    // Extract token from URL or use directly
    let token = pasteLink.trim();
    
    // If it's a full URL, extract the token
    const urlPatterns = [
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
    navigate(`/spaces/invite/${token}`);
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
              {language === "uz" ? "Xonalar" : "Spaces"}
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
              {language === "uz" ? "Link" : "Link"}
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
        ) : spaces.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {language === "uz" ? "Xonalar yo'q" : "No spaces yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {language === "uz"
                ? "Birinchi xonangizni yarating"
                : "Create your first space"}
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {language === "uz" ? "Xona yaratish" : "Create Space"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {spaces.map((space) => (
              <button
                key={space.id}
                onClick={() => navigate(`/spaces/${space.id}`)}
                className="w-full text-left p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {space.name}
                      </h3>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground">
                        {getTemplateLabel(space.template)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {space.memberCount}
                      </span>
                      {space.goal && (
                        <span className="truncate">{space.goal}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <CreateSpaceModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleSpaceCreated}
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
