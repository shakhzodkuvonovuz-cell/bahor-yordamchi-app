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
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-4">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className="flex-shrink-0 px-4 py-2 bg-secondary text-secondary-foreground rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-border"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
