import { X } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

interface EditingIndicatorProps {
  onCancel: () => void;
}

export function EditingIndicator({ onCancel }: EditingIndicatorProps) {
  const { language, t } = useTranslation();

  const editingLabel = language === "uz" 
    ? "Tahrirlanyapti… Yuborsangiz yangi javob yaratiladi" 
    : language === "en" 
    ? "Editing… Sending will create a new response" 
    : language === "ru" 
    ? "Редактирование… Отправка создаст новый ответ" 
    : "Düzenleniyor… Gönderim yeni yanıt oluşturacak";

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl mb-2 animate-fade-in">
      <span className="text-xs text-primary font-medium">{editingLabel}</span>
      <button
        onClick={onCancel}
        className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg transition-colors"
      >
        <X className="w-3 h-3" />
        {t('actions.cancel')}
      </button>
    </div>
  );
}
