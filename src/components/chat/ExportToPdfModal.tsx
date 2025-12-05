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

  // Escape HTML entities
  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Convert markdown to HTML
  const markdownToHtml = (md: string): string => {
    const codeBlocks: string[] = [];
    let html = md.replace(/```([\s\S]*?)```/g, (_, code) => {
      codeBlocks.push(escapeHtml(code.replace(/^\w*\n?/, "")));
      return `__CODEBLOCK_${codeBlocks.length - 1}__`;
    });

    html = html
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    html = `<p>${html}</p>`;
    html = html.replace(/(<li>.*?<\/li>)+/g, (match) => `<ul>${match}</ul>`);

    codeBlocks.forEach((code, i) => {
      html = html.replace(
        `__CODEBLOCK_${i}__`,
        `<pre><code>${code}</code></pre>`
      );
    });

    return html;
  };

  const handleExport = async () => {
    if (!messageContent.trim()) {
      toast({ title: t("error"), description: "No content to export", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default;

      // Build HTML content
      let content = markdownToHtml(messageContent);
      if (includeCitations && citations.length > 0) {
        content += `
          <div class="citations">
            <h3>Manbalar</h3>
            <ul>
              ${citations.map((c) => `<li><a href="${escapeHtml(c.url)}">${escapeHtml(c.title)}</a></li>`).join("")}
            </ul>
          </div>
        `;
      }

      // Create container element
      const container = document.createElement("div");
      container.className = `pdf-template pdf-template-${template}`;
      container.innerHTML = `<h1 class="pdf-title">${escapeHtml(title)}</h1>${content}`;
      
      // Style container - MUST be visible and rendered for html2canvas
      // Using clip-path to hide visually while keeping it rendered
      container.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: 794px;
        background: #ffffff;
        padding: 40px;
        box-sizing: border-box;
        z-index: 99999;
        font-family: 'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #1a1a1a;
      `;

      // Inject styles
      const styleEl = document.createElement("style");
      styleEl.textContent = `
        .pdf-template .pdf-title {
          font-size: 22pt !important;
          font-weight: 700 !important;
          margin: 0 0 24px 0 !important;
          color: #111 !important;
        }
        .pdf-template h1 { font-size: 18pt !important; font-weight: 600 !important; margin: 20px 0 12px 0 !important; }
        .pdf-template h2 { font-size: 16pt !important; font-weight: 600 !important; margin: 18px 0 10px 0 !important; }
        .pdf-template h3 { font-size: 14pt !important; font-weight: 600 !important; margin: 16px 0 8px 0 !important; }
        .pdf-template p { margin: 10px 0 !important; }
        .pdf-template ul, .pdf-template ol { margin: 10px 0 !important; padding-left: 24px !important; list-style-type: disc !important; }
        .pdf-template li { margin: 4px 0 !important; display: list-item !important; }
        .pdf-template code { 
          background: #f5f5f5 !important; 
          padding: 2px 6px !important; 
          border-radius: 4px !important; 
          font-family: Consolas, Monaco, monospace !important;
          font-size: 11pt !important;
        }
        .pdf-template pre {
          background: #f5f5f5 !important;
          padding: 12px !important;
          border-radius: 6px !important;
          overflow-x: auto !important;
          margin: 12px 0 !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
        }
        .pdf-template pre code { background: transparent !important; padding: 0 !important; }
        .pdf-template strong { font-weight: 600 !important; }
        .pdf-template em { font-style: italic !important; }
        .pdf-template .citations { margin-top: 32px !important; padding-top: 16px !important; border-top: 1px solid #e5e5e5 !important; }
        .pdf-template .citations h3 { font-size: 14pt !important; margin-bottom: 12px !important; }
        .pdf-template .citations a { color: #10b981 !important; text-decoration: underline !important; }
        .pdf-template-assignment .pdf-title { padding-bottom: 12px !important; border-bottom: 2px solid #10b981 !important; }
        .pdf-template-report .pdf-title { text-align: center !important; }
        .pdf-template-report h2 { border-bottom: 1px solid #ddd !important; padding-bottom: 6px !important; }
      `;
      document.head.appendChild(styleEl);
      document.body.appendChild(container);

      // Wait for browser to render
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 200);
          });
        });
      });

      console.log("[PDF Export] Container size:", container.offsetWidth, "x", container.offsetHeight);

      const filename = `${title.replace(/[^a-zA-Z0-9\u0400-\u04FF\-_\s]/g, "").trim() || "document"}.pdf`;

      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: true, // Enable logging for debugging
            width: 794,
            windowWidth: 794,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(container)
        .save();

      // Cleanup
      document.body.removeChild(container);
      document.head.removeChild(styleEl);

      toast({ title: t("success") });
      onOpenChange(false);
    } catch (error) {
      console.error("[PDF Export] Error:", error);
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
