import { useNavigate } from "react-router-dom";
import { ModeInfo } from "@/types/chat";
import RecommendedBadge, { incrementModeUsage } from "@/components/RecommendedBadge";
import { useTranslation, Lang } from "@/i18n/LanguageProvider";

interface MasonryCardProps {
  mode: ModeInfo;
  size?: "large" | "medium" | "small";
  chips?: string[];
  onClick: () => void;
}

function MasonryCard({ mode, size = "small", chips, onClick }: MasonryCardProps) {
  const handleClick = () => {
    incrementModeUsage(mode.id);
    onClick();
  };

  const sizeClasses = {
    large: "row-span-2 min-h-[180px]",
    medium: "row-span-2 min-h-[160px]",
    small: "min-h-[120px]",
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full rounded-2xl bg-card border border-border/50 p-4 flex flex-col text-left transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-[0.98] ${sizeClasses[size]}`}
    >
      <div className="flex items-start gap-3 mb-2">
        <div className={`rounded-xl bg-secondary flex items-center justify-center ${size === "large" ? "w-12 h-12 text-2xl" : "w-10 h-10 text-xl"}`}>
          {mode.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className={`font-semibold text-foreground leading-tight ${size === "large" ? "text-base" : "text-sm"}`}>
              {mode.title}
            </h3>
            <RecommendedBadge modeId={mode.id} />
          </div>
        </div>
      </div>

      <p className={`text-muted-foreground leading-relaxed flex-1 ${size === "large" ? "text-sm line-clamp-3" : "text-xs line-clamp-2"}`}>
        {mode.subtitle}
      </p>

      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {chips.map((chip) => (
            <span
              key={chip}
              className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
            >
              {chip}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

interface MasonrySectionProps {
  title: string;
  modes: Array<{
    mode: ModeInfo;
    size?: "large" | "medium" | "small";
    chips?: string[];
  }>;
}

function MasonrySection({ title, modes }: MasonrySectionProps) {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3 auto-rows-auto">
        {modes.map(({ mode, size, chips }) => (
          <MasonryCard
            key={mode.id}
            mode={mode}
            size={size}
            chips={chips}
            onClick={() => navigate(`/chat/${mode.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

interface MasonryGridProps {
  language: Lang;
  primaryModes: ModeInfo[];
  learningModes: ModeInfo[];
}

export default function MasonryGrid({ language, primaryModes, learningModes }: MasonryGridProps) {
  const { t } = useTranslation();
  
  // Find specific modes
  const techMode = primaryModes.find(m => m.id === "tech");
  const dailyMode = primaryModes.find(m => m.id === "daily");
  const businessMode = primaryModes.find(m => m.id === "business");
  
  const ieltsMode = learningModes.find(m => m.id === "ielts");
  const homeworkMode = learningModes.find(m => m.id === "homework");
  const jobMode = learningModes.find(m => m.id === "job");
  const financialMode = learningModes.find(m => m.id === "financial");
  const healthMode = learningModes.find(m => m.id === "health");

  return (
    <div>
      {/* Learning Section */}
      <MasonrySection
        title={t('modes.learning') || "O'rganish"}
        modes={[
          ...(ieltsMode ? [{ mode: ieltsMode, size: "large" as const, chips: ["Speaking", "Writing", "IELTS"] }] : []),
          ...(homeworkMode ? [{ mode: homeworkMode, size: "medium" as const, chips: ["Fanlar", "Matematika"] }] : []),
          ...(jobMode ? [{ mode: jobMode, chips: ["CV", "Suhbat"] }] : []),
          ...(healthMode ? [{ mode: healthMode, chips: ["Fitness", "Ovqat"] }] : []),
        ]}
      />

      {/* Work & Productivity Section */}
      <MasonrySection
        title="Ish va Productivlik"
        modes={[
          ...(businessMode ? [{ mode: businessMode, size: "medium" as const, chips: ["Marketing", "G'oya"] }] : []),
          ...(financialMode ? [{ mode: financialMode, chips: ["Byudjet", "Moliya"] }] : []),
          ...(dailyMode ? [{ mode: dailyMode, chips: ["Retsept", "Maslahat"] }] : []),
        ]}
      />

      {/* Technical Section */}
      <MasonrySection
        title="Texnik"
        modes={[
          ...(techMode ? [{ mode: techMode, size: "large" as const, chips: ["Kod", "Python", "Web"] }] : []),
        ]}
      />
    </div>
  );
}
