import { X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PendingAttachment {
  id: string;
  file: File;
  previewUrl?: string;
  status: "pending" | "uploading" | "done" | "failed";
  progress: number;
  error?: string;
}

interface PendingAttachmentsProps {
  attachments: PendingAttachment[];
  onRemove: (id: string) => void;
  language: string;
}

export default function PendingAttachments({
  attachments,
  onRemove,
  language,
}: PendingAttachmentsProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="px-4 pt-2 max-w-2xl mx-auto">
      <div className="flex flex-wrap gap-2">
        {attachments.map((att) => {
          const isImage = att.file.type.startsWith("image/");
          const isUploading = att.status === "uploading";
          const isFailed = att.status === "failed";

          return (
            <div
              key={att.id}
              className={cn(
                "relative group flex items-center gap-2 p-2 rounded-xl border transition-all",
                isFailed
                  ? "bg-destructive/10 border-destructive/30"
                  : "bg-secondary/50 border-border/50"
              )}
            >
              {/* Preview */}
              {isImage && att.previewUrl ? (
                <img
                  src={att.previewUrl}
                  alt={att.file.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  {isImage ? (
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              )}

              {/* File info */}
              <div className="flex-1 min-w-0 max-w-[120px]">
                <p className="text-xs font-medium truncate">{att.file.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(att.file.size / 1024).toFixed(0)} KB
                  {isUploading && ` • ${att.progress}%`}
                </p>
                {isFailed && att.error && (
                  <p className="text-[10px] text-destructive truncate">{att.error}</p>
                )}
              </div>

              {/* Status indicator */}
              {isUploading && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}

              {/* Remove button */}
              {!isUploading && (
                <button
                  onClick={() => onRemove(att.id)}
                  className="p-1 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
