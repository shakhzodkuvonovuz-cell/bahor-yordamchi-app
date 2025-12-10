import { useState, useRef, memo } from "react";
import { Message } from "@/types/chat";
import { ExternalLink, FileText, Download } from "lucide-react";
import { MessageActionsPopover } from "@/components/chat/MessageActions";
import { MessageActionsBar, MessageActionsSheet, MessageVariant } from "@/components/chat/MessageActionsBar";
import BahorCard, { parseMessageForCards, hasCardContent } from "@/components/chat/BahorCard";
import { CollapsibleMessage, OutputFormatButtons } from "@/components/chat";
import { formatAssistantText } from "@/lib/formatAssistant";
import { track } from "@/lib/analytics";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import MarkdownContent from "@/components/chat/MarkdownContent";
import { SourcesList } from "@/components/chat/SourcesList";
import { useAuth } from "@/contexts/AuthContext";

interface ChatMessageProps {
  message: Message;
  onCopy?: (content: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onReaction?: (messageId: string, reaction: "like" | "dislike" | null) => void;
  onShare?: (content: string) => void;
  onContinue?: (messageId: string) => void;
  onVariant?: (messageId: string, variant: MessageVariant) => void;
  onFormatRequest?: (prompt: string) => void;
  onExportPdf?: (messageId: string, content: string) => void;
  showActions?: boolean;
  showActionBar?: boolean;
  isStreaming?: boolean;
  isActionLoading?: boolean;
  isMobile?: boolean;
}

function ChatMessageComponent({
  message,
  onCopy,
  onEdit,
  onRegenerate,
  onReaction,
  onShare,
  onContinue,
  onVariant,
  onFormatRequest,
  onExportPdf,
  showActions = true,
  showActionBar = true,
  isStreaming = false,
  isActionLoading = false,
  isMobile = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const { profile } = useAuth();
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [highlightedCitation, setHighlightedCitation] = useState<number | null>(null);

  // Handle citation click - scroll to and highlight source
  const handleCitationClick = (index: number) => {
    setHighlightedCitation(index);
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (profile?.full_name) {
      const parts = profile.full_name.split(' ');
      return parts.length > 1 
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : parts[0][0].toUpperCase();
    }
    if (profile?.email) {
      return profile.email[0].toUpperCase();
    }
    return "U";
  };

  // Parse message for Bahor Cards (only for AI messages)
  const hasCards = !isUser && hasCardContent(message.content);
  const parsedSections = hasCards ? parseMessageForCards(message.content) : null;

  const handleTouchStart = () => {
    if (isMobile) {
      setIsPressed(true);
      longPressTimer.current = setTimeout(() => {
        setShowMobileSheet(true);
        setIsPressed(false);
      }, 400);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    // Cancel long-press if user scrolls
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      setIsPressed(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMobile) {
      setShowMobileSheet(true);
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

  const handleFormatRequest = (prompt: string) => {
    track("format_button_clicked", { format: prompt.split(" ")[2] });
    onFormatRequest?.(prompt);
  };

  const handleExportPdf = () => {
    onExportPdf?.(message.id, message.content);
  };

  // Render attachments with clean inline card styling (no Telegram bubbles)
  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <div className={`space-y-2 ${message.content ? (isUser ? "mb-3" : "mb-4") : ""}`}>
        {message.attachments.map((attachment) => (
          <div key={attachment.id} className="rounded-xl overflow-hidden">
            {attachment.type.startsWith("image/") && attachment.url ? (
              <div className="relative group/img">
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="max-w-full max-h-72 rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => setLightboxImage(attachment.url!)}
                  onError={(e) => {
                    console.error('[ChatMessage] Image failed to load:', attachment.url);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity">
                  <button
                    onClick={() => setLightboxImage(attachment.url!)}
                    className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                    title="View fullscreen"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        const response = await fetch(attachment.url!);
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = attachment.name || 'image.png';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(blobUrl);
                      } catch (err) {
                        console.error('Download error:', err);
                        window.open(attachment.url, '_blank');
                      }
                    }}
                    className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary/70 border border-border/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              </a>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Format and render content with Bahor Cards
  const renderContent = () => {
    // Apply formatter to assistant messages
    const displayContent = isUser ? message.content : formatAssistantText(message.content, 'uz');
    
    if (!parsedSections) {
      // User messages: plain text with simple styling (no markdown parsing needed)
      if (isUser) {
        const contentElement = (
          <div className="text-[15px] leading-7 tracking-[0.01em] whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word] text-primary-foreground">
            {displayContent}
          </div>
        );
        return contentElement;
      }
      
      // AI messages: render with full Markdown support
      const contentElement = (
        <MarkdownContent 
          content={displayContent} 
          className="text-foreground"
          citations={message.citations}
          onCitationClick={handleCitationClick}
        />
      );
      
      // Wrap long assistant messages in CollapsibleMessage
      if (displayContent.length > 900) {
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
          // Use MarkdownContent for card text sections too
          return (
            <MarkdownContent
              key={idx}
              content={section.content}
              className="text-foreground"
              citations={message.citations}
              onCitationClick={handleCitationClick}
            />
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* User message: right-aligned bubble with avatar */}
      {isUser ? (
        <div
          className="flex justify-end items-end gap-2 group animate-fade-in chat-message-user"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          <div className="relative max-w-[80%] sm:max-w-[70%] lg:max-w-[60%] min-w-0">
            {/* Desktop actions button - appears on hover */}
            {showActions && !isMobile && (
              <div className="absolute left-0 -translate-x-full pr-2 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <MessageActionsPopover
                  messageRole={message.role}
                  onCopy={handleCopy}
                  onEdit={handleEdit}
                />
              </div>
            )}

            <div
              className={`rounded-2xl rounded-tr-md bg-primary text-primary-foreground shadow-md transition-transform duration-150 no-ios-callout ${
                isPressed ? "scale-[0.98]" : ""
              }`}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="px-4 py-3">
                {renderAttachments()}
                {message.content && renderContent()}
              </div>

              {/* Timestamp */}
              {!hasCards && (
                <div className="px-4 pb-2 -mt-1">
                  <span className="text-[11px] text-primary-foreground/60">
                    {new Date(message.timestamp).toLocaleTimeString("uz-UZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* User avatar */}
          <Avatar className="w-7 h-7 flex-shrink-0 mb-1">
            <AvatarImage src={profile?.avatar_url || undefined} alt="User" />
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
        </div>
      ) : (
        /* AI message: full-width, no bubble, blends with background */
        <div
          className="flex justify-start group animate-fade-in chat-message-ai"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          <div className="relative w-full max-w-none min-w-0">
            <div
              className={`transition-transform duration-150 no-ios-callout ${
                isPressed ? "scale-[0.99]" : ""
              }`}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="py-3">
                {renderAttachments()}
                {message.content && renderContent()}
                
                {/* Sources/Citations section for web search results */}
                {message.citations && message.citations.length > 0 && (
                  <SourcesList 
                    citations={message.citations} 
                    highlightedIndex={highlightedCitation}
                    onHighlightClear={() => setHighlightedCitation(null)}
                  />
                )}
              </div>

              {/* Timestamp for AI - subtle, inline */}
              {!hasCards && (
                <div className="-mt-1 mb-1">
                  <span className="text-[11px] text-muted-foreground/60">
                    {new Date(message.timestamp).toLocaleTimeString("uz-UZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Action bar for assistant messages (desktop only) */}
            {showActionBar && !isMobile && (
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
                onExportPdf={onExportPdf ? handleExportPdf : undefined}
              />
            )}

            {/* Output Format Buttons for assistant messages */}
            {showActionBar && !isStreaming && onFormatRequest && (
              <OutputFormatButtons
                onFormatRequest={handleFormatRequest}
                disabled={isActionLoading}
              />
            )}

            {/* Variant label if this is a variant message */}
            {message.meta?.variant && (
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
        </div>
      )}

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
          onExportPdf={!isUser && onExportPdf ? handleExportPdf : undefined}
        />
      )}

      {/* Image Lightbox with pinch/zoom/pan */}
      <ImageLightbox
        imageUrl={lightboxImage}
        alt="Attachment"
        onClose={() => setLightboxImage(null)}
      />
    </>
  );
}

// Memoize to prevent unnecessary re-renders in message list
const ChatMessage = memo(ChatMessageComponent, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.reaction === nextProps.message.reaction &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.isActionLoading === nextProps.isActionLoading &&
    prevProps.showActions === nextProps.showActions &&
    prevProps.showActionBar === nextProps.showActionBar
  );
});

export default ChatMessage;
