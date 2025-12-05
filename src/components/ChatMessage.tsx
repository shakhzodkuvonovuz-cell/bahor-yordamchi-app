import { useState, useCallback } from "react";
import { Message } from "@/types/chat";
import { ExternalLink, FileText, User } from "lucide-react";
import { MessageActionsPopover } from "@/components/chat/MessageActions";
import { MessageActionsBar, MessageActionsSheet, MessageVariant } from "@/components/chat/MessageActionsBar";
import BahorCard, { parseMessageForCards, hasCardContent } from "@/components/chat/BahorCard";
import { CollapsibleMessage } from "@/components/chat";
import { formatAssistantText } from "@/lib/formatAssistant";
import { useIOSLongPressBlocker } from "@/hooks/useIOSLongPressBlocker";
import bahorLogo from "@/assets/bahor-logo.png";

interface ChatMessageProps {
  message: Message;
  onCopy?: (content: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onReaction?: (messageId: string, reaction: "like" | "dislike" | null) => void;
  onShare?: (content: string) => void;
  onContinue?: (messageId: string) => void;
  onVariant?: (messageId: string, variant: MessageVariant) => void;
  showActions?: boolean;
  showActionBar?: boolean;
  isStreaming?: boolean;
  isActionLoading?: boolean;
  isMobile?: boolean;
}

export default function ChatMessage({
  message,
  onCopy,
  onEdit,
  onRegenerate,
  onReaction,
  onShare,
  onContinue,
  onVariant,
  showActions = true,
  showActionBar = true,
  isStreaming = false,
  isActionLoading = false,
  isMobile = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [isPressed, setIsPressed] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);

  // Parse message for Bahor Cards (only for AI messages)
  const hasCards = !isUser && hasCardContent(message.content);
  const parsedSections = hasCards ? parseMessageForCards(message.content) : null;

  // Use native event listener hook for iOS long-press blocking
  const handleLongPress = useCallback(() => {
    setShowMobileSheet(true);
    setIsPressed(false);
  }, []);

  const bubbleRef = useIOSLongPressBlocker<HTMLDivElement>({
    onLongPress: handleLongPress,
    delay: 400,
    moveThreshold: 10,
    disabled: !isMobile,
  });

  const handleCopy = () => {
    onCopy?.(message.content);
  };

  const handleEdit = () => {
    onEdit?.(message.id, message.content);
  };

  const handleRegenerate = () => {
    onRegenerate?.(message.id);
  };

  const handleReaction = (reaction: "like" | "dislike" | null) => {
    onReaction?.(message.id, reaction);
  };

  const handleShare = () => {
    onShare?.(message.content);
  };

  const handleContinue = () => {
    onContinue?.(message.id);
  };

  const handleVariant = (variant: MessageVariant) => {
    onVariant?.(message.id, variant);
  };

  // Format and render content with Bahor Cards
  const renderContent = () => {
    // Apply formatter to assistant messages
    const displayContent = isUser ? message.content : formatAssistantText(message.content, 'uz');
    
    if (!parsedSections) {
      const contentElement = (
        <div
          className={`text-[15px] leading-[1.75] whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word] 
            [&_pre]:mt-3 [&_pre]:rounded-xl [&_pre]:bg-black/30 [&_pre]:border [&_pre]:border-white/10 [&_pre]:text-foreground [&_pre]:text-[13px] [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:max-w-full 
            [&_code]:font-mono [&_code]:text-[13px] [&_code]:bg-black/20 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded
            [&_a]:text-primary [&_a]:underline [&_a]:break-all
            [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2
            [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5
            [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-2 [&_h3]:mb-1
            [&_ul]:my-2 [&_ul]:pl-4 [&_ul]:list-disc
            [&_ol]:my-2 [&_ol]:pl-4 [&_ol]:list-decimal
            [&_li]:my-0.5
            ${isUser ? "text-white/95" : "text-foreground/90"}`}
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
    <>
      <div
        ref={bubbleRef}
        className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} ${
          isUser ? "chat-message-user" : "chat-message-ai"
        } group ${isMobile ? "no-ios-select" : ""}`}
      >
        {/* AI Avatar */}
        {!isUser && (
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center mt-0.5">
            <img src={bahorLogo} alt="Bahor AI" className="w-7 h-7 object-contain" />
          </div>
        )}

        <div className={`relative min-w-0 ${isUser ? "max-w-[85%] sm:max-w-[70%]" : "max-w-[85%] sm:max-w-[75%]"}`}>
          {/* Desktop actions button - appears on hover */}
          {showActions && !isMobile && isUser && (
            <div className="absolute left-0 -translate-x-full pr-2 top-1">
              <MessageActionsPopover
                messageRole={message.role}
                onCopy={handleCopy}
                onEdit={handleEdit}
              />
            </div>
          )}

          <div
            className={`transition-all duration-150 ${
              isPressed ? "scale-[0.98]" : ""
            } ${
              isUser
                ? "bubble-user rounded-2xl rounded-tr-md text-white"
                : "bubble-assistant rounded-2xl rounded-tl-md"
            }`}
          >
            <div className="px-4 py-3.5 sm:px-5 sm:py-4">
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

            {/* Timestamp - smaller, lower contrast */}
            {!hasCards && (
              <div className="px-4 sm:px-5 pb-2.5 -mt-1">
                <span
                  className={`text-[10px] ${
                    isUser ? "text-white/40" : "text-muted-foreground/50"
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

          {/* Action bar for assistant messages (desktop only) */}
          {!isUser && showActionBar && !isMobile && (
            <MessageActionsBar
              messageId={message.id}
              messageContent={message.content}
              reaction={message.reaction}
              isStreaming={isStreaming}
              isActionLoading={isActionLoading}
              onReaction={handleReaction}
              onCopy={handleCopy}
              onShare={handleShare}
              onContinue={handleContinue}
              onRegenerate={handleRegenerate}
              onVariant={handleVariant}
            />
          )}

          {/* Variant label if this is a variant message */}
          {!isUser && message.meta?.variant && (
            <div className="mt-1.5 text-[10px] text-muted-foreground/60 uppercase tracking-wide">
              {message.meta.variant === "regen" ? "Yangi javob" :
               message.meta.variant === "continue" ? "Davomi" :
               message.meta.variant === "shorter" ? "Qisqa versiya" :
               message.meta.variant === "longer" ? "Kengaytirilgan" :
               message.meta.variant === "simplify" ? "Soddalashtirilgan" :
               message.meta.variant === "detailed" ? "Batafsil" : ""}
            </div>
          )}
        </div>

        {/* User Avatar */}
        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary flex items-center justify-center mt-0.5">
            <User className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Mobile action sheet - single source of truth for all messages */}
      {isMobile && (
        <MessageActionsSheet
          isOpen={showMobileSheet}
          onClose={() => setShowMobileSheet(false)}
          reaction={message.reaction}
          isDisabled={isStreaming || isActionLoading}
          isUserMessage={isUser}
          onReaction={handleReaction}
          onCopy={handleCopy}
          onShare={handleShare}
          onContinue={handleContinue}
          onRegenerate={handleRegenerate}
          onVariant={handleVariant}
          onEdit={isUser ? handleEdit : undefined}
        />
      )}
    </>
  );
}
