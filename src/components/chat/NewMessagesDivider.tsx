import { useTranslation } from "@/i18n/LanguageProvider";

interface NewMessagesDividerProps {
  visible: boolean;
}

export function NewMessagesDivider({ visible }: NewMessagesDividerProps) {
  const { language } = useTranslation();

  if (!visible) return null;

  const label = language === "uz" ? "Yangi xabarlar" : language === "en" ? "New messages" : language === "ru" ? "Новые сообщения" : "Yeni mesajlar";

  return (
    <div className="flex items-center gap-3 my-4 animate-fade-in">
      <div className="flex-1 h-px bg-primary/30" />
      <span className="text-xs font-medium text-primary/70 px-2">{label}</span>
      <div className="flex-1 h-px bg-primary/30" />
    </div>
  );
}
