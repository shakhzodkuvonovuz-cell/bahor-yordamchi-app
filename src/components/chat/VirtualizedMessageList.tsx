import { useRef, forwardRef, useImperativeHandle, memo } from "react";
import ChatMessage from "@/components/ChatMessage";
import { ThinkBar } from "@/components/chat/ThinkBar";
import { ReasonedChip } from "@/components/chat/ReasonedChip";
import { FollowUpSuggestions } from "@/components/chat/FollowUpSuggestions";
import { WaitingBubble } from "@/components/chat/WaitingBubble";
import { Message } from "@/types/chat";
import type { MessageTrace } from "@/types/trace";
import type { ModelPreference } from "@/components/ModelToggle";
import bahorLogo from "@/assets/bahor-logo.png";

// Memoized message item to prevent re-renders
const MessageItem = memo(function MessageItem({
  message,
  isLastAssistant,
  isCurrentlyGenerating,
  activeTrace,
  liveElapsedMs,
  modelPreference,
  language,
  mode,
  onTraceClick,
  onCopy,
  onEdit,
  onRegenerate,
  onReaction,
  onShare,
  onContinue,
  onVariant,
  onExportPdf,
  onSendMessage,
  isMobile,
}: {
  message: Message;
  isLastAssistant: boolean;
  isCurrentlyGenerating: boolean;
  activeTrace: MessageTrace | null;
  liveElapsedMs: number;
  modelPreference: ModelPreference;
  language: string;
  mode?: string;
  onTraceClick: (messageId: string) => void;
  onCopy: (content: string) => void;
  onEdit: (id: string, content: string) => void;
  onRegenerate: (id: string) => void;
  onReaction: (id: string, reaction: "like" | "dislike" | null) => void;
  onShare: (content: string) => void;
  onContinue: (id: string) => void;
  onVariant: (id: string, type: string) => void;
  onExportPdf: (id: string, content: string) => void;
  onSendMessage: (message: string) => void;
  isMobile: boolean;
}) {
  const showThinkBar = message.role === 'assistant' && 
                      isLastAssistant && 
                      isCurrentlyGenerating && 
                      !message.trace && 
                      !activeTrace?.isComplete;
  
  const showReasonedChip = message.role === 'assistant' && (
    message.trace || 
    (isLastAssistant && activeTrace?.isComplete)
  );
  
  const showFollowUp = message.role === 'assistant' && 
                      isLastAssistant && 
                      !isCurrentlyGenerating;

  return (
    <div className="px-2 sm:px-4 py-1">
      <ChatMessage
        message={message}
        onCopy={onCopy}
        onEdit={onEdit}
        onRegenerate={onRegenerate}
        onReaction={onReaction}
        onShare={onShare}
        onContinue={onContinue}
        onVariant={onVariant}
        onExportPdf={onExportPdf}
        showActions={!isCurrentlyGenerating}
        showActionBar={!isCurrentlyGenerating}
        isStreaming={isCurrentlyGenerating}
        isMobile={isMobile}
      />
      
      {showThinkBar && (
        <div className="mb-3">
          <ThinkBar
            trace={activeTrace}
            isGenerating={isCurrentlyGenerating}
            language={language}
            elapsedLive={liveElapsedMs}
            modelPreference={modelPreference}
            onExpandClick={() => {
              if (activeTrace?.isComplete) {
                onTraceClick(message.id);
              }
            }}
          />
        </div>
      )}
      
      {showReasonedChip && (
        <div className="flex justify-start mt-2 ml-12">
          <ReasonedChip
            trace={message.trace || (isLastAssistant ? activeTrace : null)}
            isGenerating={false}
            language={language}
            elapsedLive={undefined}
            onClick={() => {
              const traceData = message.trace || (isLastAssistant ? activeTrace : null);
              if (traceData?.isComplete) {
                onTraceClick(message.id);
              }
            }}
          />
        </div>
      )}
      
      {showFollowUp && (
        <FollowUpSuggestions
          onSelect={onSendMessage}
          disabled={isCurrentlyGenerating}
          mode={mode}
        />
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.reaction === next.message.reaction &&
    prev.isLastAssistant === next.isLastAssistant &&
    prev.isCurrentlyGenerating === next.isCurrentlyGenerating &&
    prev.activeTrace?.isComplete === next.activeTrace?.isComplete &&
    prev.language === next.language
  );
});

interface VirtualizedMessageListProps {
  messages: Message[];
  typing: boolean;
  isLoading: boolean;
  lastAssistantMessageId: string | null;
  onCopy: (content: string) => void;
  onEdit: (id: string, content: string) => void;
  onRegenerate: (id: string) => void;
  onReaction: (id: string, reaction: "like" | "dislike" | null) => void;
  onShare: (content: string) => void;
  onContinue: (id: string) => void;
  onVariant: (id: string, type: string) => void;
  onExportPdf: (id: string, content: string) => void;
  onSendMessage: (message: string) => void;
  isMobile: boolean;
  onAtBottomStateChange?: (atBottom: boolean) => void;
  activeTrace: MessageTrace | null;
  liveElapsedMs: number;
  modelPreference: ModelPreference;
  language: string;
  mode?: string;
  onTraceClick: (messageId: string) => void;
  isGeneratingImage: boolean;
  isWaitingForFirstToken?: boolean;
  onCancelRequest?: () => void;
}

export interface VirtualizedMessageListHandle {
  scrollToBottom: () => void;
  scrollToIndex: (index: number) => void;
}

const VirtualizedMessageList = forwardRef<VirtualizedMessageListHandle, VirtualizedMessageListProps>(
  (
    {
      messages,
      typing,
      isLoading,
      lastAssistantMessageId,
      onCopy,
      onEdit,
      onRegenerate,
      onReaction,
      onShare,
      onContinue,
      onVariant,
      onExportPdf,
      onSendMessage,
      isMobile,
      onAtBottomStateChange,
      activeTrace,
      liveElapsedMs,
      modelPreference,
      language,
      mode,
      onTraceClick,
      isGeneratingImage,
      isWaitingForFirstToken,
      onCancelRequest,
    },
    ref
  ) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      scrollToBottom: () => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      },
      scrollToIndex: (index: number) => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const items = container.querySelectorAll('[data-message-index]');
        const target = items[index] as HTMLElement;
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
    }));

    const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollHeight - scrollTop - clientHeight < 100;
      onAtBottomStateChange?.(atBottom);
    };

    const isCurrentlyGenerating = isLoading || typing;

    return (
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ WebkitOverflowScrolling: "touch" }}
        onScroll={handleScroll}
      >
        <div className="flex flex-col py-4">
          {messages.map((message, index) => (
            <div key={message.id} data-message-index={index}>
              <MessageItem
                message={message}
                isLastAssistant={message.id === lastAssistantMessageId}
                isCurrentlyGenerating={isCurrentlyGenerating}
                activeTrace={activeTrace}
                liveElapsedMs={liveElapsedMs}
                modelPreference={modelPreference}
                language={language}
                mode={mode}
                onTraceClick={onTraceClick}
                onCopy={onCopy}
                onEdit={onEdit}
                onRegenerate={onRegenerate}
                onReaction={onReaction}
                onShare={onShare}
                onContinue={onContinue}
                onVariant={onVariant}
                onExportPdf={onExportPdf}
                onSendMessage={onSendMessage}
                isMobile={isMobile}
              />
            </div>
          ))}
          
          {/* Instant waiting bubble - shows immediately when user sends, before first token */}
          {isWaitingForFirstToken && !isGeneratingImage && (
            <WaitingBubble
              language={language}
              onCancel={onCancelRequest}
            />
          )}
          
          {/* Image generation placeholder */}
          {isGeneratingImage && (
            <div className="px-2 sm:px-4 py-1">
              <div className="flex gap-3 justify-start chat-message-ai group animate-fade-in">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-card border border-border/40 flex items-center justify-center mt-0.5 shadow-[0_0_12px_rgba(45,212,191,0.3)]">
                  <img src={bahorLogo} alt="Bahor AI" className="w-8 h-8 object-contain" />
                </div>
                <div className="rounded-2xl bg-card border border-border/40 rounded-tl-md shadow-[0_2px_8px_-2px_hsl(var(--foreground)/0.06)] px-5 py-4">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center animate-pulse">
                      <span className="text-lg">🎨</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {language === "uz" ? "Rasm yaratilmoqda..." :
                         language === "ru" ? "Создание изображения..." :
                         language === "tr" ? "Görsel oluşturuluyor..." :
                         "Generating image..."}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {language === "uz" ? "10-15 soniya..." :
                         language === "ru" ? "10-15 секунд..." :
                         language === "tr" ? "10-15 saniye..." :
                         "10-15 seconds..."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={bottomRef} />
        </div>
      </div>
    );
  }
);

VirtualizedMessageList.displayName = "VirtualizedMessageList";

export default VirtualizedMessageList;
