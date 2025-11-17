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
];

export function getModeInfo(modeId: string): ModeInfo | undefined {
  return CHAT_MODES.find((mode) => mode.id === modeId);
}
