import { useRef } from "react";
import { Send, Paperclip, Camera, X, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SpaceMessage } from "./SpaceChatMessage";

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "failed";
  error?: string;
}

interface SpaceChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  replyTo: SpaceMessage | null;
  onCancelReply: () => void;
  disabled?: boolean;
  uploading?: boolean;
  uploadProgress?: number;
  uploadingFiles?: UploadingFile[];
  onFileSelect: (files: FileList) => void;
  language: string;
}

export default function SpaceChatInput({
  value,
  onChange,
  onSend,
  replyTo,
  onCancelReply,
  disabled,
  uploading,
  uploadProgress,
  uploadingFiles = [],
  onFileSelect,
  language,
}: SpaceChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur-lg shadow-premium-md">
      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 pt-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border-l-2 border-primary">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary">{replyTo.senderName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {replyTo.content?.slice(0, 60) || (language === "uz" ? "Rasm/Fayl" : "Image/File")}
              </p>
            </div>
            <button onClick={onCancelReply} className="p-1 hover:bg-secondary rounded transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Upload progress with per-file status */}
      {uploadingFiles.length > 0 && (
        <div className="px-4 pt-2 max-w-2xl mx-auto space-y-1">
          {uploadingFiles.map((file) => (
            <div
              key={file.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg text-xs",
                file.status === "failed" ? "bg-destructive/10" : "bg-secondary/50"
              )}
            >
              {file.status === "uploading" && (
                <Loader2 className="w-3 h-3 animate-spin text-primary flex-shrink-0" />
              )}
              {file.status === "failed" && (
                <AlertCircle className="w-3 h-3 text-destructive flex-shrink-0" />
              )}
              {file.status === "done" && (
                <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0" />
              )}
              <span className={cn("truncate flex-1", file.status === "failed" && "text-destructive")}>
                {file.name}
              </span>
              {file.status === "uploading" && (
                <span className="text-muted-foreground">{file.progress}%</span>
              )}
              {file.status === "failed" && file.error && (
                <span className="text-destructive text-[10px]">{file.error}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legacy single progress bar */}
      {uploading && uploadingFiles.length === 0 && (
        <div className="px-4 pt-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">
              {language === "uz" ? "Yuklanmoqda..." : "Uploading..."}
              {uploadProgress !== undefined && ` ${uploadProgress}%`}
            </span>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex gap-2 items-end">
          {/* Attachment buttons */}
          <div className="flex gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className={cn(
                "p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-all duration-200 hover:scale-105",
                (disabled || uploading) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled || uploading}
              className={cn(
                "p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-all duration-200 hover:scale-105",
                (disabled || uploading) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Camera className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Text input */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={language === "uz" ? "Xabar yozing... (/bahor savol)" : "Type a message... (/bahor question)"}
            disabled={disabled || uploading}
            rows={1}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-xl bg-secondary border-none outline-none text-foreground",
              "placeholder:text-muted-foreground resize-none min-h-[44px] max-h-[120px]",
              "focus:ring-1 focus:ring-primary/30 transition-all duration-200",
              (disabled || uploading) && "opacity-50"
            )}
            style={{
              height: "auto",
              minHeight: "44px",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 120) + "px";
            }}
          />

          {/* Send button */}
          <Button
            onClick={onSend}
            disabled={(!value.trim() && !uploading) || disabled}
            size="icon"
            className="rounded-xl h-11 w-11 transition-all duration-200 hover:scale-105"
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
