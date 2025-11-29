import { Message } from "@/types/chat";
import { ExternalLink, FileText, User } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div 
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} ${
        isUser ? "chat-message-user" : "chat-message-ai"
      }`}
    >
      <div
        className={`max-w-[90%] sm:max-w-[80%] rounded-2xl ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm shadow-lg glow-primary-subtle"
            : "bg-card border border-border/40 rounded-tl-sm shadow-md"
        }`}
      >
        {/* AI message header */}
        {!isUser && (
          <div className="px-5 pt-3 pb-1 border-b border-border/20">
            <span className="text-xs font-medium text-primary">Bahor AI</span>
          </div>
        )}

        <div className={isUser ? "px-5 py-4" : "px-5 py-4"}>
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.attachments.map((attachment) => (
                <div key={attachment.id} className="rounded-xl overflow-hidden">
                  {attachment.type.startsWith("image/") && attachment.url ? (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="max-w-full max-h-64 rounded-xl group-hover:opacity-95 transition-opacity"
                      />
                    </a>
                  ) : (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        isUser
                          ? "bg-primary-foreground/10 hover:bg-primary-foreground/15"
                          : "bg-secondary/60 hover:bg-secondary"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isUser ? "bg-primary-foreground/10" : "bg-muted"
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.name}
                        </p>
                        <p className={`text-xs ${isUser ? "opacity-70" : "text-muted-foreground"}`}>
                          {(attachment.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <ExternalLink className={`w-4 h-4 flex-shrink-0 ${isUser ? "opacity-60" : "text-muted-foreground"}`} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {message.content && (
            <div className={`text-[15px] leading-[1.7] whitespace-pre-wrap break-words [&_pre]:mt-3 [&_pre]:rounded-xl [&_pre]:bg-secondary/80 [&_pre]:text-foreground [&_pre]:text-[13px] [&_pre]:p-4 [&_pre]:overflow-x-auto [&_code]:font-mono [&_code]:text-[13px] ${
              isUser ? "" : "text-card-foreground"
            }`}>
              {message.content}
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <div className={`px-5 pb-3 ${isUser ? "" : "border-t border-border/10 pt-2"}`}>
          <span className={`text-[11px] ${isUser ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
            {new Date(message.timestamp).toLocaleTimeString("uz-UZ", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg glow-primary-subtle">
          <User className="w-5 h-5 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
