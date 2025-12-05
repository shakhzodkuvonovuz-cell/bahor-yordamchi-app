import { useState } from "react";
import { Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/i18n/LanguageProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ReportAnswerModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  threadId?: string;
}

const REPORT_REASONS = [
  { id: 'incorrect', labelKey: 'report.incorrect' },
  { id: 'harmful', labelKey: 'report.harmful' },
  { id: 'offensive', labelKey: 'report.offensive' },
  { id: 'other', labelKey: 'report.other' },
];

export default function ReportAnswerModal({
  isOpen,
  onClose,
  messageId,
  threadId,
}: ReportAnswerModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: t('report.selectReason') || "Sababni tanlang",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Try to insert into answer_reports table
      const { error } = await supabase
        .from('beta_feedback')
        .insert({
          user_id: user?.id,
          category: `report_${reason}`,
          message: `Message ID: ${messageId}\nThread ID: ${threadId || 'N/A'}\nReason: ${reason}\nNote: ${note}`,
          route: window.location.pathname,
          user_agent: navigator.userAgent,
        });

      if (error) throw error;

      toast({
        title: t('report.success') || "Xabar yuborildi. Rahmat!",
      });
      onClose();
      setReason('');
      setNote('');
    } catch (err) {
      console.error('Report error:', err);
      toast({
        title: t('report.error') || "Xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            {t('report.title') || "Javobni bildirish"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t('report.reason') || "Sabab"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  className={`p-3 rounded-xl text-sm text-left transition-all ${
                    reason === r.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-secondary/80 text-foreground'
                  }`}
                >
                  {t(r.labelKey) || r.id}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t('report.note') || "Qo'shimcha izoh (ixtiyoriy)"}
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('report.notePlaceholder') || "Batafsil yozing..."}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {t('common.cancel') || "Bekor qilish"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? t('common.loading') || "Yuklanmoqda..." : t('report.submit') || "Yuborish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
