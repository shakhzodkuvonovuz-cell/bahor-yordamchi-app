import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send, Trash2, Menu, Paperclip, X } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import QuickSuggestions from "@/components/QuickSuggestions";
import { DeleteChatModal } from "@/components/DeleteChatModal";
import DailyUsageIndicator from "@/components/DailyUsageIndicator";
import LimitReachedCard from "@/components/LimitReachedCard";
import { Message, ChatSession, ChatMode, ChatAttachment } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { getModeInfo } from "@/data/modes";
import { useLanguage } from "@/hooks/useLanguage";
import { getTranslation } from "@/data/translations";
import { loadChatsFromStorage, saveChatsToStorage, createNewSession } from "@/utils/chatStorage";
import { generateChatTitle } from "@/utils/generateChatTitle";
import { useAuth } from "@/hooks/useAuth";
import { useDailyUsage } from "@/hooks/useDailyUsage";
import clsx from "clsx";
import { useToast } from "@/hooks/use-toast";
import bahorLogo from "@/assets/bahor-logo.png";

// Real streaming helper - processes SSE from DeepSeek API
type StreamOptions = {
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
};

async function processStreamingResponse(
  response: Response,
  options: StreamOptions
) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    options.onError(new Error("No reader available"));
    return;
  }

  try {
    let buffer = "";
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === "data: [DONE]") continue;
        if (!trimmedLine.startsWith("data: ")) continue;
        
        try {
          const jsonStr = trimmedLine.slice(6);
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          
          if (content) {
            options.onChunk(content);
          }
        } catch (e) {
          // Skip malformed JSON chunks
          console.warn("Failed to parse chunk:", e);
        }
      }
    }
    
    options.onDone();
  } catch (error) {
    options.onError(error instanceof Error ? error : new Error("Stream error"));
  }
}

export default function Chat() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const t = getTranslation(language);
  const { user } = useAuth();
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // TODO: Backend integration - Replace with real usage tracking from backend
  const { usedToday, dailyLimit, hasReachedLimit, isNearLimit, incrementUsage } = useDailyUsage();
  const [showLimitCard, setShowLimitCard] = useState(false);

  const modeInfo = getModeInfo(mode || "");
  const modeTranslation = t.modes[mode as keyof typeof t.modes];
  const modeSuggestions = [...(t.suggestions[mode as keyof typeof t.suggestions] || modeInfo?.quickSuggestions || [])];

  // Initialize sessions on mount
  useEffect(() => {
    if (!mode) return;

    const storage = loadChatsFromStorage();
    
    // If no data for this mode, create default session
    if (!storage[mode]) {
      const defaultSession = createNewSession(mode, t.chat.defaultChatTitle);
      storage[mode] = {
        sessions: [defaultSession],
        messagesById: { [defaultSession.id]: [] },
      };
      saveChatsToStorage(storage);
      setSessions([defaultSession]);
      setCurrentSessionId(defaultSession.id);
      setMessages([]);
    } else {
      const modeData = storage[mode];
      setSessions(modeData.sessions);
      
      // Pick most recent session
      const mostRecent = [...modeData.sessions].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      
      setCurrentSessionId(mostRecent.id);
      setMessages(modeData.messagesById[mostRecent.id] || []);
    }
  }, [mode, t.chat.defaultChatTitle]);

  // Save messages whenever they change
  useEffect(() => {
    if (!mode || !currentSessionId) return;

    const storage = loadChatsFromStorage();
    if (!storage[mode]) return;

    storage[mode].messagesById[currentSessionId] = messages;
    
    // Update updatedAt for current session
    const session = storage[mode].sessions.find(s => s.id === currentSessionId);
    if (session) {
      session.updatedAt = new Date().toISOString();
      
      // Auto-name chat from first user message
      const isDefaultTitle = 
        session.title === t.chat.defaultChatTitle || 
        session.title === "Yangi suhbat" || 
        session.title === "New chat";
      
      const firstUserMessage = messages.find(m => m.role === "user");
      
      if (isDefaultTitle && firstUserMessage && messages.length >= 1) {
        session.title = generateChatTitle(firstUserMessage.content, mode);
      }
    }

    saveChatsToStorage(storage);
    
    // Update sessions state to reflect new updatedAt
    setSessions([...storage[mode].sessions]);
  }, [messages, currentSessionId, mode, t.chat.defaultChatTitle]);

  useEffect(() => {
    if (!modeInfo) {
      navigate("/");
    }
  }, [modeInfo, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  // Auto-focus input after AI finishes responding
  useEffect(() => {
    if (!isLoading && !typing) {
      // Small delay to ensure DOM has updated
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, typing]);

  // Handle initial message from home page
  useEffect(() => {
    const state = location.state as { initialMessage?: string } | null;
    if (state?.initialMessage) {
      handleSendMessage(state.initialMessage);
      // Clear the state to prevent re-sending on re-render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const newAttachments: ChatAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Only support images for now
        if (!file.type.startsWith("image/")) {
          toast({
            title: language === "uz" ? "Xatolik" : "Error",
            description: language === "uz" ? `${file.name}: Faqat rasm fayllari qo'llab-quvvatlanadi` : `${file.name}: Only image files are supported`,
            variant: "destructive",
          });
          continue;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: language === "uz" ? "Xatolik" : "Error",
            description: language === "uz" ? `${file.name}: Fayl hajmi 10MB dan oshmasligi kerak` : `${file.name}: File size must not exceed 10MB`,
            variant: "destructive",
          });
          continue;
        }

        // Create preview URL for images
        const previewUrl = URL.createObjectURL(file);

        // Upload to Supabase storage
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${i}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
          .from("chat-attachments")
          .upload(filePath, file);

        if (error) {
          console.error("Upload error:", error);
          toast({
            title: language === "uz" ? "Xatolik" : "Error",
            description: language === "uz" ? `${file.name}: Yuklashda xatolik` : `${file.name}: Upload failed`,
            variant: "destructive",
          });
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("chat-attachments")
          .getPublicUrl(filePath);

        const attachment: ChatAttachment = {
          id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}-${i}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: publicUrl,
          previewUrl,
        };

        newAttachments.push(attachment);
      }

      if (newAttachments.length > 0) {
        setPendingAttachments((prev) => [...prev, ...newAttachments]);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: language === "uz" ? "Xatolik" : "Error",
        description: language === "uz" ? "Fayllarni yuklashda xatolik yuz berdi" : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    const attachment = pendingAttachments.find((a) => a.id === attachmentId);
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    setPendingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  const handleSendMessage = async (content: string) => {
    if ((!content.trim() && pendingAttachments.length === 0) || isLoading || typing || !mode) return;
    
    // TODO: Backend integration - Check limit via backend API instead of local storage
    if (hasReachedLimit) {
      setShowLimitCard(true);
      scrollToBottom();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setPendingAttachments([]);
    setIsLoading(true);
    setTyping(true);

    // Prepare assistant message ID but don't add to state yet
    const assistantId = crypto.randomUUID?.() ?? (Date.now() + 1).toString();
    let assistantMessageCreated = false;

    try {
      // Create conversation history for API (limit to last 12 messages)
      const recentMessages = messages.slice(-12);
      const conversationMessages = recentMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
      
      // Add the new user message
      conversationMessages.push({
        role: "user" as const,
        content: content.trim(),
      });

      // Call the backend API for streaming response
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: conversationMessages,
            mode: mode || "general",
            attachments: userMessage.attachments || [],
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get response from server");
      }

      // Process the streaming response
      await processStreamingResponse(response, {
        onChunk: (chunk) => {
          if (!assistantMessageCreated) {
            // Create assistant message on first chunk
            const newAssistantMessage: Message = {
              id: assistantId,
              role: "assistant",
              content: chunk,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, newAssistantMessage]);
            assistantMessageCreated = true;
          } else {
            // Update existing assistant message
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m
              )
            );
          }
        },
        onDone: () => {
          setTyping(false);
          setIsLoading(false);
          inputRef.current?.focus();
          
          // TODO: Backend integration - Backend should track and enforce limits
          // Increment usage count after successful AI response
          incrementUsage();
        },
        onError: (error) => {
          throw error;
        },
      });
    } catch (error) {
      console.error("Error getting AI response:", error);
      
      setTyping(false);
      setIsLoading(false);
      inputRef.current?.focus();
      
      // Show error toast (you can add toast notification here if desired)
      alert("Hozircha serverda xatolik bo'ldi, birozdan so'ng qayta urinib ko'ring.");
    }
  };

  const handleClearChat = () => {
    if (!currentSessionId || !mode) return;
    
    const storage = loadChatsFromStorage();
    if (!storage[mode]) return;

    // Clear messages for current session
    storage[mode].messagesById[currentSessionId] = [];
    saveChatsToStorage(storage);
    setMessages([]);
  };

  const handleCreateNewSession = () => {
    if (!mode) return;

    const newSession = createNewSession(mode, t.chat.defaultChatTitle);
    const storage = loadChatsFromStorage();
    
    if (!storage[mode]) {
      storage[mode] = {
        sessions: [newSession],
        messagesById: { [newSession.id]: [] },
      };
    } else {
      storage[mode].sessions.unshift(newSession);
      storage[mode].messagesById[newSession.id] = [];
    }
    
    saveChatsToStorage(storage);
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setIsHistoryOpen(false);
  };

  const handleSelectSession = (sessionId: string) => {
    if (!mode) return;
    
    const storage = loadChatsFromStorage();
    if (!storage[mode]) return;

    setCurrentSessionId(sessionId);
    setMessages(storage[mode].messagesById[sessionId] || []);
    setIsHistoryOpen(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!mode) return;

    const storage = loadChatsFromStorage();
    if (!storage[mode]) return;

    const modeData = storage[mode];
    const updatedSessions = modeData.sessions.filter(s => s.id !== sessionId);
    const { [sessionId]: _removed, ...updatedMessagesById } = modeData.messagesById;

    if (updatedSessions.length === 0) {
      // No sessions left: create a new default one
      const newSession = createNewSession(mode, t.chat.defaultChatTitle);
      storage[mode] = {
        sessions: [newSession],
        messagesById: { [newSession.id]: [] },
      };
      saveChatsToStorage(storage);
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
    } else {
      // Still have sessions
      storage[mode] = {
        sessions: updatedSessions,
        messagesById: updatedMessagesById,
      };
      saveChatsToStorage(storage);
      setSessions(updatedSessions);

      // If deleted current session, switch to another
      if (sessionId === currentSessionId) {
        const newCurrentId = updatedSessions[0].id;
        setCurrentSessionId(newCurrentId);
        setMessages(updatedMessagesById[newCurrentId] || []);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Auto-grow textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 140); // Max ~6 lines
    textarea.style.height = `${newHeight}px`;
  };

  if (!modeInfo) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      {/* History Drawer */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="flex-1 bg-black/40"
            onClick={() => setIsHistoryOpen(false)}
          />

          {/* Drawer */}
          <div className="w-64 max-w-[80vw] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="px-3 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500 uppercase">
                  {t.chat.chatHistory}
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Bahor AI
                </span>
              </div>
              <button
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setIsHistoryOpen(false)}
                aria-label="Close history"
              >
                ✕
              </button>
            </div>

            <button
              onClick={handleCreateNewSession}
              className="m-3 mb-2 w-full rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              + {t.chat.defaultChatTitle}
            </button>

            <div className="flex-1 overflow-y-auto">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={clsx(
                    "flex items-center justify-between px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800",
                    session.id === currentSessionId &&
                      "bg-emerald-50 dark:bg-emerald-900/20"
                  )}
                  onClick={() => handleSelectSession(session.id)}
                >
                  <div className="flex-1 pr-2">
                    <div className="font-medium text-slate-800 dark:text-slate-100 truncate">
                      {session.title || t.chat.defaultChatTitle}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDeleteSessionId(session.id);
                    }}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"
                    aria-label="Delete chat"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl flex flex-col h-screen">
        {/* Header */}
        <div className="sticky top-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 backdrop-blur z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/")}
                className="w-9 h-9 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition flex-shrink-0"
                aria-label={t.chat.back}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="w-9 h-9 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition flex-shrink-0"
                aria-label="Open chat history"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {modeTranslation?.title || modeInfo.title}
                </h1>
                {modeTranslation?.subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {modeTranslation.subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {messages.length > 0 && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
                  aria-label={t.chat.clearChat}
                  title={t.chat.clearChat}
                >
                  <Trash2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>
              )}
              <img src={bahorLogo} alt="Bahor AI" className="w-9 h-9 object-contain" />
            </div>
          </div>
        </div>


        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
          {/* Daily Usage Indicator */}
          {messages.length > 0 && (
            <DailyUsageIndicator 
              used={usedToday}
              limit={dailyLimit}
              isNearLimit={isNearLimit}
              hasReachedLimit={hasReachedLimit}
            />
          )}
          
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm space-y-3">
                <div className="text-5xl mb-4">{modeInfo.icon}</div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                  {modeTranslation?.title || modeInfo.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {modeTranslation?.subtitle || modeInfo.subtitle}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
                  {language === "uz" ? "Savolingizni yozing yoki quyidagi tezkor takliflardan foydalaning" :
                   language === "en" ? "Type your question or use quick suggestions below" :
                   language === "ru" ? "Введите свой вопрос или используйте быстрые предложения ниже" :
                   "Sorunuzu yazın veya aşağıdaki hızlı önerileri kullanın"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              
              {/* Show limit reached card */}
              {showLimitCard && hasReachedLimit && (
                <LimitReachedCard onDismiss={() => setShowLimitCard(false)} />
              )}
              
              {typing && (
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 dark:text-slate-300">{t.chat.typing}</span>
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
      </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur">
          {/* Quick Suggestions */}
          {modeSuggestions && modeSuggestions.length > 0 && messages.length === 0 && (
            <div className="py-3">
              <QuickSuggestions
                suggestions={modeSuggestions}
                onSelect={handleSendMessage}
                disabled={isLoading || typing}
              />
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="px-4 py-3">
            {/* Attachment Previews */}
            {pendingAttachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pendingAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg"
                  >
                    {attachment.previewUrl ? (
                      <img
                        src={attachment.previewUrl}
                        alt={attachment.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center text-2xl">
                        📄
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
                        {attachment.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                      aria-label="Remove attachment"
                    >
                      <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-sm">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                capture="environment"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || typing || isUploading}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-50 flex-shrink-0"
                aria-label="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={t.chatPlaceholder}
                disabled={isLoading || typing}
                rows={1}
                className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] leading-relaxed text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-50 max-h-[140px] overflow-y-auto"
                style={{ minHeight: "24px" }}
              />
              <button
                type="submit"
                disabled={(!inputValue.trim() && pendingAttachments.length === 0) || isLoading || typing}
                className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                aria-label="Yuborish"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      <DeleteChatModal
        open={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => {
          handleClearChat();
          setShowDeleteModal(false);
        }}
      />

      <DeleteChatModal
        open={pendingDeleteSessionId !== null}
        onCancel={() => setPendingDeleteSessionId(null)}
        onConfirm={() => {
          if (pendingDeleteSessionId) {
            handleDeleteSession(pendingDeleteSessionId);
            setPendingDeleteSessionId(null);
          }
        }}
      />
    </div>
  );
}
