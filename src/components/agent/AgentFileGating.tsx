import { AlertCircle, Loader2, RefreshCw, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from "@/i18n/LanguageProvider";
import type { FileReadinessResult } from "@/hooks/useAgentFileStatus";

interface AgentFileGatingProps {
  fileReadiness: FileReadinessResult;
  onRetryExtraction: () => void;
  onRemoveFilesFromRun: () => void;
  isRetrying?: boolean;
}

const translations: Record<string, Record<string, string>> = {
  title: {
    uz: "Fayllar hali tayyor emas",
    en: "Files are not ready yet",
    ru: "Файлы ещё не готовы",
    tr: "Dosyalar henüz hazır değil",
  },
  processing: {
    uz: "Fayllar o'qilmoqda. Agent ular tayyor bo'lgach boshlanadi.",
    en: "Files are being processed. Agent will start once they are ready.",
    ru: "Файлы обрабатываются. Агент запустится, когда они будут готовы.",
    tr: "Dosyalar işleniyor. Hazır olduklarında Agent başlayacak.",
  },
  failed: {
    uz: "Ba'zi fayllar o'qilmadi. Qayta urinib ko'ring yoki ularsiz davom eting.",
    en: "Some files failed to process. Retry or continue without them.",
    ru: "Некоторые файлы не удалось обработать. Повторите или продолжите без них.",
    tr: "Bazı dosyalar işlenemedi. Yeniden deneyin veya onlarsız devam edin.",
  },
  retry: {
    uz: "Qayta urinish",
    en: "Retry extraction",
    ru: "Повторить извлечение",
    tr: "Yeniden dene",
  },
  removeFiles: {
    uz: "Faylsiz davom etish",
    en: "Continue without files",
    ru: "Продолжить без файлов",
    tr: "Dosyasız devam et",
  },
  processingCount: {
    uz: "ta fayl o'qilmoqda",
    en: "files processing",
    ru: "файлов обрабатывается",
    tr: "dosya işleniyor",
  },
  failedCount: {
    uz: "ta fayl o'qilmadi",
    en: "files failed",
    ru: "файлов не удалось",
    tr: "dosya başarısız",
  },
};

export function AgentFileGating({
  fileReadiness,
  onRetryExtraction,
  onRemoveFilesFromRun,
  isRetrying = false,
}: AgentFileGatingProps) {
  const { language } = useTranslation();
  const lang = language as string;

  const t = (key: string) => translations[key]?.[lang] || translations[key]?.en || key;

  // Don't show if all files are ready or no files
  if (fileReadiness.allFilesReady || fileReadiness.fileStatuses.length === 0) {
    return null;
  }

  const isProcessing = fileReadiness.hasProcessingFiles;
  const hasFailed = fileReadiness.hasFailedFiles && !isProcessing;

  return (
    <Alert 
      variant={hasFailed ? "destructive" : "default"} 
      className={`${isProcessing ? "border-yellow-500/50 bg-yellow-500/5" : ""}`}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
      ) : hasFailed ? (
        <AlertCircle className="h-4 w-4" />
      ) : (
        <FileX className="h-4 w-4" />
      )}
      
      <AlertTitle className="text-sm font-medium">
        {t("title")}
      </AlertTitle>
      
      <AlertDescription className="mt-1 space-y-2">
        <p className="text-xs text-muted-foreground">
          {isProcessing ? t("processing") : t("failed")}
        </p>
        
        <div className="flex items-center gap-2 text-xs">
          {fileReadiness.processingCount > 0 && (
            <span className="text-yellow-600">
              {fileReadiness.processingCount} {t("processingCount")}
            </span>
          )}
          {fileReadiness.failedCount > 0 && (
            <span className="text-destructive">
              {fileReadiness.failedCount} {t("failedCount")}
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetryExtraction}
            disabled={isRetrying}
            className="h-7 text-xs gap-1.5"
          >
            {isRetrying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {t("retry")}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemoveFilesFromRun}
            className="h-7 text-xs gap-1.5"
          >
            <FileX className="h-3 w-3" />
            {t("removeFiles")}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
