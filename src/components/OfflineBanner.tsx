import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useTranslation } from "@/i18n/LanguageProvider";

export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const { t } = useTranslation();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive/90 text-destructive-foreground px-4 py-2 flex items-center justify-center gap-2 text-sm animate-fade-in">
      <WifiOff className="w-4 h-4" />
      <span>{t('offline.message')}</span>
    </div>
  );
}