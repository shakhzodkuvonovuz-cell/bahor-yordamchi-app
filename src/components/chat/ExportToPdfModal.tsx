import React, { useState, useRef } from "react";
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
  const contentRef = useRef<HTMLDivElement>(null);

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
        success: "PDF downloaded!",
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
        success: "PDF скачан!",
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
        success: "PDF indirildi!",
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
        return `<pre style="background:#f4f4f4;padding:12px;border-radius:6px;overflow-x:auto;font-size:13px;"><code>${code}</code></pre>`;
      })
      // Inline code
      .replace(/`([^`]+)`/g, "<code style='background:#f4f4f4;padding:2px 6px;border-radius:4px;font-size:13px;'>$1</code>")
      // Lists
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
      // Line breaks
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    // Wrap in paragraphs
    html = `<p>${html}</p>`;
    
    // Fix list items
    html = html.replace(/(<li>.*?<\/li>)+/g, (match) => `<ul style="margin:12px 0;padding-left:24px;">${match}</ul>`);

    return html;
  };

  const getTemplateStyles = () => {
    const baseStyles = `
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.7;
      color: #1a1a1a;
      max-width: 100%;
    `;

    const templates: Record<string, string> = {
      clean: `
        ${baseStyles}
        h1 { font-size: 24px; margin-bottom: 16px; font-weight: 700; }
        h2 { font-size: 20px; margin: 24px 0 12px; font-weight: 600; }
        h3 { font-size: 16px; margin: 20px 0 10px; font-weight: 600; }
        p { margin: 10px 0; }
        strong { font-weight: 600; }
      `,
      assignment: `
        ${baseStyles}
        h1 { font-size: 22px; margin-bottom: 20px; font-weight: 700; text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 12px; }
        h2 { font-size: 18px; margin: 24px 0 12px; font-weight: 600; color: #059669; }
        h3 { font-size: 15px; margin: 18px 0 10px; font-weight: 600; }
        p { margin: 10px 0; text-align: justify; }
      `,
      report: `
        ${baseStyles}
        h1 { font-size: 26px; margin-bottom: 24px; font-weight: 700; color: #1e40af; border-left: 4px solid #3b82f6; padding-left: 16px; }
        h2 { font-size: 20px; margin: 28px 0 14px; font-weight: 600; color: #1e3a8a; }
        h3 { font-size: 16px; margin: 20px 0 10px; font-weight: 600; color: #1e40af; }
        p { margin: 12px 0; }
      `,
    };

    return templates[template] || templates.clean;
  };

  const handleExport = async () => {
    setLoading(true);

    try {
      // Dynamic import of html2pdf.js
      const html2pdf = (await import("html2pdf.js")).default;

      let content = markdownToHtml(messageContent);

      // Add citations if enabled
      if (includeCitations && citations.length > 0) {
        const citationsHtml = `
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5;">
            <h3 style="font-size: 16px; margin-bottom: 12px; font-weight: 600;">Manbalar</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${citations.map((c) => `<li style="margin: 6px 0;"><a href="${c.url}" style="color: #10b981; text-decoration: underline;">${c.title}</a></li>`).join("")}
            </ul>
          </div>
        `;
        content += citationsHtml;
      }

      // Create a hidden container for rendering
      const container = document.createElement("div");
      container.innerHTML = `
        <div style="${getTemplateStyles()}">
          <h1 style="margin-top: 0;">${title}</h1>
          ${content}
        </div>
      `;
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.width = "700px";
      container.style.padding = "40px";
      document.body.appendChild(container);

      const opt = {
        margin: [15, 15, 15, 15],
        filename: `${title.replace(/[^a-zA-Z0-9-_\s]/g, "")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: { 
          unit: "mm", 
          format: "a4", 
          orientation: "portrait" 
        },
      };

      await html2pdf().set(opt).from(container).save();

      // Clean up
      document.body.removeChild(container);

      toast({ title: t("success") });
      onOpenChange(false);
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
