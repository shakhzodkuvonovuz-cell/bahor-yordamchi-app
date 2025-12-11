/**
 * Assistant Output Formatter
 * Sanitizes and formats AI responses for consistent brand voice
 */

// Forbidden phrases that should never appear in output
const FORBIDDEN_PHRASES = [
  /as an? ai( model| assistant)?,?\s*/gi,
  /i('m| am) (actually|based on|powered by)\s*/gi,
  /deepseek/gi,
  /openai/gi,
  /chatgpt/gi,
  /gpt-[45]/gi,
  /claude/gi,
  /anthropic/gi,
  /gemini/gi,
  /bard/gi,
  /mistral/gi,
  /llama/gi,
  /meta ai/gi,
  /provider/gi,
  /model i('m| am) based on/gi,
  /underlying (model|ai|system)/gi,
  /i was (trained|created|built) by/gi,
  // Uzbek leaks
  /ai model(i|eli)?/gi,
  /til model(i|eli)/gi,
  /sun'iy intellekt model(i|eli)/gi,
  /texnik asos:?\s*/gi,
  /men .{0,20}asosida ishlayman/gi,
  /\*\*texnik asos:?\*\*/gi,
  // Russian leaks
  /языковая модель/gi,
  /модель ии/gi,
  /на основе .{0,15}модел/gi,
];

// Replacement for identity questions
const IDENTITY_RESPONSES: Record<string, string> = {
  uz: "Men Bahor AI — kuchli til modellari asosida ishlayman. Sizga natijani sifatli chiqarish muhim; ichki infratuzilma tafsilotlarini ochmayman.",
  en: "I'm Bahor AI — powered by advanced language models. What matters is delivering quality results for you; I don't disclose internal infrastructure details.",
  ru: "Я Bahor AI — работаю на основе мощных языковых моделей. Главное для меня — качественный результат; детали внутренней инфраструктуры не раскрываю.",
  tr: "Ben Bahor AI — güçlü dil modelleri ile çalışıyorum. Sizin için kaliteli sonuçlar sunmak önemli; iç altyapı detaylarını paylaşmıyorum.",
};

/**
 * Format and sanitize assistant text before rendering
 */
export function formatAssistantText(text: string, uiLang: string = 'uz'): string {
  if (!text) return text;
  
  let result = text;
  
  // 1. Strip forbidden phrases
  for (const pattern of FORBIDDEN_PHRASES) {
    result = result.replace(pattern, '');
  }
  
  // 2. Collapse excessive whitespace (more than 2 newlines -> 2)
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.replace(/[ \t]{2,}/g, ' ');
  
  // 3. Strip truncation phrases that model may emit
  const TRUNCATION_PATTERNS = [
    /\(Davomi uchun[^)]*\)/gi,
    /Davomi uchun:?\s*['"]?batafsil['"]?\s*deb yozing\.?/gi,
    /'batafsil'\s*deb yozing\.?/gi,
    /Davom et(ay)?mi\??/gi,
    /Would you like me to continue\??/gi,
    /Shall I continue\??/gi,
    /Let me know if you('d like| want) me to continue/gi,
  ];
  for (const pattern of TRUNCATION_PATTERNS) {
    result = result.replace(pattern, '');
  }
  
  // 4. Collapse excessive bullet lists (>10 items -> max 6 + note)
  const bulletPattern = /^[\\s]*[-•*]\\s+.+$/gm;
  const bullets = result.match(bulletPattern);
  if (bullets && bullets.length > 10) {
    const bulletNote: Record<string, string> = {
      uz: "\n... va boshqalar.",
      en: "\n... and more.",
      ru: "\n... и другие.",
      tr: "\n... ve diğerleri.",
    };
    
    // Keep first 6 bullets, add note
    let bulletCount = 0;
    result = result.replace(bulletPattern, (match) => {
      bulletCount++;
      if (bulletCount <= 6) return match;
      if (bulletCount === 7) return (bulletNote[uiLang] || bulletNote.uz);
      return '';
    });
  }
  
  // 5. Clean up any leftover artifacts
  result = result.trim();
  
  return result;
}

/**
 * Check if response contains brand leak
 */
export function hasBrandLeak(text: string): boolean {
  const leakPatterns = [
    /deepseek/i,
    /openai/i,
    /chatgpt/i,
    /gpt-[45]/i,
    /claude/i,
    /anthropic/i,
    /gemini/i,
    /mistral/i,
    /llama/i,
    /i('m| am) actually/i,
    /based on \w+ model/i,
    /ai model(i|eli)?/i,
    /til model/i,
    /texnik asos/i,
    /asosida ishlayman/i,
    /языковая модель/i,
  ];
  
  return leakPatterns.some(pattern => pattern.test(text));
}

/**
 * Get safe identity response
 */
export function getSafeIdentityResponse(lang: string = 'uz'): string {
  return IDENTITY_RESPONSES[lang] || IDENTITY_RESPONSES.uz;
}
