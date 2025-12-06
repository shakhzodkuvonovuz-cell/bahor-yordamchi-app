import { useState, useEffect, useRef } from "react";
import { Sparkles, FileText, CheckSquare, Target, Calendar, ClipboardList, AlertCircle, Loader2, ChevronRight, ChevronDown, ChevronUp, Copy, Send, FileDown, FolderDown, Trash2, MoreVertical, Pencil, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { haptic } from "@/lib/haptics";
import { jsPDF } from "jspdf";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CircleAIActionsPanelProps {
  circleId: string;
  onSendToChat?: (content: string, title: string) => void;
}

type ActionType = "summary" | "tasks" | "decisions" | "plan" | "meeting_notes" | "issues";
type ScopeType = "30" | "100" | "300";
type FilterType = "all" | ActionType;

interface AICard {
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
  meta?: {
    scope?: number;
    scope_label?: string;
    include_files?: boolean;
  };
}

const ACTION_OPTIONS: { type: ActionType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: "summary", label: "Xulosa", icon: <FileText className="h-5 w-5" />, description: "Suhbat xulosasi" },
  { type: "tasks", label: "Vazifalar", icon: <CheckSquare className="h-5 w-5" />, description: "Topshiriqlar va mas'ullar" },
  { type: "decisions", label: "Qarorlar", icon: <Target className="h-5 w-5" />, description: "Qarorlar va ochiq savollar" },
  { type: "plan", label: "Reja", icon: <Calendar className="h-5 w-5" />, description: "Bosqichma-bosqich reja" },
  { type: "meeting_notes", label: "Bayonnoma", icon: <ClipboardList className="h-5 w-5" />, description: "Uchrashuv bayonnomasi" },
  { type: "issues", label: "Muammolar", icon: <AlertCircle className="h-5 w-5" />, description: "Muammolar va yechimlar" },
];

const FILTER_OPTIONS: { type: FilterType; label: string }[] = [
  { type: "all", label: "Hammasi" },
  { type: "tasks", label: "Vazifalar" },
  { type: "decisions", label: "Qarorlar" },
  { type: "plan", label: "Reja" },
  { type: "meeting_notes", label: "Bayonnoma" },
  { type: "issues", label: "Muammolar" },
];

const TYPE_COLORS: Record<string, { accent: string; bg: string; text: string }> = {
  summary: { accent: "bg-blue-500", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  tasks: { accent: "bg-green-500", bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400" },
  decisions: { accent: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  plan: { accent: "bg-purple-500", bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
  meeting_notes: { accent: "bg-orange-500", bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" },
  issues: { accent: "bg-red-500", bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400" },
};

const TYPE_LABELS: Record<string, string> = {
  summary: "Xulosa",
  tasks: "Vazifalar",
  decisions: "Qarorlar",
  plan: "Reja",
  meeting_notes: "Bayonnoma",
  issues: "Muammolar",
};

const getStorageKey = (circleId: string) => `bahorai_ai_actions_${circleId}`;

const sanitizeFilename = (title: string): string => {
  return title
    .replace(/[^\w\s\u0400-\u04FF-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50)
    .trim();
};

export function CircleAIActionsPanel({ circleId, onSendToChat }: CircleAIActionsPanelProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [scope, setScope] = useState<ScopeType>("100");
  const [includeFiles, setIncludeFiles] = useState(true);
  const [extraNote, setExtraNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [cards, setCards] = useState<AICard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<"amallar" | "natijalar">("amallar");
  const [actionsCollapsed, setActionsCollapsed] = useState(false);
  const [selectedCard, setSelectedCard] = useState<AICard | null>(null);
  const [savingToFiles, setSavingToFiles] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renamingCardId, setRenamingCardId] = useState<string | null>(null);
  const [isSavingRename, setIsSavingRename] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Guard: if circleId is undefined, render nothing (prevents crashes)
  if (!circleId) {
    return null;
  }

  // Helper to get display title
  const getDisplayTitle = (card: AICard) => card.title || card.auto_title;

  // Load persisted state - wrapped in try-catch to prevent crashes
  useEffect(() => {
    if (!circleId) return;
    try {
      const stored = localStorage.getItem(getStorageKey(circleId));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.actionsCollapsed !== undefined) setActionsCollapsed(parsed.actionsCollapsed);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [circleId]);

  // Persist state - safe wrapper
  const persistState = (updates: { actionsCollapsed?: boolean }) => {
    if (!circleId) return;
    try {
      const stored = localStorage.getItem(getStorageKey(circleId));
      const current = stored ? JSON.parse(stored) : {};
      localStorage.setItem(getStorageKey(circleId), JSON.stringify({ ...current, ...updates }));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Fetch existing cards - with error handling to prevent crashes
  const fetchCards = async () => {
    if (!circleId) return;
    setLoadingCards(true);
    try {
      const { data, error } = await supabase
        .from("circle_ai_cards")
        .select("*")
        .eq("circle_id", circleId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching cards:", error);
        // Don't throw - just log and continue with empty cards
        setCards([]);
        return;
      }
      const fetchedCards = (data as AICard[]) || [];
      setCards(fetchedCards);

      if (fetchedCards.length > 0) {
        setActiveTab("natijalar");
        setSelectedCard(fetchedCards[0]);
      }
    } catch (err) {
      console.error("Error fetching cards:", err);
      // Graceful degradation - don't crash, just show empty state
      setCards([]);
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    if (open && circleId) {
      fetchCards();
    }
  }, [open, circleId]);

  // Filtered cards
  const filteredCards = cards.filter((card) => {
    const matchesFilter = filter === "all" || card.type === filter;
    const matchesSearch = !searchQuery || 
      getDisplayTitle(card).toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.content_md.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleSelectAction = (type: ActionType) => {
    setSelectedAction(type);
    setShowConfig(true);
  };

  const handleGenerate = async () => {
    if (!selectedAction) return;

    setGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Iltimos, tizimga kiring", variant: "destructive" });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/circle-ai-actions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            circle_id: circleId,
            type: selectedAction,
            scope: parseInt(scope),
            include_files: includeFiles,
            extra_note: extraNote.trim() || undefined
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errorMsg = errData.error || "Xatolik yuz berdi";

        if (response.status === 401) {
          toast({ title: "Kirish kerak. Iltimos login qiling.", variant: "destructive" });
        } else if (response.status === 403) {
          toast({ title: "Siz bu doiraga a'zo emassiz yoki ruxsat yo'q.", variant: "destructive" });
        } else {
          toast({ title: errorMsg, variant: "destructive" });
        }
        return;
      }

      const { card } = await response.json();
      const newCard = card as AICard;
      setCards(prev => [newCard, ...prev]);
      setShowConfig(false);
      setSelectedAction(null);
      setExtraNote("");

      setActiveTab("natijalar");
      setSelectedCard(newCard);
      setFilter("all");

      haptic("success");
      toast({ title: "✅ Natija yaratildi" });

      setTimeout(() => {
        resultsRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Generate error:", err);
      toast({
        title: err instanceof Error ? err.message : "Xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from("circle_ai_cards")
        .delete()
        .eq("id", cardId);

      if (error) throw error;
      setCards(prev => prev.filter(c => c.id !== cardId));
      if (selectedCard?.id === cardId) {
        setSelectedCard(cards.find(c => c.id !== cardId) || null);
      }
      haptic("light");
      toast({ title: "O'chirildi ✓" });
    } catch (err) {
      console.error("Delete error:", err);
      toast({ title: "O'chirishda xatolik", variant: "destructive" });
    }
  };

  const handleOpenRenameModal = (card: AICard) => {
    setRenamingCardId(card.id);
    setRenameValue(card.title || card.auto_title);
    setRenameModalOpen(true);
  };

  const handleSaveRename = async () => {
    if (!renamingCardId) return;
    setIsSavingRename(true);

    try {
      const newTitle = renameValue.trim() || null; // null reverts to auto_title
      const { error } = await supabase
        .from("circle_ai_cards")
        .update({ title: newTitle })
        .eq("id", renamingCardId);

      if (error) throw error;

      // Update local state
      setCards(prev => prev.map(c =>
        c.id === renamingCardId ? { ...c, title: newTitle } : c
      ));
      if (selectedCard?.id === renamingCardId) {
        setSelectedCard(prev => prev ? { ...prev, title: newTitle } : null);
      }

      haptic("success");
      toast({ title: "Nomi yangilandi ✅" });
      setRenameModalOpen(false);
    } catch (err) {
      console.error("Rename error:", err);
      toast({ title: "Xatolik yuz berdi", variant: "destructive" });
    } finally {
      setIsSavingRename(false);
    }
  };

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

  const generatePdfDoc = (card: AICard) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    const title = getDisplayTitle(card);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128);
    doc.text(formatDate(card.created_at), margin, 28);

    doc.setTextColor(0);
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(card.content_md, maxWidth);
    let yPos = 38;
    const lineHeight = 6;
    const pageHeight = doc.internal.pageSize.getHeight();

    for (const line of lines) {
      if (yPos > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += lineHeight;
    }

    return { doc, title };
  };

  const handleExportPdf = async () => {
    if (!selectedCard) return;
    setGeneratingPdf(true);
    try {
      const { doc, title } = generatePdfDoc(selectedCard);
      const date = new Date().toISOString().split("T")[0];
      const filename = `${sanitizeFilename(title)}-${date}.pdf`;
      doc.save(filename);

      haptic("success");
      toast({ title: "PDF yuklandi ✓" });
    } catch (err) {
      console.error("PDF error:", err);
      toast({ title: "PDF yaratishda xatolik", variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSaveToFiles = async () => {
    if (!selectedCard) return;
    setSavingToFiles(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { doc, title } = generatePdfDoc(selectedCard);
      const pdfBlob = doc.output("blob");
      const date = new Date().toISOString().split("T")[0];
      const safeTitle = sanitizeFilename(title);
      const filename = `${safeTitle}-${date}-${Date.now()}.pdf`;
      const path = `${user.id}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(path, pdfBlob, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("user_files").insert({
        user_id: user.id,
        title: `${title} - ${formatDate(selectedCard.created_at)}`,
        path,
        mime_type: "application/pdf",
        size_bytes: pdfBlob.size,
        tool: "circle_ai_card",
        source: "ai_actions",
        status: "success",
      });

      if (dbError) throw dbError;

      haptic("success");
      toast({ title: "Fayllarga saqlandi ✓" });
    } catch (err) {
      console.error("Save to files error:", err);
      toast({ title: "Saqlashda xatolik", variant: "destructive" });
    } finally {
      setSavingToFiles(false);
    }
  };

  const panelContent = (
    <div className="flex flex-col h-full overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "amallar" | "natijalar")}
        className="flex flex-col flex-1 overflow-hidden"
      >
        {/* Tabs Header */}
        <div className="px-4 pt-2 pb-3 border-b border-border">
          <TabsList className="w-full grid grid-cols-2 h-10">
            <TabsTrigger value="amallar" className="text-sm font-medium">
              Amallar
            </TabsTrigger>
            <TabsTrigger value="natijalar" className="text-sm font-medium gap-1.5">
              Natijalar
              {cards.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-primary/20 text-primary">
                  {cards.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Amallar Tab */}
        <TabsContent value="amallar" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
          <div className="flex flex-col h-full overflow-hidden">
            {!showConfig ? (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  <button
                    onClick={() => {
                      const newVal = !actionsCollapsed;
                      setActionsCollapsed(newVal);
                      persistState({ actionsCollapsed: newVal });
                    }}
                    className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
                  >
                    <span>Amallar ro'yxati</span>
                    {actionsCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                  </button>

                  {actionsCollapsed ? (
                    <div className="flex flex-wrap gap-2">
                      {ACTION_OPTIONS.map((action) => (
                        <button
                          key={action.type}
                          onClick={() => handleSelectAction(action.type)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-card hover:bg-accent/50 transition-colors text-sm"
                        >
                          <span className="text-primary">{action.icon}</span>
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ACTION_OPTIONS.map((action) => (
                        <button
                          key={action.type}
                          onClick={() => handleSelectAction(action.type)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-left group shadow-sm"
                        >
                          <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                            {action.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground">{action.label}</div>
                            <div className="text-xs text-muted-foreground">{action.description}</div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5 mb-4 shadow-sm">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {ACTION_OPTIONS.find(a => a.type === selectedAction)?.icon}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {ACTION_OPTIONS.find(a => a.type === selectedAction)?.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ACTION_OPTIONS.find(a => a.type === selectedAction)?.description}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <Label className="text-sm font-medium mb-2 block">Qamrov</Label>
                    <RadioGroup value={scope} onValueChange={(v) => setScope(v as ScopeType)} className="flex gap-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="30" id="scope-30" />
                        <Label htmlFor="scope-30" className="text-sm cursor-pointer">Oxirgi 30</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="100" id="scope-100" />
                        <Label htmlFor="scope-100" className="text-sm cursor-pointer">Oxirgi 100</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="300" id="scope-300" />
                        <Label htmlFor="scope-300" className="text-sm cursor-pointer">Oxirgi 300</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="include-files"
                      checked={includeFiles}
                      onCheckedChange={(checked) => setIncludeFiles(checked as boolean)}
                    />
                    <Label htmlFor="include-files" className="text-sm cursor-pointer">
                      Fayllarni qo'shish
                    </Label>
                  </div>

                  <div className="mb-4">
                    <Label className="text-sm font-medium mb-2 block">Qo'shimcha izoh (ixtiyoriy)</Label>
                    <Textarea
                      value={extraNote}
                      onChange={(e) => setExtraNote(e.target.value)}
                      placeholder="Masalan: faqat marketing mavzulariga e'tibor bering..."
                      className="resize-none h-20"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowConfig(false);
                        setSelectedAction(null);
                      }}
                      className="flex-1"
                    >
                      Orqaga
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="flex-1 gap-2"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Tahlil...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Yaratish
                        </>
                      )}
                    </Button>
                  </div>

                  {generating && (
                    <div className="mt-4 p-4 rounded-xl border border-border bg-muted/30 animate-pulse shadow-sm">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Bahor ishlayapti…
                      </div>
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                      <Skeleton className="h-4 w-2/3 mt-2" />
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        {/* Natijalar Tab */}
        <TabsContent value="natijalar" className="flex-1 overflow-hidden mt-0 flex flex-col data-[state=inactive]:hidden">
          {loadingCards ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : cards.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">Hali natijalar yo'q</p>
              <Button
                variant="outline"
                onClick={() => setActiveTab("amallar")}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Amal tanlash
              </Button>
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Search & Filters */}
              <div className="p-3 border-b border-border space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Natijalar ichidan qidirish..."
                    className="pl-9 pr-8 h-9 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => setFilter(opt.type)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        filter === opt.type
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cards List */}
              <ScrollArea className="flex-1 max-h-48 border-b border-border">
                <div className="p-2 space-y-1.5">
                  {filteredCards.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Natija topilmadi
                    </div>
                  ) : (
                    filteredCards.map((card) => {
                      const colors = TYPE_COLORS[card.type] || TYPE_COLORS.summary;
                      const isSelected = selectedCard?.id === card.id;
                      return (
                        <div
                          key={card.id}
                          className={`flex items-stretch rounded-lg border transition-colors cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border bg-card hover:bg-accent/30"
                          }`}
                        >
                          {/* Color accent bar */}
                          <div className={`w-1 rounded-l-lg ${colors.accent}`} />
                          
                          <button
                            onClick={() => setSelectedCard(card)}
                            className="flex-1 flex items-center gap-2.5 p-2.5 text-left min-w-0"
                          >
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors.bg} ${colors.text}`}>
                              {TYPE_LABELS[card.type] || card.type}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{getDisplayTitle(card)}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(card.created_at)} • {card.source_message_count} xabar
                              </div>
                            </div>
                          </button>

                          {/* Actions Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="px-2 flex items-center text-muted-foreground hover:text-foreground transition-colors">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => handleOpenRenameModal(card)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Nomini o'zgartirish
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteCard(card.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                O'chirish
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Result Viewer */}
              {selectedCard && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Result Header */}
                  <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${TYPE_COLORS[selectedCard.type]?.bg || ""} ${TYPE_COLORS[selectedCard.type]?.text || ""}`}>
                          {TYPE_LABELS[selectedCard.type] || selectedCard.type}
                        </span>
                        <span className="font-medium text-sm truncate">{getDisplayTitle(selectedCard)}</span>
                      </div>
                      <button
                        onClick={() => handleOpenRenameModal(selectedCard)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Nomini o'zgartirish"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate(selectedCard.created_at)} • {selectedCard.source_message_count} xabar
                      {selectedCard.meta?.scope_label && ` • Oxirgi ${selectedCard.meta.scope_label}`}
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <ScrollArea ref={resultsRef} className="flex-1">
                    <div className="p-4">
                      <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
                        {selectedCard.content_md}
                      </pre>
                    </div>
                  </ScrollArea>

                  {/* Sticky Action Bar */}
                  <div className="flex items-center gap-2 p-3 border-t border-border bg-background/95 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                    <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 flex-1">
                      <Copy className="h-3.5 w-3.5" />
                      Nusxa
                    </Button>
                    {onSendToChat && (
                      <Button size="sm" variant="outline" onClick={handleSendToChat} className="gap-1.5 flex-1">
                        <Send className="h-3.5 w-3.5" />
                        Chatga
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportPdf}
                      disabled={generatingPdf}
                      className="gap-1.5 flex-1"
                    >
                      {generatingPdf ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileDown className="h-3.5 w-3.5" />
                      )}
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveToFiles}
                      disabled={savingToFiles}
                      className="gap-1.5 flex-1"
                    >
                      {savingToFiles ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FolderDown className="h-3.5 w-3.5" />
                      )}
                      Fayllarga
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rename Modal */}
      <Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nomini o'zgartirish</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Yangi nom..."
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              Bo'sh qoldirish avtomatik nomni ishlatadi
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameModalOpen(false)}>
              Bekor
            </Button>
            <Button onClick={handleSaveRename} disabled={isSavingRename}>
              {isSavingRename ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Safe handler for panel open/close
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    // Reset modal state when closing to prevent overlay issues
    if (!newOpen) {
      setRenameModalOpen(false);
      setShowConfig(false);
    }
  };

  const triggerButton = (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/40"
    >
      <Sparkles className="h-4 w-4" />
      <span className="hidden sm:inline">AI Amallar</span>
      <span className="sm:hidden">AI</span>
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>
          {triggerButton}
        </DrawerTrigger>
        <DrawerContent className="h-[85vh] flex flex-col">
          <DrawerHeader className="border-b border-border pb-3 flex-shrink-0">
            <DrawerTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Amallar
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">
            {panelContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {triggerButton}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full">
        <SheetHeader className="p-4 border-b border-border flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Amallar
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          {panelContent}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { type AICard };
