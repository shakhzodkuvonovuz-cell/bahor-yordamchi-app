import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, FileText, MessageSquare, UserPlus, Send, MoreVertical, Check, X, Ban, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageProvider";
import { toast } from "sonner";
import SpaceInviteModal from "@/components/spaces/SpaceInviteModal";
import SpaceFilesTab from "@/components/spaces/SpaceFilesTab";
import SpaceChatTab from "@/components/spaces/SpaceChatTab";

interface SpaceData {
  id: string;
  name: string;
  template: string;
  goal: string | null;
  owner_id: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  email?: string;
  name?: string;
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

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  type: string;
  created_at: string;
  senderName?: string;
  usedFiles?: string[];
  usedMessages?: boolean;
}

export default function SpaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [space, setSpace] = useState<SpaceData | null>(null);
  const [userRole, setUserRole] = useState<string>("member");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Members state
  const [members, setMembers] = useState<Member[]>([]);

  // Requests state
  const [requests, setRequests] = useState<JoinRequest[]>([]);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Bahor context picker
  const [showBahorPicker, setShowBahorPicker] = useState(false);
  const [bahorQuestion, setBahorQuestion] = useState("");
  const [sendingBahor, setSendingBahor] = useState(false);

  const isAdmin = userRole === "owner" || userRole === "admin";

  const fetchSpace = async () => {
    if (!id || !user) return;

    try {
      // Get space details
      const { data: spaceData, error: spaceError } = await supabase
        .from("spaces")
        .select("*")
        .eq("id", id)
        .single();

      if (spaceError) throw spaceError;
      setSpace(spaceData);

      // Get user's role
      const { data: memberData } = await supabase
        .from("space_members")
        .select("role")
        .eq("space_id", id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (memberData) {
        setUserRole(memberData.role);
      }
    } catch (err) {
      console.error("Error fetching space:", err);
      toast.error("Xatolik yuz berdi");
      navigate("/spaces");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("space_messages")
      .select("*")
      .eq("space_id", id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    // Get sender profiles
    const senderIds = [...new Set(data?.map((m) => m.sender_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name")
      .in("user_id", senderIds);

    const profileMap = Object.fromEntries(
      (profiles || []).map((p) => [
        p.user_id,
        `${p.first_name || ""} ${p.last_name || ""}`.trim() || "User",
      ])
    );

    setMessages(
      (data || []).map((m) => ({
        ...m,
        senderName: profileMap[m.sender_id] || "User",
      }))
    );
  };

  const fetchMembers = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("space_members")
      .select("*")
      .eq("space_id", id)
      .eq("status", "active");

    if (error) {
      console.error("Error fetching members:", error);
      return;
    }

    // Get profiles
    const userIds = data?.map((m) => m.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, email")
      .in("user_id", userIds);

    const profileMap = Object.fromEntries(
      (profiles || []).map((p) => [
        p.user_id,
        {
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "User",
          email: p.email || "",
        },
      ])
    );

    setMembers(
      (data || []).map((m) => ({
        ...m,
        name: profileMap[m.user_id]?.name || "User",
        email: profileMap[m.user_id]?.email || "",
      }))
    );
  };

  const fetchRequests = async () => {
    if (!id || !isAdmin) return;

    const { data, error } = await supabase
      .from("space_join_requests")
      .select("id, requester_id, status, note, created_at, requester_name, requester_avatar_url")
      .eq("space_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
      return;
    }

    // For requests without snapshot data, fetch from profiles
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

      // Merge profile data as fallback
      const enrichedData = (data || []).map((req) => ({
        ...req,
        requester_name: req.requester_name || profileMap[req.requester_id]?.name || null,
        requester_avatar_url: req.requester_avatar_url || profileMap[req.requester_id]?.avatar_url || null,
      }));

      setRequests(enrichedData);
    } else {
      setRequests(data || []);
    }
  };

  useEffect(() => {
    fetchSpace();
  }, [id, user]);

  useEffect(() => {
    if (space && activeTab === "chat") {
      fetchMessages();
    } else if (space && activeTab === "members") {
      fetchMembers();
    } else if (space && activeTab === "requests" && isAdmin) {
      fetchRequests();
    }
  }, [space, activeTab, isAdmin]);

  // Real-time messages subscription
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`space-messages-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "space_messages",
          filter: `space_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Fetch sender name
          supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("user_id", newMsg.sender_id)
            .single()
            .then(({ data: profile }) => {
              setMessages((prev) => [
                ...prev,
                {
                  ...newMsg,
                  senderName:
                    `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
                    "User",
                },
              ]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!messageInput.trim() || !id || !user || sendingMessage) return;

    const trimmedInput = messageInput.trim();
    
    // Check if it's a /bahor command
    if (trimmedInput.toLowerCase().startsWith("/bahor")) {
      const question = trimmedInput.replace(/^\/bahor\s*/i, "").trim();
      if (!question) {
        toast.error(language === "uz" ? "Savol yozing" : "Please enter a question");
        return;
      }
      setBahorQuestion(question);
      setShowBahorPicker(true);
      return;
    }

    setSendingMessage(true);
    try {
      const { error } = await supabase.from("space_messages").insert({
        space_id: id,
        sender_id: user.id,
        content: trimmedInput,
        type: "text",
      });

      if (error) throw error;
      setMessageInput("");
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Xabar yuborishda xatolik");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleBahorSend = async (payload: {
    question: string;
    includeLastMessages: boolean;
    selectedFileIds: string[];
  }) => {
    if (!id || !user) return;

    setSendingBahor(true);
    try {
      // First, insert the user's question as a message
      await supabase.from("space_messages").insert({
        space_id: id,
        sender_id: user.id,
        content: `/bahor ${payload.question}`,
        type: "text",
      });

      // Call the space-chat edge function
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/space-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            space_id: id,
            question: payload.question,
            include_last_messages: payload.includeLastMessages,
            selected_file_ids: payload.selectedFileIds,
            ui_language: language,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "AI xizmati xatosi");
      }

      const data = await response.json();

      // Insert AI response as a message
      await supabase.from("space_messages").insert({
        space_id: id,
        sender_id: user.id,
        content: data.response,
        type: "ai",
      });

      // Show what Bahor used
      const usedContext: string[] = [];
      if (data.used_messages) {
        usedContext.push(language === "uz" ? "oxirgi 30 xabar" : "last 30 messages");
      }
      if (data.used_files?.length > 0) {
        usedContext.push(data.used_files.join(", "));
      }
      if (usedContext.length > 0) {
        toast.success(
          `Bahor: ${usedContext.join(" + ")}`,
          { duration: 4000 }
        );
      }

      setShowBahorPicker(false);
      setMessageInput("");
      setBahorQuestion("");
    } catch (err: any) {
      console.error("Bahor error:", err);
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setSendingBahor(false);
    }
  };

  const handleRequestAction = async (
    requestId: string,
    requesterId: string,
    action: "approved" | "rejected" | "blocked"
  ) => {
    if (!user || !id) return;

    try {
      // Update request status
      const { error: updateError } = await supabase
        .from("space_join_requests")
        .update({
          status: action,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // If approved, add to members
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

      // If blocked, create blocked member entry
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

  const handleBlockMember = async (memberId: string, userId: string) => {
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

  if (!space) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/spaces")}
              className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">{space.name}</h1>
              {space.goal && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {space.goal}
                </p>
              )}
            </div>
          </div>
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
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-border">
          <TabsList className="max-w-2xl mx-auto w-full justify-start px-4 bg-transparent h-12">
            <TabsTrigger value="chat" className="gap-1.5 data-[state=active]:bg-secondary">
              <MessageSquare className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1.5 data-[state=active]:bg-secondary">
              <FileText className="w-4 h-4" />
              {language === "uz" ? "Fayllar" : "Files"}
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1.5 data-[state=active]:bg-secondary">
              <Users className="w-4 h-4" />
              {language === "uz" ? "A'zolar" : "Members"}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="requests" className="gap-1.5 data-[state=active]:bg-secondary">
                <UserPlus className="w-4 h-4" />
                {language === "uz" ? "So'rovlar" : "Requests"}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex-1 flex flex-col m-0 relative">
          <SpaceChatTab spaceId={id || ""} />
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="flex-1 m-0 overflow-y-auto">
          <SpaceFilesTab spaceId={id || ""} isAdmin={isAdmin} />
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="flex-1 m-0 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-xl bg-card border border-border"
              >
                <div>
                  <p className="font-medium text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.email} · {member.role}
                  </p>
                </div>
                {isAdmin && member.user_id !== user?.id && member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBlockMember(member.id, member.user_id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Requests Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="requests" className="flex-1 m-0 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
              {requests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {language === "uz" ? "So'rovlar yo'q" : "No requests"}
                </div>
              ) : (
                requests.map((req) => {
                  const displayName = req.requester_name || "User";
                  const initials = displayName.charAt(0).toUpperCase();
                  
                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl bg-card border border-border"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Avatar */}
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
                })
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <SpaceInviteModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        spaceId={id || ""}
        spaceName={space.name}
      />

    </div>
  );
}
