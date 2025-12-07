import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, FileText, MessageSquare, UserPlus, Check, X, Ban, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageProvider";
import { toast } from "sonner";
import CircleInviteModal from "@/components/circles/CircleInviteModal";
import CircleFilesTab from "@/components/circles/CircleFilesTab";
import CircleChatTab from "@/components/circles/CircleChatTab";
import { CircleTabSkeleton } from "@/components/circles/CircleTabSkeleton";
import { CircleAIActionsPanel, type AICard } from "@/components/circles/CircleAIActionsPanel";
import { CircleAICard } from "@/components/circles/CircleAICard";

interface SpaceData {
  id: string;
  name: string;
  template: string;
  goal: string | null;
  owner_id: string;
  icon_emoji: string | null;
  icon_color: string | null;
}

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

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}

interface JoinRequest {
  id: string;
  requester_id: string;
  status: string;
  note: string | null;
  created_at: string;
  requester_name: string | null;
  requester_avatar_url: string | null;
}

export default function SpaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useTranslation();

  // Circle state with separate error tracking
  const [space, setSpace] = useState<SpaceData | null>(null);
  const [spaceError, setSpaceError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("member");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");

  // Members state with error tracking
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Requests state with error tracking
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  // AI Cards state with error tracking
  const [aiCards, setAiCards] = useState<AICard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Ref to send AI card content to chat
  const sendAICardToChatRef = useRef<((content: string, title: string) => void) | null>(null);

  // Fetch AI cards - lazy load only when tab is active
  const fetchAICards = async () => {
    if (!id) return;
    setLoadingCards(true);
    setCardsError(null);
    try {
      const { data, error } = await supabase
        .from("circle_ai_cards")
        .select("*")
        .eq("circle_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.error("Error fetching AI cards:", error);
        setCardsError("Natijalarni yuklab bo'lmadi");
      } else {
        setAiCards((data as AICard[]) || []);
      }
    } catch (err) {
      console.error("Error fetching AI cards:", err);
      setCardsError("Natijalarni yuklab bo'lmadi");
    } finally {
      setLoadingCards(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase.from("circle_ai_cards").delete().eq("id", cardId);
      if (error) throw error;
      setAiCards(prev => prev.filter(c => c.id !== cardId));
      toast.success("O'chirildi ✓");
    } catch (err) {
      console.error("Error deleting card:", err);
      toast.error("O'chirishda xatolik");
    }
  };

  const isAdmin = userRole === "owner" || userRole === "admin";

  const fetchSpace = async () => {
    if (!id || !user) {
      setLoading(false);
      return;
    }

    setSpaceError(null);
    try {
      const { data: spaceData, error: spaceError } = await supabase
        .from("spaces")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (spaceError) {
        console.error("Error fetching space:", spaceError);
        setSpaceError("Doirani yuklab bo'lmadi");
        setLoading(false);
        return;
      }

      if (!spaceData) {
        setSpaceError("Doira topilmadi");
        setLoading(false);
        return;
      }

      setSpace(spaceData);

      const { data: memberData } = await supabase
        .from("space_members")
        .select("role")
        .eq("space_id", id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (memberData) {
        setUserRole(memberData.role);
      }
    } catch (err) {
      console.error("Error fetching space:", err);
      setSpaceError("Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!id) return;
    setMembersLoading(true);
    setMembersError(null);

    try {
      const { data, error } = await supabase
        .from("space_members")
        .select("*")
        .eq("space_id", id)
        .eq("status", "active");

      if (error) {
        console.error("Error fetching members:", error);
        setMembersError("A'zolarni yuklab bo'lmadi");
        return;
      }

      const userIds = data?.map((m) => m.user_id) || [];
      if (userIds.length === 0) {
        setMembers([]);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, avatar_url")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries(
        (profiles || []).map((p) => [
          p.user_id,
          {
            name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "User",
            email: p.email || "",
            avatar_url: p.avatar_url || null,
          },
        ])
      );

      setMembers(
        (data || []).map((m) => ({
          ...m,
          name: profileMap[m.user_id]?.name || "User",
          email: profileMap[m.user_id]?.email || "",
          avatar_url: profileMap[m.user_id]?.avatar_url || null,
        }))
      );
    } catch (err) {
      console.error("Error fetching members:", err);
      setMembersError("A'zolarni yuklab bo'lmadi");
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchRequests = async () => {
    if (!id || !isAdmin) return;
    setRequestsLoading(true);
    setRequestsError(null);

    try {
      const { data, error } = await supabase
        .from("space_join_requests")
        .select("id, requester_id, status, note, created_at, requester_name, requester_avatar_url")
        .eq("space_id", id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching requests:", error);
        setRequestsError("So'rovlarni yuklab bo'lmadi");
        return;
      }

      const requestsWithMissingData = (data || []).filter(
        (r) => !r.requester_name && !r.requester_avatar_url
      );

      if (requestsWithMissingData.length > 0) {
        const requesterIds = requestsWithMissingData.map((r) => r.requester_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, avatar_url")
          .in("user_id", requesterIds);

        const profileMap = Object.fromEntries(
          (profiles || []).map((p) => [
            p.user_id,
            {
              name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || null,
              avatar_url: p.avatar_url,
            },
          ])
        );

        const enrichedData = (data || []).map((req) => ({
          ...req,
          requester_name: req.requester_name || profileMap[req.requester_id]?.name || null,
          requester_avatar_url: req.requester_avatar_url || profileMap[req.requester_id]?.avatar_url || null,
        }));

        setRequests(enrichedData);
      } else {
        setRequests(data || []);
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
      setRequestsError("So'rovlarni yuklab bo'lmadi");
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpace();
  }, [id, user]);

  useEffect(() => {
    if (space && activeTab === "members") {
      fetchMembers();
    } else if (space && activeTab === "requests" && isAdmin) {
      fetchRequests();
    } else if (space && activeTab === "natijalar") {
      fetchAICards();
    }
  }, [space, activeTab, isAdmin]);

  const handleRequestAction = async (
    requestId: string,
    requesterId: string,
    action: "approved" | "rejected" | "blocked"
  ) => {
    if (!user || !id) return;

    try {
      const { error: updateError } = await supabase
        .from("space_join_requests")
        .update({
          status: action,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      if (action === "approved") {
        const { error: memberError } = await supabase
          .from("space_members")
          .insert({
            space_id: id,
            user_id: requesterId,
            role: "member",
            status: "active",
          });

        if (memberError) throw memberError;
      }

      if (action === "blocked") {
        await supabase.from("space_members").upsert({
          space_id: id,
          user_id: requesterId,
          role: "member",
          status: "blocked",
        });
      }

      toast.success(
        action === "approved"
          ? language === "uz" ? "Qabul qilindi" : "Approved"
          : action === "rejected"
          ? language === "uz" ? "Rad etildi" : "Rejected"
          : language === "uz" ? "Bloklandi" : "Blocked"
      );

      fetchRequests();
    } catch (err) {
      console.error("Error handling request:", err);
      toast.error("Xatolik yuz berdi");
    }
  };

  const handleBlockMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("space_members")
        .update({ status: "blocked" })
        .eq("id", memberId);

      if (error) throw error;
      toast.success(language === "uz" ? "Foydalanuvchi bloklandi" : "Member blocked");
      fetchMembers();
    } catch (err) {
      console.error("Error blocking member:", err);
      toast.error("Xatolik yuz berdi");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show error page only if circle itself failed to load
  if (spaceError || !space) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {spaceError || "Doira topilmadi"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Iltimos sahifani yangilang yoki qaytadan urinib ko'ring.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={() => window.location.reload()} className="w-full gap-2">
              Qayta yuklash
            </Button>
            <Button variant="outline" onClick={() => navigate("/circles")} className="w-full">
              Doiralarga qaytish
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      {/* Header - fixed */}
      <header className="flex-shrink-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/circles")}
              className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            {/* Circle emoji icon */}
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${getColorClass(space.icon_color)}`}>
              {space.icon_emoji || "💬"}
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{space.name}</h1>
              {space.goal && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {space.goal}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CircleAIActionsPanel 
              circleId={id || ""} 
              onSendToChat={(content, title) => {
                if (sendAICardToChatRef.current) {
                  sendAICardToChatRef.current(content, title);
                }
              }}
            />
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInviteModal(true)}
                className="gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                {language === "uz" ? "Taklif" : "Invite"}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Tabs container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Tabs bar - sticky with solid background, high z-index, and pointer-events-auto */}
        <div className="flex-shrink-0 z-50 border-b border-border bg-background/95 backdrop-blur-md" style={{ position: 'sticky', top: 0 }}>
          <TabsList className="max-w-2xl mx-auto w-full justify-start px-4 bg-transparent h-11">
            <TabsTrigger 
              value="chat" 
              className="gap-1.5 data-[state=active]:bg-secondary data-[state=active]:shadow-sm transition-all duration-150 text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger 
              value="files" 
              className="gap-1.5 data-[state=active]:bg-secondary data-[state=active]:shadow-sm transition-all duration-150 text-sm"
            >
              <FileText className="w-4 h-4" />
              {language === "uz" ? "Fayllar" : "Files"}
            </TabsTrigger>
            <TabsTrigger 
              value="members" 
              className="gap-1.5 data-[state=active]:bg-secondary data-[state=active]:shadow-sm transition-all duration-150 text-sm"
            >
              <Users className="w-4 h-4" />
              {language === "uz" ? "A'zolar" : "Members"}
            </TabsTrigger>
            <TabsTrigger 
              value="natijalar" 
              className="gap-1.5 data-[state=active]:bg-secondary data-[state=active]:shadow-sm transition-all duration-150 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Natijalar
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger 
                value="requests" 
                className="gap-1.5 data-[state=active]:bg-secondary data-[state=active]:shadow-sm transition-all duration-150 text-sm"
              >
                <UserPlus className="w-4 h-4" />
                {language === "uz" ? "So'rovlar" : "Requests"}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Chat Tab - takes remaining height */}
        <TabsContent value="chat" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden tab-panel-transition">
          <CircleChatTab spaceId={id || ""} onSendAICardRef={sendAICardToChatRef} />
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="flex-1 min-h-0 m-0 overflow-y-auto tab-panel-transition">
          <CircleFilesTab spaceId={id || ""} isAdmin={isAdmin} />
        </TabsContent>

        {/* Natijalar (AI Results) Tab - lazy loaded */}
        <TabsContent value="natijalar" className="flex-1 min-h-0 m-0 overflow-y-auto tab-panel-transition">
          <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">AI tomonidan yaratilgan natijalar</p>
              <CircleAIActionsPanel 
                circleId={id || ""} 
                onSendToChat={(content, title) => {
                  if (sendAICardToChatRef.current) {
                    sendAICardToChatRef.current(content, title);
                  }
                }}
              />
            </div>
            {loadingCards ? (
              <CircleTabSkeleton type="members" />
            ) : cardsError ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-destructive" />
                </div>
                <p className="text-sm text-destructive font-medium mb-3">{cardsError}</p>
                <Button variant="outline" size="sm" onClick={fetchAICards}>
                  Qayta urinib ko'rish
                </Button>
              </div>
            ) : aiCards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium text-sm">Hali natijalar yo'q</p>
                <p className="text-xs mt-1">AI Amallar tugmasini bosib natija yarating</p>
              </div>
            ) : (
              aiCards.map((card) => (
                <CircleAICard
                  key={card.id}
                  card={card}
                  circleId={id || ""}
                  onDelete={() => handleDeleteCard(card.id)}
                  onSendToChat={(content, title) => {
                    if (sendAICardToChatRef.current) {
                      sendAICardToChatRef.current(content, title);
                    }
                  }}
                  isLatest={false}
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="flex-1 min-h-0 m-0 overflow-y-auto tab-panel-transition">
          {membersLoading ? (
            <CircleTabSkeleton type="members" />
          ) : membersError ? (
            <div className="max-w-2xl mx-auto px-4 py-8 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-sm text-destructive font-medium mb-3">{membersError}</p>
              <Button variant="outline" size="sm" onClick={fetchMembers}>
                Qayta urinib ko'rish
              </Button>
            </div>
          ) : members.length === 0 ? (
            <div className="max-w-2xl mx-auto px-4 pt-4">
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">{language === "uz" ? "A'zolar yo'q" : "No members"}</p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-4 pt-4 space-y-2 pb-[env(safe-area-inset-bottom)]">
              {members.map((member) => {
                const initials = member.name?.split(" ").map(n => n.charAt(0).toUpperCase()).join("").slice(0, 2) || "U";
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-card border border-border shadow-elevation-1 hover:shadow-elevation-2 transition-shadow duration-150"
                  >
                    <div className="flex items-center gap-3">
                      {/* Member avatar */}
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-medium text-primary">{initials}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.role === "owner" 
                            ? (language === "uz" ? "Egasi" : "Owner")
                            : member.role === "admin" 
                            ? (language === "uz" ? "Admin" : "Admin")
                            : (language === "uz" ? "A'zo" : "Member")
                          }
                        </p>
                      </div>
                    </div>
                    {isAdmin && member.user_id !== user?.id && member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBlockMember(member.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Requests Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="requests" className="flex-1 min-h-0 m-0 overflow-y-auto tab-panel-transition">
            {requestsLoading ? (
              <CircleTabSkeleton type="requests" />
            ) : requestsError ? (
              <div className="max-w-2xl mx-auto px-4 py-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                  <UserPlus className="w-6 h-6 text-destructive" />
                </div>
                <p className="text-sm text-destructive font-medium mb-3">{requestsError}</p>
                <Button variant="outline" size="sm" onClick={fetchRequests}>
                  Qayta urinib ko'rish
                </Button>
              </div>
            ) : requests.length === 0 ? (
              <div className="max-w-2xl mx-auto px-4 pt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">{language === "uz" ? "So'rovlar yo'q" : "No requests"}</p>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto px-4 pt-4 space-y-2 pb-[env(safe-area-inset-bottom)]">
                {requests.map((req) => {
                  const displayName = req.requester_name || "User";
                  const initials = displayName.charAt(0).toUpperCase();

                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl bg-card border border-border shadow-elevation-1 hover:shadow-elevation-2 transition-shadow duration-150"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          {req.requester_avatar_url ? (
                            <img
                              src={req.requester_avatar_url}
                              alt={displayName}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-primary">
                                {initials}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{displayName}</p>
                            {req.note && (
                              <p className="text-sm text-muted-foreground mt-1 italic">
                                "{req.note}"
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(req.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {req.status === "pending" ? (
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleRequestAction(req.id, req.requester_id, "approved")
                              }
                              className="gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleRequestAction(req.id, req.requester_id, "rejected")
                              }
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleRequestAction(req.id, req.requester_id, "blocked")
                              }
                              className="text-destructive"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span
                            className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                              req.status === "approved"
                                ? "bg-green-500/20 text-green-600"
                                : req.status === "rejected"
                                ? "bg-red-500/20 text-red-600"
                                : "bg-orange-500/20 text-orange-600"
                            }`}
                          >
                            {req.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      <CircleInviteModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        spaceId={id || ""}
        spaceName={space.name}
      />
    </div>
  );
}
