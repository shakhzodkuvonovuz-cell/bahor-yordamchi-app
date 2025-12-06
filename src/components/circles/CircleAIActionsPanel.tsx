import { useState, useEffect, useRef } from "react";
import { Sparkles, FileText, CheckSquare, Target, Calendar, ClipboardList, AlertCircle, Loader2, ChevronRight, ChevronDown, ChevronUp, Copy, Send, FileDown, FolderDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

interface AICard {
  id: string;
  circle_id: string;
  creator_id: string;
  type: string;
  title: string;
  content_md: string;
  created_at: string;
  source_message_count: number;
  pinned: boolean;
}

const ACTION_OPTIONS: { type: ActionType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: "summary", label: "Xulosa", icon: <FileText className="h-5 w-5" />, description: "Suhbat xulosasi" },
  { type: "tasks", label: "Vazifalar", icon: <CheckSquare className="h-5 w-5" />, description: "Topshiriqlar va mas'ullar" },
  { type: "decisions", label: "Qarorlar", icon: <Target className="h-5 w-5" />, description: "Qarorlar va ochiq savollar" },
  { type: "plan", label: "Reja", icon: <Calendar className="h-5 w-5" />, description: "Bosqichma-bosqich reja" },
  { type: "meeting_notes", label: "Bayonnoma", icon: <ClipboardList className="h-5 w-5" />, description: "Uchrashuv bayonnomasi" },
  { type: "issues", label: "Muammolar", icon: <AlertCircle className="h-5 w-5" />, description: "Muammolar va yechimlar" },
];

const getStorageKey = (circleId: string) => `bahorai_ai_actions_${circleId}`;

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
  const resultsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load persisted state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(circleId));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.actionsCollapsed !== undefined) setActionsCollapsed(parsed.actionsCollapsed);
      }
    } catch {}
  }, [circleId]);

  // Persist state
  const persistState = (updates: { actionsCollapsed?: boolean }) => {
    try {
      const stored = localStorage.getItem(getStorageKey(circleId));
      const current = stored ? JSON.parse(stored) : {};
      localStorage.setItem(getStorageKey(circleId), JSON.stringify({ ...current, ...updates }));
    } catch {}
  };

  // Fetch existing cards
  const fetchCards = async () => {
    setLoadingCards(true);
    try {
      const { data, error } = await supabase
        .from("circle_ai_cards")
        .select("*")
        .eq("circle_id", circleId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      const fetchedCards = (data as AICard[]) || [];
      setCards(fetchedCards);
      
      // Default to natijalar tab if there are results
      if (fetchedCards.length > 0) {
        setActiveTab("natijalar");
        setSelectedCard(fetchedCards[0]);
      }
    } catch (err) {
      console.error("Error fetching cards:", err);
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCards();
    }
  }, [open, circleId]);

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
      
      // Auto-switch to results and select new card
      setActiveTab("natijalar");
      setSelectedCard(newCard);
      
      haptic("success");
      toast({ title: "✅ Natija yaratildi" });
      
      // Scroll to top of results
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
    onSendToChat(selectedCard.content_md, selectedCard.title);
    haptic("light");
    toast({ title: "Chatga yuborildi ✓" });
  };

  const handleExportPdf = async () => {
    if (!selectedCard) return;
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(selectedCard.title, margin, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128);
      doc.text(formatDate(selectedCard.created_at), margin, 28);
      
      doc.setTextColor(0);
      doc.setFontSize(11);
      
      const lines = doc.splitTextToSize(selectedCard.content_md, maxWidth);
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
      
      const filename = `Doira_${selectedCard.type}_${new Date().toISOString().split("T")[0]}.pdf`;
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

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(selectedCard.title, margin, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128);
      doc.text(formatDate(selectedCard.created_at), margin, 28);
      
      doc.setTextColor(0);
      doc.setFontSize(11);
      
      const lines = doc.splitTextToSize(selectedCard.content_md, maxWidth);
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
      
      const pdfBlob = doc.output("blob");
      const filename = `Doira_${selectedCard.type}_${Date.now()}.pdf`;
      const path = `${user.id}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(path, pdfBlob, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("user_files").insert({
        user_id: user.id,
        title: `${selectedCard.title} - ${formatDate(selectedCard.created_at)}`,
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

  const typeLabels: Record<string, string> = {
    summary: "Xulosa",
    tasks: "Vazifalar", 
    decisions: "Qarorlar",
    plan: "Reja",
    meeting_notes: "Bayonnoma",
    issues: "Muammolar",
  };

  const typeColors: Record<string, string> = {
    summary: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    tasks: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    decisions: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    plan: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    meeting_notes: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    issues: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
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
                  {/* Collapse Toggle */}
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
                    /* Compact Chips View */
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
                    /* Full Cards View */
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
              /* Config Panel */
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {/* Selected Action */}
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

                  {/* Scope Selector */}
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

                  {/* Include Files */}
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

                  {/* Extra Note */}
                  <div className="mb-4">
                    <Label className="text-sm font-medium mb-2 block">Qo'shimcha izoh (ixtiyoriy)</Label>
                    <Textarea
                      value={extraNote}
                      onChange={(e) => setExtraNote(e.target.value)}
                      placeholder="Masalan: faqat marketing mavzulariga e'tibor bering..."
                      className="resize-none h-20"
                    />
                  </div>

                  {/* Generate Button */}
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

                  {/* Loading State */}
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
              {/* Cards List (Left Side / Top on Mobile) */}
              <div className="border-b border-border">
                <ScrollArea className="max-h-32">
                  <div className="p-2 flex gap-2 overflow-x-auto">
                    {cards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-left ${
                          selectedCard?.id === card.id 
                            ? "border-primary bg-primary/10" 
                            : "border-border bg-card hover:bg-accent/50"
                        }`}
                      >
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${typeColors[card.type] || "bg-muted"}`}>
                          {typeLabels[card.type] || card.type}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(card.created_at)}
                        </span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Result Viewer (Main Content) */}
              {selectedCard && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Result Header */}
                  <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${typeColors[selectedCard.type] || "bg-muted"}`}>
                          {typeLabels[selectedCard.type] || selectedCard.type}
                        </span>
                        <span className="font-medium text-sm">{selectedCard.title}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteCard(selectedCard.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate(selectedCard.created_at)} • {selectedCard.source_message_count} xabar
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
    </div>
  );

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

  // Use Drawer on mobile, Sheet on desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
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
    <Sheet open={open} onOpenChange={setOpen}>
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
