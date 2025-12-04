import { useState } from "react";
import { Copy, Bookmark, BookmarkCheck, ListTodo, Lightbulb, FileText, Target, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type CardType = "plan" | "summary" | "tasks" | "tips";

interface BahorCardProps {
  type: CardType;
  title: string;
  content: string;
  timestamp?: Date;
}

const CARD_CONFIG: Record<CardType, { icon: typeof Target; label: string; color: string }> = {
  plan: { 
    icon: Target, 
    label: "Reja", 
    color: "from-primary/20 to-primary/5 border-primary/30" 
  },
  summary: { 
    icon: FileText, 
    label: "Xulosa", 
    color: "from-blue-500/20 to-blue-500/5 border-blue-500/30" 
  },
  tasks: { 
    icon: ListTodo, 
    label: "Topshiriqlar", 
    color: "from-amber-500/20 to-amber-500/5 border-amber-500/30" 
  },
  tips: { 
    icon: Lightbulb, 
    label: "Maslahatlar", 
    color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30" 
  },
};

const ICON_COLORS: Record<CardType, string> = {
  plan: "text-primary",
  summary: "text-blue-500",
  tasks: "text-amber-500",
  tips: "text-emerald-500",
};

export default function BahorCard({ type, title, content, timestamp }: BahorCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const config = CARD_CONFIG[type];
  const Icon = config.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Nusxa olindi");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    const savedCards = JSON.parse(localStorage.getItem("bahorai_saved_cards") || "[]");
    const newCard = {
      id: `${type}-${Date.now()}`,
      type,
      title,
      content,
      savedAt: new Date().toISOString(),
    };
    savedCards.push(newCard);
    localStorage.setItem("bahorai_saved_cards", JSON.stringify(savedCards));
    setIsSaved(true);
    toast.success("Karta saqlandi");
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${config.color} shadow-premium-sm my-3`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg bg-background/80 ${ICON_COLORS[type]}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-semibold text-[15px] text-foreground">{title || config.label}</span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-background/60"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-background/60"
            onClick={handleSave}
            disabled={isSaved}
          >
            {isSaved ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <div className="text-[14px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {content}
        </div>
      </div>

      {/* Footer with timestamp */}
      {timestamp && (
        <div className="px-4 pb-2.5">
          <span className="text-[11px] text-muted-foreground">
            {new Date(timestamp).toLocaleTimeString("uz-UZ", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}
    </div>
  );
}

// Patterns to detect card sections in message content
const CARD_PATTERNS: { type: CardType; patterns: RegExp[] }[] = [
  { type: "plan", patterns: [/^(?:📋\s*)?Reja:/im, /^(?:📋\s*)?Plan:/im] },
  { type: "summary", patterns: [/^(?:📝\s*)?Xulosa:/im, /^(?:📝\s*)?Summary:/im] },
  { type: "tasks", patterns: [/^(?:✅\s*)?Topshiriqlar:/im, /^(?:✅\s*)?Tasks:/im, /^(?:✅\s*)?Vazifalar:/im] },
  { type: "tips", patterns: [/^(?:💡\s*)?Maslahatlar:/im, /^(?:💡\s*)?Tips:/im, /^(?:💡\s*)?Tavsiyalar:/im] },
];

export interface ParsedSection {
  type: "text" | "card";
  cardType?: CardType;
  title?: string;
  content: string;
}

export function parseMessageForCards(content: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = content.split("\n");
  let currentSection: ParsedSection | null = null;
  let textBuffer: string[] = [];

  const flushTextBuffer = () => {
    if (textBuffer.length > 0) {
      const text = textBuffer.join("\n").trim();
      if (text) {
        sections.push({ type: "text", content: text });
      }
      textBuffer = [];
    }
  };

  const flushCurrentSection = () => {
    if (currentSection) {
      currentSection.content = currentSection.content.trim();
      if (currentSection.content) {
        sections.push(currentSection);
      }
      currentSection = null;
    }
  };

  for (const line of lines) {
    let matchedCard: { type: CardType; title: string } | null = null;

    for (const { type, patterns } of CARD_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          // Extract title (everything after the pattern keyword)
          const cleanLine = line.replace(/^(?:📋|📝|✅|💡)\s*/, "");
          const titleMatch = cleanLine.match(/^(Reja|Plan|Xulosa|Summary|Topshiriqlar|Tasks|Vazifalar|Maslahatlar|Tips|Tavsiyalar):\s*(.*)/i);
          matchedCard = {
            type,
            title: titleMatch?.[2]?.trim() || "",
          };
          break;
        }
      }
      if (matchedCard) break;
    }

    if (matchedCard) {
      // Flush any existing content
      flushTextBuffer();
      flushCurrentSection();
      
      // Start new card section
      currentSection = {
        type: "card",
        cardType: matchedCard.type,
        title: matchedCard.title,
        content: "",
      };
    } else if (currentSection) {
      // Continue building current card content
      currentSection.content += (currentSection.content ? "\n" : "") + line;
    } else {
      // Regular text
      textBuffer.push(line);
    }
  }

  // Flush remaining content
  flushTextBuffer();
  flushCurrentSection();

  return sections;
}

// Check if message has any card-like content
export function hasCardContent(content: string): boolean {
  return CARD_PATTERNS.some(({ patterns }) =>
    patterns.some((pattern) => pattern.test(content))
  );
}