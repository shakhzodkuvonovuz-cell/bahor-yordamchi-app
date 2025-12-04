import { useState, useEffect } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share2,
  RefreshCw,
  ChevronRight,
  Minimize2,
  Maximize2,
  Sparkles,
  FileText,
  MoreHorizontal,
  Check,
  X,
} from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type MessageVariant = "shorter" | "longer" | "simplify" | "detailed" | "continue" | "regen";

export interface MessageActionsBarProps {
  messageId: string;
  messageContent: string;
  reaction?: "like" | "dislike" | null;
  isStreaming?: boolean;
  isActionLoading?: boolean;
  onReaction: (reaction: "like" | "dislike" | null) => void;
  onCopy: () => void;
  onShare: () => void;
  onContinue: () => void;
  onRegenerate: () => void;
  onVariant: (variant: MessageVariant) => void;
}

export function MessageActionsBar({
  reaction,
  isStreaming = false,
  isActionLoading = false,
  onReaction,
  onCopy,
  onShare,
  onContinue,
  onRegenerate,
  onVariant,
}: MessageActionsBarProps) {
  const { language } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isDisabled = isStreaming || isActionLoading;

  const labels = {
    like: language === "uz" ? "Yoqdi" : language === "ru" ? "Нравится" : language === "tr" ? "Beğen" : "Like",
    dislike: language === "uz" ? "Yoqmadi" : language === "ru" ? "Не нравится" : language === "tr" ? "Beğenme" : "Dislike",
    copy: language === "uz" ? "Nusxa olish" : language === "ru" ? "Копировать" : language === "tr" ? "Kopyala" : "Copy",
    copied: language === "uz" ? "Nusxa olindi" : language === "ru" ? "Скопировано" : language === "tr" ? "Kopyalandı" : "Copied",
    share: language === "uz" ? "Ulashish" : language === "ru" ? "Поделиться" : language === "tr" ? "Paylaş" : "Share",
    continue: language === "uz" ? "Davom ettirish" : language === "ru" ? "Продолжить" : language === "tr" ? "Devam et" : "Continue",
    regenerate: language === "uz" ? "Qayta yaratish" : language === "ru" ? "Перегенерировать" : language === "tr" ? "Yeniden oluştur" : "Regenerate",
    shorter: language === "uz" ? "Qisqaroq" : language === "ru" ? "Короче" : language === "tr" ? "Daha kısa" : "Shorter",
    longer: language === "uz" ? "Uzunroq" : language === "ru" ? "Длиннее" : language === "tr" ? "Daha uzun" : "Longer",
    simplify: language === "uz" ? "Soddalash" : language === "ru" ? "Упростить" : language === "tr" ? "Basitleştir" : "Simplify",
    detailed: language === "uz" ? "Batafsil" : language === "ru" ? "Подробнее" : language === "tr" ? "Detaylı" : "More detailed",
    more: language === "uz" ? "Ko'proq" : language === "ru" ? "Ещё" : language === "tr" ? "Daha fazla" : "More",
  };

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleReaction = (type: "like" | "dislike") => {
    if (reaction === type) {
      onReaction(null);
    } else {
      onReaction(type);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-2 -ml-1 flex-wrap">
      {/* Like / Dislike */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 rounded-lg transition-all",
            reaction === "like" 
              ? "text-primary bg-primary/10 hover:bg-primary/15" 
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          )}
          onClick={() => handleReaction("like")}
          disabled={isDisabled}
          title={labels.like}
        >
          <ThumbsUp className={cn("w-4 h-4", reaction === "like" && "fill-current")} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 rounded-lg transition-all",
            reaction === "dislike" 
              ? "text-destructive bg-destructive/10 hover:bg-destructive/15" 
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          )}
          onClick={() => handleReaction("dislike")}
          disabled={isDisabled}
          title={labels.dislike}
        >
          <ThumbsDown className={cn("w-4 h-4", reaction === "dislike" && "fill-current")} />
        </Button>
      </div>

      <div className="w-px h-5 bg-border/50 mx-1" />

      {/* Copy */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        onClick={handleCopy}
        disabled={isDisabled}
        title={labels.copy}
      >
        {copied ? (
          <Check className="w-4 h-4 text-primary" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
        <span className="text-xs hidden sm:inline">{copied ? labels.copied : labels.copy}</span>
      </Button>

      {/* Share */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        onClick={onShare}
        disabled={isDisabled}
        title={labels.share}
      >
        <Share2 className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">{labels.share}</span>
      </Button>

      <div className="w-px h-5 bg-border/50 mx-1" />

      {/* Continue */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        onClick={onContinue}
        disabled={isDisabled}
        title={labels.continue}
      >
        <ChevronRight className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">{labels.continue}</span>
      </Button>

      {/* Regenerate */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        onClick={onRegenerate}
        disabled={isDisabled}
        title={labels.regenerate}
      >
        <RefreshCw className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">{labels.regenerate}</span>
      </Button>

      {/* More options (variants) */}
      <Popover open={moreOpen} onOpenChange={setMoreOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            disabled={isDisabled}
            title={labels.more}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1.5" sideOffset={8}>
          <div className="space-y-0.5">
            <button
              onClick={() => { onVariant("shorter"); setMoreOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-left"
              disabled={isDisabled}
            >
              <Minimize2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{labels.shorter}</span>
            </button>
            <button
              onClick={() => { onVariant("longer"); setMoreOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-left"
              disabled={isDisabled}
            >
              <Maximize2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{labels.longer}</span>
            </button>
            <button
              onClick={() => { onVariant("simplify"); setMoreOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-left"
              disabled={isDisabled}
            >
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{labels.simplify}</span>
            </button>
            <button
              onClick={() => { onVariant("detailed"); setMoreOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-left"
              disabled={isDisabled}
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{labels.detailed}</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Mobile bottom sheet for actions - Single source of truth for mobile actions
export function MessageActionsSheet({
  isOpen,
  onClose,
  reaction,
  isDisabled,
  onReaction,
  onCopy,
  onShare,
  onContinue,
  onRegenerate,
  onVariant,
}: {
  isOpen: boolean;
  onClose: () => void;
  reaction?: "like" | "dislike" | null;
  isDisabled?: boolean;
  onReaction: (reaction: "like" | "dislike" | null) => void;
  onCopy: () => void;
  onShare: () => void;
  onContinue: () => void;
  onRegenerate: () => void;
  onVariant: (variant: MessageVariant) => void;
}) {
  const { language } = useTranslation();
  const [copied, setCopied] = useState(false);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const labels = {
    like: language === "uz" ? "Yoqdi" : language === "ru" ? "Нравится" : language === "tr" ? "Beğen" : "Like",
    dislike: language === "uz" ? "Yoqmadi" : language === "ru" ? "Не нравится" : language === "tr" ? "Beğenme" : "Dislike",
    copy: language === "uz" ? "Nusxa olish" : language === "ru" ? "Копировать" : language === "tr" ? "Kopyala" : "Copy",
    copied: language === "uz" ? "Nusxa olindi" : language === "ru" ? "Скопировано" : language === "tr" ? "Kopyalandı" : "Copied",
    share: language === "uz" ? "Ulashish" : language === "ru" ? "Поделиться" : language === "tr" ? "Paylaş" : "Share",
    continue: language === "uz" ? "Davom ettirish" : language === "ru" ? "Продолжить" : language === "tr" ? "Devam et" : "Continue",
    regenerate: language === "uz" ? "Qayta yaratish" : language === "ru" ? "Перегенерировать" : language === "tr" ? "Yeniden oluştur" : "Regenerate",
    shorter: language === "uz" ? "Qisqaroq" : language === "ru" ? "Короче" : language === "tr" ? "Daha kısa" : "Shorter",
    longer: language === "uz" ? "Uzunroq" : language === "ru" ? "Длиннее" : language === "tr" ? "Daha uzun" : "Longer",
    simplify: language === "uz" ? "Soddalash" : language === "ru" ? "Упростить" : language === "tr" ? "Basitleştir" : "Simplify",
    detailed: language === "uz" ? "Batafsil" : language === "ru" ? "Подробнее" : language === "tr" ? "Detaylı" : "More detailed",
    cancel: language === "uz" ? "Bekor qilish" : language === "ru" ? "Отмена" : language === "tr" ? "İptal" : "Cancel",
  };

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 800);
  };

  const handleReaction = (type: "like" | "dislike") => {
    if (reaction === type) {
      onReaction(null);
    } else {
      onReaction(type);
    }
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleClose();
        }}
      />
      {/* Bottom Sheet */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
        onTouchMove={(e) => {
          // Allow swipe down to close
          const touch = e.touches[0];
          if (touch && touch.clientY > window.innerHeight - 100) {
            handleClose();
          }
        }}
      >
        <div className="bg-card border-t border-border/40 rounded-t-3xl shadow-2xl p-4 pb-8 safe-area-bottom">
          <div 
            className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4 cursor-pointer" 
            onClick={handleClose}
          />

          {/* Quick reactions row */}
          <div className="flex items-center justify-center gap-4 mb-4 pb-4 border-b border-border/40">
            <button
              onClick={() => handleReaction("like")}
              disabled={isDisabled}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors",
                reaction === "like" ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}
            >
              <ThumbsUp className={cn("w-6 h-6", reaction === "like" && "fill-current")} />
              <span className="text-xs">{labels.like}</span>
            </button>
            <button
              onClick={() => handleReaction("dislike")}
              disabled={isDisabled}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors",
                reaction === "dislike" ? "bg-destructive/10 text-destructive" : "text-muted-foreground"
              )}
            >
              <ThumbsDown className={cn("w-6 h-6", reaction === "dislike" && "fill-current")} />
              <span className="text-xs">{labels.dislike}</span>
            </button>
          </div>

          <div className="space-y-1">
            {/* Copy */}
            <button
              onClick={handleCopy}
              disabled={isDisabled}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 active:bg-secondary transition-colors"
            >
              {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
              <span className="text-[15px] font-medium">{copied ? labels.copied : labels.copy}</span>
            </button>

            {/* Share */}
            <button
              onClick={() => { onShare(); handleClose(); }}
              disabled={isDisabled}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 active:bg-secondary transition-colors"
            >
              <Share2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-[15px] font-medium">{labels.share}</span>
            </button>

            {/* Continue */}
            <button
              onClick={() => { onContinue(); handleClose(); }}
              disabled={isDisabled}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 active:bg-secondary transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
              <span className="text-[15px] font-medium">{labels.continue}</span>
            </button>

            {/* Regenerate */}
            <button
              onClick={() => { onRegenerate(); handleClose(); }}
              disabled={isDisabled}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 active:bg-secondary transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-muted-foreground" />
              <span className="text-[15px] font-medium">{labels.regenerate}</span>
            </button>

            {/* Divider */}
            <div className="h-px bg-border/40 my-2" />

            {/* Variants */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { onVariant("shorter"); handleClose(); }}
                disabled={isDisabled}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
              >
                <Minimize2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{labels.shorter}</span>
              </button>
              <button
                onClick={() => { onVariant("longer"); handleClose(); }}
                disabled={isDisabled}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
              >
                <Maximize2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{labels.longer}</span>
              </button>
              <button
                onClick={() => { onVariant("simplify"); handleClose(); }}
                disabled={isDisabled}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{labels.simplify}</span>
              </button>
              <button
                onClick={() => { onVariant("detailed"); handleClose(); }}
                disabled={isDisabled}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
              >
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{labels.detailed}</span>
              </button>
            </div>

            {/* Cancel */}
            <button
              onClick={handleClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-3 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{labels.cancel}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
