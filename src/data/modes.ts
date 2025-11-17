import { ModeInfo } from "@/types/chat";

export const CHAT_MODES: ModeInfo[] = [
  {
    id: "general",
    title: "Umumiy suhbat",
    subtitle: "Har qanday savol uchun",
    icon: "💬",
    quickSuggestions: [
      "Menga bir foydali maslahat ber",
      "Bugun nimani o'rganishim mumkin?",
    ],
  },
  {
    id: "ielts",
    title: "IELTS va Ingliz tili",
    subtitle: "Ingliz tilini yaxshilash va IELTSga tayyorgarlik",
    icon: "🎓",
    quickSuggestions: [
      "IELTS speaking savol ber",
      "Ingliz matnni tekshir",
    ],
  },
  {
    id: "homework",
    title: "Uy vazifasi va fanlar",
    subtitle: "Matematika, fizika va boshqa fanlar bo'yicha yordam",
    icon: "📚",
    quickSuggestions: [
      "Matematik misolni tushuntir",
      "Formulani sodda tilda tushuntir",
    ],
  },
  {
    id: "job",
    title: "Ish va Rezyume",
    subtitle: "Rezyume yaratish, suhbatga tayyorgarlik va ish topishda yordam",
    icon: "💼",
    quickSuggestions: [
      "Rezyumeni yaxshilab ber",
      "Ish suhbatiga tayyorla",
    ],
  },
  {
    id: "daily",
    title: "Kundalik Hayot Yordami",
    subtitle: "Retseptlar, sayohat, maslahatlar va kundalik hayot yordami",
    icon: "🏠",
    quickSuggestions: [
      "Bugun uchun retsept ber",
      "Sog'lom turmush bo'yicha maslahat ber",
    ],
  },
  {
    id: "business",
    title: "Biznes va Marketing",
    subtitle: "Marketing, kontent yaratish va biznes g'oyalar",
    icon: "📈",
    quickSuggestions: [
      "Marketing posti yozib ber",
      "Biznes g'oya taklif qil",
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
];

export function getModeInfo(modeId: string): ModeInfo | undefined {
  return CHAT_MODES.find((mode) => mode.id === modeId);
}
