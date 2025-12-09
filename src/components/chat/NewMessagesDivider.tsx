import { useTranslation } from "@/i18n/LanguageProvider";

interface NewMessagesDividerProps {
  visible: boolean;
}

export function NewMessagesDivider({ visible }: NewMessagesDividerProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 my-4 animate-fade-in">
      <div className="flex-1 h-px bg-primary/30" />
      <span className="text-xs font-medium text-primary/70 px-2">{t('circleChat.newMessages')}</span>
      <div className="flex-1 h-px bg-primary/30" />
    </div>
  );
}
