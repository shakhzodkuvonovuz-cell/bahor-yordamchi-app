import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  FileText,
  CheckSquare,
  Target,
  Calendar,
  ClipboardList,
  AlertCircle,
  Search,
  Copy,
  Send,
  FileDown,
  FolderDown,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { downloadPDF, generatePDF, sanitizeFilename } from "@/lib/pdfGenerator";
import { cn } from "@/lib/utils";

export interface AICard {
  id: string;
  circle_id: string;
  creator_id: string;
  type: string;
  title: string | null;
  auto_title: string;
  content_md: string;
  created_at: string;
  source_message_count: number;
  pinned: boolean;
  meta?: Record<string, unknown>;
}

type FilterType = "all" | "summary" | "tasks" | "decisions" | "plan" | "meeting_notes" | "issues";

const FILTER_OPTIONS: { type: FilterType; label: string; icon: React.ReactNode }[] = [
  { type: "all", label: "Hammasi", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { type: "tasks", label: "Vazifalar", icon: <CheckSquare className="w-3.5 h-3.5" /> },
  { type: "decisions", label: "Qarorlar", icon: <Target className="w-3.5 h-3.5" /> },
  { type: "plan", label: "Reja", icon: <Calendar className="w-3.5 h-3.5" /> },
  { type: "meeting_notes", label: "Bayonnoma", icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { type: "issues", label: "Muammolar", icon: <AlertCircle className="w-3.5 h-3.5" /> },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  summary: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  tasks: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400" },
  decisions: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  plan: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
  meeting_notes: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" },
  issues: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400" },
};

const TYPE_LABELS: Record<string, string> = {
  summary: "Xulosa",
  tasks: "Vazifalar",
  decisions: "Qarorlar",
  plan: "Reja",
  meeting_notes: "Bayonnoma",
  issues: "Muammolar",
};

interface CircleOutcomesPaneProps {
  circleId: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSendToChat?: (content: string, title: string) => void;
  className?: string;
}

export function CircleOutcomesPane({
  circleId,
  isCollapsed = false,
  onToggleCollapse,
  onSendToChat,
  className,
}: CircleOutcomesPaneProps) {
  const [cards, setCards] = useState<AICard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<AICard | null>(null);
  const [savingToFiles, setSavingToFiles] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { toast } = useToast();

  const getDisplayTitle = (card: AICard) => card.title || card.auto_title;

  const fetchCards = async () => {
    if (!circleId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("circle_ai_cards")
        .select("*")
        .eq("circle_id", circleId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setCards((data as AICard[]) || []);
    } catch (err) {
      console.error("Error fetching cards:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [circleId]);

  const filteredCards = cards.filter((card) => {
    const matchesFilter = filter === "all" || card.type === filter;
    const matchesSearch =
      !searchQuery ||
      getDisplayTitle(card).toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.content_md.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("uz-UZ", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCopy = async () => {
    if (!selectedCard) return;
    try {
      await navigator.clipboard.writeText(selectedCard.content_md);
      haptic("light");
      toast({ title: "Nusxalandi ✓" });
    } catch {
      toast({ title: "Nusxalashda xatolik", variant: "destructive" });
    }
  };

  const handleSendToChat = () => {
    if (!selectedCard || !onSendToChat) return;
    onSendToChat(selectedCard.content_md, getDisplayTitle(selectedCard));
    haptic("light");
    toast({ title: "Chatga yuborildi ✓" });
  };

  const handleExportPdf = async () => {
    if (!selectedCard) return;
    setGeneratingPdf(true);
    try {
      await downloadPDF({
        title: getDisplayTitle(selectedCard),
        content: selectedCard.content_md,
        date: formatDate(selectedCard.created_at),
        messageCount: selectedCard.source_message_count,
      });
      haptic("success");
      toast({ title: "PDF yuklandi ✓" });
    } catch (err) {
      console.error("PDF error:", err);
      haptic("error");
      toast({ title: "PDF yaratilmadi", variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSaveToFiles = async () => {
    if (!selectedCard) return;
    setSavingToFiles(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const title = getDisplayTitle(selectedCard);
      const pdfBlob = await generatePDF({
        title,
        content: selectedCard.content_md,
        date: formatDate(selectedCard.created_at),
        messageCount: selectedCard.source_message_count,
      });

      const safeTitle = sanitizeFilename(title);
      const filename = `${safeTitle}-${Date.now()}.pdf`;
      const path = `${user.id}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(path, pdfBlob, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      await supabase.from("user_files").insert({
        user_id: user.id,
        title: `${title} - ${formatDate(selectedCard.created_at)}`,
        path,
        mime_type: "application/pdf",
        size_bytes: pdfBlob.size,
        tool: "circle_ai_card",
        source: "ai_actions",
        status: "success",
      });

      haptic("success");
      toast({ title: "Fayllarga saqlandi ✓" });
    } catch (err) {
      console.error("Save error:", err);
      toast({ title: "Saqlashda xatolik", variant: "destructive" });
    } finally {
      setSavingToFiles(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await supabase.from("circle_ai_cards").delete().eq("id", cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      if (selectedCard?.id === cardId) setSelectedCard(null);
      haptic("light");
      toast({ title: "O'chirildi ✓" });
    } catch {
      toast({ title: "O'chirishda xatolik", variant: "destructive" });
    }
  };

  // Collapsed state - just show a rail
  if (isCollapsed) {
    return (
      <div className={cn(
        "flex flex-col items-center py-4 w-12 bg-card/30 border-l border-border/50",
        className
      )}>
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-secondary transition-colors mb-4"
          title="Natijalarni ochish"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex flex-col gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          {cards.length > 0 && (
            <span className="text-xs text-muted-foreground text-center">{cards.length}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-card/30 border-l border-border/50",
      className
    )}>
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Natijalar
          </h3>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Qidirish..."
            className="h-8 pl-8 text-sm bg-secondary/50 border-border/50"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => setFilter(opt.type)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors",
                filter === opt.type
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-secondary/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Natijalar yo'q</p>
              <p className="text-xs mt-1">AI Amallar orqali yarating</p>
            </div>
          ) : (
            filteredCards.map((card) => {
              const colors = TYPE_COLORS[card.type] || TYPE_COLORS.summary;
              return (
                <button
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all",
                    selectedCard?.id === card.id
                      ? "bg-primary/5 border-primary/30"
                      : "bg-card/50 border-border/50 hover:border-border"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", colors.bg, colors.text)}>
                      {TYPE_LABELS[card.type] || card.type}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDate(card.created_at).split(",")[0]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-1.5 line-clamp-2">
                    {getDisplayTitle(card)}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Selected Card Viewer */}
      {selectedCard && (
        <div className="flex-shrink-0 border-t border-border/50 bg-card/50">
          <div className="p-3 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className={cn(
                "px-1.5 py-0.5 rounded text-xs font-medium",
                TYPE_COLORS[selectedCard.type]?.bg,
                TYPE_COLORS[selectedCard.type]?.text
              )}>
                {TYPE_LABELS[selectedCard.type]}
              </span>
              <button
                onClick={() => setSelectedCard(null)}
                className="p-1 rounded hover:bg-secondary"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm font-medium text-foreground mb-2">
              {getDisplayTitle(selectedCard)}
            </p>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed line-clamp-4">
              {selectedCard.content_md.substring(0, 300)}...
            </pre>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 p-2 border-t border-border/30">
            <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 px-2 gap-1 text-xs">
              <Copy className="w-3 h-3" />
              Nusxa
            </Button>
            {onSendToChat && (
              <Button size="sm" variant="ghost" onClick={handleSendToChat} className="h-7 px-2 gap-1 text-xs">
                <Send className="w-3 h-3" />
                Chatga
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleExportPdf}
              disabled={generatingPdf}
              className="h-7 px-2 gap-1 text-xs"
            >
              {generatingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
              PDF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSaveToFiles}
              disabled={savingToFiles}
              className="h-7 px-2 gap-1 text-xs"
            >
              {savingToFiles ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderDown className="w-3 h-3" />}
              Fayllar
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDeleteCard(selectedCard.id)}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
