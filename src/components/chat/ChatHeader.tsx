import { ArrowLeft, Menu, MoreVertical, Settings, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageProvider";
import UsageBadge from "./UsageBadge";

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  onClearChat?: () => void;
  onOpenSettings?: () => void;
  showMenu?: boolean;
  showUsage?: boolean;
}

export default function ChatHeader({
  title,
  subtitle,
  onMenuClick,
  onClearChat,
  onOpenSettings,
  showMenu = true,
  showUsage = true,
}: ChatHeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-20 bg-card/95 backdrop-blur-lg border-b border-border/40 shadow-sm">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        <div className="h-14 sm:h-16 flex items-center gap-2 sm:gap-3">
          {/* Left: Back button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/modes")}
            className="shrink-0 h-10 w-10 rounded-xl hover:bg-secondary/80"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Center: Title + Subtitle */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-base sm:text-lg font-semibold text-foreground truncate leading-tight">
                {title}
              </h1>
              {showUsage && <UsageBadge />}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          {/* Right: Actions menu */}
          <div className="flex items-center gap-1 shrink-0">
            {/* History toggle (if showMenu) */}
            {showMenu && onMenuClick && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuClick}
                className="h-10 w-10 rounded-xl hover:bg-secondary/80"
                aria-label={t('chat.history')}
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}

            {/* More options menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl hover:bg-secondary/80"
                  aria-label={t('chat.moreOptions')}
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onClearChat && (
                  <DropdownMenuItem onClick={onClearChat} className="text-destructive focus:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span>{t('chat.clear')}</span>
                  </DropdownMenuItem>
                )}
                {onOpenSettings && (
                  <DropdownMenuItem onClick={onOpenSettings}>
                    <Settings className="w-4 h-4 mr-2" />
                    <span>{t('settings.title')}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
