/**
 * Bahor AI - Unified Limits Configuration
 * Single source of truth for all usage limits
 */

export type PlanType = 'dev_unlimited' | 'beta_premium' | 'free';

export interface PlanLimits {
  chatDaily: number;      // -1 = unlimited
  pdfMonthly: number;     // -1 = unlimited
  searchDaily: number;
  visionDaily: number;
  filesDaily: number;
}

export interface LimitConfig {
  free: PlanLimits;
  beta_premium: PlanLimits;
  dev_unlimited: PlanLimits;
}

// Beta mode flag - set to false to disable beta limits
export const BETA_LIMITS_ENABLED = true;

// Limit configurations by plan
export const LIMITS: LimitConfig = {
  free: {
    chatDaily: BETA_LIMITS_ENABLED ? 10 : 5,  // During beta: 10/day, after: 5/day
    pdfMonthly: 10,
    searchDaily: 0,
    visionDaily: 0,
    filesDaily: 0,
  },
  beta_premium: {
    chatDaily: 10,
    pdfMonthly: 50,
    searchDaily: 3,
    visionDaily: 3,
    filesDaily: 2,
  },
  dev_unlimited: {
    chatDaily: -1,
    pdfMonthly: -1,
    searchDaily: -1,
    visionDaily: -1,
    filesDaily: -1,
  },
};

/**
 * Get effective limits for a user based on their plan
 */
export function getEffectiveLimits(plan: PlanType): PlanLimits {
  return LIMITS[plan] || LIMITS.free;
}

/**
 * Check if a limit value means unlimited
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Get remaining usage
 */
export function getRemaining(used: number, limit: number): number {
  if (limit === -1) return -1; // unlimited
  return Math.max(0, limit - used);
}

/**
 * Check if limit is reached
 */
export function isLimitReached(used: number, limit: number): boolean {
  if (limit === -1) return false; // unlimited
  return used >= limit;
}

/**
 * Check if near limit (80% or more used)
 */
export function isNearLimit(used: number, limit: number): boolean {
  if (limit === -1) return false;
  if (limit === 0) return false;
  return (used / limit) >= 0.8;
}

/**
 * Premium benefits for marketing
 */
export const PREMIUM_BENEFITS = {
  uz: [
    "Cheklovlar ancha yuqori (ko'proq chat + hujjatlar)",
    "PDF Tools Pro: OCR, Protect/Unlock, Office→PDF, Merge/Split/Compress",
    "Tezroq javob (prioritet ishlov berish)",
    "Fayllar saqlanadi va tez yuklab olinadi (hujjatlar arxivi)",
    "Ko'proq rejimlar (IELTS, Coding, Math) — full access",
    "Kelajakda Voice (Bahor Voice) — premium roadmap",
  ],
  en: [
    "Higher limits (more chat + documents)",
    "PDF Tools Pro: OCR, Protect/Unlock, Office→PDF, Merge/Split/Compress",
    "Faster responses (priority processing)",
    "Files saved and quick download (document archive)",
    "More modes (IELTS, Coding, Math) — full access",
    "Voice mode coming soon — premium roadmap",
  ],
  ru: [
    "Выше лимиты (больше чатов + документов)",
    "PDF Tools Pro: OCR, Protect/Unlock, Office→PDF, Merge/Split/Compress",
    "Быстрые ответы (приоритетная обработка)",
    "Файлы сохраняются и быстро загружаются (архив документов)",
    "Больше режимов (IELTS, Coding, Math) — полный доступ",
    "Голосовой режим скоро — premium roadmap",
  ],
  tr: [
    "Daha yüksek limitler (daha fazla sohbet + belge)",
    "PDF Tools Pro: OCR, Protect/Unlock, Office→PDF, Merge/Split/Compress",
    "Daha hızlı yanıtlar (öncelikli işlem)",
    "Dosyalar kaydedilir ve hızlı indirilir (belge arşivi)",
    "Daha fazla mod (IELTS, Coding, Math) — tam erişim",
    "Sesli mod yakında — premium yol haritası",
  ],
};

/**
 * Scope labels for UI
 */
export const SCOPE_LABELS = {
  chat_daily: { uz: 'Chat', en: 'Chat', ru: 'Чат', tr: 'Sohbet' },
  pdf_monthly: { uz: 'PDF Tools', en: 'PDF Tools', ru: 'PDF Инструменты', tr: 'PDF Araçları' },
  search_daily: { uz: 'Web qidiruv', en: 'Web Search', ru: 'Веб-поиск', tr: 'Web Arama' },
  vision_daily: { uz: 'Rasm tahlil', en: 'Image Analysis', ru: 'Анализ изображений', tr: 'Görsel Analiz' },
  files_daily: { uz: 'Fayl tahlil', en: 'File Analysis', ru: 'Анализ файлов', tr: 'Dosya Analizi' },
};

/**
 * Reset text by period
 */
export const RESET_TEXT = {
  daily: { 
    uz: 'Ertaga qayta urinib ko\'ring', 
    en: 'Try again tomorrow', 
    ru: 'Попробуйте завтра', 
    tr: 'Yarın tekrar deneyin' 
  },
  monthly: { 
    uz: 'Keyingi oyda qayta urinib ko\'ring', 
    en: 'Try again next month', 
    ru: 'Попробуйте в следующем месяце', 
    tr: 'Gelecek ay tekrar deneyin' 
  },
};
