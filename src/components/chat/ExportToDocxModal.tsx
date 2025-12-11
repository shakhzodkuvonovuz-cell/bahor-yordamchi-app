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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { downloadDocx } from "@/lib/docxGenerator";

interface ExportToDocxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageContent: string;
  defaultTitle: string;
  citations?: Array<{ title: string; url: string }>;
}

export function ExportToDocxModal({
  open,
  onOpenChange,
  messageContent,
  defaultTitle,
  citations = [],
}: ExportToDocxModalProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [title, setTitle] = useState(defaultTitle);
  const [includeCitations, setIncludeCitations] = useState(citations.length > 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTitle(defaultTitle);
  }, [defaultTitle]);

  const t = (key: string) => {
    const labels: Record<string, Record<string, string>> = {
      uz: {
        title: "Word hujjatiga eksport",
        docTitle: "Hujjat nomi",
        includeCitations: "Manbalarni qo'shish",
        export: "Eksport qilish",
        exporting: "Tayyorlanmoqda...",
        success: "DOCX yuklandi!",
        error: "Xatolik yuz berdi",
      },
      en: {
        title: "Export to Word",
        docTitle: "Document title",
        includeCitations: "Include citations",
        export: "Export",
        exporting: "Processing...",
        success: "DOCX downloaded!",
        error: "An error occurred",
      },
      ru: {
        title: "Экспорт в Word",
        docTitle: "Название документа",
        includeCitations: "Включить источники",
        export: "Экспортировать",
        exporting: "Обработка...",
        success: "DOCX скачан!",
        error: "Произошла ошибка",
      },
      tr: {
        title: "Word'e Aktar",
        docTitle: "Belge adı",
        includeCitations: "Kaynakları dahil et",
        export: "Aktar",
        exporting: "İşleniyor...",
        success: "DOCX indirildi!",
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
      let content = messageContent;
      
      // Add citations if included
      if (includeCitations && citations.length > 0) {
        const sourcesLabel = language === 'uz' ? 'Manbalar' : language === 'ru' ? 'Источники' : language === 'tr' ? 'Kaynaklar' : 'Sources';
        content += `\n\n---\n\n## ${sourcesLabel}\n\n`;
        citations.forEach((c, i) => {
          content += `${i + 1}. ${c.title} (${c.url})\n`;
        });
      }

      await downloadDocx({
        title,
        content,
        filename: `${title.replace(/[^a-zA-Z0-9\u0400-\u04FF\-_\s]/g, "").trim() || "document"}.docx`,
      });

      toast({ title: t("success") });
      onOpenChange(false);
    } catch (error) {
      console.error("[DOCX Export] Error:", error);
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
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
            <Label htmlFor="docx-title">{t("docTitle")}</Label>
            <Input
              id="docx-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5"
            />
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
