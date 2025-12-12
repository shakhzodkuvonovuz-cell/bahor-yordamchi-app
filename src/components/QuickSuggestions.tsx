interface QuickSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

export default function QuickSuggestions({
  suggestions,
  onSelect,
  disabled,
}: QuickSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-3 sm:px-4">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className="flex-shrink-0 px-4 py-3 min-h-[44px] bg-card text-foreground rounded-xl text-[13px] font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed border border-border/50 hover:border-primary shadow-premium-sm hover:shadow-premium-md touch-manipulation"
          style={{
            animationDelay: `${index * 50}ms`,
          }}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
