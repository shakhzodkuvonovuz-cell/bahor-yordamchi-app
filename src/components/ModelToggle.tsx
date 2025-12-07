import { useState, useEffect } from "react";
import { Zap, Brain } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

export type ModelPreference = "chat" | "reasoner";

const STORAGE_KEY = "bahor_model_preference";

export function getModelPreference(): ModelPreference {
  if (typeof window === "undefined") return "chat";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "reasoner" ? "reasoner" : "chat";
}

export function setModelPreference(pref: ModelPreference) {
  localStorage.setItem(STORAGE_KEY, pref);
}

interface ModelToggleProps {
  value?: ModelPreference;
  onChange?: (value: ModelPreference) => void;
  className?: string;
  size?: "sm" | "md";
}

export function ModelToggle({ value, onChange, className, size = "md" }: ModelToggleProps) {
  const { t } = useTranslation();
  const [internalValue, setInternalValue] = useState<ModelPreference>(getModelPreference);

  const currentValue = value ?? internalValue;

  useEffect(() => {
    if (value === undefined) {
      setInternalValue(getModelPreference());
    }
  }, [value]);

  const handleChange = (newValue: ModelPreference) => {
    setModelPreference(newValue);
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  const isSmall = size === "sm";

  return (
    <div className={cn(
      "inline-flex items-center gap-1 p-0.5 rounded-lg bg-secondary/50 border border-border/50",
      className
    )}>
      <button
        type="button"
        onClick={() => handleChange("chat")}
        className={cn(
          "flex items-center gap-1.5 rounded-md transition-all duration-200",
          isSmall ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
          currentValue === "chat"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        <Zap className={cn(isSmall ? "w-3 h-3" : "w-3.5 h-3.5")} />
        <span className="font-medium">{t('model.fast')}</span>
      </button>
      <button
        type="button"
        onClick={() => handleChange("reasoner")}
        className={cn(
          "flex items-center gap-1.5 rounded-md transition-all duration-200",
          isSmall ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
          currentValue === "reasoner"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        <Brain className={cn(isSmall ? "w-3 h-3" : "w-3.5 h-3.5")} />
        <span className="font-medium">{t('model.reasoner')}</span>
      </button>
    </div>
  );
}
