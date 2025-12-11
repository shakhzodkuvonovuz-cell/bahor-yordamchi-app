import { useRef, useCallback, forwardRef, useImperativeHandle, useMemo, memo } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import ChatMessage from "@/components/ChatMessage";
import { ThinkBar } from "@/components/chat/ThinkBar";
import { ReasonedChip } from "@/components/chat/ReasonedChip";
import { FollowUpSuggestions } from "@/components/chat/FollowUpSuggestions";
import { Message } from "@/types/chat";
import type { MessageTrace, TraceStepData } from "@/types/trace";
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
  // Custom comparison for memoization
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
  // Trace props
  activeTrace: MessageTrace | null;
  liveElapsedMs: number;
  modelPreference: ModelPreference;
  language: string;
  mode?: string;
  onTraceClick: (messageId: string) => void;
  // Image generation
  isGeneratingImage: boolean;
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
    },
    ref
  ) => {
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    useImperativeHandle(ref, () => ({
      scrollToBottom: () => {
        virtuosoRef.current?.scrollToIndex({
          index: "LAST",
          behavior: "smooth",
        });
      },
      scrollToIndex: (index: number) => {
        virtuosoRef.current?.scrollToIndex({
          index,
          behavior: "smooth",
          align: "center",
        });
      },
    }));

    const handleAtBottomChange = useCallback(
      (atBottom: boolean) => {
        onAtBottomStateChange?.(atBottom);
      },
      [onAtBottomStateChange]
    );

    // Add image generation placeholder as virtual item if generating
    const data = useMemo(() => {
      if (isGeneratingImage) {
        return [...messages, { id: "__generating_image__", role: "assistant", content: "", timestamp: new Date() } as Message];
      }
      return messages;
    }, [messages, isGeneratingImage]);

    // Render function for each message
    const itemContent = useCallback(
      (index: number, message: Message) => {
        // Image generation placeholder
        if (message.id === "__generating_image__") {
          return (
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
          );
        }

        const isLastAssistant = message.id === lastAssistantMessageId;
        const isCurrentlyGenerating = isLoading || typing;

        return (
          <MessageItem
            key={message.id}
            message={message}
            isLastAssistant={isLastAssistant}
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
        );
      },
      [
        lastAssistantMessageId,
        typing,
        isLoading,
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
        activeTrace,
        liveElapsedMs,
        modelPreference,
        language,
        mode,
        onTraceClick,
      ]
    );

    return (
      <Virtuoso
        ref={virtuosoRef}
        data={data}
        computeItemKey={(index, msg) => msg.id}
        itemContent={itemContent}
        atBottomStateChange={handleAtBottomChange}
        atBottomThreshold={100}
        followOutput={false}
        overscan={200}
        className="flex-1"
        style={{ 
          height: "100%",
          WebkitOverflowScrolling: "touch",
        }}
        increaseViewportBy={{ top: 400, bottom: 600 }}
        defaultItemHeight={120}
      />
    );
  }
);

VirtualizedMessageList.displayName = "VirtualizedMessageList";

export default VirtualizedMessageList;
