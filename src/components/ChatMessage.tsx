import { useState, useRef } from "react";
import { Message } from "@/types/chat";
import { ExternalLink, FileText, User } from "lucide-react";
import { MessageActionsPopover } from "@/components/chat/MessageActions";
import BahorCard, { parseMessageForCards, hasCardContent } from "@/components/chat/BahorCard";
import { CollapsibleMessage } from "@/components/chat";
import { formatAssistantText } from "@/lib/formatAssistant";
import bahorLogo from "@/assets/bahor-logo.png";

interface ChatMessageProps {
  message: Message;
  onCopy?: (content: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  showActions?: boolean;
  isMobile?: boolean;
  onLongPress?: (messageId: string) => void;
}

export default function ChatMessage({
  message,
  onCopy,
  onEdit,
  onRegenerate,
  showActions = true,
  isMobile = false,
  onLongPress,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  // Parse message for Bahor Cards (only for AI messages)
  const hasCards = !isUser && hasCardContent(message.content);
  const parsedSections = hasCards ? parseMessageForCards(message.content) : null;

  const handleTouchStart = () => {
    if (isMobile && onLongPress) {
      setIsPressed(true);
      longPressTimer.current = setTimeout(() => {
        onLongPress(message.id);
        setIsPressed(false);
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCopy = () => {
    onCopy?.(message.content);
  };

  const handleEdit = () => {
    onEdit?.(message.id, message.content);
  };

  const handleRegenerate = () => {
    onRegenerate?.(message.id);
  };

  // Format and render content with Bahor Cards
  const renderContent = () => {
    // Apply formatter to assistant messages
    const displayContent = isUser ? message.content : formatAssistantText(message.content, 'uz');
    
    if (!parsedSections) {
      const contentElement = (
        <div
          className={`text-[15px] leading-[1.75] whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word] [&_pre]:mt-3 [&_pre]:rounded-xl [&_pre]:bg-secondary/80 [&_pre]:text-foreground [&_pre]:text-[13px] [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:font-mono [&_code]:text-[13px] [&_a]:text-primary [&_a]:underline [&_a]:break-all ${
            isUser ? "" : "text-card-foreground"
          }`}
        >
          {displayContent}
        </div>
      );
      
      // Wrap long assistant messages in CollapsibleMessage
      if (!isUser && displayContent.length > 900) {
        return (
          <CollapsibleMessage content={displayContent} maxLines={12} maxChars={900}>
            {contentElement}
          </CollapsibleMessage>
        );
      }
      
      return contentElement;
    }

    return (
      <div className="space-y-1">
        {parsedSections.map((section, idx) => {
          if (section.type === "card" && section.cardType) {
            return (
              <BahorCard
                key={idx}
                type={section.cardType}
                title={section.title || ""}
                content={section.content}
                timestamp={message.timestamp}
              />
            );
          }
          return (
            <div
              key={idx}
              className="text-[15px] leading-[1.75] whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word] text-card-foreground"
            >
              {section.content}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} ${
        isUser ? "chat-message-user" : "chat-message-ai"
      } group animate-fade-in`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-card border border-border/40 flex items-center justify-center mt-0.5 shadow-[0_0_12px_rgba(45,212,191,0.3)]">
          <img src={bahorLogo} alt="Bahor AI" className="w-8 h-8 object-contain" />
        </div>
      )}

      <div className="relative max-w-[88%] sm:max-w-[80%] lg:max-w-[75%] min-w-0">
        {/* Desktop actions button - appears on hover */}
        {showActions && !isMobile && (
          <div className={`absolute ${isUser ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"} top-1`}>
            <MessageActionsPopover
              messageRole={message.role}
              onCopy={handleCopy}
              onEdit={isUser ? handleEdit : undefined}
              onRegenerate={!isUser ? handleRegenerate : undefined}
            />
          </div>
        )}

        <div
          className={`rounded-2xl transition-transform duration-150 ${
            isPressed ? "scale-[0.98]" : ""
          } ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-md shadow-lg"
              : "bg-card border border-border/40 rounded-tl-md shadow-[0_2px_8px_-2px_hsl(var(--foreground)/0.06)]"
          }`}
        >
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
                        className="block group/img"
                      >
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="max-w-full max-h-64 rounded-xl group-hover/img:opacity-95 transition-opacity"
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
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isUser ? "bg-primary-foreground/10" : "bg-muted"
                          }`}
                        >
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.name}</p>
                          <p className={`text-xs ${isUser ? "opacity-70" : "text-muted-foreground"}`}>
                            {(attachment.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <ExternalLink
                          className={`w-4 h-4 flex-shrink-0 ${
                            isUser ? "opacity-60" : "text-muted-foreground"
                          }`}
                        />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {message.content && renderContent()}
          </div>

          {/* Timestamp - only show for messages without cards (cards have their own timestamps) */}
          {!hasCards && (
            <div className="px-4 pb-2.5 -mt-1">
              <span
                className={`text-[11px] ${
                  isUser ? "text-primary-foreground/60" : "text-muted-foreground"
                }`}
              >
                {new Date(message.timestamp).toLocaleTimeString("uz-UZ", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mt-0.5 shadow-lg glow-primary-subtle">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
