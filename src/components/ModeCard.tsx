import { ModeInfo } from "@/types/chat";

interface ModeCardProps {
  mode: ModeInfo;
  onClick: () => void;
}

export default function ModeCard({ mode, onClick }: ModeCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full p-6 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 text-left active:scale-95"
    >
      <div className="flex items-start gap-4">
        <div className="text-4xl flex-shrink-0">{mode.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-card-foreground mb-1">
            {mode.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {mode.subtitle}
          </p>
        </div>
      </div>
    </button>
  );
}
