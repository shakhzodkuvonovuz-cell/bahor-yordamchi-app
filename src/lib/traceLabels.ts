// Trace step labels for i18n
import type { TraceStep } from '@/types/trace';

type Lang = 'uz' | 'en' | 'ru' | 'tr';

const labels: Record<TraceStep, Record<Lang, string>> = {
  thinking: {
    uz: "O'ylanmoqda",
    en: "Thinking",
    ru: "Размышление",
    tr: "Düşünüyor",
  },
  analyzing_request: {
    uz: "So'rov tahlil qilinmoqda",
    en: "Analyzing request",
    ru: "Анализ запроса",
    tr: "İstek analiz ediliyor",
  },
  image_analysis: {
    uz: "Rasm tahlil qilinmoqda",
    en: "Analyzing image",
    ru: "Анализ изображения",
    tr: "Görsel analiz ediliyor",
  },
  web_search: {
    uz: "Internetdan qidirilmoqda",
    en: "Searching the web",
    ru: "Поиск в интернете",
    tr: "Web'de aranıyor",
  },
  reading_files: {
    uz: "Fayllar o'qilmoqda",
    en: "Reading files",
    ru: "Чтение файлов",
    tr: "Dosyalar okunuyor",
  },
  drafting_answer: {
    uz: "Javob tayyorlanmoqda",
    en: "Drafting answer",
    ru: "Подготовка ответа",
    tr: "Cevap hazırlanıyor",
  },
  safety_check: {
    uz: "Xavfsizlik tekshiruvi",
    en: "Safety check",
    ru: "Проверка безопасности",
    tr: "Güvenlik kontrolü",
  },
  formatting: {
    uz: "Formatlash",
    en: "Formatting",
    ru: "Форматирование",
    tr: "Biçimlendirme",
  },
  saving: {
    uz: "Saqlanmoqda",
    en: "Saving",
    ru: "Сохранение",
    tr: "Kaydediliyor",
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
    reading_files: '📄',
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
  process: string;
  totalTime: string;
  sources: string;
  noSources: string;
  close: string;
}> = {
  uz: {
    reasoned: "O'ylandi",
    reasoning: "O'ylanmoqda",
    process: "Jarayon",
    totalTime: "Umumiy vaqt",
    sources: "Manbalar",
    noSources: "Tashqi manbalar ishlatilmadi",
    close: "Yopish",
  },
  en: {
    reasoned: "Reasoned for",
    reasoning: "Reasoning",
    process: "Process",
    totalTime: "Total time",
    sources: "Sources",
    noSources: "No external sources used",
    close: "Close",
  },
  ru: {
    reasoned: "Размышлял",
    reasoning: "Размышляю",
    process: "Процесс",
    totalTime: "Общее время",
    sources: "Источники",
    noSources: "Внешние источники не использовались",
    close: "Закрыть",
  },
  tr: {
    reasoned: "Düşündü",
    reasoning: "Düşünüyor",
    process: "Süreç",
    totalTime: "Toplam süre",
    sources: "Kaynaklar",
    noSources: "Harici kaynak kullanılmadı",
    close: "Kapat",
  },
};

export function getUILabels(lang: string) {
  return traceUILabels[(lang as Lang) || 'uz'] || traceUILabels.uz;
}
