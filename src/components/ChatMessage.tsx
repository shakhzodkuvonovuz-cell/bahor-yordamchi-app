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
            : "mr-auto bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50"
        }`}
      >
        {!isUser && (
          <span className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-[0.16em]">
            Bahor AI
          </span>
        )}
        <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words [&_pre]:mt-2 [&_pre]:rounded-xl [&_pre]:bg-slate-100 dark:[&_pre]:bg-slate-950 [&_pre]:text-slate-900 dark:[&_pre]:text-slate-100 [&_pre]:text-[13px] [&_pre]:p-3 [&_pre]:overflow-x-auto [&_code]:font-mono">
          {message.content}
        </div>
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
