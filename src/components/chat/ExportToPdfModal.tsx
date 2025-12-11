import React, { useState, useEffect } from "react";
import { FileText, Loader2, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { downloadPDF, openHTMLPrintFallback } from "@/lib/pdfGenerator";

interface ExportToPdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageContent: string;
  defaultTitle: string;
  citations?: Array<{ title: string; url: string }>;
}

export function ExportToPdfModal({
  open,
  onOpenChange,
  messageContent,
  defaultTitle,
  citations = [],
}: ExportToPdfModalProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [title, setTitle] = useState(defaultTitle);
  const [template, setTemplate] = useState("clean");
  const [includeCitations, setIncludeCitations] = useState(citations.length > 0);
  const [loading, setLoading] = useState(false);

  // Reset title when defaultTitle changes
  useEffect(() => {
    setTitle(defaultTitle);
  }, [defaultTitle]);

  const t = (key: string) => {
    const labels: Record<string, Record<string, string>> = {
      uz: {
        title: "PDFga eksport qilish",
        docTitle: "Hujjat nomi",
        template: "Shablon",
        "template.clean": "Oddiy",
        "template.assignment": "Vazifa",
        "template.report": "Hisobot",
        includeCitations: "Manbalarni qo'shish",
        export: "Eksport qilish",
        exporting: "Tayyorlanmoqda...",
        success: "PDF yuklandi!",
        error: "Xatolik yuz berdi",
      },
      en: {
        title: "Export to PDF",
        docTitle: "Document title",
        template: "Template",
        "template.clean": "Clean",
        "template.assignment": "Assignment",
        "template.report": "Report",
        includeCitations: "Include citations",
        export: "Export",
        exporting: "Processing...",
        success: "PDF downloaded!",
        error: "An error occurred",
      },
      ru: {
        title: "Экспорт в PDF",
        docTitle: "Название документа",
        template: "Шаблон",
        "template.clean": "Простой",
        "template.assignment": "Задание",
        "template.report": "Отчёт",
        includeCitations: "Включить источники",
        export: "Экспортировать",
        exporting: "Обработка...",
        success: "PDF скачан!",
        error: "Произошла ошибка",
      },
      tr: {
        title: "PDF'e Aktar",
        docTitle: "Belge adı",
        template: "Şablon",
        "template.clean": "Basit",
        "template.assignment": "Ödev",
        "template.report": "Rapor",
        includeCitations: "Kaynakları dahil et",
        export: "Aktar",
        exporting: "İşleniyor...",
        success: "PDF indirildi!",
        error: "Bir hata oluştu",
      },
    };
    return labels[language]?.[key] || labels.en[key] || key;
  };

  const handleExport = async () => {
    if (!messageContent.trim()) {
      toast({ title: t("error"), description: "No content to export", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // Prepare content with title and citations
      let content = messageContent;
      
      // Add citations if included
      if (includeCitations && citations.length > 0) {
        const sourcesLabel = language === 'uz' ? 'Manbalar' : language === 'ru' ? 'Источники' : language === 'tr' ? 'Kaynaklar' : 'Sources';
        content += `\n\n---\n\n## ${sourcesLabel}\n\n`;
        citations.forEach((c, i) => {
          content += `${i + 1}. ${c.title} (${c.url})\n`;
        });
      }

      const today = new Date().toLocaleDateString(
        language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : language === 'tr' ? 'tr-TR' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' }
      );

      // Use the proper PDF generator with Unicode font support
      await downloadPDF({
        title,
        content,
        date: today,
        filename: `${title.replace(/[^a-zA-Z0-9\u0400-\u04FF\-_\s]/g, "").trim() || "document"}.pdf`,
      });

      toast({ title: t("success") });
      onOpenChange(false);
    } catch (error) {
      console.error("[PDF Export] Error with @react-pdf/renderer:", error);
      
      // Fallback to HTML print dialog
      try {
        const today = new Date().toLocaleDateString(
          language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : language === 'tr' ? 'tr-TR' : 'en-US',
          { year: 'numeric', month: 'long', day: 'numeric' }
        );
        
        openHTMLPrintFallback({
          title,
          content: messageContent,
          date: today,
        });
        
        toast({ title: t("success"), description: "Use Ctrl+P / Cmd+P to save as PDF" });
        onOpenChange(false);
      } catch (fallbackError) {
        console.error("[PDF Export] HTML fallback also failed:", fallbackError);
        toast({
          title: t("error"),
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setTitle(defaultTitle); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="pdf-title">{t("docTitle")}</Label>
            <Input
              id="pdf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>{t("template")}</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clean">{t("template.clean")}</SelectItem>
                <SelectItem value="assignment">{t("template.assignment")}</SelectItem>
                <SelectItem value="report">{t("template.report")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {citations.length > 0 && (
            <div className="flex items-center justify-between">
              <Label htmlFor="include-citations">{t("includeCitations")}</Label>
              <Switch
                id="include-citations"
                checked={includeCitations}
                onCheckedChange={setIncludeCitations}
              />
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleExport}
            disabled={loading || !title.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("exporting")}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t("export")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
