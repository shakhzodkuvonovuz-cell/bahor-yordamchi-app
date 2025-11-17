import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Settings } from "lucide-react";
import { CHAT_MODES } from "@/data/modes";
import ModeCard from "@/components/ModeCard";
import { useLanguage } from "@/hooks/useLanguage";
import { getTranslation } from "@/data/translations";

export default function Home() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = getTranslation(language);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    // Navigate to general chat with the message
    navigate("/chat/general", { state: { initialMessage: input } });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 dark:to-primary/10">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header with App Name and Settings Icon */}
        <div className="flex justify-between items-center px-4 pt-4 pb-2">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Bahor AI</h2>
          <button
            onClick={() => navigate("/settings")}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Sozlamalar"
          >
            <Settings className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Hero Section */}
        <h1 className="mt-4 text-center text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
          {t.heroText}
        </h1>

        {/* Main Chat Input */}
        <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm px-3 py-2">
          <div className="flex gap-2 items-center">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t.chatPlaceholder}
              rows={1}
              className="flex-1 border-none outline-none bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none max-h-32"
              style={{ minHeight: "44px" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="rounded-full bg-emerald-500 text-white w-9 h-9 flex items-center justify-center hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section Title */}
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground font-medium">
            {t.subtitle}
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-3 pb-8">
          {CHAT_MODES.filter((mode) => mode.id !== "general").map((mode) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              language={language}
              onClick={() => navigate(`/chat/${mode.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
