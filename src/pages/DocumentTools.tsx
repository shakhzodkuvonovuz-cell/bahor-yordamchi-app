import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Images, Merge, Split, Minimize2, Droplet, Hash, ScanText, Download, RefreshCw, Loader2, File, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

interface UserFile {
  id: string;
  title: string;
  tool: string;
  mime_type: string;
  size_bytes: number | null;
  created_at: string;
  signed_url?: string;
}

const TOOLS = [
  { id: "htmlpdf", icon: FileText, labelKey: "docs.tool.htmlpdf", premium: false },
  { id: "imagepdf", icon: Images, labelKey: "docs.tool.imagepdf", premium: false },
  { id: "merge", icon: Merge, labelKey: "docs.tool.merge", premium: false },
  { id: "split", icon: Split, labelKey: "docs.tool.split", premium: false },
  { id: "compress", icon: Minimize2, labelKey: "docs.tool.compress", premium: false },
  { id: "watermark", icon: Droplet, labelKey: "docs.tool.watermark", premium: false },
  { id: "pagenumber", icon: Hash, labelKey: "docs.tool.pagenumber", premium: false },
  { id: "ocr", icon: ScanText, labelKey: "docs.tool.ocr", premium: true },
];

const TOOL_LABELS: Record<string, Record<string, string>> = {
  uz: {
    htmlpdf: "Matndan PDF",
    imagepdf: "Rasmlardan PDF",
    merge: "PDF birlashtirish",
    split: "PDF bo'lish",
    compress: "PDF siqish",
    watermark: "Watermark",
    pagenumber: "Sahifa raqamlash",
    ocr: "OCR (Premium)",
  },
  en: {
    htmlpdf: "Text to PDF",
    imagepdf: "Images to PDF",
    merge: "Merge PDFs",
    split: "Split PDF",
    compress: "Compress PDF",
    watermark: "Watermark",
    pagenumber: "Page Numbers",
    ocr: "OCR (Premium)",
  },
  ru: {
    htmlpdf: "Текст в PDF",
    imagepdf: "Изображения в PDF",
    merge: "Объединить PDF",
    split: "Разделить PDF",
    compress: "Сжать PDF",
    watermark: "Водяной знак",
    pagenumber: "Нумерация страниц",
    ocr: "OCR (Премиум)",
  },
  tr: {
    htmlpdf: "Metinden PDF",
    imagepdf: "Resimlerden PDF",
    merge: "PDF Birleştir",
    split: "PDF Böl",
    compress: "PDF Sıkıştır",
    watermark: "Filigran",
    pagenumber: "Sayfa Numarası",
    ocr: "OCR (Premium)",
  },
};

export default function DocumentTools() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const [selectedTool, setSelectedTool] = useState("htmlpdf");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<UserFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  
  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<"text" | "html">("text");
  const [template, setTemplate] = useState("clean");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedPdfs, setSelectedPdfs] = useState<File[]>([]);
  const [watermarkText, setWatermarkText] = useState("");
  const [splitRanges, setSplitRanges] = useState("1-3");
  const [compressLevel, setCompressLevel] = useState("recommended");
  const [pagePosition, setPagePosition] = useState("bottom-right");
  const [ocrLanguage, setOcrLanguage] = useState("eng");

  const t = (key: string) => {
    const labels: Record<string, Record<string, string>> = {
      uz: {
        "docs.title": "Hujjatlar / PDF Tools",
        "docs.create": "Yaratish",
        "docs.myFiles": "Fayllarim",
        "docs.selectTool": "Asbobni tanlang",
        "docs.docTitle": "Hujjat nomi",
        "docs.content": "Matn",
        "docs.contentType": "Format",
        "docs.template": "Shablon",
        "docs.template.clean": "Oddiy",
        "docs.template.assignment": "Vazifa",
        "docs.template.report": "Hisobot",
        "docs.selectImages": "Rasmlarni tanlang",
        "docs.selectPdfs": "PDF fayllarni tanlang",
        "docs.watermarkText": "Watermark matni",
        "docs.splitRanges": "Sahifa diapazoni (masalan: 1-3,5,7-9)",
        "docs.compressLevel": "Siqish darajasi",
        "docs.compress.low": "Past",
        "docs.compress.recommended": "Tavsiya etilgan",
        "docs.compress.extreme": "Maksimal",
        "docs.pagePosition": "Pozitsiya",
        "docs.ocrLanguage": "Til",
        "docs.run": "Ishga tushirish",
        "docs.processing": "Tayyorlanmoqda...",
        "docs.success": "PDF tayyor!",
        "docs.error": "Xatolik yuz berdi",
        "docs.noFiles": "Hali fayllar yo'q",
        "docs.download": "Yuklab olish",
        "docs.refresh": "Yangilash",
        "docs.back": "Orqaga",
        "docs.addFile": "Fayl qo'shish",
      },
      en: {
        "docs.title": "Documents / PDF Tools",
        "docs.create": "Create",
        "docs.myFiles": "My Files",
        "docs.selectTool": "Select tool",
        "docs.docTitle": "Document title",
        "docs.content": "Content",
        "docs.contentType": "Format",
        "docs.template": "Template",
        "docs.template.clean": "Clean",
        "docs.template.assignment": "Assignment",
        "docs.template.report": "Report",
        "docs.selectImages": "Select images",
        "docs.selectPdfs": "Select PDF files",
        "docs.watermarkText": "Watermark text",
        "docs.splitRanges": "Page ranges (e.g., 1-3,5,7-9)",
        "docs.compressLevel": "Compression level",
        "docs.compress.low": "Low",
        "docs.compress.recommended": "Recommended",
        "docs.compress.extreme": "Maximum",
        "docs.pagePosition": "Position",
        "docs.ocrLanguage": "Language",
        "docs.run": "Run",
        "docs.processing": "Processing...",
        "docs.success": "PDF ready!",
        "docs.error": "An error occurred",
        "docs.noFiles": "No files yet",
        "docs.download": "Download",
        "docs.refresh": "Refresh",
        "docs.back": "Back",
        "docs.addFile": "Add file",
      },
      ru: {
        "docs.title": "Документы / PDF Инструменты",
        "docs.create": "Создать",
        "docs.myFiles": "Мои файлы",
        "docs.selectTool": "Выберите инструмент",
        "docs.docTitle": "Название документа",
        "docs.content": "Содержание",
        "docs.contentType": "Формат",
        "docs.template": "Шаблон",
        "docs.template.clean": "Простой",
        "docs.template.assignment": "Задание",
        "docs.template.report": "Отчёт",
        "docs.selectImages": "Выберите изображения",
        "docs.selectPdfs": "Выберите PDF файлы",
        "docs.watermarkText": "Текст водяного знака",
        "docs.splitRanges": "Диапазон страниц (напр.: 1-3,5,7-9)",
        "docs.compressLevel": "Уровень сжатия",
        "docs.compress.low": "Низкий",
        "docs.compress.recommended": "Рекомендуемый",
        "docs.compress.extreme": "Максимальный",
        "docs.pagePosition": "Позиция",
        "docs.ocrLanguage": "Язык",
        "docs.run": "Запустить",
        "docs.processing": "Обработка...",
        "docs.success": "PDF готов!",
        "docs.error": "Произошла ошибка",
        "docs.noFiles": "Пока нет файлов",
        "docs.download": "Скачать",
        "docs.refresh": "Обновить",
        "docs.back": "Назад",
        "docs.addFile": "Добавить файл",
      },
      tr: {
        "docs.title": "Belgeler / PDF Araçları",
        "docs.create": "Oluştur",
        "docs.myFiles": "Dosyalarım",
        "docs.selectTool": "Araç seçin",
        "docs.docTitle": "Belge adı",
        "docs.content": "İçerik",
        "docs.contentType": "Format",
        "docs.template": "Şablon",
        "docs.template.clean": "Basit",
        "docs.template.assignment": "Ödev",
        "docs.template.report": "Rapor",
        "docs.selectImages": "Resimleri seçin",
        "docs.selectPdfs": "PDF dosyalarını seçin",
        "docs.watermarkText": "Filigran metni",
        "docs.splitRanges": "Sayfa aralığı (ör: 1-3,5,7-9)",
        "docs.compressLevel": "Sıkıştırma seviyesi",
        "docs.compress.low": "Düşük",
        "docs.compress.recommended": "Önerilen",
        "docs.compress.extreme": "Maksimum",
        "docs.pagePosition": "Konum",
        "docs.ocrLanguage": "Dil",
        "docs.run": "Çalıştır",
        "docs.processing": "İşleniyor...",
        "docs.success": "PDF hazır!",
        "docs.error": "Bir hata oluştu",
        "docs.noFiles": "Henüz dosya yok",
        "docs.download": "İndir",
        "docs.refresh": "Yenile",
        "docs.back": "Geri",
        "docs.addFile": "Dosya ekle",
      },
    };
    return labels[language]?.[key] || labels.en[key] || key;
  };

  const loadFiles = async () => {
    if (!user) return;
    
    setFilesLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_files")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get signed URLs for each file
      const filesWithUrls = await Promise.all(
        (data || []).map(async (file) => {
          const { data: urlData } = await supabase.storage
            .from(file.bucket)
            .createSignedUrl(file.path, 3600);
          return { ...file, signed_url: urlData?.signedUrl };
        })
      );

      setFiles(filesWithUrls);
    } catch (error) {
      console.error("Failed to load files:", error);
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [user]);

  const uploadToStorage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
    
    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file);
    
    if (error) throw error;
    return path;
  };

  const handleRun = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast({ title: t("docs.error"), description: "Hujjat nomini kiriting", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let inputs: Record<string, unknown> = {};

      if (selectedTool === "htmlpdf") {
        if (!content.trim()) {
          throw new Error("Matn kiriting");
        }
        inputs = { contentType, content, template };
      } else if (selectedTool === "imagepdf") {
        if (selectedImages.length === 0) {
          throw new Error("Rasmlarni tanlang");
        }
        const images = await Promise.all(
          selectedImages.map(async (img) => ({
            storagePath: await uploadToStorage(img),
            mime: img.type,
            bucket: "chat-attachments",
          }))
        );
        inputs = { images };
      } else if (selectedTool === "merge") {
        if (selectedPdfs.length < 2) {
          throw new Error("Kamida 2 ta PDF tanlang");
        }
        const pdfs = await Promise.all(
          selectedPdfs.map(async (pdf) => ({
            storagePath: await uploadToStorage(pdf),
            bucket: "chat-attachments",
          }))
        );
        inputs = { pdfs };
      } else if (selectedTool === "split") {
        if (selectedPdfs.length === 0) {
          throw new Error("PDF faylni tanlang");
        }
        const path = await uploadToStorage(selectedPdfs[0]);
        inputs = { pdf: { storagePath: path, bucket: "chat-attachments" }, ranges: splitRanges };
      } else if (selectedTool === "compress") {
        if (selectedPdfs.length === 0) {
          throw new Error("PDF faylni tanlang");
        }
        const path = await uploadToStorage(selectedPdfs[0]);
        inputs = { pdf: { storagePath: path, bucket: "chat-attachments" }, level: compressLevel };
      } else if (selectedTool === "watermark") {
        if (selectedPdfs.length === 0) {
          throw new Error("PDF faylni tanlang");
        }
        if (!watermarkText.trim()) {
          throw new Error("Watermark matnini kiriting");
        }
        const path = await uploadToStorage(selectedPdfs[0]);
        inputs = { pdf: { storagePath: path, bucket: "chat-attachments" }, text: watermarkText };
      } else if (selectedTool === "pagenumber") {
        if (selectedPdfs.length === 0) {
          throw new Error("PDF faylni tanlang");
        }
        const path = await uploadToStorage(selectedPdfs[0]);
        inputs = { pdf: { storagePath: path, bucket: "chat-attachments" }, position: pagePosition };
      } else if (selectedTool === "ocr") {
        if (selectedPdfs.length === 0) {
          throw new Error("PDF faylni tanlang");
        }
        const path = await uploadToStorage(selectedPdfs[0]);
        inputs = { pdf: { storagePath: path, bucket: "chat-attachments" }, language: ocrLanguage };
      }

      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("doc-run", {
        body: { tool: selectedTool, title, inputs },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (response.error || !response.data?.ok) {
        throw new Error(response.data?.error || response.error?.message || "Unknown error");
      }

      toast({ title: t("docs.success"), description: title });
      
      // Reset form
      setTitle("");
      setContent("");
      setSelectedImages([]);
      setSelectedPdfs([]);
      setWatermarkText("");
      
      // Reload files
      await loadFiles();
      
    } catch (error) {
      console.error("Document tool error:", error);
      toast({
        title: t("docs.error"),
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === "uz" ? "uz-UZ" : language, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{t("docs.title")}</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 pb-20">
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="create">{t("docs.create")}</TabsTrigger>
            <TabsTrigger value="files">{t("docs.myFiles")}</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            {/* Tool Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("docs.selectTool")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    const isSelected = selectedTool === tool.id;
                    return (
                      <Button
                        key={tool.id}
                        variant={isSelected ? "default" : "outline"}
                        className={`flex flex-col items-center gap-1 h-auto py-3 ${tool.premium ? "border-amber-500/50" : ""}`}
                        onClick={() => setSelectedTool(tool.id)}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs text-center leading-tight">
                          {TOOL_LABELS[language]?.[tool.id] || TOOL_LABELS.en[tool.id]}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Tool-specific inputs */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t("docs.docTitle")}</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Hujjat nomi..."
                  />
                </div>

                {selectedTool === "htmlpdf" && (
                  <>
                    <div className="flex gap-2">
                      <Select value={contentType} onValueChange={(v) => setContentType(v as "text" | "html")}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="html">HTML</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={template} onValueChange={setTemplate}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clean">{t("docs.template.clean")}</SelectItem>
                          <SelectItem value="assignment">{t("docs.template.assignment")}</SelectItem>
                          <SelectItem value="report">{t("docs.template.report")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={t("docs.content")}
                      rows={8}
                    />
                  </>
                )}

                {selectedTool === "imagepdf" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t("docs.selectImages")}</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedImages.map((img, i) => (
                        <div key={i} className="relative bg-muted rounded-lg p-2 flex items-center gap-2">
                          <img
                            src={URL.createObjectURL(img)}
                            alt=""
                            className="w-12 h-12 object-cover rounded"
                          />
                          <span className="text-xs truncate max-w-[100px]">{img.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setSelectedImages((prev) => prev.filter((_, j) => j !== i))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("image-input")?.click()}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("docs.addFile")}
                    </Button>
                    <input
                      id="image-input"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          setSelectedImages((prev) => [...prev, ...Array.from(e.target.files!)]);
                        }
                      }}
                    />
                  </div>
                )}

                {(selectedTool === "merge" || selectedTool === "split" || selectedTool === "compress" || selectedTool === "watermark" || selectedTool === "pagenumber" || selectedTool === "ocr") && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t("docs.selectPdfs")}</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedPdfs.map((pdf, i) => (
                        <div key={i} className="relative bg-muted rounded-lg p-2 flex items-center gap-2">
                          <File className="h-8 w-8 text-red-500" />
                          <span className="text-xs truncate max-w-[100px]">{pdf.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setSelectedPdfs((prev) => prev.filter((_, j) => j !== i))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("pdf-input")?.click()}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("docs.addFile")}
                    </Button>
                    <input
                      id="pdf-input"
                      type="file"
                      accept="application/pdf"
                      multiple={selectedTool === "merge"}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          if (selectedTool === "merge") {
                            setSelectedPdfs((prev) => [...prev, ...Array.from(e.target.files!)]);
                          } else {
                            setSelectedPdfs([e.target.files[0]]);
                          }
                        }
                      }}
                    />
                  </div>
                )}

                {selectedTool === "split" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t("docs.splitRanges")}</label>
                    <Input
                      value={splitRanges}
                      onChange={(e) => setSplitRanges(e.target.value)}
                      placeholder="1-3,5,7-9"
                    />
                  </div>
                )}

                {selectedTool === "compress" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t("docs.compressLevel")}</label>
                    <Select value={compressLevel} onValueChange={setCompressLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t("docs.compress.low")}</SelectItem>
                        <SelectItem value="recommended">{t("docs.compress.recommended")}</SelectItem>
                        <SelectItem value="extreme">{t("docs.compress.extreme")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedTool === "watermark" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t("docs.watermarkText")}</label>
                    <Input
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="Bahor AI"
                    />
                  </div>
                )}

                {selectedTool === "pagenumber" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t("docs.pagePosition")}</label>
                    <Select value={pagePosition} onValueChange={setPagePosition}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-center">Bottom Center</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="top-center">Top Center</SelectItem>
                        <SelectItem value="top-left">Top Left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedTool === "ocr" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t("docs.ocrLanguage")}</label>
                    <Select value={ocrLanguage} onValueChange={setOcrLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eng">English</SelectItem>
                        <SelectItem value="rus">Русский</SelectItem>
                        <SelectItem value="tur">Türkçe</SelectItem>
                        <SelectItem value="ara">العربية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleRun}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("docs.processing")}
                    </>
                  ) : (
                    t("docs.run")
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={loadFiles} disabled={filesLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${filesLoading ? "animate-spin" : ""}`} />
                {t("docs.refresh")}
              </Button>
            </div>

            {filesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("docs.noFiles")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <Card key={file.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-red-500/10 p-2 rounded-lg">
                          <FileText className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{file.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {TOOL_LABELS[language]?.[file.tool] || file.tool} • {formatSize(file.size_bytes)} • {formatDate(file.created_at)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        disabled={!file.signed_url}
                      >
                        <a href={file.signed_url} target="_blank" rel="noopener noreferrer" download>
                          <Download className="h-5 w-5" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
