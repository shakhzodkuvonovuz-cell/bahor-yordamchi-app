import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Globe, Info, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage, Language } from "@/hooks/useLanguage";
import { getTranslation } from "@/data/translations";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = getTranslation(language);
  const [name, setName] = useState("Bahor");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary-glow/10">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border shadow-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
            aria-label={t.settings.back}
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{t.settings.title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* User Info Section */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {t.settings.userInfo}
            </h2>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              {t.settings.name}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              placeholder={t.settings.namePlaceholder}
            />
          </div>
        </div>

        {/* Theme Section */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            {theme === "dark" ? (
              <Moon className="w-5 h-5 text-primary" />
            ) : (
              <Sun className="w-5 h-5 text-primary" />
            )}
            <h2 className="text-lg font-semibold text-foreground">{t.settings.theme}</h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme("light")}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                theme === "light"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Sun className="w-4 h-4" />
                <span>{t.settings.lightMode}</span>
              </div>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                theme === "dark"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Moon className="w-4 h-4" />
                <span>{t.settings.darkMode}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Language Section */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{t.settings.language}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLanguage("uz")}
              className={`py-3 px-4 rounded-xl font-medium transition-all ${
                language === "uz"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {t.settings.languageUz}
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`py-3 px-4 rounded-xl font-medium transition-all ${
                language === "en"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {t.settings.languageEn}
            </button>
            <button
              onClick={() => setLanguage("ru")}
              className={`py-3 px-4 rounded-xl font-medium transition-all ${
                language === "ru"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {t.settings.languageRu}
            </button>
            <button
              onClick={() => setLanguage("tr")}
              className={`py-3 px-4 rounded-xl font-medium transition-all ${
                language === "tr"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {t.settings.languageTr}
            </button>
          </div>
        </div>

        {/* Status Section */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{t.settings.status}</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-foreground">{t.settings.status}:</span>
              <span className="text-sm font-medium text-primary">
                {t.settings.statusText}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border">
              <span className="text-sm text-foreground">{t.settings.version.split(':')[0]}:</span>
              <span className="text-sm font-medium text-muted-foreground">
                {t.settings.version.split(':')[1]?.trim()}
              </span>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-muted/50 border border-border rounded-2xl p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t.settings.note}
          </p>
        </div>
      </div>
    </div>
  );
}
