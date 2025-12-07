import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import ModeCard from "@/components/ModeCard";
import { PRIMARY_MODES, LEARNING_MODES } from "@/data/modes";
import { useTranslation } from "@/i18n/LanguageProvider";

export default function ModesList() {
  const navigate = useNavigate();
  const { language, t } = useTranslation();

  const handleModeClick = (modeId: string) => {
    // Navigate to main chat entry page with mode preselected
    navigate(`/modes?mode=${modeId}`);
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{t('sidebar.modes')}</h1>
          <button
            onClick={() => navigate("/settings")}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
            aria-label={t('settings.title')}
          >
            <Settings className="w-6 h-6 text-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t('modes.question')}
          </h2>
          <p className="text-muted-foreground">
            {t('modes.subtitle')}
          </p>
        </div>

        <div className="space-y-8">
          {/* Primary Section */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 px-2">
              {t('modes.primary')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {PRIMARY_MODES.map((mode) => (
                <ModeCard
                  key={mode.id}
                  mode={mode}
                  language={language}
                  onClick={() => handleModeClick(mode.id)}
                />
              ))}
            </div>
          </div>

          {/* Learning Section */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 px-2">
              {t('modes.learning')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {LEARNING_MODES.map((mode) => (
                <ModeCard
                  key={mode.id}
                  mode={mode}
                  language={language}
                  onClick={() => handleModeClick(mode.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
