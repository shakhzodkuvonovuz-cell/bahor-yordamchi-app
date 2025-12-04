import { useState, useRef, useEffect } from "react";
import { Copy, RefreshCw, Edit3, X, Check } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

interface MessageActionsProps {
  messageId: string;
  messageRole: "user" | "assistant";
  messageContent: string;
  isOpen: boolean;
  onClose: () => void;
  onCopy: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  position?: { x: number; y: number };
  isMobile: boolean;
}

export function MessageActions({
  messageRole,
  isOpen,
  onClose,
  onCopy,
  onEdit,
  onRegenerate,
  isMobile,
}: MessageActionsProps) {
  const { language } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const labels = {
    copy: language === "uz" ? "Nusxa olish" : language === "en" ? "Copy" : language === "ru" ? "Копировать" : "Kopyala",
    edit: language === "uz" ? "Tahrirlash" : language === "en" ? "Edit" : language === "ru" ? "Редактировать" : "Düzenle",
    regenerate: language === "uz" ? "Qayta yaratish" : language === "en" ? "Regenerate" : language === "ru" ? "Перегенерировать" : "Yeniden oluştur",
  };

  if (!isOpen) return null;

  // Mobile: Bottom sheet
  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        <div
          className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />
        {/* Bottom Sheet */}
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
          <div className="bg-card border-t border-border/40 rounded-t-3xl shadow-2xl p-4 pb-8 safe-area-bottom">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />
            <div className="space-y-2">
              {/* Copy */}
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 active:bg-secondary transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-primary" />
                ) : (
                  <Copy className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-[15px] font-medium text-foreground">
                  {copied ? (language === "uz" ? "Nusxa olindi" : "Copied") : labels.copy}
                </span>
              </button>

              {/* Edit - User messages only */}
              {messageRole === "user" && onEdit && (
                <button
                  onClick={() => {
                    onEdit();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 active:bg-secondary transition-colors"
                >
                  <Edit3 className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[15px] font-medium text-foreground">{labels.edit}</span>
                </button>
              )}

              {/* Regenerate - Assistant messages only */}
              {messageRole === "assistant" && onRegenerate && (
                <button
                  onClick={() => {
                    onRegenerate();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 active:bg-secondary transition-colors"
                >
                  <RefreshCw className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[15px] font-medium text-foreground">{labels.regenerate}</span>
                </button>
              )}

              {/* Cancel */}
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {language === "uz" ? "Bekor qilish" : language === "en" ? "Cancel" : language === "ru" ? "Отмена" : "İptal"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Desktop: Popover menu (rendered inline near the message)
  return null; // Desktop popover is handled differently in ChatMessage
}

// Desktop hover menu component
export function MessageActionsPopover({
  messageRole,
  onCopy,
  onEdit,
  onRegenerate,
}: {
  messageRole: "user" | "assistant";
  onCopy: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
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
    regenerate: language === "uz" ? "Qayta yaratish" : language === "en" ? "Regenerate" : language === "ru" ? "Перегенерировать" : "Yeniden oluştur",
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100"
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
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors text-left"
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

          {/* Edit - User only */}
          {messageRole === "user" && onEdit && (
            <button
              onClick={() => {
                onEdit();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors text-left"
            >
              <Edit3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{labels.edit}</span>
            </button>
          )}

          {/* Regenerate - Assistant only */}
          {messageRole === "assistant" && onRegenerate && (
            <button
              onClick={() => {
                onRegenerate();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors text-left"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{labels.regenerate}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
