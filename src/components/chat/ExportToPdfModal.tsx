import React, { useState } from "react";
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

  // Escape HTML entities for safety
  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Convert markdown to HTML with proper escaping
  const markdownToHtml = (md: string): string => {
    // First, extract and preserve code blocks to prevent double-processing
    const codeBlocks: string[] = [];
    let html = md.replace(/```([\s\S]*?)```/g, (_, code) => {
      codeBlocks.push(escapeHtml(code.replace(/^\w*\n?/, ""))); // Remove language identifier
      return `__CODEBLOCK_${codeBlocks.length - 1}__`;
    });

    // Process markdown
    html = html
      // Headers
      .replace(/^### (.+)$/gm, "<h3 style='font-size:16px;font-weight:600;margin:16px 0 8px 0;'>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2 style='font-size:18px;font-weight:600;margin:20px 0 10px 0;'>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1 style='font-size:22px;font-weight:700;margin:24px 0 12px 0;'>$1</h1>")
      // Bold and italic
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // Inline code
      .replace(/`([^`]+)`/g, "<code style='background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:13px;font-family:Consolas,Monaco,monospace;'>$1</code>")
      // Lists
      .replace(/^- (.+)$/gm, "<li style='margin:4px 0;'>$1</li>")
      .replace(/^(\d+)\. (.+)$/gm, "<li style='margin:4px 0;'>$2</li>")
      // Paragraphs
      .replace(/\n\n/g, "</p><p style='margin:12px 0;'>")
      .replace(/\n/g, "<br>");

    // Wrap in paragraphs
    html = `<p style='margin:12px 0;'>${html}</p>`;
    
    // Wrap consecutive list items in ul
    html = html.replace(/(<li[^>]*>.*?<\/li>)+/g, (match) => 
      `<ul style='margin:12px 0;padding-left:24px;list-style-type:disc;'>${match}</ul>`
    );

    // Restore code blocks
    codeBlocks.forEach((code, i) => {
      html = html.replace(
        `__CODEBLOCK_${i}__`,
        `<pre style='background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto;font-size:13px;font-family:Consolas,Monaco,monospace;margin:12px 0;white-space:pre-wrap;word-break:break-word;'><code>${code}</code></pre>`
      );
    });

    return html;
  };

  const getTemplateStyles = (): { container: string; title: string } => {
    const baseContainer = "font-family:'Segoe UI',Inter,system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.7;color:#1a1a1a;background:#ffffff;";
    const baseTitle = "font-size:24px;margin:0 0 24px 0;font-weight:700;color:#111;";
    
    const styles: Record<string, { container: string; title: string }> = {
      clean: { container: baseContainer, title: baseTitle },
      assignment: { 
        container: baseContainer, 
        title: `${baseTitle}padding-bottom:12px;border-bottom:2px solid #10b981;` 
      },
      report: { 
        container: baseContainer, 
        title: `${baseTitle}text-align:center;` 
      },
    };
    
    return styles[template] || styles.clean;
  };

  const handleExport = async () => {
    if (!messageContent.trim()) {
      toast({ title: t("error"), description: "No content to export", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // Dynamically import html2pdf
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default;

      // Convert markdown content to HTML
      let content = markdownToHtml(messageContent);

      // Add citations if enabled
      if (includeCitations && citations.length > 0) {
        const citationsHtml = `
          <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;">
            <h3 style="font-size:16px;margin-bottom:12px;font-weight:600;">Manbalar</h3>
            <ul style="margin:0;padding-left:20px;list-style-type:disc;">
              ${citations.map((c) => `<li style="margin:6px 0;"><a href="${escapeHtml(c.url)}" style="color:#10b981;text-decoration:underline;">${escapeHtml(c.title)}</a></li>`).join("")}
            </ul>
          </div>
        `;
        content += citationsHtml;
      }

      const templateStyles = getTemplateStyles();

      // Build complete HTML document
      const fullHtml = `
        <div style="${templateStyles.container}padding:0;box-sizing:border-box;">
          <h1 style="${templateStyles.title}">${escapeHtml(title)}</h1>
          <div style="word-wrap:break-word;">${content}</div>
        </div>
      `;

      // Create a container element for rendering
      // CRITICAL: Element must be visible and in the DOM for html2canvas to work
      // Using position:absolute with left:-9999px keeps it off-screen but rendered
      const container = document.createElement("div");
      container.id = "pdf-export-container-" + Date.now();
      container.innerHTML = fullHtml;
      container.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 650px;
        padding: 40px;
        background-color: white;
        box-sizing: border-box;
      `;
      
      // Append to body
      document.body.appendChild(container);

      // Force browser to layout the element - wait for next animation frame + additional time
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          // Additional timeout to ensure layout is complete
          setTimeout(resolve, 300);
        });
      });

      // Verify content is rendered
      console.log("[PDF Export] Container dimensions:", container.offsetWidth, "x", container.offsetHeight);
      console.log("[PDF Export] Content length:", messageContent.length);

      const filename = `${title.replace(/[^a-zA-Z0-9\u0400-\u04FF\-_\s]/g, "").trim() || "document"}.pdf`;

      // Generate PDF with proper settings
      await html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            width: 650,
            windowWidth: 650,
            scrollX: 0,
            scrollY: 0,
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

      // Clean up
      document.body.removeChild(container);

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
    <Dialog open={open} onOpenChange={(o) => { if (!o) setTitle(defaultTitle); onOpenChange(o); }}>
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
