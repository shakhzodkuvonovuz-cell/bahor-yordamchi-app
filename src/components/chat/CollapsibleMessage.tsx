import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

interface CollapsibleMessageProps {
  content: string;
  maxLines?: number;
  maxChars?: number;
  className?: string;
  children: React.ReactNode;
}

export default function CollapsibleMessage({
  content,
  maxLines = 12,
  maxChars = 900,
  className = "",
  children,
}: CollapsibleMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldCollapse, setShouldCollapse] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { language } = useTranslation();

  // Check if content exceeds threshold
  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        const lineHeight = 26; // Match the leading-[1.7] at 15px
        const maxHeight = lineHeight * maxLines;
        const actualHeight = contentRef.current.scrollHeight;
        const charOverflow = content.length > maxChars;
        
        setShouldCollapse(actualHeight > maxHeight || charOverflow);
      }
    };

    // Check on mount and after content renders
    checkOverflow();
    const timer = setTimeout(checkOverflow, 100);
    return () => clearTimeout(timer);
  }, [content, maxLines, maxChars]);

  const collapsedHeight = maxLines * 26;

  // Toggle with scroll position preservation
  const handleToggle = useCallback(() => {
    const wasAtBottom = containerRef.current && 
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
    
    setIsExpanded(prev => !prev);

    // If collapsing and user was at bottom, keep them at bottom
    if (isExpanded && wasAtBottom) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [isExpanded]);

  const labels = {
    showMore: language === 'uz' ? "Davomini ko'rsatish" : 
              language === 'en' ? "Show more" : 
              language === 'ru' ? "Показать больше" : "Daha fazla göster",
    showLess: language === 'uz' ? "Yopish" : 
              language === 'en' ? "Show less" : 
              language === 'ru' ? "Свернуть" : "Daha az göster",
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
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
          <div 
            className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, hsl(var(--card)) 0%, hsl(var(--card) / 0.8) 40%, transparent 100%)'
            }}
          />
        )}
      </div>

      {/* Expand/Collapse button */}
      {shouldCollapse && (
        <div className={`${!isExpanded ? "-mt-2 relative z-10" : "mt-2"}`}>
          <button
            onClick={handleToggle}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg transition-all duration-200 active:scale-[0.97]"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
            {isExpanded ? labels.showLess : labels.showMore}
          </button>
        </div>
      )}
    </div>
  );
}
