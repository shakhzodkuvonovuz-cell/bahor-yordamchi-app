import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageProvider";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import bahorLogo from "@/assets/bahor-logo.png";

interface CreateSpaceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const TEMPLATES = [
  { value: "study", labelUz: "O'qish", labelEn: "Study", emoji: "📚" },
  { value: "work", labelUz: "Ish", labelEn: "Work", emoji: "💼" },
  { value: "family", labelUz: "Oila / Hayot", labelEn: "Family / Life", emoji: "👨‍👩‍👧‍👦" },
  { value: "creator", labelUz: "Kreator", labelEn: "Creator", emoji: "🎨" },
  { value: "biz", labelUz: "Kichik biznes", labelEn: "Small Business", emoji: "🛍️" },
  { value: "gaming", labelUz: "O'yin", labelEn: "Gaming", emoji: "🎮" },
  { value: "general", labelUz: "Umumiy", labelEn: "General", emoji: "💬" },
];

const QUICK_EMOJIS = ["📚", "💼", "👨‍👩‍👧‍👦", "🎮", "🧠", "✅", "💬", "🛍️", "🏋️", "🎨", "🎯", "🚀"];

const COLOR_OPTIONS = [
  { value: "blue", bg: "bg-blue-500" },
  { value: "green", bg: "bg-green-500" },
  { value: "purple", bg: "bg-purple-500" },
  { value: "orange", bg: "bg-orange-500" },
  { value: "pink", bg: "bg-pink-500" },
  { value: "cyan", bg: "bg-cyan-500" },
  { value: "red", bg: "bg-red-500" },
  { value: "yellow", bg: "bg-yellow-500" },
];

export default function CreateSpaceModal({ open, onClose, onCreated }: CreateSpaceModalProps) {
  const { user } = useAuth();
  const { language } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("general");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [iconEmoji, setIconEmoji] = useState("💬");
  const [iconColor, setIconColor] = useState<string | null>(null);
  const [customEmoji, setCustomEmoji] = useState("");

  // Update emoji when template changes
  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    const templateData = TEMPLATES.find(t => t.value === value);
    if (templateData) {
      setIconEmoji(templateData.emoji);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(language === "uz" ? "Doira nomini kiriting" : "Please enter a circle name");
      return;
    }

    setLoading(true);
    try {
      const { data: { user: authUser }, error: userErr } = await supabase.auth.getUser();
      
      if (userErr) {
        console.error("Auth error:", userErr);
        toast.error(language === "uz" 
          ? `Xatolik: ${userErr.message}` 
          : `Error: ${userErr.message}`);
        setLoading(false);
        return;
      }
      
      if (!authUser) {
        toast.error(language === "uz" 
          ? "Doira yaratish uchun kirish kerak" 
          : "Please log in to create a space");
        setLoading(false);
        onClose();
        navigate("/auth?next=/circles");
        return;
      }

      const { data, error } = await supabase
        .from("spaces")
        .insert({
          name: name.trim(),
          template,
          goal: goal.trim() || null,
          owner_id: authUser.id,
          icon_emoji: iconEmoji,
          icon_color: iconColor,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Space creation error:", error.code, error.message, error.details);
        toast.error(language === "uz" 
          ? `Xatolik: ${error.message}${error.code ? ` (${error.code})` : ''}` 
          : `Error: ${error.message}${error.code ? ` (${error.code})` : ''}`);
        return;
      }

      toast.success(language === "uz" ? "Doira yaratildi!" : "Circle created!");
      setName("");
      setTemplate("general");
      setGoal("");
      setIconEmoji("💬");
      setIconColor(null);
      setCustomEmoji("");
      onClose();
      onCreated();
      
      if (data?.id) {
        navigate(`/circles/${data.id}`);
      }
    } catch (err: any) {
      console.error("Unexpected error:", err);
      toast.error(language === "uz" 
        ? `Xatolik: ${err?.message || "Noma'lum xatolik"}` 
        : `Error: ${err?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomEmojiChange = (value: string) => {
    setCustomEmoji(value);
    // Extract first emoji from input
    const emojiMatch = value.match(/\p{Extended_Pictographic}/u);
    if (emojiMatch) {
      setIconEmoji(emojiMatch[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4 rounded-2xl p-0 overflow-hidden max-h-[90dvh] flex flex-col">
        {/* Header with logo */}
        <div className="bg-gradient-to-b from-primary/10 to-background px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={bahorLogo} alt="Bahor AI" className="w-8 h-8 sm:w-10 sm:h-10" />
            <span className="font-semibold text-lg text-foreground">Bahor AI</span>
          </div>
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl font-bold">
              {language === "uz" ? "Yangi doira yaratish" : "Create New Circle"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5 overflow-y-auto flex-1">
          {/* Emoji Picker */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{language === "uz" ? "Emoji" : "Icon"}</Label>
            <div className="flex items-center gap-3">
              {/* Selected emoji preview */}
              <div 
                className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center text-2xl border-2 border-primary/30 flex-shrink-0",
                  iconColor ? `bg-${iconColor}-500/20` : "bg-secondary"
                )}
              >
                {iconEmoji}
              </div>
              {/* Quick emoji grid */}
              <div className="flex flex-wrap gap-1.5 flex-1">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIconEmoji(emoji)}
                    className={cn(
                      "w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center text-lg hover:bg-secondary transition-colors touch-manipulation",
                      iconEmoji === emoji && "ring-2 ring-primary bg-primary/10"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            {/* Custom emoji input */}
            <Input
              value={customEmoji}
              onChange={(e) => handleCustomEmojiChange(e.target.value)}
              placeholder={language === "uz" ? "Yoki emoji yozing..." : "Or type an emoji..."}
              className="text-lg min-h-[48px]"
              maxLength={10}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{language === "uz" ? "Rang (ixtiyoriy)" : "Color (optional)"}</Label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIconColor(null)}
                className={cn(
                  "w-10 h-10 min-w-[40px] min-h-[40px] rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 transition-colors touch-manipulation",
                  iconColor === null && "ring-2 ring-primary ring-offset-2"
                )}
                title={language === "uz" ? "Rangsiz" : "No color"}
              />
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setIconColor(color.value)}
                  className={cn(
                    "w-10 h-10 min-w-[40px] min-h-[40px] rounded-full transition-transform hover:scale-110 touch-manipulation",
                    color.bg,
                    iconColor === color.value && "ring-2 ring-primary ring-offset-2"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Circle Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              {language === "uz" ? "Doira nomi" : "Circle Name"} *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === "uz" ? "Masalan: IELTS guruhi" : "e.g. IELTS Study Group"}
              maxLength={50}
              className="min-h-[48px]"
            />
          </div>

          {/* Template */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{language === "uz" ? "Shablon" : "Template"}</Label>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger className="min-h-[48px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg z-50">
                {TEMPLATES.map((t) => (
                  <SelectItem 
                    key={t.value} 
                    value={t.value}
                    className="min-h-[44px] py-3 touch-manipulation"
                  >
                    <span className="flex items-center gap-2">
                      <span>{t.emoji}</span>
                      <span>{language === "uz" ? t.labelUz : t.labelEn}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Goal */}
          <div className="space-y-2">
            <Label htmlFor="goal" className="text-sm font-medium">
              {language === "uz" ? "Maqsad (ixtiyoriy)" : "Goal (optional)"}
            </Label>
            <Input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={language === "uz" ? "Masalan: IELTS 7.0 olish" : "e.g. Achieve IELTS 7.0"}
              maxLength={100}
              className="min-h-[48px]"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={loading}
              className="h-12 min-h-[48px] touch-manipulation text-base font-medium flex-1 order-2 sm:order-1"
            >
              {language === "uz" ? "Bekor" : "Cancel"}
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={loading || !name.trim()}
              className="h-12 min-h-[48px] touch-manipulation text-base font-medium flex-1 order-1 sm:order-2"
            >
              {loading
                ? language === "uz" ? "Yaratilmoqda..." : "Creating..."
                : language === "uz" ? "Yaratish" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
