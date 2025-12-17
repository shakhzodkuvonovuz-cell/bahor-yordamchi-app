import { useState } from "react";
import { Copy, Send, FileDown, FolderDown, Trash2, ChevronDown, ChevronUp, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import { downloadPDF, generatePDF, sanitizeFilename, openHTMLPrintFallback } from "@/lib/pdfGenerator";
import { AiResponseRenderer } from "@/components/ai/AiResponseRenderer";
import { useTranslation } from "@/i18n/LanguageProvider";

interface AICard {
  id: string;
  circle_id: string;
  creator_id: string;
  type: string;
  title: string | null;
  auto_title?: string;
  content_md: string;
  created_at: string;
  source_message_count: number;
  pinned: boolean;
}

interface CircleAICardProps {
  card: AICard;
  circleId: string;
  onDelete: () => void;
  onSendToChat?: (content: string, title: string) => void;
  isLatest?: boolean;
}

export function CircleAICard({ card, circleId, onDelete, onSendToChat, isLatest }: CircleAICardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(isLatest);
  const [savingToFiles, setSavingToFiles] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const { toast } = useToast();

  // Use title with fallback to auto_title
  const displayTitle = card.title || card.auto_title || t('circleAICard.result');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("uz-UZ", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPdfOptions = () => ({
    title: displayTitle,
    content: card.content_md,
    date: formatDate(card.created_at),
    messageCount: card.source_message_count,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(card.content_md);
      haptic("light");
      toast({ title: t('circleAICard.copied') });
    } catch {
      toast({ title: t('circleAICard.copyError'), variant: "destructive" });
    }
  };

  const handleSendToChat = () => {
    if (onSendToChat) {
      onSendToChat(card.content_md, displayTitle);
      haptic("light");
      toast({ title: t('circleAICard.sentToChat') });
    }
  };

  /**
   * PDF Export using @react-pdf/renderer with proper Unicode support
   * Includes HTML print fallback for maximum reliability
   */
  const handleExportPdf = async () => {
    setGeneratingPdf(true);
    setPdfError(false);
    
    try {
      console.log('[AI_PDF_EXPORT] Attempting PDF export from card...');
      await downloadPDF(getPdfOptions());
      
      haptic("success");
      toast({ title: t('circleAICard.pdfDownloaded') });
    } catch (err) {
      console.error("[AI_PDF_EXPORT] PDF error:", err);
      setPdfError(true);
      haptic("error");
      toast({ 
        title: t('circleAICard.pdfError'), 
        description: t('circleAICard.pdfErrorDesc'),
        variant: "destructive" 
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePrintFallback = () => {
    openHTMLPrintFallback(getPdfOptions());
    haptic("light");
    toast({ title: t('circleAICard.htmlOpened') });
  };

  const handleSaveToFiles = async () => {
    setSavingToFiles(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const pdfBlob = await generatePDF(getPdfOptions());
      
      const safeTitle = sanitizeFilename(displayTitle);
      const filename = `${safeTitle}_${Date.now()}.pdf`;
      const path = `${user.id}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(path, pdfBlob, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("user_files").insert({
        user_id: user.id,
        title: `${displayTitle} - ${formatDate(card.created_at)}`,
        path,
        mime_type: "application/pdf",
        size_bytes: pdfBlob.size,
        tool: "circle_ai_card",
        source: "ai_actions",
        status: "success",
      });

      if (dbError) throw dbError;

      haptic("success");
      toast({ title: t('circleAICard.savedToFiles') });
    } catch (err) {
      console.error("Save to files error:", err);
      toast({ title: t('circleAICard.saveError'), variant: "destructive" });
    } finally {
      setSavingToFiles(false);
    }
  };

  const typeColors: Record<string, string> = {
    summary_20: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    summary_100: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    tasks: "bg-green-500/10 text-green-600 dark:text-green-400",
    decisions: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    plan: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    meeting_notes: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  return (
    <div className={`rounded-lg border bg-card overflow-hidden ${isLatest ? "ring-2 ring-primary/50" : ""}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-accent/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[card.type] || "bg-muted"}`}>
            {displayTitle.split(" ")[0]}
          </span>
          <span className="text-sm font-medium truncate">{displayTitle}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs hidden sm:inline">{formatDate(card.created_at)}</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t">
          <div className="p-3 max-h-64 overflow-auto">
            <AiResponseRenderer 
              content={card.content_md} 
              variant="circle"
              className="text-foreground"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 p-3 border-t bg-muted/30">
            <Button size="sm" variant="ghost" onClick={handleCopy} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" />
              {t('circleAICard.copy')}
            </Button>
            {onSendToChat && (
              <Button size="sm" variant="ghost" onClick={handleSendToChat} className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                {t('circleAICard.toChat')}
              </Button>
            )}
            <Button 
              size="sm" 
              variant={pdfError ? "destructive" : "ghost"}
              onClick={handleExportPdf} 
              disabled={generatingPdf}
              className="gap-1.5"
            >
              {generatingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              PDF
            </Button>
            {pdfError && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handlePrintFallback}
                className="gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleSaveToFiles}
              disabled={savingToFiles}
              className="gap-1.5"
            >
              {savingToFiles ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FolderDown className="h-3.5 w-3.5" />
              )}
              {t('circleAICard.toFiles')}
            </Button>
            <div className="flex-1" />
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}