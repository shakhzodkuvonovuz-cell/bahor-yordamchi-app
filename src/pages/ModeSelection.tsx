import { useNavigate, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import ModeCard from "@/components/ModeCard";
import { PRIMARY_MODES, LEARNING_MODES } from "@/data/modes";
import { useTranslation } from "@/i18n/LanguageProvider";
import { AppContainer, AppLayout } from "@/components/layout";
import { markSessionInitialized } from "@/utils/chatSession";

export default function ModeSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t } = useTranslation();

  // Handler for mode card click - creates NEW thread and navigates to chat
  const handleModeSelect = (modeId: string) => {
    // Mark session initialized to track that user initiated a chat
    markSessionInitialized();
    // Generate unique ID to force new thread creation
    const newChatId = crypto.randomUUID?.() ?? Date.now().toString();
    // Navigate to chat with ?new param to trigger new thread creation in Chat.tsx
    navigate(`/chat/${modeId}?new=${newChatId}`);
  };

  return (
    <AppLayout className="bg-gradient-to-b from-background to-primary-glow/10">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <AppContainer className="py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('modes.title')}</h1>
          </div>
          <button
            onClick={() => {
              const fromPath = location.pathname;
              navigate(`/settings?from=${encodeURIComponent(fromPath)}`, { replace: true, state: { from: fromPath } });
            }}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
            aria-label={t('settings.title')}
          >
            <Settings className="w-6 h-6 text-foreground" />
          </button>
        </AppContainer>
      </div>

      {/* Content */}
      <AppContainer className="py-8">
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
            <div className="overflow-x-auto pb-2 -mx-4 px-4">
              <div className="flex gap-3 snap-x snap-mandatory">
                {PRIMARY_MODES.map((mode) => (
                  <div key={mode.id} className="snap-start flex-shrink-0 w-44">
                    <ModeCard
                      mode={mode}
                      language={language}
                      onClick={() => handleModeSelect(mode.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Learning Section */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 px-2">
              {t('modes.learning')}
            </h3>
            <div className="overflow-x-auto pb-2 -mx-4 px-4">
              <div className="flex gap-3 snap-x snap-mandatory">
                {LEARNING_MODES.map((mode) => (
                  <div key={mode.id} className="snap-start flex-shrink-0 w-44">
                    <ModeCard
                      mode={mode}
                      language={language}
                      onClick={() => handleModeSelect(mode.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppContainer>
    </AppLayout>
  );
}
