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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlan?: "monthly" | "yearly";
}

export function WaitlistModal({ open, onOpenChange, defaultPlan = "monthly" }: WaitlistModalProps) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [plan, setPlan] = useState<"monthly" | "yearly">(defaultPlan);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contact.trim()) {
      toast.error("Email yoki Telegram username kiriting");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("premium_waitlist").insert({
        name: name.trim() || null,
        contact: contact.trim(),
        plan,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success("Rahmat! Tez orada bog'lanamiz.");
    } catch (err) {
      console.error("Waitlist error:", err);
      toast.error("Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setSuccess(false);
      setName("");
      setContact("");
      setPlan(defaultPlan);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {success ? "Muvaffaqiyatli!" : "Premiumga qiziqasizmi?"}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-4">
              Rahmat! Tez orada bog'lanamiz.
            </p>
            <Button onClick={handleClose} className="rounded-xl">
              Yopish
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ism (ixtiyoriy)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ismingiz"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Email yoki Telegram username *</Label>
              <Input
                id="contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="email@example.com yoki @username"
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Tarif</Label>
              <RadioGroup value={plan} onValueChange={(v) => setPlan(v as "monthly" | "yearly")} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="cursor-pointer">Oylik (49,000 UZS)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yearly" id="yearly" />
                  <Label htmlFor="yearly" className="cursor-pointer">Yillik (340,000 UZS)</Label>
                </div>
              </RadioGroup>
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl font-medium" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Yuborilmoqda...
                </>
              ) : (
                "Yuborish"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
