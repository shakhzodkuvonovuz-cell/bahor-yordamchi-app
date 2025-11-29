import { useTranslation } from "@/i18n/LanguageProvider";

interface DeleteChatModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteChatModal({ open, onConfirm, onCancel }: DeleteChatModalProps) {
  const { language } = useTranslation();

  if (!open) return null;

  const getText = () => {
    switch (language) {
      case "en":
        return {
          title: "Delete chat?",
          description: "This will permanently delete this chat history. Do you want to continue?",
          cancel: "Cancel",
          confirm: "Delete"
        };
      case "ru":
        return {
          title: "Удалить чат?",
          description: "Это действие полностью удалит историю этого чата. Вы хотите продолжить?",
          cancel: "Отмена",
          confirm: "Удалить"
        };
      case "tr":
        return {
          title: "Sohbet silinsin mi?",
          description: "Bu işlem bu sohbet geçmişini kalıcı olarak silecek. Devam etmek istiyor musunuz?",
          cancel: "İptal",
          confirm: "Sil"
        };
      default: // uz
        return {
          title: "Suhbat o'chirilsinmi?",
          description: "Bu amaliyot ushbu suhbat tarixini butunlay o'chiradi. Davom etishni xohlaysizmi?",
          cancel: "Bekor qilish",
          confirm: "O'chirish"
        };
    }
  };

  const text = getText();

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
          {text.title}
        </h2>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          {text.description}
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-secondary/50 text-foreground hover:bg-secondary transition-all active:scale-[0.97]"
            onClick={onCancel}
          >
            {text.cancel}
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.97] transition-all"
            onClick={onConfirm}
          >
            {text.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
