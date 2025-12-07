import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Image, Download, MessageSquare, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ImageGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId?: string;
  onImageGenerated?: (imageUrl: string, fileName: string) => void;
}

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (Kvadrat)" },
  { value: "16:9", label: "16:9 (Keng)" },
  { value: "9:16", label: "9:16 (Vertikal)" },
  { value: "4:5", label: "4:5 (Instagram)" },
  { value: "3:4", label: "3:4 (Portret)" },
  { value: "4:3", label: "4:3 (Standart)" },
  { value: "3:2", label: "3:2 (Foto)" },
  { value: "2:3", label: "2:3 (Poster)" },
];

const LABELS: Record<string, Record<string, string>> = {
  uz: {
    title: "Rasm yaratish (AI)",
    promptLabel: "Prompt (Uzbek, English yoki boshqa til)",
    promptPlaceholder: "Masalan: Samarqand Registon maydoni kechqurun, yulduzli osmon",
    aspectRatio: "Nisbat",
    advancedSettings: "Kengaytirilgan sozlamalar",
    negativePrompt: "Negative prompt",
    negativePromptPlaceholder: "Rasmda bo'lmasligi kerak bo'lgan narsalar",
    steps: "Bosqichlar (Steps)",
    guidance: "Guidance scale",
    generate: "Yaratish",
    generating: "Yaratilmoqda...",
    success: "Rasm tayyor!",
    error: "Xatolik",
    savedToFiles: "Fayllarimga saqlandi",
    download: "Yuklab olish",
    sendToChat: "Chatga yuborish",
    close: "Yopish",
  },
  en: {
    title: "Generate Image (AI)",
    promptLabel: "Prompt (any language)",
    promptPlaceholder: "Example: Registan square in Samarkand at night, starry sky",
    aspectRatio: "Aspect Ratio",
    advancedSettings: "Advanced settings",
    negativePrompt: "Negative prompt",
    negativePromptPlaceholder: "Things that should not appear in the image",
    steps: "Steps",
    guidance: "Guidance scale",
    generate: "Generate",
    generating: "Generating...",
    success: "Image ready!",
    error: "Error",
    savedToFiles: "Saved to My Files",
    download: "Download",
    sendToChat: "Send to chat",
    close: "Close",
  },
  ru: {
    title: "Создать изображение (AI)",
    promptLabel: "Промпт (любой язык)",
    promptPlaceholder: "Например: Площадь Регистан в Самарканде ночью, звёздное небо",
    aspectRatio: "Соотношение сторон",
    advancedSettings: "Расширенные настройки",
    negativePrompt: "Негативный промпт",
    negativePromptPlaceholder: "То, чего не должно быть на изображении",
    steps: "Шаги",
    guidance: "Guidance scale",
    generate: "Создать",
    generating: "Создаётся...",
    success: "Изображение готово!",
    error: "Ошибка",
    savedToFiles: "Сохранено в Мои файлы",
    download: "Скачать",
    sendToChat: "Отправить в чат",
    close: "Закрыть",
  },
  tr: {
    title: "Görsel Oluştur (AI)",
    promptLabel: "Prompt (herhangi bir dil)",
    promptPlaceholder: "Örnek: Gece Semerkant'ta Registan Meydanı, yıldızlı gökyüzü",
    aspectRatio: "En boy oranı",
    advancedSettings: "Gelişmiş ayarlar",
    negativePrompt: "Negatif prompt",
    negativePromptPlaceholder: "Görüntüde olmaması gerekenler",
    steps: "Adımlar",
    guidance: "Guidance scale",
    generate: "Oluştur",
    generating: "Oluşturuluyor...",
    success: "Görsel hazır!",
    error: "Hata",
    savedToFiles: "Dosyalarıma kaydedildi",
    download: "İndir",
    sendToChat: "Sohbete gönder",
    close: "Kapat",
  },
};

export default function ImageGeneratorModal({
  open,
  onOpenChange,
  chatId,
  onImageGenerated,
}: ImageGeneratorModalProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{ url: string; fileName: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const t = (key: string) => LABELS[language]?.[key] || LABELS.en[key] || key;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: t("error"), description: "Prompt kiriting", variant: "destructive" });
      return;
    }

    setLoading(true);
    setGeneratedImage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: t("error"), description: "Iltimos, tizimga kiring", variant: "destructive" });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fireworks-generate-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            prompt: prompt.trim(),
            negativePrompt: negativePrompt.trim(),
            aspectRatio,
            guidanceScale: 3.5,
            steps: 4,
            seed: 0,
            chatId,
            attachToChat: !!chatId,
          }),
        }
      );

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || "Xatolik yuz berdi");
      }

      setGeneratedImage({ url: result.fileUrl, fileName: result.fileName });
      
      toast({
        title: t("success"),
        description: t("savedToFiles"),
      });

      if (onImageGenerated) {
        onImageGenerated(result.fileUrl, result.fileName);
      }
    } catch (error) {
      console.error("Image generation error:", error);
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : "Xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    
    try {
      const response = await fetch(generatedImage.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = generatedImage.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      window.open(generatedImage.url, "_blank");
    }
  };

  const handleReset = () => {
    setPrompt("");
    setNegativePrompt("");
    setGeneratedImage(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!generatedImage ? (
            <>
              <div className="space-y-2">
                <Label>{t("promptLabel")}</Label>
                <Textarea
                  placeholder={t("promptPlaceholder")}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="resize-none"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("aspectRatio")}</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((ratio) => (
                      <SelectItem key={ratio.value} value={ratio.value}>
                        {ratio.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                    {t("advancedSettings")}
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <Label className="text-sm">{t("negativePrompt")}</Label>
                    <Textarea
                      placeholder={t("negativePromptPlaceholder")}
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      rows={2}
                      className="resize-none text-sm"
                      disabled={loading}
                    />
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{t("steps")}: 4 (fixed)</span>
                    <span>{t("guidance")}: 3.5 (fixed)</span>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("generating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t("generate")}
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <img
                  src={generatedImage.url}
                  alt="Generated image"
                  className="w-full h-auto object-contain max-h-[400px]"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleDownload} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  {t("download")}
                </Button>
                {chatId && (
                  <Button
                    onClick={() => {
                      toast({ title: "✓", description: "Chatga yuborildi" });
                      onOpenChange(false);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {t("sendToChat")}
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleReset} variant="ghost" className="flex-1">
                  Yangi rasm
                </Button>
                <Button onClick={() => onOpenChange(false)} variant="ghost" className="flex-1">
                  {t("close")}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
