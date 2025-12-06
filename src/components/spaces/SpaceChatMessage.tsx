import { useState } from "react";
import { Sparkles, Reply, Copy, Trash2, Check, CheckCheck, MoreVertical, Image as ImageIcon, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
  status?: "sending" | "sent" | "read";
}

interface SpaceChatMessageProps {
  message: SpaceMessage;
  onReply: (message: SpaceMessage) => void;
  onDelete: (messageId: string) => void;
  onViewReaders?: (messageId: string) => void;
  language: string;
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

  const isOwn = message.sender_id === user?.id && message.type !== "ai";
  const isAi = message.type === "ai";
  const isDeleted = !!message.deleted_at;
  const hasAttachments = message.attachments && message.attachments.length > 0;

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast.success(language === "uz" ? "Nusxa olindi" : "Copied");
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(message.id);
    setShowDeleteConfirm(false);
  };

  const renderAttachments = () => {
    if (!hasAttachments) return null;

    return (
      <div className="space-y-2 mt-2">
        {message.attachments!.map((attachment, idx) => {
          const isImage = attachment.mime?.startsWith("image/");
          
          if (isImage && attachment.signedUrl) {
            return (
              <a
                key={idx}
                href={attachment.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={attachment.signedUrl}
                  alt={attachment.name}
                  className="max-w-full rounded-lg max-h-64 object-cover"
                />
              </a>
            );
          }

          return (
            <a
              key={idx}
              href={attachment.signedUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
            >
              {isImage ? (
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
              ) : (
                <FileText className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-xs truncate flex-1">{attachment.name}</span>
              <span className="text-xs text-muted-foreground">
                {(attachment.size / 1024).toFixed(1)}KB
              </span>
            </a>
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

  const renderCheckmarks = () => {
    if (!isOwn || message.status === "sending") {
      return message.status === "sending" ? (
        <span className="text-[10px] opacity-50">...</span>
      ) : null;
    }

    const readCount = message.readCount || 0;

    return (
      <button
        onClick={() => readCount > 0 && onViewReaders?.(message.id)}
        className="inline-flex items-center gap-0.5 text-[10px] opacity-70 hover:opacity-100"
      >
        {readCount > 0 ? (
          <>
            <CheckCheck className="w-3 h-3 text-primary" />
            {readCount > 0 && <span>({readCount})</span>}
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
      <div className={cn("flex group", isAi ? "justify-start" : isOwn ? "justify-end" : "justify-start")}>
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
              "rounded-2xl px-4 py-2.5 relative",
              isAi
                ? "bg-primary/10 border border-primary/20 text-foreground"
                : isOwn
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
            )}
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

            {/* Checkmarks for own messages */}
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-[10px] opacity-50">
                {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              {renderCheckmarks()}
            </div>
          </div>
        </div>

        {/* Actions dropdown */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 self-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-secondary">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
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
      </div>

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
    </>
  );
}
