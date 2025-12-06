import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useSpaceChat } from "@/hooks/useSpaceChat";
import SpaceChatMessage, { type SpaceMessage } from "./SpaceChatMessage";
import SpaceChatInput from "./SpaceChatInput";
import BahorContextPicker from "./BahorContextPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SpaceChatTabProps {
  spaceId: string;
}

export default function SpaceChatTab({ spaceId }: SpaceChatTabProps) {
  const { user } = useAuth();
  const { language } = useTranslation();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    loading,
    sending,
    uploading,
    uploadProgress,
    sendMessage,
    uploadAndSend,
    deleteMessage,
    markAsRead,
    getMessageReaders,
  } = useSpaceChat({ spaceId, userId: user?.id });

  const [messageInput, setMessageInput] = useState("");
  const [replyTo, setReplyTo] = useState<SpaceMessage | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  // Bahor AI context picker
  const [showBahorPicker, setShowBahorPicker] = useState(false);
  const [bahorQuestion, setBahorQuestion] = useState("");
  const [sendingBahor, setSendingBahor] = useState(false);

  // Readers modal
  const [showReadersModal, setShowReadersModal] = useState(false);
  const [readers, setReaders] = useState<{ user_name?: string; user_avatar?: string; read_at: string }[]>([]);
  const [loadingReaders, setLoadingReaders] = useState(false);

  // Track if user is near bottom
  const isNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    setHasNewMessages(false);
  }, []);

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!nearBottom);
    
    if (nearBottom) {
      setHasNewMessages(false);
    }
  }, []);

  // Auto-scroll on new messages if near bottom
  useEffect(() => {
    if (messages.length > 0) {
      if (isNearBottom()) {
        scrollToBottom(false);
      } else {
        setHasNewMessages(true);
      }
    }
  }, [messages.length, isNearBottom, scrollToBottom]);

  // Mark latest message as read when visible
  useEffect(() => {
    if (messages.length > 0 && isNearBottom() && document.visibilityState === "visible") {
      const latestMsg = messages[messages.length - 1];
      if (latestMsg && latestMsg.sender_id !== user?.id && !latestMsg.id.startsWith("temp-")) {
        markAsRead(latestMsg.id);
      }
    }
  }, [messages, user?.id, isNearBottom, markAsRead]);

  // Handle send
  const handleSend = async () => {
    const trimmedInput = messageInput.trim();
    if (!trimmedInput) return;

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

    await sendMessage(trimmedInput, replyTo?.id);
    setMessageInput("");
    setReplyTo(null);
  };

  // Handle file upload
  const handleFileSelect = async (files: FileList) => {
    await uploadAndSend(files, messageInput.trim(), replyTo?.id);
    setMessageInput("");
    setReplyTo(null);
  };

  // Handle Bahor AI send
  const handleBahorSend = async (payload: {
    question: string;
    includeLastMessages: boolean;
    selectedFileIds: string[];
  }) => {
    if (!user) return;

    setSendingBahor(true);
    try {
      // First, insert the user's question as a message
      await sendMessage(`/bahor ${payload.question}`);

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
            space_id: spaceId,
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
        space_id: spaceId,
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
        toast.success(`Bahor: ${usedContext.join(" + ")}`, { duration: 4000 });
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

  // Handle reply
  const handleReply = (message: SpaceMessage) => {
    setReplyTo(message);
  };

  // Handle view readers
  const handleViewReaders = async (messageId: string) => {
    setShowReadersModal(true);
    setLoadingReaders(true);
    
    try {
      const messageReaders = await getMessageReaders(messageId);
      setReaders(messageReaders);
    } catch (err) {
      console.error("Error fetching readers:", err);
    } finally {
      setLoadingReaders(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          {language === "uz" ? "Yuklanmoqda..." : "Loading..."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {language === "uz"
                ? "Hali xabarlar yo'q. Birinchi bo'ling!"
                : "No messages yet. Be the first!"}
            </div>
          ) : (
            messages.map((msg) => (
              <SpaceChatMessage
                key={msg.id}
                message={msg}
                onReply={handleReply}
                onDelete={deleteMessage}
                onViewReaders={handleViewReaders}
                language={language}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={() => scrollToBottom()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
            {hasNewMessages
              ? language === "uz"
                ? "Yangi xabarlar"
                : "New messages"
              : "↓"}
          </button>
        </div>
      )}

      {/* Message input */}
      <SpaceChatInput
        value={messageInput}
        onChange={setMessageInput}
        onSend={handleSend}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        disabled={sending}
        uploading={uploading}
        uploadProgress={uploadProgress}
        onFileSelect={handleFileSelect}
        language={language}
      />

      {/* Bahor Context Picker */}
      {showBahorPicker && (
        <BahorContextPicker
          spaceId={spaceId}
          question={bahorQuestion}
          onSend={handleBahorSend}
          onCancel={() => {
            setShowBahorPicker(false);
            setBahorQuestion("");
          }}
          sending={sendingBahor}
        />
      )}

      {/* Readers modal */}
      <Dialog open={showReadersModal} onOpenChange={setShowReadersModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {language === "uz" ? "Kim o'qidi" : "Read by"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {loadingReaders ? (
              <div className="py-4 text-center text-muted-foreground animate-pulse">
                {language === "uz" ? "Yuklanmoqda..." : "Loading..."}
              </div>
            ) : readers.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                {language === "uz" ? "Hali hech kim o'qimagan" : "No one has read yet"}
              </div>
            ) : (
              readers.map((reader, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    {reader.user_avatar ? (
                      <img src={reader.user_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="text-xs font-medium">
                        {reader.user_name?.charAt(0).toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{reader.user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(reader.read_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
