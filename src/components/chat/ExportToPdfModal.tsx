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

  // Convert markdown to HTML
  const markdownToHtml = (md: string): string => {
    let html = md
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/```[\s\S]*?```/g, (match) => {
        const code = match.replace(/```\w*\n?/g, "").replace(/```/g, "");
        return `<pre style="background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto;font-size:13px;font-family:monospace;"><code>${code}</code></pre>`;
      })
      .replace(/`([^`]+)`/g, "<code style='background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:13px;'>$1</code>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    html = `<p>${html}</p>`;
    html = html.replace(/(<li>.*?<\/li>)+/g, (match) => `<ul style="margin:12px 0;padding-left:24px;">${match}</ul>`);

    return html;
  };

  const getTemplateStyles = (): string => {
    const base = "font-family:Inter,Segoe UI,system-ui,sans-serif;font-size:14px;line-height:1.7;color:#1a1a1a;";
    
    const styles: Record<string, string> = {
      clean: `${base}`,
      assignment: `${base}`,
      report: `${base}`,
    };
    
    return styles[template] || styles.clean;
  };

  const handleExport = async () => {
    setLoading(true);

    try {
      const html2pdf = (await import("html2pdf.js")).default;

      let content = markdownToHtml(messageContent);

      if (includeCitations && citations.length > 0) {
        const citationsHtml = `
          <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;">
            <h3 style="font-size:16px;margin-bottom:12px;font-weight:600;">Manbalar</h3>
            <ul style="margin:0;padding-left:20px;">
              ${citations.map((c) => `<li style="margin:6px 0;"><a href="${c.url}" style="color:#10b981;">${c.title}</a></li>`).join("")}
            </ul>
          </div>
        `;
        content += citationsHtml;
      }

      // Build full HTML document
      const fullHtml = `
        <div style="${getTemplateStyles()}">
          <h1 style="font-size:24px;margin:0 0 20px 0;font-weight:700;">${title}</h1>
          ${content}
        </div>
      `;

      // Create container that will be rendered
      const container = document.createElement("div");
      container.innerHTML = fullHtml;
      container.style.cssText = "position:fixed;left:0;top:0;width:650px;padding:40px;background:white;z-index:-9999;";
      document.body.appendChild(container);

      // Wait for layout
      await new Promise(r => setTimeout(r, 150));

      const filename = `${title.replace(/[^a-zA-Z0-9\-_\s]/g, "").trim() || "document"}.pdf`;

      await html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename,
          image: { type: "jpeg", quality: 0.92 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
        })
        .from(container)
        .save();

      document.body.removeChild(container);
      toast({ title: t("success") });
      onOpenChange(false);
    } catch (error) {
      console.error("PDF export error:", error);
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
