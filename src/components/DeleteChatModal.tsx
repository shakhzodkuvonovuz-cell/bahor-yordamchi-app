import { useLanguage } from "@/hooks/useLanguage";

interface DeleteChatModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteChatModal({ open, onConfirm, onCancel }: DeleteChatModalProps) {
  const { language } = useLanguage();

  if (!open) return null;

  const getText = () => {
    switch (language) {
      case "en":
        return {
          title: "Delete chat?",
          description: "This action will completely delete this chat history. Do you want to continue?",
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
          description: "Bu işlem bu sohbet geçmişini tamamen silecektir. Devam etmek istiyor musunuz?",
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-sm mx-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
          {text.title}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {text.description}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            onClick={onCancel}
          >
            {text.cancel}
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded-full bg-red-500 text-white hover:bg-red-600 active:scale-95 transition"
            onClick={onConfirm}
          >
            {text.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
