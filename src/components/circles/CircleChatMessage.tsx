import { useState, useRef, useCallback } from "react";
import { Sparkles, Reply, Copy, Trash2, Check, CheckCheck, MoreVertical, Image as ImageIcon, FileText, AlertCircle, Download, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHaptics } from "@/hooks/useHaptics";
import { useTranslation } from "@/i18n/LanguageProvider";
import { AiResponseRenderer } from "@/components/ai/AiResponseRenderer";
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

export interface CircleMessageAttachment {
  path: string;
  mime: string;
  name: string;
  size: number;
  width?: number;
  height?: number;
  signedUrl?: string;
}

export interface CircleMessage {
  id: string;
  sender_id: string;
  content: string | null;
  type: string;
  created_at: string;
  reply_to_id: string | null;
  attachments: CircleMessageAttachment[] | null;
  client_id: string | null;
  deleted_at: string | null;
  senderName?: string;
  senderAvatar?: string;
  replyToMessage?: CircleMessage | null;
  readCount?: number;
  status?: "sending" | "sent" | "read" | "failed";
}

// Type aliases for backward compatibility in hooks
export type SpaceMessage = CircleMessage;
export type SpaceMessageAttachment = CircleMessageAttachment;

interface CircleChatMessageProps {
  message: CircleMessage;
  onReply: (message: CircleMessage) => void;
  onDelete: (messageId: string) => void;
  onViewReaders?: (messageId: string) => void;
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

export default function CircleChatMessage({
  message,
  onReply,
  onDelete,
  onViewReaders,
}: CircleChatMessageProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { lightTap, mediumTap } = useHaptics();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Swipe-to-reply state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeThresholdReachedRef = useRef(false);
  const isSwipingRef = useRef(false);
  
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
      lightTap();
      navigator.clipboard.writeText(message.content);
      toast.success(t('circleMessage.copied'));
    }
    setShowActionSheet(false);
  };

  const handleDelete = () => {
    lightTap();
    setShowActionSheet(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    mediumTap();
    onDelete(message.id);
    setShowDeleteConfirm(false);
  };

  const handleReply = () => {
    lightTap();
    setShowActionSheet(false);
    onReply(message);
  };

  // Swipe-to-reply constants
  const SWIPE_THRESHOLD = 60; // px needed to trigger reply
  const MAX_SWIPE = 80; // max visual offset
  
  // Touch handlers for swipe-to-reply
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isSending || isFailed || isDeleted) return;
    
    const touch = e.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    swipeThresholdReachedRef.current = false;
    isSwipingRef.current = false;
  }, [isSending, isFailed, isDeleted]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeStartRef.current || isSending || isFailed || isDeleted) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStartRef.current.x;
    const deltaY = touch.clientY - swipeStartRef.current.y;
    
    // Only allow right swipe, and check if horizontal movement is dominant
    if (!isSwipingRef.current) {
      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isSwipingRef.current = true;
        // Cancel long-press if swiping
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      } else if (Math.abs(deltaY) > 10) {
        // Vertical scroll, cancel swipe detection
        swipeStartRef.current = null;
        return;
      }
    }
    
    if (isSwipingRef.current && deltaX > 0) {
      const offset = Math.min(deltaX, MAX_SWIPE);
      setSwipeOffset(offset);
      
      // Haptic feedback when crossing threshold
      if (offset >= SWIPE_THRESHOLD && !swipeThresholdReachedRef.current) {
        swipeThresholdReachedRef.current = true;
        mediumTap();
      } else if (offset < SWIPE_THRESHOLD && swipeThresholdReachedRef.current) {
        swipeThresholdReachedRef.current = false;
        lightTap();
      }
    }
  }, [isSending, isFailed, isDeleted, lightTap, mediumTap]);
  
  const handleTouchEnd = useCallback(() => {
    if (swipeOffset >= SWIPE_THRESHOLD) {
      onReply(message);
    }
    
    setSwipeOffset(0);
    swipeStartRef.current = null;
    isSwipingRef.current = false;
    swipeThresholdReachedRef.current = false;
  }, [swipeOffset, message, onReply]);
  
  const handleTouchCancel = useCallback(() => {
    setSwipeOffset(0);
    swipeStartRef.current = null;
    isSwipingRef.current = false;
    swipeThresholdReachedRef.current = false;
  }, []);

  // Long-press handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isSending || isFailed || isDeleted) return;
    
    startPosRef.current = { x: e.clientX, y: e.clientY };
    isLongPressRef.current = false;
    
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowActionSheet(true);
      mediumTap();
    }, 400);
  }, [isSending, isFailed, isDeleted, mediumTap]);

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

  // Get signed URL for attachment via edge function (for proper auth)
  const getSignedUrlViaEdge = async (path: string, spaceId: string): Promise<string | null> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return null;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/space-file-signed-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ path, space_id: spaceId }),
        }
      );

      if (!response.ok) return null;
      const data = await response.json();
      return data.signedUrl || null;
    } catch (err) {
      console.error('Error getting signed URL:', err);
      return null;
    }
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
                      className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-secondary transition-colors touch-manipulation"
                      onClick={(e) => e.stopPropagation()}
                      title={t('circleMessage.open')}
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadFile(attachment.signedUrl!, attachment.name);
                      }}
                      className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-secondary transition-colors touch-manipulation"
                      title={t('circleMessage.download')}
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
      ? t('circleMessage.messageDeleted')
      : message.replyToMessage.content?.slice(0, 50) + (message.replyToMessage.content && message.replyToMessage.content.length > 50 ? "..." : "");

    const handleScrollToReply = () => {
      // Find the reply message element and scroll to it
      const replyElement = document.getElementById(`msg-${message.replyToMessage?.id}`);
      if (replyElement) {
        replyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a brief highlight effect
        replyElement.classList.add('ring-2', 'ring-primary/50', 'transition-all');
        setTimeout(() => {
          replyElement.classList.remove('ring-2', 'ring-primary/50');
        }, 1500);
      }
    };

    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          handleScrollToReply();
        }}
        className="text-xs opacity-70 border-l-2 border-primary/50 pl-2 mb-1.5 text-left w-full hover:opacity-100 transition-opacity cursor-pointer"
      >
        <span className="font-medium">{message.replyToMessage.senderName}</span>
        <p className="truncate">{replyContent}</p>
      </button>
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
          {t('circleMessage.messageDeleted')}
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        id={`msg-${message.id}`}
        className={cn(
          "flex group transition-all duration-200 rounded-lg max-w-full relative",
          isAi ? "justify-start" : isOwn ? "justify-end" : "justify-start",
          isSending && "opacity-70"
        )}
        style={{ maxWidth: '100%' }}
      >
        {/* Swipe-to-reply indicator */}
        {swipeOffset > 0 && (
          <div 
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-100",
              swipeOffset >= SWIPE_THRESHOLD ? "text-primary" : "text-muted-foreground"
            )}
            style={{ 
              width: 40,
              opacity: Math.min(swipeOffset / 30, 1),
              transform: `translateY(-50%) scale(${Math.min(0.6 + (swipeOffset / SWIPE_THRESHOLD) * 0.4, 1)})`
            }}
          >
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
              swipeOffset >= SWIPE_THRESHOLD ? "bg-primary/20" : "bg-secondary"
            )}>
              <Reply className="w-4 h-4" />
            </div>
          </div>
        )}
        
        {/* Avatar for others */}
        {!isOwn && !isAi && (
          <div 
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mr-2 flex-shrink-0 mt-1"
            style={{ transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined }}
          >
            {message.senderAvatar ? (
              <img src={message.senderAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                {message.senderName?.charAt(0).toUpperCase() || "U"}
              </span>
            )}
          </div>
        )}

        <div 
          className="flex flex-col min-w-0" 
          style={{ 
            maxWidth: isAi ? "95%" : "85%",
            transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined,
            transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {/* Sender name for others */}
          {!isOwn && !isAi && message.senderName && (
            <span className="text-xs font-medium text-muted-foreground mb-0.5 ml-1">
              {message.senderName}
            </span>
          )}

          {/* AI badge */}
          {isAi && (
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary">Bahor AI</span>
            </div>
          )}

          {/* Message bubble */}
          <div
            className={cn(
              "relative rounded-2xl px-3.5 py-2.5 break-words overflow-hidden",
              isAi
                ? "bg-primary/10 text-foreground"
                : isOwn
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground"
            )}
          >
            {/* Reply preview */}
            {renderReplyPreview()}

            {/* Content */}
            {message.content && (
              isAi ? (
                <AiResponseRenderer 
                  content={message.content} 
                  variant="circle"
                  className={cn(
                    "text-sm leading-relaxed",
                    isOwn && "text-primary-foreground"
                  )}
                />
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              )
            )}

            {/* Attachments */}
            {renderAttachments()}

            {/* Time and status */}
            <div className={cn(
              "flex items-center gap-1.5 mt-1.5 text-[10px]",
              isOwn ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
            )}>
              <span>
                {new Date(message.created_at).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              {renderStatus()}
            </div>
          </div>
        </div>

        {/* 3-dot menu for desktop */}
        {!isSending && !isFailed && !isDeleted && (
          <div className="hidden sm:flex items-center self-center ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"} className="min-w-[140px]">
                <DropdownMenuItem onClick={handleReply}>
                  <Reply className="w-4 h-4 mr-2" />
                  {t('circleMessage.reply')}
                </DropdownMenuItem>
                {message.content && (
                  <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-2" />
                    {t('circleMessage.copy')}
                  </DropdownMenuItem>
                )}
                {isOwn && (
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('common.delete')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Mobile Action Sheet */}
      <Drawer open={showActionSheet} onOpenChange={setShowActionSheet}>
        <DrawerContent className="pb-safe">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{t('circleMessage.actions')}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-1">
            <button
              onClick={handleReply}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary transition-colors touch-manipulation"
            >
              <Reply className="w-5 h-5 text-muted-foreground" />
              <span className="text-base">{t('circleMessage.reply')}</span>
            </button>
            {message.content && (
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary transition-colors touch-manipulation"
              >
                <Copy className="w-5 h-5 text-muted-foreground" />
                <span className="text-base">{t('circleMessage.copy')}</span>
              </button>
            )}
            {isOwn && (
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-destructive/10 text-destructive transition-colors touch-manipulation"
              >
                <Trash2 className="w-5 h-5" />
                <span className="text-base">{t('common.delete')}</span>
              </button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('circleMessage.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('circleMessage.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-transparent border-none">
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-2 right-2 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            ✕
          </button>
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg mx-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}