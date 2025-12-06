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

interface CreateSpaceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const TEMPLATES = [
  { value: "study", labelUz: "O'qish", labelEn: "Study" },
  { value: "work", labelUz: "Ish", labelEn: "Work" },
  { value: "family", labelUz: "Oila / Hayot", labelEn: "Family / Life" },
  { value: "creator", labelUz: "Kreator", labelEn: "Creator" },
  { value: "biz", labelUz: "Kichik biznes", labelEn: "Small Business" },
  { value: "gaming", labelUz: "O'yin", labelEn: "Gaming" },
  { value: "general", labelUz: "Umumiy", labelEn: "General" },
];

export default function CreateSpaceModal({ open, onClose, onCreated }: CreateSpaceModalProps) {
  const { user } = useAuth();
  const { language } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("general");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(language === "uz" ? "Xona nomini kiriting" : "Please enter a space name");
      return;
    }

    setLoading(true);
    try {
      // Use getUser() for reliable server-side auth verification
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
          ? "Xona yaratish uchun kirish kerak" 
          : "Please log in to create a space");
        setLoading(false);
        onClose();
        navigate("/auth?next=/spaces");
        return;
      }

      const { data, error } = await supabase
        .from("spaces")
        .insert({
          name: name.trim(),
          template,
          goal: goal.trim() || null,
          owner_id: authUser.id,
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

      toast.success(language === "uz" ? "Xona yaratildi!" : "Space created!");
      setName("");
      setTemplate("general");
      setGoal("");
      onClose();
      onCreated();
      
      if (data?.id) {
        navigate(`/spaces/${data.id}`);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === "uz" ? "Yangi xona yaratish" : "Create New Space"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              {language === "uz" ? "Xona nomi" : "Space Name"} *
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
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {language === "uz" ? t.labelUz : t.labelEn}
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
