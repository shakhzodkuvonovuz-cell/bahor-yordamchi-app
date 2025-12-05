import { FileText, List, Table, ClipboardList, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageProvider";

interface OutputFormatButtonsProps {
  onFormatRequest: (prompt: string) => void;
  disabled?: boolean;
}

const formats = [
  { key: "short", icon: MessageSquare, labelKey: "chat.formatShort", prompt: "Shu javobni qisqaroq qilib yoz." },
  { key: "formal", icon: FileText, labelKey: "chat.formatFormal", prompt: "Shu javobni rasmiy uslubda qayta yoz." },
  { key: "list", icon: List, labelKey: "chat.formatList", prompt: "Shu javobni ro'yxat shaklida yoz." },
  { key: "plan", icon: ClipboardList, labelKey: "chat.formatPlan", prompt: "Shu javobni reja shaklida yoz." },
  { key: "table", icon: Table, labelKey: "chat.formatTable", prompt: "Shu javobni jadval shaklida yoz." },
];

export default function OutputFormatButtons({ onFormatRequest, disabled }: OutputFormatButtonsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {formats.map(({ key, icon: Icon, labelKey, prompt }) => (
        <Button
          key={key}
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onFormatRequest(prompt)}
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-lg"
        >
          <Icon className="w-3.5 h-3.5 mr-1" />
          {t(labelKey)}
        </Button>
      ))}
    </div>
  );
}
