import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { PRIMARY_MODES, LEARNING_MODES } from "@/data/modes";
import { useTranslation } from "@/i18n/LanguageProvider";
import { AppContainer, AppLayout } from "@/components/layout";
import { ShowcaseStrip, QuickActionsRow, MasonryGrid, Toolrail } from "@/components/modes";

export default function Home() {
  const navigate = useNavigate();
  const { language } = useTranslation();

  return (
    <AppLayout className="bg-gradient-to-b from-background via-background to-primary/5">
      {/* Desktop Toolrail */}
      <Toolrail />

      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 z-10">
        <AppContainer className="py-3 flex items-center justify-end">
          <button
            onClick={() => navigate("/settings")}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
            aria-label="Sozlamalar"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </AppContainer>
      </div>

      {/* Content */}
      <AppContainer className="py-6 lg:pl-20">
        {/* Showcase Strip */}
        <ShowcaseStrip />

        {/* Quick Actions */}
        <QuickActionsRow />

        {/* Masonry Grid */}
        <MasonryGrid
          language={language}
          primaryModes={PRIMARY_MODES}
          learningModes={LEARNING_MODES}
        />
      </AppContainer>
    </AppLayout>
  );
}
