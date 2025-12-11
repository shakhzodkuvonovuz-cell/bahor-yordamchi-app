import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Camera, Loader2, Bug, Lightbulb, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/i18n/LanguageProvider";
import { supabase } from "@/integrations/supabase/client";

type FeedbackCategory = "bug" | "idea" | "other";

const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0-beta";

export default function Feedback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          description: t('feedback.imageTooLarge'),
          variant: "destructive",
        });
        return;
      }
      setScreenshot(file);
      const reader = new FileReader();
      reader.onload = (e) => setScreenshotPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        description: t('feedback.emptyMessage'),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotUrl: string | null = null;

      // Upload screenshot if provided
      if (screenshot && user) {
        const fileExt = screenshot.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("feedback-screenshots")
          .upload(fileName, screenshot);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("feedback-screenshots")
            .getPublicUrl(fileName);
          screenshotUrl = urlData.publicUrl;
        }
      }

      // Insert feedback
      const { error } = await supabase.from("beta_feedback").insert({
        user_id: user?.id || null,
        email: user?.email || null,
        category,
        message: message.trim(),
        screenshot_url: screenshotUrl,
        route: window.location.pathname,
        user_agent: navigator.userAgent,
        app_version: APP_VERSION,
      });

      if (error) throw error;

      // Send email notification (fire and forget)
      supabase.functions.invoke("notify-feedback", {
        body: {
          category,
          message: message.trim(),
          email: user?.email || null,
          screenshot_url: screenshotUrl,
          route: window.location.pathname,
          app_version: APP_VERSION,
        },
      }).catch((err) => console.error("Failed to send notification:", err));

      toast({
        description: t('feedback.success'),
      });

      // Go back to settings
      navigate(-1);
    } catch (error) {
      console.error("Feedback submission error:", error);
      toast({
        description: t('feedback.error'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories: { id: FeedbackCategory; labelKey: string; icon: React.ReactNode }[] = [
    { id: "bug", labelKey: "feedback.bug", icon: <Bug className="w-4 h-4" /> },
    { id: "idea", labelKey: "feedback.idea", icon: <Lightbulb className="w-4 h-4" /> },
    { id: "other", labelKey: "feedback.other", icon: <MessageSquare className="w-4 h-4" /> },
  ];

  const getPlaceholder = () => {
    if (category === "bug") return t('feedback.messagePlaceholder.bug');
    if (category === "idea") return t('feedback.messagePlaceholder.idea');
    return t('feedback.messagePlaceholder.other');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-card/95 backdrop-blur-lg border-b border-border/40 shadow-premium-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary rounded-xl transition-colors"
            aria-label={t('settings.back')}
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{t('feedback.title')}</h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Category Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('feedback.type')}</label>
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex-1 min-h-[44px] px-3 rounded-xl font-medium transition-all text-sm flex items-center justify-center gap-2 ${
                  category === cat.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {cat.icon}
                {t(cat.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('feedback.message')} *</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={getPlaceholder()}
            rows={5}
            className="resize-none"
          />
        </div>

        {/* Screenshot Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {t('feedback.screenshot')}
          </label>
          
          {screenshotPreview ? (
            <div className="relative">
              <img
                src={screenshotPreview}
                alt="Screenshot preview"
                className="w-full max-h-48 object-cover rounded-xl border border-border"
              />
              <button
                onClick={removeScreenshot}
                className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm p-1.5 rounded-lg hover:bg-background transition-colors"
              >
                <span className="text-xs">✕</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[80px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/50 transition-colors"
            >
              <Camera className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('feedback.addImage')}</span>
            </button>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleScreenshotSelect}
            className="hidden"
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !message.trim()}
          className="w-full min-h-[48px] text-base"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              {t('feedback.submit')}
            </>
          )}
        </Button>

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center">
          {t('feedback.thanks')}
        </p>
      </div>
    </div>
  );
}
