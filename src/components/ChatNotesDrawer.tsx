import { useState, useEffect } from "react";
import { StickyNote, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useToast } from "@/hooks/use-toast";

interface ChatNotesDrawerProps {
  threadId: string;
  onNotesChange?: (notes: string) => void;
}

const NOTES_PREFIX = "bahorai_chat_notes_";

export default function ChatNotesDrawer({ threadId, onNotesChange }: ChatNotesDrawerProps) {
  const { language } = useTranslation();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);

  const labels = {
    title: language === "uz" ? "Chat eslatmalari" : language === "ru" ? "Заметки чата" : "Chat Notes",
    placeholder: language === "uz" 
      ? "Bu yerga eslatmalar yozing. Ular AI javoblarida hisobga olinadi."
      : "Write notes here. They will be considered in AI responses.",
    save: language === "uz" ? "Saqlash" : language === "ru" ? "Сохранить" : "Save",
    saved: language === "uz" ? "Saqlandi" : language === "ru" ? "Сохранено" : "Saved",
  };

  // Load notes on mount
  useEffect(() => {
    if (threadId) {
      const saved = localStorage.getItem(`${NOTES_PREFIX}${threadId}`);
      setNotes(saved || "");
    }
  }, [threadId]);

  const handleSave = () => {
    localStorage.setItem(`${NOTES_PREFIX}${threadId}`, notes);
    onNotesChange?.(notes);
    toast({ description: labels.saved });
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <StickyNote className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[50vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-primary" />
            {labels.title}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={labels.placeholder}
            className="min-h-[150px] resize-none"
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              {language === "uz" ? "Yopish" : "Close"}
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              {labels.save}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Helper to get notes for a thread
export function getChatNotes(threadId: string): string {
  return localStorage.getItem(`${NOTES_PREFIX}${threadId}`) || "";
}
