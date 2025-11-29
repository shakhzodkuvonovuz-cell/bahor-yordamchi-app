import { Message } from "@/types/chat";
import { ExternalLink, FileText } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} chat-message-enter`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "ml-auto bg-primary text-primary-foreground shadow-premium-sm"
            : "mr-auto bg-card border border-border/50 text-card-foreground shadow-premium-sm"
        }`}
      >
        {!isUser && (
          <span className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-[0.12em]">
            Bahor AI
          </span>
        )}
        
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 space-y-2">
            {message.attachments.map((attachment) => (
              <div key={attachment.id} className="rounded-xl overflow-hidden">
                {attachment.type.startsWith("image/") && attachment.url ? (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="max-w-full h-auto rounded-xl hover:opacity-90 transition"
                    />
                  </a>
                ) : (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 p-2.5 rounded-xl transition ${
                      isUser
                        ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    <FileText className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.name}
                      </p>
                      <p className={`text-xs ${isUser ? "opacity-70" : "text-muted-foreground"}`}>
                        {(attachment.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <ExternalLink className={`w-4 h-4 flex-shrink-0 ${isUser ? "opacity-70" : "text-muted-foreground"}`} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        
        {message.content && (
          <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words [&_pre]:mt-2 [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:text-foreground [&_pre]:text-[13px] [&_pre]:p-3 [&_pre]:overflow-x-auto [&_code]:font-mono">
            {message.content}
          </div>
        )}
        <div
          className={`text-xs mt-1.5 ${
            isUser ? "opacity-70" : "text-muted-foreground"
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString("uz-UZ", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
