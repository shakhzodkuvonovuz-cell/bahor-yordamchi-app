import { Message } from "@/types/chat";
import { ExternalLink, FileText, User } from "lucide-react";
import bahorLogo from "@/assets/bahor-logo.png";

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
      {/* AI Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-card border border-border/40 flex items-center justify-center mt-0.5 shadow-sm">
          <img src={bahorLogo} alt="Bahor AI" className="w-6 h-6 object-contain" />
        </div>
      )}

      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-md shadow-lg shadow-primary/20"
            : "glass-premium rounded-tl-md"
        }`}
      >
        <div className="px-4 py-3">
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
                        className="max-w-full h-auto rounded-xl group-hover:opacity-95 transition-opacity"
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
                          : "bg-secondary hover:bg-secondary/80"
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
            <div className={`text-[15px] leading-[1.6] whitespace-pre-wrap break-words [&_pre]:mt-3 [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:text-foreground [&_pre]:text-[13px] [&_pre]:p-4 [&_pre]:overflow-x-auto [&_code]:font-mono [&_code]:text-[13px] ${
              isUser ? "" : "text-card-foreground"
            }`}>
              {message.content}
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <div className="px-4 pb-2.5 -mt-1">
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
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mt-0.5 shadow-lg shadow-primary/20">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}