import { ModeInfo } from "@/types/chat";

interface ModeCardProps {
  mode: ModeInfo;
  onClick: () => void;
}

export default function ModeCard({ mode, onClick }: ModeCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 bg-card dark:bg-card border border-border dark:border-border rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 text-left active:scale-95"
    >
      <div className="flex flex-col items-center text-center gap-2">
        <div className="text-4xl mb-1">{mode.icon}</div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-card-foreground dark:text-card-foreground leading-tight">
            {mode.title}
          </h3>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground leading-relaxed line-clamp-2">
            {mode.subtitle}
          </p>
        </div>
      </div>
    </button>
  );
}
