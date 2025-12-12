import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/LanguageProvider";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PremiumInterestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: "monthly" | "yearly";
}

export function PremiumInterestModal({ open, onOpenChange, plan }: PremiumInterestModalProps) {
  const { t } = useTranslation();
  const [contact, setContact] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;

    setLoading(true);
    try {
      // Try to save to database
      const { error } = await supabase.from("premium_waitlist").insert({
        contact: contact.trim(),
        name: name.trim() || null,
        plan: plan,
      });

      if (error) {
        // Fallback: save to localStorage and log
        console.log("Premium Interest Submission:", { contact, name, plan, timestamp: new Date().toISOString() });
        const existing = JSON.parse(localStorage.getItem("premium_waitlist") || "[]");
        existing.push({ contact, name, plan, timestamp: new Date().toISOString() });
        localStorage.setItem("premium_waitlist", JSON.stringify(existing));
      }

      setSubmitted(true);
    } catch (err) {
      // Fallback: save to localStorage and log
      console.log("Premium Interest Submission:", { contact, name, plan, timestamp: new Date().toISOString() });
      const existing = JSON.parse(localStorage.getItem("premium_waitlist") || "[]");
      existing.push({ contact, name, plan, timestamp: new Date().toISOString() });
      localStorage.setItem("premium_waitlist", JSON.stringify(existing));
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after modal closes
    setTimeout(() => {
      setSubmitted(false);
      setContact("");
      setName("");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {t('premium.interest.title') || "Premiumga qiziqasizmi?"}
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <p className="text-foreground font-medium mb-2">
              {t('premium.interest.success') || "Rahmat! Tez orada bog'lanamiz."}
            </p>
            <Button onClick={handleClose} variant="outline" className="mt-4">
              {t('button.close') || "Yopish"}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="contact" className="text-foreground">
                {t('premium.interest.contactLabel') || "Email yoki Telegram username"} *
              </Label>
              <Input
                id="contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="email@example.com yoki @username"
                required
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-muted-foreground">
                {t('premium.interest.nameLabel') || "Ism"} ({t('optional') || "ixtiyoriy"})
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ismingiz"
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={loading || !contact.trim()}>
              {loading ? "..." : (t('button.submit') || "Yuborish")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
