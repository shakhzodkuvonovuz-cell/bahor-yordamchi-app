import { useState, useCallback, useEffect, useRef } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageProvider";

interface ChatSearchBarProps {
  messages: { id: string; content: string }[];
  onHighlight: (messageId: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatSearchBar({ messages, onHighlight, isOpen, onClose }: ChatSearchBarProps) {
  const { language } = useTranslation();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const placeholder = language === "uz" ? "Qidirish..." : language === "ru" ? "Поиск..." : "Search...";

  // Search logic
  const search = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setMatches([]);
      onHighlight(null);
      return;
    }

    const q = searchQuery.toLowerCase();
    const found = messages
      .filter(m => m.content.toLowerCase().includes(q))
      .map(m => m.id);

    setMatches(found);
    setCurrentIndex(0);
    if (found.length > 0) {
      onHighlight(found[0]);
    } else {
      onHighlight(null);
    }
  }, [messages, onHighlight]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Navigate matches
  const goToNext = () => {
    if (matches.length === 0) return;
    const next = (currentIndex + 1) % matches.length;
    setCurrentIndex(next);
    onHighlight(matches[next]);
  };

  const goToPrev = () => {
    if (matches.length === 0) return;
    const prev = (currentIndex - 1 + matches.length) % matches.length;
    setCurrentIndex(prev);
    onHighlight(matches[prev]);
  };

  const handleClose = () => {
    setQuery("");
    setMatches([]);
    onHighlight(null);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        goToPrev();
      } else {
        goToNext();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-card/95 backdrop-blur-lg border-b border-border/40 animate-fade-in">
      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 h-9 border-0 bg-transparent focus-visible:ring-0 px-0"
      />
      
      {matches.length > 0 && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {currentIndex + 1}/{matches.length}
        </span>
      )}

      {matches.length > 1 && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrev}>
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNext}>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
