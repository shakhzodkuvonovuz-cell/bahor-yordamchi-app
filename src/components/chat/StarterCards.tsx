import { 
  GraduationCap, 
  Code, 
  FileText, 
  Calendar, 
  Languages, 
  HelpCircle 
} from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

interface StarterCard {
  id: string;
  icon: React.ElementType;
  labelKey: string;
  prompt: string;
}

const STARTER_CARDS: StarterCard[] = [
  {
    id: 'ielts',
    icon: GraduationCap,
    labelKey: 'starter.ielts',
    prompt: "IELTS Task 2 uchun reja tuzib ber: ",
  },
  {
    id: 'english',
    icon: Languages,
    labelKey: 'starter.english',
    prompt: "Mening inglizcha matnimni tekshir va to'g'rilab ber: ",
  },
  {
    id: 'homework',
    icon: HelpCircle,
    labelKey: 'starter.homework',
    prompt: "Mavzuni tushuntirib ber: ",
  },
  {
    id: 'daily',
    icon: Calendar,
    labelKey: 'starter.daily',
    prompt: "Menga kundalik hayot uchun maslahat: ",
  },
  {
    id: 'cv',
    icon: FileText,
    labelKey: 'starter.cv',
    prompt: "Professional rezyume yozishga yordam ber: ",
  },
  {
    id: 'coding',
    icon: Code,
    labelKey: 'starter.coding',
    prompt: "Mana kod/masala, tushuntirib ber: ",
  },
];

interface StarterCardsProps {
  onSelect: (prompt: string) => void;
}

export default function StarterCards({ onSelect }: StarterCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">
        {t('starter.title') || "Boshlash kartalari"}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {STARTER_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onSelect(card.prompt)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/40 hover:border-primary/30 hover:bg-card/80 transition-all duration-200 group active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground text-center leading-tight">
                {t(card.labelKey) || card.id}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
