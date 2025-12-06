import { useState, useEffect } from "react";
import { Sparkles, FileText, CheckSquare, Target, Calendar, ClipboardList, AlertCircle, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CircleAICard } from "./CircleAICard";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const { toast } = useToast();

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
      setCards((data as AICard[]) || []);
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
        
        // Better error messages based on status
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
      setCards(prev => [card, ...prev]);
      setShowConfig(false);
      setSelectedAction(null);
      setExtraNote("");
      toast({ title: "Natija tayyor! ✨" });
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
      toast({ title: "O'chirildi ✓" });
    } catch (err) {
      console.error("Delete error:", err);
      toast({ title: "O'chirishda xatolik", variant: "destructive" });
    }
  };

  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Subtitle */}
      <p className="text-sm text-muted-foreground px-4 pb-3 pt-1">
        Bahor bu doira kontekstida natija chiqaradi.
      </p>

      {!showConfig ? (
        <>
          {/* Actions List */}
          <div className="flex-1 overflow-auto px-4 pb-4 space-y-2">
            {ACTION_OPTIONS.map((action) => (
              <button
                key={action.type}
                onClick={() => handleSelectAction(action.type)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-left group"
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

          {/* Results Section */}
          {cards.length > 0 && (
            <div className="border-t border-border">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Natijalar</span>
                <span className="text-xs text-muted-foreground">{cards.length} ta</span>
              </div>
              <div className="px-4 pb-4 space-y-3 max-h-64 overflow-auto">
                {loadingCards ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  cards.slice(0, 3).map((card) => (
                    <CircleAICard
                      key={card.id}
                      card={card}
                      circleId={circleId}
                      onDelete={() => handleDeleteCard(card.id)}
                      onSendToChat={onSendToChat}
                      isLatest={false}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Config Panel */
        <div className="flex-1 overflow-auto px-4 pb-4">
          {/* Selected Action */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5 mb-4">
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
            <div className="mt-4 p-4 rounded-xl border border-border bg-muted/30 animate-pulse">
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
      )}
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
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b border-border pb-3">
            <DrawerTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Amallar
            </DrawerTitle>
          </DrawerHeader>
          {panelContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {triggerButton}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Amallar
          </SheetTitle>
        </SheetHeader>
        {panelContent}
      </SheetContent>
    </Sheet>
  );
}

export { type AICard };
