/**
 * MarkdownContent - Legacy wrapper around AiResponseRenderer
 * 
 * This file now re-exports the unified AiResponseRenderer for backward compatibility.
 * All markdown rendering is centralized in src/components/ai/AiResponseRenderer.tsx
 */

import { memo } from "react";
import { AiResponseRenderer, type AiResponseRendererProps } from "@/components/ai/AiResponseRenderer";
import type { Citation } from "@/types/chat";

interface MarkdownContentProps {
  content: string;
  className?: string;
  citations?: Citation[];
  onCitationClick?: (index: number) => void;
}

function MarkdownContentComponent({ content, className = "", citations, onCitationClick }: MarkdownContentProps) {
  return (
    <AiResponseRenderer
      content={content}
      className={className}
      citations={citations}
      onCitationClick={onCitationClick}
      variant="chat"
    />
  );
}

// Memoize to prevent re-renders when content hasn't changed
const MarkdownContent = memo(MarkdownContentComponent, (prev, next) => {
  return prev.content === next.content && 
         prev.className === next.className &&
         prev.citations === next.citations;
});

export default MarkdownContent;
