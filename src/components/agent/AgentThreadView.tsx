import { useState, useRef, useEffect } from "react";
import { Bot, User, Pin, PinOff, Copy, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AiResponseRenderer } from "@/components/ai/AiResponseRenderer";

export interface AgentMessage {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  metadata: Record<string, any>;
  is_pinned: boolean;
  created_at: string;
}

interface AgentThreadViewProps {
  messages: AgentMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  rollingSummary: string;
  pinnedContext: Record<string, any>;
  onPinMessage: (messageId: string, isPinned: boolean) => void;
}

export function AgentThreadView({
  messages,
  isLoading,
  isStreaming,
  streamingContent,
  rollingSummary,
  pinnedContext,
  onPinMessage,
}: AgentThreadViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Nusxa olindi!");
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pinnedCount = Object.keys(pinnedContext).length;

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-2/3 ml-auto" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Context Header */}
      {(rollingSummary || pinnedCount > 0) && (
        <div className="border-b px-3 py-2 bg-muted/30">
          <div className="flex items-center gap-2 text-xs">
            {rollingSummary && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] gap-1"
                onClick={() => setShowSummary(!showSummary)}
              >
                <Sparkles className="h-3 w-3" />
                Xulosa
              </Button>
            )}
            {pinnedCount > 0 && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Pin className="h-2.5 w-2.5" />
                {pinnedCount} pinned
              </Badge>
            )}
          </div>
          {showSummary && rollingSummary && (
            <div className="mt-2 p-2 bg-background rounded text-xs text-muted-foreground">
              {rollingSummary}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bot className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Vazifani yozing va ishga tushiring</p>
            <p className="text-xs mt-1">Agent qadam-baqadam bajaradi</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "group flex gap-2",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role !== "user" && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {msg.role === "tool" ? (
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                )}

                <div
                  className={cn(
                    "relative max-w-[80%] rounded-lg px-3 py-2",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : msg.role === "tool"
                      ? "bg-muted/50 border"
                      : "bg-muted",
                    msg.is_pinned && "ring-2 ring-primary/30"
                  )}
                >
                  {msg.is_pinned && (
                    <Pin className="absolute -top-1.5 -right-1.5 h-3 w-3 text-primary" />
                  )}

                  {msg.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  ) : msg.role === "tool" ? (
                    <div className="text-xs">
                      <Badge variant="outline" className="mb-1 text-[10px]">
                        {msg.metadata?.tool || "Tool"}
                      </Badge>
                      <p className="text-muted-foreground line-clamp-3">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                      <AiResponseRenderer content={msg.content} />
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <span className="text-[10px] opacity-60">{formatTime(msg.created_at)}</span>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => handleCopy(msg.content)}
                      >
                        <Copy className="h-2.5 w-2.5" />
                      </Button>
                      {msg.role !== "user" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn("h-5 w-5 p-0", msg.is_pinned && "text-primary")}
                          onClick={() => onPinMessage(msg.id, !msg.is_pinned)}
                        >
                          {msg.is_pinned ? (
                            <PinOff className="h-2.5 w-2.5" />
                          ) : (
                            <Pin className="h-2.5 w-2.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming message */}
            {isStreaming && streamingContent && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary animate-pulse" />
                </div>
                <div className="max-w-[80%] rounded-lg px-3 py-2 bg-muted">
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                    <AiResponseRenderer content={streamingContent} />
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Yozilmoqda...
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
