import { useState, useRef, useCallback } from "react";
import { Sparkles, Reply, Copy, Trash2, Check, CheckCheck, MoreVertical, Image as ImageIcon, FileText, AlertCircle, Download, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export interface SpaceMessageAttachment {
  path: string;
  mime: string;
  name: string;
  size: number;
  width?: number;
  height?: number;
  signedUrl?: string;
}

export interface SpaceMessage {
  id: string;
  sender_id: string;
  content: string | null;
  type: string;
  created_at: string;
  reply_to_id: string | null;
  attachments: SpaceMessageAttachment[] | null;
  client_id: string | null;
  deleted_at: string | null;
  senderName?: string;
  senderAvatar?: string;
  replyToMessage?: SpaceMessage | null;
  readCount?: number;
  status?: "sending" | "sent" | "read" | "failed";
}

interface SpaceChatMessageProps {
  message: SpaceMessage;
  onReply: (message: SpaceMessage) => void;
  onDelete: (messageId: string) => void;
  onViewReaders?: (messageId: string) => void;
  language: string;
}

// Helper to download file via blob
async function downloadFile(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    // Fallback: open in new tab
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export default function SpaceChatMessage({
  message,
  onReply,
  onDelete,
  onViewReaders,
  language,
}: SpaceChatMessageProps) {
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Long-press detection
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const isOwn = message.sender_id === user?.id && message.type !== "ai";
  const isAi = message.type === "ai";
  const isDeleted = !!message.deleted_at;
  const isSending = message.status === "sending";
  const isFailed = message.status === "failed";
  const hasAttachments = message.attachments && message.attachments.length > 0;

  // Read count excluding sender
  const readCountExcludingSender = message.readCount || 0;

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast.success(language === "uz" ? "Nusxa olindi" : "Copied");
    }
    setShowActionSheet(false);
  };

  const handleDelete = () => {
    setShowActionSheet(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(message.id);
    setShowDeleteConfirm(false);
  };

  const handleReply = () => {
    setShowActionSheet(false);
    onReply(message);
  };

  // Long-press handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isSending || isFailed || isDeleted) return;
    
    startPosRef.current = { x: e.clientX, y: e.clientY };
    isLongPressRef.current = false;
    
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowActionSheet(true);
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(10);
    }, 400);
  }, [isSending, isFailed, isDeleted]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!longPressTimerRef.current) return;
    
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    
    // Cancel if moved more than 10px
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Get signed URL for attachment
  const getSignedUrl = async (path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("space-chat-files")
      .createSignedUrl(path, 60 * 10); // 10 minutes
    
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  };

  const renderAttachments = () => {
    if (!hasAttachments) return null;

    return (
      <div className="space-y-2 mt-2">
        {message.attachments!.map((attachment, idx) => {
          const isImage = attachment.mime?.startsWith("image/");

          if (isImage) {
            const imgUrl = attachment.signedUrl;
            
            return (
              <div key={idx} className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (imgUrl) setLightboxImage(imgUrl);
                  }}
                  className="block cursor-pointer"
                >
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={attachment.name}
                      className="max-w-full rounded-lg max-h-64 object-cover"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm">{attachment.name}</span>
                    </div>
                  )}
                </button>
              </div>
            );
          }

          // Non-image file card
          return (
            <div
              key={idx}
              className="flex items-center gap-2 p-3 rounded-lg bg-background/50"
              onClick={(e) => e.stopPropagation()}
            >
              <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(attachment.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="flex items-center gap-1">
                {attachment.signedUrl && (
                  <>
                    <a
                      href={attachment.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-secondary transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      title={language === "uz" ? "Ochish" : "Open"}
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadFile(attachment.signedUrl!, attachment.name);
                      }}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors"
                      title={language === "uz" ? "Yuklab olish" : "Download"}
                    >
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderReplyPreview = () => {
    if (!message.replyToMessage) return null;

    const replyContent = message.replyToMessage.deleted_at
      ? language === "uz" ? "Xabar o'chirildi" : "Message deleted"
      : message.replyToMessage.content?.slice(0, 50) + (message.replyToMessage.content && message.replyToMessage.content.length > 50 ? "..." : "");

    return (
      <div className="text-xs opacity-70 border-l-2 border-primary/50 pl-2 mb-1.5">
        <span className="font-medium">{message.replyToMessage.senderName}</span>
        <p className="truncate">{replyContent}</p>
      </div>
    );
  };

  const renderStatus = () => {
    if (!isOwn) return null;

    if (isSending) {
      return <span className="text-[10px] opacity-50 animate-pulse">...</span>;
    }

    if (isFailed) {
      return (
        <span className="text-[10px] text-destructive flex items-center gap-0.5">
          <AlertCircle className="w-3 h-3" />
        </span>
      );
    }

    return (
      <button
        onClick={() => readCountExcludingSender > 0 && onViewReaders?.(message.id)}
        className="inline-flex items-center gap-0.5 text-[10px] opacity-70 hover:opacity-100"
        disabled={readCountExcludingSender === 0}
      >
        {readCountExcludingSender > 0 ? (
          <>
            <CheckCheck className="w-3 h-3 text-primary" />
            <span>({readCountExcludingSender})</span>
          </>
        ) : (
          <Check className="w-3 h-3" />
        )}
      </button>
    );
  };

  if (isDeleted) {
    return (
      <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
        <div className="px-4 py-2 rounded-2xl bg-secondary/50 text-muted-foreground italic text-sm">
          {language === "uz" ? "Xabar o'chirildi" : "Message deleted"}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        "flex group",
        isAi ? "justify-start" : isOwn ? "justify-end" : "justify-start",
        isSending && "opacity-70"
      )}>
        {/* Avatar for others */}
        {!isOwn && !isAi && (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mr-2 flex-shrink-0 mt-1">
            {message.senderAvatar ? (
              <img src={message.senderAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                {message.senderName?.charAt(0).toUpperCase() || "U"}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col max-w-[80%]">
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 relative select-none",
              isAi
                ? "bg-primary/10 border border-primary/20 text-foreground"
                : isOwn
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onContextMenu={(e) => {
              e.preventDefault();
              if (!isSending && !isFailed && !isDeleted) {
                setShowActionSheet(true);
              }
            }}
          >
            {/* AI badge */}
            {isAi && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1">
                <Sparkles className="w-3 h-3" />
                Bahor AI
              </div>
            )}

            {/* Sender name for others */}
            {!isOwn && !isAi && (
              <p className="text-xs font-medium opacity-70 mb-1">
                {message.senderName}
              </p>
            )}

            {/* Reply preview */}
            {renderReplyPreview()}

            {/* Content */}
            {message.content && (
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            )}

            {/* Attachments */}
            {renderAttachments()}

            {/* Time and status */}
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-[10px] opacity-50">
                {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              {renderStatus()}
            </div>
          </div>
        </div>

        {/* Actions dropdown - visible on hover (desktop) */}
        {!isSending && !isFailed && (
          <div className="opacity-50 group-hover:opacity-100 transition-opacity ml-1 self-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-secondary flex items-center justify-center">
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"}>
                {message.content && (
                  <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-2" />
                    {language === "uz" ? "Nusxa olish" : "Copy"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onReply(message)}>
                  <Reply className="w-4 h-4 mr-2" />
                  {language === "uz" ? "Javob berish" : "Reply"}
                </DropdownMenuItem>
                {isOwn && (
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {language === "uz" ? "O'chirish" : "Delete"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Mobile action sheet (long-press) */}
      <Drawer open={showActionSheet} onOpenChange={setShowActionSheet}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{language === "uz" ? "Amallar" : "Actions"}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-2 pb-8">
            <button
              onClick={handleReply}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Reply className="w-5 h-5 text-muted-foreground" />
              <span>{language === "uz" ? "Javob berish" : "Reply"}</span>
            </button>
            {message.content && (
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Copy className="w-5 h-5 text-muted-foreground" />
                <span>{language === "uz" ? "Nusxa olish" : "Copy"}</span>
              </button>
            )}
            {isOwn && (
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                <span>{language === "uz" ? "O'chirish" : "Delete"}</span>
              </button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "uz" ? "Xabarni o'chirish" : "Delete message"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "uz"
                ? "Bu xabar barcha a'zolar uchun o'chiriladi."
                : "This message will be deleted for all members."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "uz" ? "Bekor" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              {language === "uz" ? "O'chirish" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/90 border-none">
          {lightboxImage && (
            <div className="relative">
              <img
                src={lightboxImage}
                alt=""
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <a
                  href={lightboxImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <ExternalLink className="w-5 h-5 text-white" />
                </a>
                <button
                  onClick={() => downloadFile(lightboxImage, "image")}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
