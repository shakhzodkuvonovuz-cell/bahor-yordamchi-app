// Trace step labels for i18n
import type { TraceStep } from '@/types/trace';

type Lang = 'uz' | 'en' | 'ru' | 'tr';

const labels: Record<TraceStep, Record<Lang, string>> = {
  thinking: {
    uz: "Fikrlamoqda",
    en: "Thinking",
    ru: "Размышляет",
    tr: "Düşünüyor",
  },
  analyzing_request: {
    uz: "So'rovni tushunmoqda",
    en: "Understanding request",
    ru: "Анализирует запрос",
    tr: "İsteği anlıyor",
  },
  image_analysis: {
    uz: "Rasmni tahlil qilmoqda",
    en: "Analyzing image",
    ru: "Анализирует изображение",
    tr: "Görsel analiz ediyor",
  },
  web_search: {
    uz: "Internetdan qidirmoqda",
    en: "Searching the web",
    ru: "Ищет в интернете",
    tr: "Web'de arıyor",
  },
  reading_files: {
    uz: "Kontekstni tekshirmoqda",
    en: "Checking context",
    ru: "Проверяет контекст",
    tr: "Bağlamı kontrol ediyor",
  },
  drafting_answer: {
    uz: "Javobni yozmoqda",
    en: "Writing answer",
    ru: "Пишет ответ",
    tr: "Cevap yazıyor",
  },
  safety_check: {
    uz: "Xavfsizlik tekshiruvi",
    en: "Safety check",
    ru: "Проверка безопасности",
    tr: "Güvenlik kontrolü",
  },
  formatting: {
    uz: "Javobni tartiblayapti",
    en: "Formatting response",
    ru: "Форматирует ответ",
    tr: "Yanıtı biçimlendiriyor",
  },
  saving: {
    uz: "Yakunlamoqda",
    en: "Finalizing",
    ru: "Завершает",
    tr: "Tamamlanıyor",
  },
};

export function getTraceStepLabel(step: TraceStep, lang: string): string {
  const l = (lang as Lang) || 'uz';
  return labels[step]?.[l] || labels[step]?.en || step;
}

export function getTraceStepIcon(step: TraceStep): string {
  const icons: Record<TraceStep, string> = {
    thinking: '💭',
    analyzing_request: '🔍',
    image_analysis: '📷',
    web_search: '🌐',
    reading_files: '📚',
    drafting_answer: '✍️',
    safety_check: '🛡️',
    formatting: '✨',
    saving: '💾',
  };
  return icons[step] || '⚡';
}

// UI labels
export const traceUILabels: Record<Lang, {
  reasoned: string;
  reasoning: string;
  generating: string;
  doneIn: string;
  process: string;
  totalTime: string;
  sources: string;
  noSources: string;
  close: string;
  timeline: string;
}> = {
  uz: {
    reasoned: "Tayyor",
    reasoning: "Ishlayapti",
    generating: "Generatsiya",
    doneIn: "Tayyor",
    process: "Jarayon",
    totalTime: "Umumiy vaqt",
    sources: "Manbalar",
    noSources: "Tashqi manbalar ishlatilmadi",
    close: "Yopish",
    timeline: "Qadamlar",
  },
  en: {
    reasoned: "Done",
    reasoning: "Working",
    generating: "Generating",
    doneIn: "Done in",
    process: "Process",
    totalTime: "Total time",
    sources: "Sources",
    noSources: "No external sources used",
    close: "Close",
    timeline: "Steps",
  },
  ru: {
    reasoned: "Готово",
    reasoning: "Работает",
    generating: "Генерация",
    doneIn: "Готово за",
    process: "Процесс",
    totalTime: "Общее время",
    sources: "Источники",
    noSources: "Внешние источники не использовались",
    close: "Закрыть",
    timeline: "Шаги",
  },
  tr: {
    reasoned: "Tamamlandı",
    reasoning: "Çalışıyor",
    generating: "Oluşturuluyor",
    doneIn: "Tamamlandı",
    process: "Süreç",
    totalTime: "Toplam süre",
    sources: "Kaynaklar",
    noSources: "Harici kaynak kullanılmadı",
    close: "Kapat",
    timeline: "Adımlar",
  },
};

export function getUILabels(lang: string) {
  return traceUILabels[(lang as Lang) || 'uz'] || traceUILabels.uz;
}
