// Trace step labels for i18n
import type { TraceStep } from '@/types/trace';

type Lang = 'uz' | 'en' | 'ru' | 'tr';

const labels: Record<TraceStep, Record<Lang, string>> = {
  // New ThinkBar steps
  preparing: {
    uz: "Tayyorlanmoqda",
    en: "Preparing",
    ru: "Подготовка",
    tr: "Hazırlanıyor",
  },
  new_chat: {
    uz: "Yangi chat yaratilmoqda",
    en: "Creating new chat",
    ru: "Создание нового чата",
    tr: "Yeni sohbet oluşturuluyor",
  },
  uploading: {
    uz: "Fayllar yuklanmoqda",
    en: "Uploading files",
    ru: "Загрузка файлов",
    tr: "Dosyalar yükleniyor",
  },
  parsing_files: {
    uz: "Fayllar o'qilmoqda",
    en: "Reading files",
    ru: "Чтение файлов",
    tr: "Dosyalar okunuyor",
  },
  web_search: {
    uz: "Internetdan qidirmoqda",
    en: "Searching the web",
    ru: "Поиск в интернете",
    tr: "Web'de aranıyor",
  },
  selecting_model: {
    uz: "Model tanlanmoqda",
    en: "Selecting model",
    ru: "Выбор модели",
    tr: "Model seçiliyor",
  },
  thinking: {
    uz: "Fikrlamoqda",
    en: "Thinking",
    ru: "Размышляет",
    tr: "Düşünüyor",
  },
  writing: {
    uz: "Javob yozilmoqda",
    en: "Writing response",
    ru: "Пишет ответ",
    tr: "Yanıt yazılıyor",
  },
  saving: {
    uz: "Saqlanmoqda",
    en: "Saving",
    ru: "Сохранение",
    tr: "Kaydediliyor",
  },
  generating_image: {
    uz: "Rasm yaratilmoqda",
    en: "Generating image",
    ru: "Создание изображения",
    tr: "Görsel oluşturuluyor",
  },
  delivering: {
    uz: "Yakunlanmoqda",
    en: "Finalizing",
    ru: "Завершение",
    tr: "Tamamlanıyor",
  },
  // Legacy steps (backwards compatibility)
  analyzing_request: {
    uz: "So'rovni tushunmoqda",
    en: "Understanding request",
    ru: "Анализ запроса",
    tr: "İstek analiz ediliyor",
  },
  image_analysis: {
    uz: "Rasmni tahlil qilmoqda",
    en: "Analyzing image",
    ru: "Анализ изображения",
    tr: "Görsel analiz ediliyor",
  },
  reading_files: {
    uz: "Kontekstni tekshirmoqda",
    en: "Checking context",
    ru: "Проверка контекста",
    tr: "Bağlam kontrol ediliyor",
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
    ru: "Форматирование",
    tr: "Biçimlendiriliyor",
  },
};

export function getTraceStepLabel(step: TraceStep, lang: string): string {
  const l = (lang as Lang) || 'uz';
  return labels[step]?.[l] || labels[step]?.en || step;
}

export function getTraceStepIcon(step: TraceStep): string {
  const icons: Record<TraceStep, string> = {
    preparing: '⚙️',
    new_chat: '💬',
    uploading: '📤',
    parsing_files: '📄',
    web_search: '🌐',
    selecting_model: '🎯',
    thinking: '💭',
    writing: '✍️',
    saving: '💾',
    generating_image: '🎨',
    delivering: '✅',
    // Legacy
    analyzing_request: '🔍',
    image_analysis: '📷',
    reading_files: '📚',
    drafting_answer: '✍️',
    safety_check: '🛡️',
    formatting: '✨',
  };
  return icons[step] || '⚡';
}

// UI labels for ThinkBar
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
  details: string;
  showDetails: string;
  hideDetails: string;
  model: string;
  modelFast: string;
  modelReasoner: string;
  files: string;
  filesCount: string;
  charsExtracted: string;
  webSearch: string;
  searchUsed: string;
  searchNotUsed: string;
  sourcesCount: string;
  imageGen: string;
  imageCreated: string;
  imageNotCreated: string;
  saveStatus: string;
  localOk: string;
  cloudOk: string;
  cloudFail: string;
  elapsed: string;
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
    details: "Tafsilotlar",
    showDetails: "Tafsilotlarni ko'rsatish",
    hideDetails: "Tafsilotlarni yashirish",
    model: "Model",
    modelFast: "Tez",
    modelReasoner: "Aqlli",
    files: "Fayllar",
    filesCount: "ta fayl",
    charsExtracted: "belgi o'qildi",
    webSearch: "Web qidiruv",
    searchUsed: "Ishlatildi",
    searchNotUsed: "Ishlatilmadi",
    sourcesCount: "ta manba",
    imageGen: "Rasm yaratish",
    imageCreated: "Yaratildi",
    imageNotCreated: "Yaratilmadi",
    saveStatus: "Saqlash",
    localOk: "Lokal ✓",
    cloudOk: "Cloud ✓",
    cloudFail: "Cloud ✗",
    elapsed: "Vaqt",
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
    details: "Details",
    showDetails: "Show details",
    hideDetails: "Hide details",
    model: "Model",
    modelFast: "Fast",
    modelReasoner: "Reasoner",
    files: "Files",
    filesCount: "files",
    charsExtracted: "chars extracted",
    webSearch: "Web search",
    searchUsed: "Used",
    searchNotUsed: "Not used",
    sourcesCount: "sources",
    imageGen: "Image generation",
    imageCreated: "Created",
    imageNotCreated: "Not created",
    saveStatus: "Save status",
    localOk: "Local ✓",
    cloudOk: "Cloud ✓",
    cloudFail: "Cloud ✗",
    elapsed: "Elapsed",
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
    details: "Детали",
    showDetails: "Показать детали",
    hideDetails: "Скрыть детали",
    model: "Модель",
    modelFast: "Быстрая",
    modelReasoner: "Умная",
    files: "Файлы",
    filesCount: "файлов",
    charsExtracted: "символов извлечено",
    webSearch: "Веб-поиск",
    searchUsed: "Использован",
    searchNotUsed: "Не использован",
    sourcesCount: "источников",
    imageGen: "Генерация изображения",
    imageCreated: "Создано",
    imageNotCreated: "Не создано",
    saveStatus: "Статус сохранения",
    localOk: "Локально ✓",
    cloudOk: "Облако ✓",
    cloudFail: "Облако ✗",
    elapsed: "Время",
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
    details: "Detaylar",
    showDetails: "Detayları göster",
    hideDetails: "Detayları gizle",
    model: "Model",
    modelFast: "Hızlı",
    modelReasoner: "Akıllı",
    files: "Dosyalar",
    filesCount: "dosya",
    charsExtracted: "karakter çıkarıldı",
    webSearch: "Web araması",
    searchUsed: "Kullanıldı",
    searchNotUsed: "Kullanılmadı",
    sourcesCount: "kaynak",
    imageGen: "Görsel oluşturma",
    imageCreated: "Oluşturuldu",
    imageNotCreated: "Oluşturulmadı",
    saveStatus: "Kayıt durumu",
    localOk: "Yerel ✓",
    cloudOk: "Bulut ✓",
    cloudFail: "Bulut ✗",
    elapsed: "Süre",
  },
};

export function getUILabels(lang: string) {
  return traceUILabels[(lang as Lang) || 'uz'] || traceUILabels.uz;
}
