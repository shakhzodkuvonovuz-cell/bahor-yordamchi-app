import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import QuickSuggestions from "@/components/QuickSuggestions";
import { Message, ChatMode } from "@/types/chat";
import { getDummyAiResponseAsync } from "@/services/dummyAiService";
import { getModeInfo } from "@/data/modes";
import { useLanguage } from "@/hooks/useLanguage";
import { getTranslation } from "@/data/translations";

const STORAGE_KEY_PREFIX = "bahorai_chat_";

export default function Chat() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const t = getTranslation(language);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const modeInfo = getModeInfo(mode || "");
  const modeTranslation = t.modes[mode as keyof typeof t.modes];
  const storageKey = `${STORAGE_KEY_PREFIX}${mode}`;

  // Load messages from localStorage on mount
  useEffect(() => {
    if (!mode) return;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMessages(parsed);
      }
    } catch (error) {
      console.error("Error loading messages from localStorage:", error);
    }
  }, [mode, storageKey]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!mode || messages.length === 0) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (error) {
      console.error("Error saving messages to localStorage:", error);
    }
  }, [messages, mode, storageKey]);

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
      const aiResponse = await getDummyAiResponseAsync(
        mode as ChatMode,
        content.trim()
      );

      // Add a small delay to show typing indicator
      await new Promise((resolve) => setTimeout(resolve, 600));

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error getting AI response:", error);
    } finally {
      setTyping(false);
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("Error clearing chat from localStorage:", error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  if (!modeInfo) return null;

  return (
    <div className="min-h-screen bg-slate-900 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto w-full max-w-3xl flex flex-col h-screen">
        {/* Header */}
        <div className="sticky top-0 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/")}
                className="w-9 h-9 rounded-full border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-800 active:scale-95 transition flex-shrink-0"
                aria-label={t.chat.back}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-base md:text-lg font-semibold text-slate-50">
                  {modeTranslation?.title || modeInfo.title}
                </h1>
                {modeTranslation?.subtitle && (
                  <p className="text-xs text-slate-400 truncate">
                    {modeTranslation.subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
                  aria-label={t.chat.clearChat}
                  title={t.chat.clearChat}
                >
                  <Trash2 className="w-4 h-4 text-slate-400" />
                </button>
              )}
              <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Bahor AI
              </span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm space-y-3">
                <div className="text-5xl mb-4">{modeInfo.icon}</div>
                <h2 className="text-xl font-semibold text-slate-50">
                  {modeTranslation?.title || modeInfo.title}
                </h2>
                <p className="text-sm text-slate-300">
                  {modeTranslation?.subtitle || modeInfo.subtitle}
                </p>
                <p className="text-xs text-slate-400 pt-2">
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
                  <div className="bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-300">{t.chat.typing}</span>
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
        <div className="border-t border-slate-800 bg-slate-950/80 backdrop-blur">
          {/* Quick Suggestions */}
          {modeInfo.quickSuggestions && messages.length === 0 && (
            <div className="py-3">
              <QuickSuggestions
                suggestions={modeInfo.quickSuggestions}
                onSelect={handleSendMessage}
                disabled={isLoading || typing}
              />
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="px-4 py-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 shadow-sm">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Savolingizni yozing..."
                disabled={isLoading || typing}
                className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] leading-relaxed text-slate-50 placeholder:text-slate-500 disabled:opacity-50"
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
    </div>
  );
}
