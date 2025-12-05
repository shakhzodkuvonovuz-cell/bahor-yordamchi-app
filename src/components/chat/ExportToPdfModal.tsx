import React, { useState } from "react";
import { FileText, Loader2, Download, X } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";

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
  const [resultUrl, setResultUrl] = useState<string | null>(null);

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
        success: "PDF tayyor!",
        download: "Yuklab olish",
        error: "Xatolik yuz berdi",
        close: "Yopish",
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
        success: "PDF ready!",
        download: "Download",
        error: "An error occurred",
        close: "Close",
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
        success: "PDF готов!",
        download: "Скачать",
        error: "Произошла ошибка",
        close: "Закрыть",
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
        success: "PDF hazır!",
        download: "İndir",
        error: "Bir hata oluştu",
        close: "Kapat",
      },
    };
    return labels[language]?.[key] || labels.en[key] || key;
  };

  // Convert markdown to basic HTML
  const markdownToHtml = (md: string): string => {
    let html = md
      // Headers
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      // Bold and italic
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // Code blocks
      .replace(/```[\s\S]*?```/g, (match) => {
        const code = match.replace(/```\w*\n?/g, "").replace(/```/g, "");
        return `<pre><code>${code}</code></pre>`;
      })
      // Inline code
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Lists
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
      // Line breaks
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    // Wrap in paragraphs
    html = `<p>${html}</p>`;
    
    // Fix list items
    html = html.replace(/(<li>.*?<\/li>)+/g, (match) => `<ul>${match}</ul>`);

    return html;
  };

  const handleExport = async () => {
    setLoading(true);
    setResultUrl(null);

    try {
      let content = markdownToHtml(messageContent);

      // Add citations if enabled
      if (includeCitations && citations.length > 0) {
        const citationsHtml = `
          <h3>Manbalar</h3>
          <ul>
            ${citations.map((c) => `<li><a href="${c.url}">${c.title}</a></li>`).join("")}
          </ul>
        `;
        content += citationsHtml;
      }

      const { data: session } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke("doc-run", {
        body: {
          tool: "htmlpdf",
          title,
          inputs: {
            contentType: "html",
            content,
            template,
          },
        },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (response.error || !response.data?.ok) {
        throw new Error(response.data?.error || response.error?.message || "Unknown error");
      }

      setResultUrl(response.data.file.signed_url);
      toast({ title: t("success") });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResultUrl(null);
    setTitle(defaultTitle);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        {resultUrl ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center p-6 bg-green-500/10 rounded-lg">
              <div className="text-center">
                <FileText className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="font-medium text-green-600">{t("success")}</p>
                <p className="text-sm text-muted-foreground">{title}.pdf</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <a href={resultUrl} target="_blank" rel="noopener noreferrer" download>
                  <Download className="h-4 w-4 mr-2" />
                  {t("download")}
                </a>
              </Button>
              <Button variant="outline" onClick={handleClose}>
                {t("close")}
              </Button>
            </div>
          </div>
        ) : (
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
                  <FileText className="h-4 w-4 mr-2" />
                  {t("export")}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
