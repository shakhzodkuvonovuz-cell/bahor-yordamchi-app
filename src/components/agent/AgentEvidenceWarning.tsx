import { AlertTriangle, FileX } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "@/i18n/LanguageProvider";

interface AgentEvidenceWarningProps {
  type: "no-files" | "missing-evidence";
}

const translations: Record<string, Record<string, Record<string, string>>> = {
  "no-files": {
    title: {
      uz: "Fayllar kiritilmadi",
      en: "No files included",
      ru: "Файлы не включены",
      tr: "Dosya eklenmedi",
    },
    description: {
      uz: "Bu ishga hech qanday fayl kiritilmagan. Javoblar faqat umumiy bilimga asoslangan.",
      en: "No files were included in this run. Responses are based on general knowledge only.",
      ru: "Файлы не были включены в этот запуск. Ответы основаны только на общих знаниях.",
      tr: "Bu çalışmaya dosya eklenmedi. Yanıtlar yalnızca genel bilgiye dayalı.",
    },
  },
  "missing-evidence": {
    title: {
      uz: "Dalillar yetarli emas",
      en: "Insufficient evidence",
      ru: "Недостаточно доказательств",
      tr: "Yetersiz kanıt",
    },
    description: {
      uz: "Agent javobi talab qilingan dalillarni o'z ichiga olmaydi. Iltimos, qayta ishga tushiring.",
      en: "Agent response is missing required evidence. Please re-run.",
      ru: "Ответ агента не содержит требуемых доказательств. Пожалуйста, перезапустите.",
      tr: "Agent yanıtında gerekli kanıtlar eksik. Lütfen yeniden çalıştırın.",
    },
  },
};

export function AgentEvidenceWarning({ type }: AgentEvidenceWarningProps) {
  const { language } = useTranslation();
  const lang = language as string;

  const title = translations[type]?.title?.[lang] || translations[type]?.title?.en || "";
  const description = translations[type]?.description?.[lang] || translations[type]?.description?.en || "";

  return (
    <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/5 mb-3">
      {type === "no-files" ? (
        <FileX className="h-4 w-4 text-yellow-600" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
      )}
      <AlertDescription className="text-xs">
        <span className="font-medium text-yellow-700">{title}:</span>{" "}
        <span className="text-muted-foreground">{description}</span>
      </AlertDescription>
    </Alert>
  );
}
