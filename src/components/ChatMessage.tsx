import { Message } from "@/types/chat";
import { ExternalLink } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} chat-message-enter`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
          isUser
            ? "ml-auto bg-emerald-500 text-white"
            : "mr-auto bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50"
        }`}
      >
        {!isUser && (
          <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-[0.16em]">
            Bahor AI
          </span>
        )}
        
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 space-y-2">
            {message.attachments.map((attachment) => (
              <div key={attachment.id} className="rounded-lg overflow-hidden">
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
                      className="max-w-full h-auto rounded-lg hover:opacity-90 transition"
                    />
                  </a>
                ) : (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 p-2 rounded-lg transition ${
                      isUser
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <div className="text-2xl">📄</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isUser ? "text-white" : "text-slate-900 dark:text-slate-50"
                      }`}>
                        {attachment.name}
                      </p>
                      <p className={`text-xs ${
                        isUser ? "text-emerald-100" : "text-slate-500 dark:text-slate-400"
                      }`}>
                        {(attachment.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <ExternalLink className={`w-4 h-4 flex-shrink-0 ${
                      isUser ? "text-emerald-100" : "text-slate-400 dark:text-slate-500"
                    }`} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        
        {message.content && (
          <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words [&_pre]:mt-2 [&_pre]:rounded-xl [&_pre]:bg-slate-100 dark:[&_pre]:bg-slate-950 [&_pre]:text-slate-900 dark:[&_pre]:text-slate-100 [&_pre]:text-[13px] [&_pre]:p-3 [&_pre]:overflow-x-auto [&_code]:font-mono">
            {message.content}
          </div>
        )}
        <div
          className={`text-xs mt-1.5 ${
            isUser ? "text-white/70" : "text-slate-500 dark:text-slate-400"
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
