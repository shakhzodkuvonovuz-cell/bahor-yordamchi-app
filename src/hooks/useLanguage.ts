import { useEffect, useState } from "react";

export type Language = "uz" | "en" | "ru" | "tr";

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    // Check localStorage first
    const stored = localStorage.getItem("bahorai_language");
    if (stored === "uz" || stored === "en" || stored === "ru" || stored === "tr") {
      return stored;
    }
    
    // Default to Uzbek
    return "uz";
  });

  useEffect(() => {
    localStorage.setItem("bahorai_language", language);
  }, [language]);

  return { language, setLanguage };
}
