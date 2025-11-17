import { ModeInfo } from "@/types/chat";

// Top priority modes - shown in "Asosiy imkoniyatlar" section
export const PRIMARY_MODES: ModeInfo[] = [
  {
    id: "general",
    title: "Umumiy suhbat",
    subtitle: "Har qanday savol va suhbat uchun",
    icon: "💬",
    quickSuggestions: [
      "Menga bir foydali maslahat ber",
      "Bugun nimani o'rganishim mumkin?",
    ],
  },
  {
    id: "tech",
    title: "Texnologiya va Kod",
    subtitle: "Kod yozish, dasturlash va texnologiya yordami",
    icon: "💻",
    quickSuggestions: [
      "Bu kodni tushuntirib ber",
      "Dasturlashni o'rgat",
    ],
  },
  {
    id: "daily",
    title: "Kundalik Hayot Yordami",
    subtitle: "Retseptlar, maslahatlar va kundalik hayot",
    icon: "🏠",
    quickSuggestions: [
      "Bugun uchun retsept ber",
      "Sog'lom turmush bo'yicha maslahat ber",
    ],
  },
  {
    id: "business",
    title: "Biznes va Marketing",
    subtitle: "Biznes g'oyalari va marketing kontenti",
    icon: "📈",
    quickSuggestions: [
      "Marketing posti yozib ber",
      "Biznes g'oya taklif qil",
    ],
  },
];

// Learning and development modes - shown in "O'qish va rivojlanish" section
export const LEARNING_MODES: ModeInfo[] = [
  {
    id: "ielts",
    title: "Ingliz tili va IELTS",
    subtitle: "Ingliz tili va IELTSga tayyorgarlik",
    icon: "🎓",
    quickSuggestions: [
      "IELTS speaking savol ber",
      "Ingliz matnni tekshir",
    ],
  },
  {
    id: "homework",
    title: "Uy vazifasi va fanlar",
    subtitle: "Maktab va universitet fanlari bo'yicha yordam",
    icon: "📚",
    quickSuggestions: [
      "Matematik misolni tushuntir",
      "Formulani sodda tilda tushuntir",
    ],
  },
  {
    id: "job",
    title: "Ish va Rezyume",
    subtitle: "Rezyume, suhbat va ish topishda yordam",
    icon: "💼",
    quickSuggestions: [
      "Rezyumeni yaxshilab ber",
      "Ish suhbatiga tayyorla",
    ],
  },
  {
    id: "religion",
    title: "Din va Ma'naviyat",
    subtitle: "Umumiy diniy va ma'naviy ma'lumotlar",
    icon: "☪️",
    quickSuggestions: [
      "Bugungi kun uchun qisqa ma'naviy nasihat ber",
      "Hadis yoki hikmatdan qisqa iqtibos yozib ber",
    ],
  },
];

// All modes combined for backwards compatibility
export const CHAT_MODES: ModeInfo[] = [...PRIMARY_MODES, ...LEARNING_MODES];

export function getModeInfo(modeId: string): ModeInfo | undefined {
  return CHAT_MODES.find((mode) => mode.id === modeId);
}
