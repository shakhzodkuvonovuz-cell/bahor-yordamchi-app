import { useState, useRef, useEffect, useCallback, memo } from "react";
import { ChevronDown, Users, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useSpaceChat } from "@/hooks/useSpaceChat";
import SpaceChatMessage, { type SpaceMessage } from "./SpaceChatMessage";
import SpaceChatInput from "./SpaceChatInput";
import BahorContextPicker from "./BahorContextPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SpaceChatTabProps {
  spaceId: string;
}

const MemoizedMessage = memo(SpaceChatMessage);

function hasBahorHintBeenSeen(userId: string): boolean {
  return localStorage.getItem(`bahor_hint_seen_v1_${userId}`) === "true";
}

function markBahorHintSeen(userId: string): void {
  localStorage.setItem(`bahor_hint_seen_v1_${userId}`, "true");
}

export default function SpaceChatTab({ spaceId }: SpaceChatTabProps) {
  const { user } = useAuth();
  const { language } = useTranslation();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  const {
    messages, isInitialLoading, isSending, isUploading, uploadProgress, uploadingFiles,
    sendMessage, uploadAndSend, deleteMessage, markAsRead, getMessageReaders,
  } = useSpaceChat({ spaceId, userId: user?.id });

  const [messageInput, setMessageInput] = useState("");
  const [replyTo, setReplyTo] = useState<SpaceMessage | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [showBahorPicker, setShowBahorPicker] = useState(false);
  const [bahorQuestion, setBahorQuestion] = useState("");
  const [sendingBahor, setSendingBahor] = useState(false);
  const [showBahorHint, setShowBahorHint] = useState(false);
  const [showInlineHint, setShowInlineHint] = useState(false);
  const [showReadersModal, setShowReadersModal] = useState(false);
  const [readers, setReaders] = useState<{ user_name?: string; user_avatar?: string; read_at: string }[]>([]);
  const [loadingReaders, setLoadingReaders] = useState(false);

  const isNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    setHasNewMessages(false);
  }, []);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    setShowScrollButton(scrollHeight - scrollTop - clientHeight >= 100);
    if (scrollHeight - scrollTop - clientHeight < 100) setHasNewMessages(false);
  }, []);

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && messages.length > 0) {
      isNearBottom() ? scrollToBottom(false) : setHasNewMessages(true);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, isNearBottom, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0 && isNearBottom() && document.visibilityState === "visible") {
      const latestMsg = messages[messages.length - 1];
      if (latestMsg?.sender_id !== user?.id && !latestMsg.id.startsWith("temp-")) markAsRead(latestMsg.id);
    }
  }, [messages, user?.id, isNearBottom, markAsRead]);

  useEffect(() => {
    if (!isInitialLoading && messages.length > 0) scrollToBottom(false);
  }, [isInitialLoading]);

  const handleSend = async () => {
    const trimmed = messageInput.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase().startsWith("/bahor")) {
      const question = trimmed.replace(/^\/bahor\s*/i, "").trim();
      if (!question) { toast.error(language === "uz" ? "Savol yozing" : "Enter a question"); return; }
      if (user?.id && !hasBahorHintBeenSeen(user.id)) { setShowBahorHint(true); setBahorQuestion(question); return; }
      setShowInlineHint(true); setTimeout(() => setShowInlineHint(false), 2000);
      setBahorQuestion(question); setShowBahorPicker(true); return;
    }

    await sendMessage(trimmed, replyTo?.id, undefined, replyTo || undefined);
    setMessageInput(""); setReplyTo(null);
  };

  const handleFileSelect = async (files: FileList) => {
    await uploadAndSend(files, messageInput.trim(), replyTo?.id, replyTo || undefined);
    setMessageInput(""); setReplyTo(null);
  };

  const handleBahorHintConfirm = () => {
    if (user?.id) markBahorHintSeen(user.id);
    setShowBahorHint(false); setShowBahorPicker(true);
  };

  const handleBahorSend = async (payload: { question: string; includeLastMessages: boolean; selectedFileIds: string[] }) => {
    if (!user) return;
    setSendingBahor(true);
    try {
      await sendMessage(`/bahor ${payload.question}`);
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/space-chat`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session?.access_token}` },
        body: JSON.stringify({ space_id: spaceId, question: payload.question, include_last_messages: payload.includeLastMessages, selected_file_ids: payload.selectedFileIds, ui_language: language }),
      });
      if (!response.ok) throw new Error((await response.json()).message || "AI error");
      const data = await response.json();
      await supabase.from("space_messages").insert({ space_id: spaceId, sender_id: user.id, content: data.response, type: "ai" });
      setShowBahorPicker(false); setMessageInput(""); setBahorQuestion("");
    } catch (err: any) { toast.error(err.message || "Xatolik"); } finally { setSendingBahor(false); }
  };

  const handleViewReaders = async (messageId: string) => {
    setShowReadersModal(true); setLoadingReaders(true);
    try { setReaders(await getMessageReaders(messageId)); } finally { setLoadingReaders(false); }
  };

  if (isInitialLoading) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Messages skeleton */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                {i % 2 !== 0 && <Skeleton className="w-8 h-8 rounded-full mr-2" />}
                <div className="space-y-1">
                  <Skeleton className={cn("h-10 rounded-2xl", i % 2 === 0 ? "w-48" : "w-56")} />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Input skeleton */}
        <div className="flex-shrink-0 border-t border-border bg-background/80 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Messages scroller - only this scrolls */}
      <div 
        ref={messagesContainerRef} 
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
        onScroll={handleScroll}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {language === "uz" ? "Hali xabarlar yo'q" : "No messages yet"}
            </div>
          ) : (
            messages.map((msg) => (
              <MemoizedMessage 
                key={msg.id} 
                message={msg} 
                onReply={setReplyTo} 
                onDelete={deleteMessage} 
                onViewReaders={handleViewReaders} 
                language={language} 
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Inline hint - positioned above input */}
      {showInlineHint && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary animate-fade-in">
          /bahor — AI javob beradi
        </div>
      )}

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
          <button 
            onClick={() => scrollToBottom()} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground shadow-lg"
          >
            <ChevronDown className="w-4 h-4" />
            {hasNewMessages ? (language === "uz" ? "Yangi xabarlar" : "New messages") : "↓"}
          </button>
        </div>
      )}

      {/* Input area - fixed at bottom, never scrolls */}
      <div className="flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
        <SpaceChatInput 
          value={messageInput} 
          onChange={setMessageInput} 
          onSend={handleSend} 
          replyTo={replyTo} 
          onCancelReply={() => setReplyTo(null)} 
          disabled={isSending} 
          uploading={isUploading} 
          uploadProgress={uploadProgress} 
          uploadingFiles={uploadingFiles} 
          onFileSelect={handleFileSelect} 
          language={language} 
        />
      </div>

      <Dialog open={showBahorHint} onOpenChange={setShowBahorHint}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />/bahor nima?</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground"><p>{language === "uz" ? "/bahor — Space ichidagi AI yordamchi:" : "/bahor is the Space AI:"}</p><ul className="list-disc list-inside space-y-1"><li>{language === "uz" ? "Xabarlarni o'qiydi" : "Reads messages"}</li><li>{language === "uz" ? "Fayllarni tahlil qiladi" : "Analyzes files"}</li></ul></div>
          <div className="flex gap-2 pt-2"><button onClick={() => setShowBahorHint(false)} className="flex-1 px-4 py-2 rounded-xl bg-secondary">{language === "uz" ? "Bekor" : "Cancel"}</button><button onClick={handleBahorHintConfirm} className="flex-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground">{language === "uz" ? "Tushundim" : "Got it"}</button></div>
        </DialogContent>
      </Dialog>

      {showBahorPicker && <BahorContextPicker spaceId={spaceId} question={bahorQuestion} onSend={handleBahorSend} onCancel={() => { setShowBahorPicker(false); setBahorQuestion(""); }} sending={sendingBahor} />}

      <Dialog open={showReadersModal} onOpenChange={setShowReadersModal}>
        <DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5" />{language === "uz" ? "Kim o'qidi" : "Read by"}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">{loadingReaders ? <div className="py-4 text-center animate-pulse">{language === "uz" ? "Yuklanmoqda..." : "Loading..."}</div> : readers.length === 0 ? <div className="py-4 text-center text-muted-foreground">{language === "uz" ? "Hali hech kim o'qimagan" : "No readers"}</div> : readers.map((r, i) => (<div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50"><div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">{r.user_avatar ? <img src={r.user_avatar} alt="" className="w-8 h-8 rounded-full object-cover" /> : <span className="text-xs font-medium">{r.user_name?.charAt(0) || "U"}</span>}</div><div className="flex-1"><p className="text-sm font-medium">{r.user_name}</p><p className="text-xs text-muted-foreground">{new Date(r.read_at).toLocaleString()}</p></div></div>))}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
