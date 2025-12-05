// Language detection for per-message reply language
// Detects user's message language to determine assistant reply language

export type DetectedLanguage = "uz" | "ru" | "en" | "tr";
export type Confidence = "high" | "medium" | "low";

export interface LanguageDetectionResult {
  lang: DetectedLanguage;
  confidence: Confidence;
  reason?: string;
}

// Cyrillic character range detection
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;
const CYRILLIC_HEAVY_REGEX = /[\u0400-\u04FF]{3,}/; // 3+ consecutive Cyrillic chars

// Uzbek-specific Latin patterns (apostrophe variants, digraphs)
const UZBEK_PATTERNS = [
  /o['ʻʼ`]/gi,  // o' variants
  /g['ʻʼ`]/gi,  // g' variants
  /sh/gi,
  /ch/gi,
  /ng/gi,
  /\byo['ʻʼ`]q\b/gi,  // yo'q
  /\bnima\b/gi,
  /\bqanday\b/gi,
  /\bkerak\b/gi,
  /\byordam\b/gi,
  /\bsalom\b/gi,
  /\brahmat\b/gi,
  /\biltimos\b/gi,
  /\bmen\b/gi,
  /\bsen\b/gi,
  /\bsiz\b/gi,
  /\bbu\b/gi,
  /\bva\b/gi,
  /\bbilan\b/gi,
  /\buchun\b/gi,
  /\bham\b/gi,
  /\bbo['ʻʼ`]l/gi,  // bo'l-
  /\bqil/gi,
  /\bayt/gi,
  /\bber/gi,
  /\bket/gi,
  /\bkel/gi,
];

// Turkish-specific patterns
const TURKISH_PATTERNS = [
  /\bve\b/gi,
  /\bbu\b/gi,
  /\bne\b/gi,
  /\bgibi\b/gi,
  /\biçin\b/gi,
  /\bdeğil\b/gi,
  /\bvar\b/gi,
  /\byok\b/gi,
  /\bçok\b/gi,
  /\bşey\b/gi,
  /\bnasıl\b/gi,
  /\bneden\b/gi,
  /\bteşekkür/gi,
  /\bmerhaba\b/gi,
  /[ğışçöü]/gi,  // Turkish-specific chars
];

// English common words
const ENGLISH_PATTERNS = [
  /\bthe\b/gi,
  /\bis\b/gi,
  /\bare\b/gi,
  /\bwhat\b/gi,
  /\bhow\b/gi,
  /\bwhy\b/gi,
  /\bwhen\b/gi,
  /\bwhere\b/gi,
  /\bwhich\b/gi,
  /\bcan\b/gi,
  /\bcould\b/gi,
  /\bwould\b/gi,
  /\bshould\b/gi,
  /\bplease\b/gi,
  /\bthanks?\b/gi,
  /\bhelp\b/gi,
  /\bneed\b/gi,
  /\bwant\b/gi,
  /\bhave\b/gi,
  /\bwith\b/gi,
  /\bfor\b/gi,
  /\babout\b/gi,
  /\byou\b/gi,
  /\byour\b/gi,
  /\bi\b/gi,
  /\bmy\b/gi,
];

// Russian common words (beyond just Cyrillic detection)
const RUSSIAN_PATTERNS = [
  /\bкак\b/gi,
  /\bчто\b/gi,
  /\bкогда\b/gi,
  /\bгде\b/gi,
  /\bпочему\b/gi,
  /\bзачем\b/gi,
  /\bпожалуйста\b/gi,
  /\bспасибо\b/gi,
  /\bпомоги/gi,
  /\bмне\b/gi,
  /\bменя\b/gi,
  /\bтебя\b/gi,
  /\bнужн/gi,
  /\bхоч/gi,
  /\bмог/gi,
];

// Explicit language switch requests
const LANGUAGE_OVERRIDE_PATTERNS: { pattern: RegExp; lang: DetectedLanguage }[] = [
  // English requests
  { pattern: /\b(reply|respond|answer|write|speak)\s+(in\s+)?english\b/i, lang: "en" },
  { pattern: /\bin\s+english\s+(please|pls)?\b/i, lang: "en" },
  
  // Russian requests (in various languages)
  { pattern: /\b(reply|respond|answer|write)\s+(in\s+)?russian\b/i, lang: "ru" },
  { pattern: /\bна\s+русском\b/i, lang: "ru" },
  { pattern: /\bрусча\s+(javob|yoz|ayt|gapir)\b/i, lang: "ru" },
  { pattern: /\brus\s+tilida\b/i, lang: "ru" },
  { pattern: /\brusskiy\b/i, lang: "ru" },
  
  // Uzbek requests
  { pattern: /\b(reply|respond|answer|write)\s+(in\s+)?uzbek\b/i, lang: "uz" },
  { pattern: /\bo['ʻʼ`]zbek(cha)?\s+(javob|yoz|ayt|gapir)\b/i, lang: "uz" },
  { pattern: /\bo['ʻʼ`]zbek\s+tilida\b/i, lang: "uz" },
  { pattern: /\bна\s+узбек/i, lang: "uz" },
  
  // Turkish requests
  { pattern: /\b(reply|respond|answer|write)\s+(in\s+)?turkish\b/i, lang: "tr" },
  { pattern: /\btürkçe\s+(yaz|cevap|konuş)\b/i, lang: "tr" },
  { pattern: /\bturkcha\s+(yoz|javob)\b/i, lang: "tr" },
];

function countMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

/**
 * Detect the language of a user message for determining reply language
 * @param message - The user's message text
 * @param fallbackLang - Fallback language (usually UI language) if detection is uncertain
 */
export function detectReplyLanguage(
  message: string,
  fallbackLang: DetectedLanguage = "uz"
): LanguageDetectionResult {
  const text = message.trim();
  
  if (!text) {
    return { lang: fallbackLang, confidence: "low", reason: "empty_message" };
  }

  // 1. Check for explicit language override requests first
  for (const { pattern, lang } of LANGUAGE_OVERRIDE_PATTERNS) {
    if (pattern.test(text)) {
      return { lang, confidence: "high", reason: "explicit_request" };
    }
  }

  // 2. Heavy Cyrillic presence = Russian (strong signal)
  const cyrillicMatches = text.match(CYRILLIC_REGEX) || [];
  const totalChars = text.replace(/\s/g, "").length;
  const cyrillicRatio = totalChars > 0 ? cyrillicMatches.length / totalChars : 0;
  
  if (cyrillicRatio > 0.5 || CYRILLIC_HEAVY_REGEX.test(text)) {
    return { lang: "ru", confidence: "high", reason: "cyrillic_dominant" };
  }

  // 3. Count pattern matches for each language
  const uzbekScore = countMatches(text, UZBEK_PATTERNS);
  const englishScore = countMatches(text, ENGLISH_PATTERNS);
  const turkishScore = countMatches(text, TURKISH_PATTERNS);
  const russianScore = countMatches(text, RUSSIAN_PATTERNS);

  // Add bonus for Cyrillic to Russian score
  const adjustedRussianScore = russianScore + (cyrillicMatches.length > 2 ? 3 : 0);

  const scores = {
    uz: uzbekScore,
    en: englishScore,
    tr: turkishScore,
    ru: adjustedRussianScore,
  };

  // Find the highest scoring language
  let maxLang: DetectedLanguage = fallbackLang;
  let maxScore = 0;
  let secondMaxScore = 0;

  for (const [lang, score] of Object.entries(scores) as [DetectedLanguage, number][]) {
    if (score > maxScore) {
      secondMaxScore = maxScore;
      maxScore = score;
      maxLang = lang;
    } else if (score > secondMaxScore) {
      secondMaxScore = score;
    }
  }

  // Determine confidence based on score difference
  if (maxScore === 0) {
    return { lang: fallbackLang, confidence: "low", reason: "no_patterns_matched" };
  }

  const scoreDiff = maxScore - secondMaxScore;
  
  if (maxScore >= 3 && scoreDiff >= 2) {
    return { lang: maxLang, confidence: "high", reason: `pattern_score_${maxScore}` };
  } else if (maxScore >= 2 && scoreDiff >= 1) {
    return { lang: maxLang, confidence: "medium", reason: `pattern_score_${maxScore}` };
  } else if (maxScore >= 1) {
    return { lang: maxLang, confidence: "low", reason: `weak_pattern_score_${maxScore}` };
  }

  return { lang: fallbackLang, confidence: "low", reason: "uncertain" };
}

/**
 * Get the language name for display/prompt purposes
 */
export function getLanguageName(lang: DetectedLanguage): string {
  const names: Record<DetectedLanguage, string> = {
    uz: "Uzbek",
    ru: "Russian",
    en: "English",
    tr: "Turkish",
  };
  return names[lang];
}

/**
 * Get the native language name
 */
export function getNativeLanguageName(lang: DetectedLanguage): string {
  const names: Record<DetectedLanguage, string> = {
    uz: "O'zbekcha",
    ru: "Русский",
    en: "English",
    tr: "Türkçe",
  };
  return names[lang];
}
