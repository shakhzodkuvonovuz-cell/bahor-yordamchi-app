import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Image, Download, MessageSquare, ChevronDown, ChevronUp, Sparkles, Camera, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ImageGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId?: string;
  onImageGenerated?: (imageUrl: string, fileName: string, meta?: ImageMeta) => void;
}

interface ImageMeta {
  prompt_used: string;
  prompt_original: string;
  model: string;
  width: number;
  height: number;
  render_mode: string;
}

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (Kvadrat)" },
  { value: "16:9", label: "16:9 (Keng)" },
  { value: "9:16", label: "9:16 (Story)" },
  { value: "4:5", label: "4:5 (Instagram)" },
];

const LABELS: Record<string, Record<string, string>> = {
  uz: {
    title: "Rasm yaratish (AI)",
    promptLabel: "Nimani chizish kerak?",
    promptPlaceholder: "Masalan: Samarqand Registon maydoni kechqurun, yulduzli osmon",
    aspectRatio: "Nisbat",
    style: "Uslub",
    stylePhoto: "Foto",
    styleIllustration: "Rasm",
    qualityBoost: "Sifatni oshirish",
    qualityBoostDesc: "Biroz sekinroq, lekin sifatliroq",
    generate: "Yaratish",
    generating: "Yaratilmoqda...",
    success: "Rasm tayyor!",
    error: "Xatolik",
    savedToFiles: "Fayllarimga saqlandi",
    download: "Yuklab olish",
    sendToChat: "Chatga yuborish",
    close: "Yopish",
    newImage: "Yangi rasm",
    details: "Tafsilotlar",
    promptUsed: "Ishlatilgan prompt",
    model: "Model",
    size: "O'lcham",
  },
  en: {
    title: "Generate Image (AI)",
    promptLabel: "What to generate?",
    promptPlaceholder: "Example: Registan square in Samarkand at night, starry sky",
    aspectRatio: "Aspect Ratio",
    style: "Style",
    stylePhoto: "Photo",
    styleIllustration: "Illustration",
    qualityBoost: "Quality boost",
    qualityBoostDesc: "Slightly slower, better quality",
    generate: "Generate",
    generating: "Generating...",
    success: "Image ready!",
    error: "Error",
    savedToFiles: "Saved to My Files",
    download: "Download",
    sendToChat: "Send to chat",
    close: "Close",
    newImage: "New image",
    details: "Details",
    promptUsed: "Prompt used",
    model: "Model",
    size: "Size",
  },
  ru: {
    title: "Создать изображение (AI)",
    promptLabel: "Что создать?",
    promptPlaceholder: "Например: Площадь Регистан в Самарканде ночью, звёздное небо",
    aspectRatio: "Соотношение сторон",
    style: "Стиль",
    stylePhoto: "Фото",
    styleIllustration: "Иллюстрация",
    qualityBoost: "Повышение качества",
    qualityBoostDesc: "Немного медленнее, но качественнее",
    generate: "Создать",
    generating: "Создаётся...",
    success: "Изображение готово!",
    error: "Ошибка",
    savedToFiles: "Сохранено в Мои файлы",
    download: "Скачать",
    sendToChat: "Отправить в чат",
    close: "Закрыть",
    newImage: "Новое изображение",
    details: "Подробности",
    promptUsed: "Использованный промпт",
    model: "Модель",
    size: "Размер",
  },
  tr: {
    title: "Görsel Oluştur (AI)",
    promptLabel: "Ne oluşturulsun?",
    promptPlaceholder: "Örnek: Gece Semerkant'ta Registan Meydanı, yıldızlı gökyüzü",
    aspectRatio: "En boy oranı",
    style: "Stil",
    stylePhoto: "Fotoğraf",
    styleIllustration: "İllüstrasyon",
    qualityBoost: "Kalite artırma",
    qualityBoostDesc: "Biraz daha yavaş, daha kaliteli",
    generate: "Oluştur",
    generating: "Oluşturuluyor...",
    success: "Görsel hazır!",
    error: "Hata",
    savedToFiles: "Dosyalarıma kaydedildi",
    download: "İndir",
    sendToChat: "Sohbete gönder",
    close: "Kapat",
    newImage: "Yeni görsel",
    details: "Detaylar",
    promptUsed: "Kullanılan prompt",
    model: "Model",
    size: "Boyut",
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
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [renderMode, setRenderMode] = useState<"photo" | "illustration">("photo");
  const [qualityBoost, setQualityBoost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{
    url: string;
    fileName: string;
    meta?: ImageMeta;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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
            aspectRatio,
            renderMode,
            qualityBoost,
            chatId,
            attachToChat: !!chatId,
          }),
        }
      );

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || "Xatolik yuz berdi");
      }

      const meta: ImageMeta = {
        prompt_used: result.prompt_used,
        prompt_original: result.prompt_original,
        model: result.model,
        width: result.width,
        height: result.height,
        render_mode: result.render_mode,
      };

      setGeneratedImage({ 
        url: result.image_url, 
        fileName: result.file_name,
        meta,
      });
      
      toast({
        title: t("success"),
        description: t("savedToFiles"),
      });

      if (onImageGenerated) {
        onImageGenerated(result.image_url, result.file_name, meta);
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
    setGeneratedImage(null);
    setShowDetails(false);
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
              {/* Prompt input */}
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

              {/* Style toggle */}
              <div className="space-y-2">
                <Label>{t("style")}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={renderMode === "photo" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRenderMode("photo")}
                    disabled={loading}
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {t("stylePhoto")}
                  </Button>
                  <Button
                    type="button"
                    variant={renderMode === "illustration" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRenderMode("illustration")}
                    disabled={loading}
                    className="flex-1"
                  >
                    <Palette className="w-4 h-4 mr-2" />
                    {t("styleIllustration")}
                  </Button>
                </div>
              </div>

              {/* Aspect ratio */}
              <div className="space-y-2">
                <Label>{t("aspectRatio")}</Label>
                <div className="flex gap-2 flex-wrap">
                  {ASPECT_RATIOS.map((ratio) => (
                    <Button
                      key={ratio.value}
                      type="button"
                      variant={aspectRatio === ratio.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAspectRatio(ratio.value)}
                      disabled={loading}
                    >
                      {ratio.value}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Quality boost toggle */}
              <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{t("qualityBoost")}</Label>
                  <p className="text-xs text-muted-foreground">{t("qualityBoostDesc")}</p>
                </div>
                <Switch
                  checked={qualityBoost}
                  onCheckedChange={setQualityBoost}
                  disabled={loading}
                />
              </div>

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
              {/* Generated image */}
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <img
                  src={generatedImage.url}
                  alt="Generated image"
                  className="w-full h-auto object-contain max-h-[400px]"
                />
              </div>

              {/* Collapsible details */}
              {generatedImage.meta && (
                <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                      {t("details")}
                      {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2 text-sm">
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div>
                        <span className="text-muted-foreground">{t("model")}: </span>
                        <span className="font-mono">{generatedImage.meta.model}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("size")}: </span>
                        <span>{generatedImage.meta.width}×{generatedImage.meta.height}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("promptUsed")}: </span>
                        <p className="text-xs mt-1 text-muted-foreground leading-relaxed">
                          {generatedImage.meta.prompt_used}
                        </p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Action buttons */}
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
                  {t("newImage")}
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
