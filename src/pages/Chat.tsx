import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import QuickSuggestions from "@/components/QuickSuggestions";
import { DeleteChatModal } from "@/components/DeleteChatModal";
import { Message, ChatMode, ChatSession } from "@/types/chat";
import { getDummyAiResponseAsync } from "@/services/dummyAiService";
import { getModeInfo } from "@/data/modes";
import { useLanguage } from "@/hooks/useLanguage";
import { getTranslation } from "@/data/translations";
import {
  loadChatsFromStorage,
  saveChatsToStorage,
  getOrCreateModeChats,
  createNewSession,
  updateSessionMessages,
} from "@/utils/chatStorage";
import { clsx } from "clsx";

// Streaming helper - simulates token-by-token streaming for demo purposes
// Later: replace with real LLM streaming API (e.g. streamLLMResponse)
type StreamOptions = {
  onChunk: (chunk: string) => void;
  onDone: () => void;
};

async function simulateStreamingResponse(
  fullText: string,
  options: StreamOptions
) {
  const words = fullText.split(" ");
  for (let i = 0; i < words.length; i++) {
    const chunk = (i === 0 ? "" : " ") + words[i];
    options.onChunk(chunk);
    // Small delay per word to simulate streaming
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  options.onDone();
}

export default function Chat() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const t = getTranslation(language);
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const modeInfo = getModeInfo(mode || "");
  const modeTranslation = t.modes[mode as keyof typeof t.modes];
  const modeSuggestions = [...(t.suggestions[mode as keyof typeof t.suggestions] || modeInfo?.quickSuggestions || [])];

  // Helper to get localized session label (fallback for old sessions)
  const getSessionLabel = (session: ChatSession) => {
    if (!session.title || session.title === "Yangi suhbat") {
      return t.chat.defaultChatTitle;
    }
    return session.title;
  };

  // Initialize sessions for the current mode
  useEffect(() => {
    if (!mode) return;

    const storage = loadChatsFromStorage();
    const updatedStorage = getOrCreateModeChats(storage, mode, t.chat.defaultChatTitle);
    
    if (!storage[mode]) {
      saveChatsToStorage(updatedStorage);
    }

    const modeSessions = updatedStorage[mode].sessions;
    setSessions(modeSessions);
    
    // Set current session to the most recent one
    const latestSession = modeSessions[modeSessions.length - 1];
    setCurrentSessionId(latestSession.id);
    
    // Load messages for the latest session
    const sessionMessages = updatedStorage[mode].messagesById[latestSession.id] || [];
    setMessages(sessionMessages);
  }, [mode, t.chat.defaultChatTitle]);

  // Save messages whenever they change
  useEffect(() => {
    if (!mode || !currentSessionId) return;
    
    const storage = loadChatsFromStorage();
    if (!storage[mode]) return;

    const updatedStorage = updateSessionMessages(storage, mode, currentSessionId, messages);
    saveChatsToStorage(updatedStorage);
  }, [messages, mode, currentSessionId]);

  useEffect(() => {
    if (!modeInfo) {
      navigate("/");
    }
  }, [modeInfo, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

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

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || typing || !mode) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setTyping(true);

    try {
      // Get full response from demo service (same as before)
      const fullReply = await getDummyAiResponseAsync(
        mode as ChatMode,
        content.trim()
      );

      // Add a small delay to show typing indicator before streaming starts
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Create empty assistant message that we'll stream into
      const assistantId = crypto.randomUUID?.() ?? (Date.now() + 1).toString();
      const emptyAssistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, emptyAssistantMessage]);

      // Stream the response word by word
      // Later: replace simulateStreamingResponse with streamLLMResponse for real API
      await simulateStreamingResponse(fullReply, {
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m
            )
          );
        },
        onDone: () => {
          setTyping(false);
          setIsLoading(false);
          inputRef.current?.focus();
        },
      });
    } catch (error) {
      console.error("Error getting AI response:", error);
      setTyping(false);
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSelectSession = (sessionId: string) => {
    // Save current messages before switching
    if (currentSessionId && mode) {
      const storage = loadChatsFromStorage();
      const updatedStorage = updateSessionMessages(storage, mode, currentSessionId, messages);
      saveChatsToStorage(updatedStorage);
    }

    // Load new session messages
    setCurrentSessionId(sessionId);
    const storage = loadChatsFromStorage();
    const sessionMessages = storage[mode!]?.messagesById[sessionId] || [];
    setMessages(sessionMessages);
  };

  const handleCreateNewSession = () => {
    if (!mode) return;

    const newSession = createNewSession(mode, t.chat.defaultChatTitle);
    const storage = loadChatsFromStorage();
    
    if (!storage[mode]) {
      const updatedStorage = getOrCreateModeChats(storage, mode, t.chat.defaultChatTitle);
      saveChatsToStorage(updatedStorage);
    }

    storage[mode].sessions.push(newSession);
    storage[mode].messagesById[newSession.id] = [];
    saveChatsToStorage(storage);

    setSessions([...storage[mode].sessions]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  const handleDeleteCurrentSession = () => {
    if (!mode || !currentSessionId) return;

    const chats = loadChatsFromStorage();
    const modeData = chats[mode];
    if (!modeData) return;

    // Remove the current session
    const updatedSessions = modeData.sessions.filter(s => s.id !== currentSessionId);
    const { [currentSessionId]: _, ...updatedMessagesById } = modeData.messagesById;

    if (updatedSessions.length === 0) {
      // No sessions left - create a new default one
      const newId = crypto.randomUUID?.() ?? String(Date.now());
      const now = new Date().toISOString();

      const newSession: ChatSession = {
        id: newId,
        mode,
        title: t.chat.defaultChatTitle,
        createdAt: now,
        updatedAt: now,
      };

      chats[mode] = {
        sessions: [newSession],
        messagesById: { [newId]: [] },
      };

      saveChatsToStorage(chats);
      setSessions([newSession]);
      setCurrentSessionId(newId);
      setMessages([]);
    } else {
      // Switch to the most recent remaining session
      const newCurrentId = updatedSessions[updatedSessions.length - 1].id;
      chats[mode] = {
        sessions: updatedSessions,
        messagesById: updatedMessagesById,
      };
      saveChatsToStorage(chats);

      setSessions(updatedSessions);
      setCurrentSessionId(newCurrentId);
      setMessages(chats[mode].messagesById[newCurrentId] ?? []);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  if (!modeInfo) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <div className="mx-auto w-full max-w-3xl flex flex-col h-screen">
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
              <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Bahor AI
              </span>
            </div>
          </div>
        </div>

        {/* Session Selector */}
        {sessions.length > 0 && (
          <div className="px-4 pt-2 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={clsx(
                  "whitespace-nowrap rounded-full px-3 py-1 text-xs border transition flex-shrink-0",
                  session.id === currentSessionId
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800"
                )}
              >
                {getSessionLabel(session)}
              </button>
            ))}

            <button
              onClick={handleCreateNewSession}
              className="whitespace-nowrap rounded-full px-3 py-1 text-xs border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition flex-shrink-0"
            >
              + {t.chat.defaultChatTitle}
            </button>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
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
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-sm">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t.chatPlaceholder}
                disabled={isLoading || typing}
                className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] leading-relaxed text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading || typing}
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
          handleDeleteCurrentSession();
          setShowDeleteModal(false);
        }}
      />
    </div>
  );
}
