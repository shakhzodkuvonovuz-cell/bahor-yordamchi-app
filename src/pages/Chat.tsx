import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import QuickSuggestions from "@/components/QuickSuggestions";
import { Message, ChatMode } from "@/types/chat";
import { getDummyAiResponseAsync } from "@/services/dummyAiService";
import { getModeInfo } from "@/data/modes";

export default function Chat() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const modeInfo = getModeInfo(mode || "");

  useEffect(() => {
    if (!modeInfo) {
      navigate("/modes");
    }
  }, [modeInfo, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !mode) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const aiResponse = await getDummyAiResponseAsync(
        mode as ChatMode,
        content.trim()
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      // You could add error handling UI here
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  if (!modeInfo) return null;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border z-10 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/modes")}
            className="p-2 hover:bg-secondary rounded-xl transition-colors flex-shrink-0"
            aria-label="Orqaga"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground">Bahor AI</h1>
            <p className="text-xs text-muted-foreground truncate">
              {modeInfo.title}
            </p>
          </div>
          <div className="text-2xl flex-shrink-0">{modeInfo.icon}</div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4">
            <div className="text-center max-w-sm space-y-3">
              <div className="text-5xl mb-4">{modeInfo.icon}</div>
              <h2 className="text-xl font-semibold text-foreground">
                {modeInfo.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {modeInfo.subtitle}
              </p>
              <p className="text-xs text-muted-foreground pt-2">
                Savolingizni yozing yoki quyidagi tezkor takliflardan foydalaning
              </p>
            </div>
          </div>
        ) : (
          <div className="py-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4 px-4">
                <div className="bg-ai-message border border-border rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card">
        {/* Quick Suggestions */}
        {modeInfo.quickSuggestions && messages.length === 0 && (
          <div className="py-3">
            <QuickSuggestions
              suggestions={modeInfo.quickSuggestions}
              onSelect={handleSendMessage}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex gap-2 items-end">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Savolingizni yozing..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-input border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-3 bg-primary hover:bg-primary-light text-primary-foreground rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex-shrink-0"
              aria-label="Yuborish"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
