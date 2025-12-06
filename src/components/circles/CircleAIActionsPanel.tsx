import { useState, useEffect } from "react";
import { Sparkles, FileText, CheckSquare, Target, Calendar, ClipboardList, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CircleAICard } from "./CircleAICard";
import { Skeleton } from "@/components/ui/skeleton";

interface CircleAIActionsPanelProps {
  circleId: string;
  onSendToChat?: (content: string, title: string) => void;
}

type ActionType = "summary_20" | "summary_100" | "tasks" | "decisions" | "plan" | "meeting_notes";

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
  { type: "summary_20", label: "Xulosa (20)", icon: <FileText className="h-4 w-4" />, description: "Oxirgi 20 xabardan xulosa" },
  { type: "summary_100", label: "Xulosa (100)", icon: <FileText className="h-4 w-4" />, description: "Oxirgi 100 xabardan xulosa" },
  { type: "tasks", label: "Vazifalar", icon: <CheckSquare className="h-4 w-4" />, description: "Topshiriqlar va mas'ullar" },
  { type: "decisions", label: "Qarorlar", icon: <Target className="h-4 w-4" />, description: "Qarorlar va ochiq savollar" },
  { type: "plan", label: "Reja", icon: <Calendar className="h-4 w-4" />, description: "Bosqichma-bosqich reja" },
  { type: "meeting_notes", label: "Bayonnoma", icon: <ClipboardList className="h-4 w-4" />, description: "Uchrashuv bayonnomasi" },
];

export function CircleAIActionsPanel({ circleId, onSendToChat }: CircleAIActionsPanelProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");
  const [generating, setGenerating] = useState<ActionType | null>(null);
  const [cards, setCards] = useState<AICard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [latestCard, setLatestCard] = useState<AICard | null>(null);
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

  const handleGenerate = async (type: ActionType) => {
    setGenerating(type);
    setLatestCard(null);

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
          body: JSON.stringify({ circle_id: circleId, type }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Xatolik yuz berdi");
      }

      const { card } = await response.json();
      setLatestCard(card);
      setCards(prev => [card, ...prev]);
      setActiveTab("history");
      toast({ title: "Natija tayyor! ✨" });
    } catch (err) {
      console.error("Generate error:", err);
      toast({
        title: err instanceof Error ? err.message : "Xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setGenerating(null);
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
      if (latestCard?.id === cardId) setLatestCard(null);
      toast({ title: "O'chirildi ✓" });
    } catch (err) {
      console.error("Delete error:", err);
      toast({ title: "O'chirishda xatolik", variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">AI Amallar</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Amallar
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "generate" | "history")} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2 grid w-auto grid-cols-2">
            <TabsTrigger value="generate">Yaratish</TabsTrigger>
            <TabsTrigger value="history">Natijalar ({cards.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="flex-1 p-4 space-y-3 overflow-auto">
            <p className="text-sm text-muted-foreground mb-4">
              Doira suhbatidan AI yordamida natija chiqaring:
            </p>

            {ACTION_OPTIONS.map((action) => (
              <button
                key={action.type}
                onClick={() => handleGenerate(action.type)}
                disabled={generating !== null}
                className="w-full flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left disabled:opacity-50"
              >
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  {generating === action.type ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    action.icon
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </button>
            ))}

            {generating && (
              <div className="mt-4 p-4 rounded-lg border bg-muted/30 animate-pulse">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Tahlil qilinyapti…
                </div>
                <Skeleton className="h-4 w-3/4 mt-3" />
                <Skeleton className="h-4 w-1/2 mt-2" />
                <Skeleton className="h-4 w-2/3 mt-2" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="flex-1 p-4 overflow-auto">
            {loadingCards ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-lg border">
                    <Skeleton className="h-5 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Hali natijalar yo'q</p>
                <p className="text-xs mt-1">Yuqoridagi amallardan birini tanlang</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cards.map((card) => (
                  <CircleAICard
                    key={card.id}
                    card={card}
                    circleId={circleId}
                    onDelete={() => handleDeleteCard(card.id)}
                    onSendToChat={onSendToChat}
                    isLatest={latestCard?.id === card.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
