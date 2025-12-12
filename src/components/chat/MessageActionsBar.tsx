import { useState, useEffect, useRef, useCallback } from "react";
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
  Edit3,
  Flag,
  FileDown,
} from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { MicroToast } from "@/components/ui/MicroToast";

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
  onExportPdf?: () => void;
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
  onExportPdf,
}: MessageActionsBarProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isDisabled = isStreaming || isActionLoading;

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
            "h-10 w-10 min-h-[40px] min-w-[40px] p-0 rounded-lg transition-all touch-manipulation",
            reaction === "like" 
              ? "text-primary bg-primary/10 hover:bg-primary/15" 
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          )}
          onClick={() => handleReaction("like")}
          disabled={isDisabled}
          title={t('actions.like')}
        >
          <ThumbsUp className={cn("w-4 h-4", reaction === "like" && "fill-current")} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-10 w-10 min-h-[40px] min-w-[40px] p-0 rounded-lg transition-all touch-manipulation",
            reaction === "dislike" 
              ? "text-destructive bg-destructive/10 hover:bg-destructive/15" 
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          )}
          onClick={() => handleReaction("dislike")}
          disabled={isDisabled}
          title={t('actions.dislike')}
        >
          <ThumbsDown className={cn("w-4 h-4", reaction === "dislike" && "fill-current")} />
        </Button>
      </div>

      <div className="w-px h-5 bg-border/50 mx-1" />

      {/* Copy */}
      <Button
        variant="ghost"
        size="sm"
        className="h-10 min-h-[40px] px-2 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 touch-manipulation"
        onClick={handleCopy}
        disabled={isDisabled}
        title={t('actions.copy')}
      >
        {copied ? (
          <Check className="w-4 h-4 text-primary" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
        <span className="text-xs hidden sm:inline">{copied ? t('actions.copied') : t('actions.copy')}</span>
      </Button>

      {/* Share */}
      <Button
        variant="ghost"
        size="sm"
        className="h-10 min-h-[40px] px-2 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 touch-manipulation"
        onClick={onShare}
        disabled={isDisabled}
        title={t('actions.share')}
      >
        <Share2 className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">{t('actions.share')}</span>
      </Button>

      <div className="w-px h-5 bg-border/50 mx-1" />

      {/* Continue */}
      <Button
        variant="ghost"
        size="sm"
        className="h-10 min-h-[40px] px-2 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 touch-manipulation"
        onClick={onContinue}
        disabled={isDisabled}
        title={t('actions.continue')}
      >
        <ChevronRight className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">{t('actions.continue')}</span>
      </Button>

      {/* Regenerate */}
      <Button
        variant="ghost"
        size="sm"
        className="h-10 min-h-[40px] px-2 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 touch-manipulation"
        onClick={onRegenerate}
        disabled={isDisabled}
        title={t('actions.regenerate')}
      >
        <RefreshCw className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">{t('actions.regenerate')}</span>
      </Button>

      {/* More options (variants) */}
      <Popover open={moreOpen} onOpenChange={setMoreOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 min-h-[40px] min-w-[40px] p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 touch-manipulation"
            disabled={isDisabled}
            title={t('actions.more')}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-1.5" sideOffset={8}>
          <div className="space-y-0.5">
            <button
              onClick={() => { onVariant("shorter"); setMoreOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-3 min-h-[44px] rounded-lg hover:bg-secondary/60 transition-colors text-left touch-manipulation"
              disabled={isDisabled}
            >
              <Minimize2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{t('actions.shorter')}</span>
            </button>
            <button
              onClick={() => { onVariant("longer"); setMoreOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-3 min-h-[44px] rounded-lg hover:bg-secondary/60 transition-colors text-left touch-manipulation"
              disabled={isDisabled}
            >
              <Maximize2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{t('actions.longer')}</span>
            </button>
            <button
              onClick={() => { onVariant("simplify"); setMoreOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-3 min-h-[44px] rounded-lg hover:bg-secondary/60 transition-colors text-left touch-manipulation"
              disabled={isDisabled}
            >
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{t('actions.simplify')}</span>
            </button>
            <button
              onClick={() => { onVariant("detailed"); setMoreOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-3 min-h-[44px] rounded-lg hover:bg-secondary/60 transition-colors text-left touch-manipulation"
              disabled={isDisabled}
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{t('actions.detailed')}</span>
            </button>
            {onExportPdf && (
              <>
                <div className="h-px bg-border/40 my-1.5" />
                <button
                  onClick={() => { onExportPdf(); setMoreOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-3 min-h-[44px] rounded-lg hover:bg-secondary/60 transition-colors text-left touch-manipulation"
                  disabled={isDisabled}
                >
                  <FileDown className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{t('actions.exportPdf')}</span>
                </button>
              </>
            )}
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
  isUserMessage = false,
  onReaction,
  onCopy,
  onShare,
  onContinue,
  onRegenerate,
  onVariant,
  onEdit,
  onReport,
  onExportPdf,
}: {
  isOpen: boolean;
  onClose: () => void;
  reaction?: "like" | "dislike" | null;
  isDisabled?: boolean;
  isUserMessage?: boolean;
  onReaction: (reaction: "like" | "dislike" | null) => void;
  onCopy: () => void;
  onShare: () => void;
  onContinue: () => void;
  onRegenerate: () => void;
  onVariant: (variant: MessageVariant) => void;
  onEdit?: () => void;
  onReport?: () => void;
  onExportPdf?: () => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ msg: string; variant: "success" | "error" | "info"; visible: boolean }>({
    msg: "",
    variant: "success",
    visible: false,
  });
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string, variant: "success" | "error" | "info" = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ msg, variant, visible: true });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 1200);
  }, []);

  // Haptic on open
  useEffect(() => {
    if (isOpen) {
      haptic("selection");
    }
  }, [isOpen]);

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

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const closeWithDelay = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  const handleCopy = () => {
    haptic("light");
    try {
      onCopy();
      setCopied(true);
      showToast(t('actions.copied') + ' ✓', "success");
      setTimeout(() => setCopied(false), 1500);
      closeWithDelay();
    } catch {
      haptic("error");
      showToast(t('actions.error'), "error");
    }
  };

  const handleReaction = (type: "like" | "dislike") => {
    haptic("light");
    if (reaction === type) {
      onReaction(null);
    } else {
      onReaction(type);
      showToast(type === "like" ? t('actions.liked') : t('actions.disliked'), "success");
    }
    closeWithDelay();
  };

  const handleShare = () => {
    haptic("light");
    try {
      onShare();
      showToast(t('actions.shareReady') + ' ✓', "success");
      closeWithDelay();
    } catch {
      haptic("error");
      showToast(t('actions.error'), "error");
    }
  };

  const handleContinue = () => {
    haptic("light");
    onContinue();
    showToast(t('actions.continued'), "success");
    closeWithDelay();
  };

  const handleRegenerate = () => {
    haptic("light");
    onRegenerate();
    showToast(t('actions.regenerated'), "success");
    closeWithDelay();
  };

  const handleVariant = (variant: MessageVariant) => {
    haptic("light");
    onVariant(variant);
    const toastMessages: Record<MessageVariant, string> = {
      shorter: t('actions.shortened'),
      longer: t('actions.lengthened'),
      simplify: t('actions.simplified'),
      detailed: t('actions.detailedDone'),
      continue: t('actions.continued'),
      regen: t('actions.regenerated'),
    };
    showToast(toastMessages[variant], "success");
    closeWithDelay();
  };

  const handleEdit = () => {
    haptic("light");
    onEdit?.();
    closeWithDelay();
  };

  const handleReport = () => {
    haptic("light");
    onReport?.();
    closeWithDelay();
  };

  const handleExportPdf = () => {
    haptic("light");
    onExportPdf?.();
    closeWithDelay();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-3xl shadow-2xl animate-slide-in-up safe-area-bottom">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Actions grid */}
        <div className="px-4 pb-6 space-y-2">
          {/* Reaction row */}
          <div className="flex gap-2">
            <button
              onClick={() => handleReaction("like")}
              disabled={isDisabled}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 min-h-[48px] rounded-xl transition-all touch-manipulation",
                reaction === "like"
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary hover:bg-secondary/80 text-foreground"
              )}
            >
              <ThumbsUp className={cn("w-5 h-5", reaction === "like" && "fill-current")} />
              <span className="text-sm font-medium">{t('actions.like')}</span>
            </button>
            <button
              onClick={() => handleReaction("dislike")}
              disabled={isDisabled}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 min-h-[48px] rounded-xl transition-all touch-manipulation",
                reaction === "dislike"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-secondary hover:bg-secondary/80 text-foreground"
              )}
            >
              <ThumbsDown className={cn("w-5 h-5", reaction === "dislike" && "fill-current")} />
              <span className="text-sm font-medium">{t('actions.dislike')}</span>
            </button>
          </div>

          {/* Main actions */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={handleCopy}
              disabled={isDisabled}
              className="flex flex-col items-center gap-1.5 py-3 min-h-[60px] rounded-xl bg-secondary hover:bg-secondary/80 transition-all touch-manipulation"
            >
              {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
              <span className="text-xs">{t('actions.copy')}</span>
            </button>
            <button
              onClick={handleShare}
              disabled={isDisabled}
              className="flex flex-col items-center gap-1.5 py-3 min-h-[60px] rounded-xl bg-secondary hover:bg-secondary/80 transition-all touch-manipulation"
            >
              <Share2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs">{t('actions.share')}</span>
            </button>
            <button
              onClick={handleContinue}
              disabled={isDisabled}
              className="flex flex-col items-center gap-1.5 py-3 min-h-[60px] rounded-xl bg-secondary hover:bg-secondary/80 transition-all touch-manipulation"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs">{t('actions.continue')}</span>
            </button>
            <button
              onClick={handleRegenerate}
              disabled={isDisabled}
              className="flex flex-col items-center gap-1.5 py-3 min-h-[60px] rounded-xl bg-secondary hover:bg-secondary/80 transition-all touch-manipulation"
            >
              <RefreshCw className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs">{t('actions.regenerate')}</span>
            </button>
          </div>

          {/* Variant actions */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleVariant("shorter")}
              disabled={isDisabled}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-all"
            >
              <Minimize2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs">{t('actions.shorter')}</span>
            </button>
            <button
              onClick={() => handleVariant("longer")}
              disabled={isDisabled}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-all"
            >
              <Maximize2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs">{t('actions.longer')}</span>
            </button>
            <button
              onClick={() => handleVariant("simplify")}
              disabled={isDisabled}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-all"
            >
              <Sparkles className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs">{t('actions.simplify')}</span>
            </button>
            <button
              onClick={() => handleVariant("detailed")}
              disabled={isDisabled}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-all"
            >
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs">{t('actions.detailed')}</span>
            </button>
          </div>

          {/* User message actions or assistant actions */}
          {isUserMessage && onEdit && (
            <button
              onClick={handleEdit}
              disabled={isDisabled}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-all"
            >
              <Edit3 className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t('actions.edit')}</span>
            </button>
          )}

          {!isUserMessage && (
            <div className="flex gap-2">
              {onExportPdf && (
                <button
                  onClick={handleExportPdf}
                  disabled={isDisabled}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-all"
                >
                  <FileDown className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('actions.exportPdf')}</span>
                </button>
              )}
              {onReport && (
                <button
                  onClick={handleReport}
                  disabled={isDisabled}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-all"
                >
                  <Flag className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('actions.report')}</span>
                </button>
              )}
            </div>
          )}

          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-muted/50 hover:bg-muted transition-all text-muted-foreground"
          >
            {t('actions.cancel')}
          </button>
        </div>
      </div>

      {/* Micro toast */}
      <MicroToast message={toast.msg} variant={toast.variant} visible={toast.visible} />
    </>
  );
}
