import { useState, useRef, useEffect, useCallback, memo } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

interface CollapsibleMessageProps {
  content: string;
  maxLines?: number;
  maxChars?: number;
  className?: string;
  children: React.ReactNode;
}

function CollapsibleMessageComponent({
  content,
  maxLines = 10,
  maxChars = 900,
  className = "",
  children,
}: CollapsibleMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldCollapse, setShouldCollapse] = useState(false);
  const [scrollYBeforeExpand, setScrollYBeforeExpand] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { language } = useTranslation();

  // Safely check if content exceeds threshold
  useEffect(() => {
    // Guard against undefined/null content
    if (!content || typeof content !== 'string') {
      setShouldCollapse(false);
      return;
    }

    const checkOverflow = () => {
      // Check character-based overflow first (most reliable)
      const charOverflow = content.length > maxChars;
      
      // Then check DOM-based overflow if ref exists
      if (contentRef.current) {
        const lineHeight = 26;
        const maxHeight = lineHeight * maxLines;
        const actualHeight = contentRef.current.scrollHeight;
        setShouldCollapse(actualHeight > maxHeight || charOverflow);
      } else {
        // Fallback to char-based only
        setShouldCollapse(charOverflow);
      }
    };

    // Initial check
    checkOverflow();
    
    // Delayed check after render
    const timer = setTimeout(checkOverflow, 50);
    return () => clearTimeout(timer);
  }, [content, maxLines, maxChars]);

  // Toggle with scroll position preservation
  const handleToggle = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent any default behavior and propagation
    e.preventDefault();
    e.stopPropagation();

    if (!isExpanded) {
      // Expanding: store current scroll position
      setScrollYBeforeExpand(window.scrollY);
      setIsExpanded(true);
    } else {
      // Collapsing: restore scroll position
      setIsExpanded(false);
      
      if (scrollYBeforeExpand !== null) {
        // Use requestAnimationFrame for smooth restoration
        requestAnimationFrame(() => {
          window.scrollTo({
            top: scrollYBeforeExpand,
            behavior: 'instant'
          });
        });
      }
      setScrollYBeforeExpand(null);
    }
  }, [isExpanded, scrollYBeforeExpand]);

  // Localized labels with safe fallbacks
  const labels = {
    showMore: language === 'uz' ? "Davomini ko'rsatish" : 
              language === 'en' ? "Show more" : 
              language === 'ru' ? "Показать больше" : 
              language === 'tr' ? "Daha fazla göster" : "Show more",
    showLess: language === 'uz' ? "Yopish" : 
              language === 'en' ? "Show less" : 
              language === 'ru' ? "Свернуть" : 
              language === 'tr' ? "Daha az göster" : "Show less",
  };

  // If content is invalid or shouldn't collapse, just render children
  if (!content || !shouldCollapse) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Content container with smooth transition - NO FADE OVERLAY */}
      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height] duration-200 ease-out"
        style={{
          maxHeight: !isExpanded ? `${maxLines * 26}px` : "none",
        }}
      >
        {children}
      </div>

      {/* Expand/Collapse button - simple inline link style */}
      <div className="mt-2">
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors duration-150 active:scale-[0.97] select-none"
          aria-expanded={isExpanded}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
          {isExpanded ? labels.showLess : labels.showMore}
        </button>
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
const CollapsibleMessage = memo(CollapsibleMessageComponent);

export default CollapsibleMessage;
