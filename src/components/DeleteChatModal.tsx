import { useTranslation } from "@/i18n/LanguageProvider";

interface DeleteChatModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteChatModal({ open, onConfirm, onCancel }: DeleteChatModalProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-sm mx-4 rounded-2xl bg-card border border-border/40 p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {t('delete.title')}
        </h2>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          {t('delete.description')}
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-secondary/50 text-foreground hover:bg-secondary transition-all active:scale-[0.97]"
            onClick={onCancel}
          >
            {t('delete.cancel')}
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.97] transition-all"
            onClick={onConfirm}
          >
            {t('delete.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
