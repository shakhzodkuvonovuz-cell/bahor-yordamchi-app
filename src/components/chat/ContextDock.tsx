import { useState } from "react";
import { ChevronRight, ChevronLeft, FileText, Image, Link2, ListTodo, ClipboardList, Calendar, Lightbulb, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatAttachment } from "@/types/chat";
import { useTranslation } from "@/i18n/LanguageProvider";

interface ContextDockProps {
  /** Current chat mode info */
  modeInfo?: {
    icon: string;
    title: string;
    color?: string;
  };
  modeTranslation?: {
    title: string;
  };
  /** Last uploaded attachment */
  lastAttachment?: ChatAttachment | null;
  /** Citations/sources from last AI response */
  sources?: string[];
  /** Callback for AI action shortcuts */
  onAIAction?: (action: 'summary' | 'tasks' | 'plan' | 'decisions') => void;
  /** Whether AI actions are available (e.g., in Circles) */
  aiActionsAvailable?: boolean;
  /** Whether dock is collapsed */
  defaultCollapsed?: boolean;
}

/**
 * Context Dock - Desktop sidebar showing chat context and quick actions.
 * Only visible on lg+ screens.
 */
export function ContextDock({
  modeInfo,
  modeTranslation,
  lastAttachment,
  sources = [],
  onAIAction,
  aiActionsAvailable = false,
  defaultCollapsed = true,
}: ContextDockProps) {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Determine if there's any content to show
  const hasContent = modeInfo || lastAttachment || sources.length > 0 || aiActionsAvailable;
  
  // Auto-expand if there's content
  const shouldShow = hasContent;

  if (!shouldShow) return null;

  const aiActions = [
    { id: 'summary', icon: ClipboardList, label: t('dock.summary') || 'Xulosa' },
    { id: 'tasks', icon: ListTodo, label: t('dock.tasks') || 'Vazifalar' },
    { id: 'plan', icon: Calendar, label: t('dock.plan') || 'Reja' },
    { id: 'decisions', icon: Lightbulb, label: t('dock.decisions') || 'Qarorlar' },
  ] as const;

  return (
    <div
      className={cn(
        "hidden lg:flex flex-col h-full border-l border-border/30 bg-card/50 backdrop-blur-sm transition-all duration-300 ease-out",
        isCollapsed ? "w-12" : "w-72 xl:w-80"
      )}
    >
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between p-3 border-b border-border/20">
        {!isCollapsed && (
          <span className="text-sm font-medium text-foreground">
            {t('dock.title') || 'Kontekst'}
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "p-1.5 rounded-lg hover:bg-secondary/60 transition-colors",
            isCollapsed && "mx-auto"
          )}
          aria-label={isCollapsed ? "Expand dock" : "Collapse dock"}
        >
          {isCollapsed ? (
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Content - only show when expanded */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Current Mode Section */}
          {modeInfo && (
            <div className="glass-premium rounded-xl p-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                  {modeInfo.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {t('dock.currentMode') || 'Joriy rejim'}
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {modeTranslation?.title || modeInfo.title}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Last Attachment Section */}
          {lastAttachment && (
            <div className="glass-premium rounded-xl p-3 animate-fade-in" style={{ animationDelay: '50ms' }}>
              <p className="text-xs text-muted-foreground mb-2">
                {t('dock.lastFile') || 'Oxirgi fayl'}
              </p>
              <div className="flex items-center gap-2">
                {lastAttachment.type?.startsWith('image/') ? (
                  lastAttachment.previewUrl ? (
                    <img 
                      src={lastAttachment.previewUrl} 
                      alt={lastAttachment.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Image className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{lastAttachment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(lastAttachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                {lastAttachment.url && (
                  <a
                    href={lastAttachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* AI Actions Section */}
          <div className="glass-premium rounded-xl p-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <p className="text-xs text-muted-foreground mb-2">
              {t('dock.aiActions') || 'AI Amallar'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {aiActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => onAIAction?.(action.id)}
                  disabled={!aiActionsAvailable}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                    aiActionsAvailable
                      ? "bg-secondary/60 hover:bg-secondary text-foreground hover:shadow-sm active:scale-[0.98]"
                      : "bg-secondary/30 text-muted-foreground cursor-not-allowed"
                  )}
                  title={!aiActionsAvailable ? (t('dock.circlesOnly') || "Faqat Circles'da mavjud") : undefined}
                >
                  <action.icon className="w-3.5 h-3.5" />
                  <span className="truncate">{action.label}</span>
                </button>
              ))}
            </div>
            {!aiActionsAvailable && (
              <p className="text-[10px] text-muted-foreground/70 mt-2 text-center">
                {t('dock.circlesOnly') || "Circles'da to'liq mavjud"}
              </p>
            )}
          </div>

          {/* Sources Section */}
          {sources.length > 0 && (
            <div className="glass-premium rounded-xl p-3 animate-fade-in" style={{ animationDelay: '150ms' }}>
              <p className="text-xs text-muted-foreground mb-2">
                {t('dock.sources') || 'Manbalar'}
              </p>
              <div className="space-y-1.5">
                {sources.slice(0, 3).map((url, index) => {
                  // Extract domain from URL
                  let domain = url;
                  try {
                    domain = new URL(url).hostname.replace('www.', '');
                  } catch {}
                  
                  return (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors group"
                    >
                      <Link2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                      <span className="text-xs text-foreground truncate flex-1">{domain}</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  );
                })}
                {sources.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    +{sources.length - 3} {t('dock.more') || 'yana'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed state - show icons only */}
      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center gap-3 py-4">
          {modeInfo && (
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-lg" title={modeTranslation?.title || modeInfo.title}>
              {modeInfo.icon}
            </div>
          )}
          {lastAttachment && (
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center" title={lastAttachment.name}>
              {lastAttachment.type?.startsWith('image/') ? (
                <Image className="w-4 h-4 text-muted-foreground" />
              ) : (
                <FileText className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          )}
          {sources.length > 0 && (
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center" title={`${sources.length} sources`}>
              <Link2 className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
