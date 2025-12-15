import { useRef, useState } from "react";
import { Send, Paperclip, Camera, X, Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PendingAttachments, { type PendingAttachment } from "./PendingAttachments";
import type { CircleMessage } from "./CircleChatMessage";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useHaptics } from "@/hooks/useHaptics";

interface CircleChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (pendingFiles?: PendingAttachment[]) => void;
  replyTo: CircleMessage | null;
  onCancelReply: () => void;
  disabled?: boolean;
  uploading?: boolean;
  language: string;
}

export default function CircleChatInput({
  value,
  onChange,
  onSend,
  replyTo,
  onCancelReply,
  disabled,
  uploading,
  language,
}: CircleChatInputProps) {
  const { t } = useTranslation();
  const { lightTap, mediumTap } = useHaptics();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAttachments: PendingAttachment[] = Array.from(e.target.files).map((file, idx) => {
        const id = `pending-${Date.now()}-${idx}`;
        const isImage = file.type.startsWith("image/");
        return {
          id,
          file,
          previewUrl: isImage ? URL.createObjectURL(file) : undefined,
          status: "pending" as const,
          progress: 0,
        };
      });
      setPendingAttachments((prev) => [...prev, ...newAttachments]);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.previewUrl) {
        URL.revokeObjectURL(att.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleSend = () => {
    const trimmed = value.trim();
    const hasAttachments = pendingAttachments.length > 0;
    
    if (!trimmed && !hasAttachments) return;
    
    mediumTap();
    
    // Pass pending files to parent for upload
    onSend(hasAttachments ? [...pendingAttachments] : undefined);
    
    // Clear pending attachments after sending
    pendingAttachments.forEach((att) => {
      if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
    });
    setPendingAttachments([]);
  };

  // Push-to-talk handlers (UI only for now)
  const handleMicPointerDown = () => {
    if (disabled || uploading) return;
    
    lightTap();
    recordingTimerRef.current = setTimeout(() => {
      setIsRecording(true);
      mediumTap();
    }, 180);
  };

  const handleMicPointerUp = () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (isRecording) {
      setIsRecording(false);
      lightTap();
      toast.info(t('common.comingSoon'));
    }
  };

  const handleMicPointerCancel = () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const canSend = value.trim().length > 0 || pendingAttachments.length > 0;

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur-md safe-area-bottom">
      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 pt-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50 border-l-2 border-primary">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary">{replyTo.senderName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {replyTo.content?.slice(0, 60) || t('circleChat.imageFile')}
              </p>
            </div>
            <button 
              onClick={() => {
                lightTap();
                onCancelReply();
              }} 
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-secondary active:bg-secondary/80 rounded-xl transition-colors touch-manipulation"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Pending attachments preview */}
      <PendingAttachments
        attachments={pendingAttachments}
        onRemove={handleRemoveAttachment}
        language={language}
      />

      {/* Upload progress indicator */}
      {uploading && (
        <div className="px-4 pt-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">
              {t('circleChat.uploading')}
            </span>
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="px-4 pt-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-500 font-medium">
              {t('circleChat.recording')}
            </span>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex gap-2 items-end">
          {/* Attachment buttons */}
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                lightTap();
                fileInputRef.current?.click();
              }}
              disabled={disabled || uploading}
              className={cn(
                "w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 active:scale-95 transition-all duration-200 touch-manipulation",
                (disabled || uploading) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => {
                lightTap();
                cameraInputRef.current?.click();
              }}
              disabled={disabled || uploading}
              className={cn(
                "w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 active:scale-95 transition-all duration-200 touch-manipulation",
                (disabled || uploading) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Camera className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Text input */}
          <div className="relative flex-1 bahor-no-zoom">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('circleChat.messagePlaceholder')}
              disabled={disabled || uploading}
              rows={1}
              className={cn(
                "w-full px-4 py-2.5 rounded-xl bg-secondary border-none outline-none text-foreground text-base",
                "placeholder:text-muted-foreground resize-none min-h-[44px] max-h-[120px]",
                "focus:ring-1 focus:ring-primary/30 transition-all duration-200",
                (disabled || uploading) && "opacity-50"
              )}
              style={{
                fontSize: '16px',
                height: "auto",
                minHeight: "44px",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 120) + "px";
              }}
            />
          </div>

          {/* Mic button (push-to-talk) */}
          <button
            onPointerDown={handleMicPointerDown}
            onPointerUp={handleMicPointerUp}
            onPointerCancel={handleMicPointerCancel}
            onPointerLeave={handleMicPointerCancel}
            disabled={disabled || uploading}
            className={cn(
              "w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all duration-200 touch-none select-none touch-manipulation",
              isRecording 
                ? "bg-red-500 text-white scale-110 shadow-lg shadow-red-500/30" 
                : "bg-secondary hover:bg-secondary/80 active:scale-95",
              (disabled || uploading) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Mic className={cn("w-5 h-5", isRecording ? "text-white" : "text-muted-foreground")} />
          </button>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={!canSend || disabled || uploading}
            size="icon"
            className="rounded-xl h-11 w-11 min-w-[44px] min-h-[44px] transition-all duration-200 active:scale-95"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
