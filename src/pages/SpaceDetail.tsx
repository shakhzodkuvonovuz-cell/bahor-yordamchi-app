import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, FileText, MessageSquare, UserPlus, Send, MoreVertical, Check, X, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageProvider";
import { toast } from "sonner";
import SpaceInviteModal from "@/components/spaces/SpaceInviteModal";

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
  email?: string;
  name?: string;
}

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  kind: string;
  created_at: string;
  senderName?: string;
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
      .select("*")
      .eq("space_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
      return;
    }

    // Get requester profiles
    const requesterIds = data?.map((r) => r.requester_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, email")
      .in("user_id", requesterIds);

    const profileMap = Object.fromEntries(
      (profiles || []).map((p) => [
        p.user_id,
        {
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "User",
          email: p.email || "",
        },
      ])
    );

    setRequests(
      (data || []).map((r) => ({
        ...r,
        name: profileMap[r.requester_id]?.name || "User",
        email: profileMap[r.requester_id]?.email || "",
      }))
    );
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

    setSendingMessage(true);
    try {
      const { error } = await supabase.from("space_messages").insert({
        space_id: id,
        sender_id: user.id,
        content: messageInput.trim(),
        kind: "text",
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
        <TabsContent value="chat" className="flex-1 flex flex-col m-0">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {language === "uz"
                    ? "Hali xabarlar yo'q. Birinchi bo'ling!"
                    : "No messages yet. Be the first!"}
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender_id === user?.id ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        msg.sender_id === user?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {msg.sender_id !== user?.id && (
                        <p className="text-xs font-medium opacity-70 mb-1">
                          {msg.senderName}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <div className="border-t border-border bg-background/80 backdrop-blur-lg">
            <div className="max-w-2xl mx-auto px-4 py-3">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder={language === "uz" ? "Xabar yozing..." : "Type a message..."}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border-none outline-none text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || sendingMessage}
                  size="icon"
                  className="rounded-xl"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Files Tab (Placeholder) */}
        <TabsContent value="files" className="flex-1 m-0">
          <div className="max-w-2xl mx-auto px-4 py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {language === "uz" ? "Tez orada..." : "Coming soon..."}
            </p>
          </div>
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
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl bg-card border border-border"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{req.name}</p>
                        <p className="text-xs text-muted-foreground">{req.email}</p>
                        {req.note && (
                          <p className="text-sm text-foreground mt-2 italic">
                            "{req.note}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {req.status === "pending" ? (
                        <div className="flex gap-1">
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
                          className={`text-xs px-2 py-1 rounded-full ${
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
                ))
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
