import { useState, useRef, useEffect } from "react";
import { Copy, Edit3, Check } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

// Desktop hover menu component for USER messages only (Copy/Edit)
export function MessageActionsPopover({
  messageRole,
  onCopy,
  onEdit,
}: {
  messageRole: "user" | "assistant";
  onCopy: () => void;
  onEdit?: () => void;
}) {
  const { language } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setIsOpen(false);
    }, 1000);
  };

  const labels = {
    copy: language === "uz" ? "Nusxa olish" : language === "en" ? "Copy" : language === "ru" ? "Копировать" : "Kopyala",
    edit: language === "uz" ? "Tahrirlash" : language === "en" ? "Edit" : language === "ru" ? "Редактировать" : "Düzenle",
  };

  // Only show for user messages
  if (messageRole !== "user") return null;

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 min-w-[40px] min-h-[40px] rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100 touch-manipulation"
        aria-label="Message actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 z-50 min-w-[160px] bg-card border border-border/40 rounded-xl shadow-lg py-1 animate-scale-in">
          {/* Copy */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] hover:bg-secondary/60 transition-colors text-left touch-manipulation"
          >
            {copied ? (
              <Check className="w-4 h-4 text-primary" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm text-foreground">
              {copied ? (language === "uz" ? "Nusxa olindi" : "Copied") : labels.copy}
            </span>
          </button>

          {/* Edit */}
          {onEdit && (
            <button
              onClick={() => {
                onEdit();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] hover:bg-secondary/60 transition-colors text-left touch-manipulation"
            >
              <Edit3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{labels.edit}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
