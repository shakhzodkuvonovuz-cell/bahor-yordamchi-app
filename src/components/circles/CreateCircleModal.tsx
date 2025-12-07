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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === "uz" ? "Yangi doira yaratish" : "Create New Circle"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Emoji Picker */}
          <div className="space-y-2">
            <Label>{language === "uz" ? "Emoji" : "Icon"}</Label>
            <div className="flex items-center gap-3">
              {/* Selected emoji preview */}
              <div 
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2 border-primary/30",
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
                      "w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-secondary transition-colors",
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
              className="text-lg"
              maxLength={10}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>{language === "uz" ? "Rang (ixtiyoriy)" : "Color (optional)"}</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIconColor(null)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 transition-colors",
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
                    "w-8 h-8 rounded-full transition-transform hover:scale-110",
                    color.bg,
                    iconColor === color.value && "ring-2 ring-primary ring-offset-2"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              {language === "uz" ? "Doira nomi" : "Circle Name"} *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === "uz" ? "Masalan: IELTS guruhi" : "e.g. IELTS Study Group"}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === "uz" ? "Shablon" : "Template"}</Label>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <span>{t.emoji}</span>
                      <span>{language === "uz" ? t.labelUz : t.labelEn}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">
              {language === "uz" ? "Maqsad (ixtiyoriy)" : "Goal (optional)"}
            </Label>
            <Input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={language === "uz" ? "Masalan: IELTS 7.0 olish" : "e.g. Achieve IELTS 7.0"}
              maxLength={100}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {language === "uz" ? "Bekor" : "Cancel"}
          </Button>
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading
              ? language === "uz" ? "Yaratilmoqda..." : "Creating..."
              : language === "uz" ? "Yaratish" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
