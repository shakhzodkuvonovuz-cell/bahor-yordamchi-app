import { useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import ChatMessage from "@/components/ChatMessage";
import { Message } from "@/types/chat";

interface VirtualizedMessageListProps {
  messages: Message[];
  typing: boolean;
  streamingContent: string;
  lastAssistantMessageId: string | null;
  onEditMessage: (id: string, content: string) => void;
  onReaction: (id: string, reaction: "like" | "dislike" | null) => void;
  onRegenerate: (id: string) => void;
  onExportPdf: (id: string, content: string) => void;
  isMobile: boolean;
  onAtBottomStateChange?: (atBottom: boolean) => void;
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
      streamingContent,
      lastAssistantMessageId,
      onEditMessage,
      onReaction,
      onRegenerate,
      onExportPdf,
      isMobile,
      onAtBottomStateChange,
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

    // Render function for each message
    const itemContent = useCallback(
      (index: number, message: Message) => {
        const isLastAssistant = message.id === lastAssistantMessageId;
        const isStreaming = typing && isLastAssistant;
        const displayContent = isStreaming && streamingContent 
          ? streamingContent 
          : message.content;

        return (
          <div className="px-2 sm:px-4 py-1">
            <ChatMessage
              key={message.id}
              message={{
                ...message,
                content: displayContent,
              }}
              isStreaming={isStreaming}
              onEdit={onEditMessage}
              onReaction={(_, reaction) => onReaction(message.id, reaction)}
              onRegenerate={() => onRegenerate(message.id)}
              onExportPdf={() => {
                const title = message.content.slice(0, 50).replace(/[^a-zA-Z0-9\u0400-\u04FF\s]/g, "");
                onExportPdf(message.id, message.content);
              }}
              isMobile={isMobile}
            />
          </div>
        );
      },
      [
        lastAssistantMessageId,
        typing,
        streamingContent,
        onEditMessage,
        onReaction,
        onRegenerate,
        onExportPdf,
        isMobile,
      ]
    );

    return (
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        itemContent={itemContent}
        atBottomStateChange={handleAtBottomChange}
        atBottomThreshold={100}
        followOutput="smooth"
        overscan={200}
        className="flex-1 overflow-y-auto"
        style={{ 
          height: "100%",
          // iOS smooth scrolling
          WebkitOverflowScrolling: "touch",
        }}
        increaseViewportBy={{ top: 200, bottom: 200 }}
      />
    );
  }
);

VirtualizedMessageList.displayName = "VirtualizedMessageList";

export default VirtualizedMessageList;
