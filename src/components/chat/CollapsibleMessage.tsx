import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CollapsibleMessageProps {
  content: string;
  maxLines?: number;
  className?: string;
  children: React.ReactNode;
}

export default function CollapsibleMessage({
  content,
  maxLines = 14,
  className = "",
  children,
}: CollapsibleMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldCollapse, setShouldCollapse] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Check if content exceeds max lines
  useEffect(() => {
    if (contentRef.current) {
      const lineHeight = 24; // Approximate line height in pixels
      const maxHeight = lineHeight * maxLines;
      setShouldCollapse(contentRef.current.scrollHeight > maxHeight);
    }
  }, [content, maxLines]);

  const collapsedHeight = maxLines * 24; // ~14 lines

  return (
    <div className={`relative ${className}`}>
      <div
        ref={contentRef}
        className={`overflow-hidden transition-[max-height] duration-300 ease-out ${
          !isExpanded && shouldCollapse ? "relative" : ""
        }`}
        style={{
          maxHeight: !isExpanded && shouldCollapse ? `${collapsedHeight}px` : "none",
        }}
      >
        {children}
        
        {/* Gradient fade overlay when collapsed */}
        {!isExpanded && shouldCollapse && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none" />
        )}
      </div>

      {/* Expand/Collapse button */}
      {shouldCollapse && (
        <div className={`${!isExpanded ? "mt-1" : "mt-3"}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={`w-4 h-4 mr-1 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
            {isExpanded ? "Kamroq" : "Ko'proq"}
          </Button>
        </div>
      )}
    </div>
  );
}
