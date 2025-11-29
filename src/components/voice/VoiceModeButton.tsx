import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";

interface VoiceModeButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export default function VoiceModeButton({ onClick, disabled, className }: VoiceModeButtonProps) {
  const { t } = useTranslation();
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={t('voice.startVoice')}
      className={cn(
        // Base styles
        "relative flex items-center justify-center",
        "w-12 h-12 rounded-full",
        "bg-gradient-to-br from-primary/20 to-primary/10",
        "border border-primary/30",
        "transition-all duration-300 ease-out",
        
        // Hover & active states
        "hover:scale-105 hover:border-primary/50",
        "hover:shadow-[0_0_30px_hsla(175,60%,50%,0.3)]",
        "active:scale-95",
        
        // Disabled state
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        
        // Focus state
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        
        className
      )}
    >
      {/* Animated glow rings */}
      <div className="absolute inset-0 rounded-full animate-voice-glow-ring opacity-60" />
      <div className="absolute inset-[-4px] rounded-full animate-voice-glow-ring-delayed opacity-40" />
      
      {/* Inner glow */}
      <div 
        className="absolute inset-1 rounded-full bg-gradient-to-br from-primary/10 to-transparent"
      />
      
      {/* Mic icon */}
      <Mic className="w-5 h-5 text-primary relative z-10" />
      
      {/* Tooltip on hover */}
      <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/50 text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
        {t('voice.startVoice')}
      </span>
    </button>
  );
}
