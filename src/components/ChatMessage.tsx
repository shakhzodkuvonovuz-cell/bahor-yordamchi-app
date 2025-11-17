import { Message } from "@/types/chat";

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
            : "mr-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
        }`}
      >
        {!isUser && (
          <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-0.5">
            Bahor AI
          </div>
        )}
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <div
          className={`text-xs mt-1.5 ${
            isUser ? "text-white/70" : "text-slate-400 dark:text-slate-500"
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
