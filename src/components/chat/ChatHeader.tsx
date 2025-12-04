import { ArrowLeft, Menu, MoreVertical, Settings, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  usageText?: string;
  onMenuClick?: () => void;
  onClearChat?: () => void;
  onOpenSettings?: () => void;
  showMenu?: boolean;
}

export default function ChatHeader({
  title,
  subtitle,
  usageText,
  onMenuClick,
  onClearChat,
  onOpenSettings,
  showMenu = true,
}: ChatHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 bg-card/95 backdrop-blur-lg border-b border-border/40 shadow-sm">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        <div className="h-14 sm:h-16 flex items-center gap-2 sm:gap-3">
          {/* Left: Back button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0 h-10 w-10 rounded-xl hover:bg-secondary/80"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Center: Title + Subtitle */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1 className="text-base sm:text-lg font-semibold text-foreground truncate leading-tight">
              {title}
            </h1>
            {(subtitle || usageText) && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {subtitle && <span>{subtitle}</span>}
                {subtitle && usageText && <span className="mx-1.5">•</span>}
                {usageText && <span className="font-medium">{usageText}</span>}
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
                aria-label="Chat history"
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
                  aria-label="More options"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onClearChat && (
                  <DropdownMenuItem onClick={onClearChat} className="text-destructive focus:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span>Suhbatni tozalash</span>
                  </DropdownMenuItem>
                )}
                {onOpenSettings && (
                  <DropdownMenuItem onClick={onOpenSettings}>
                    <Settings className="w-4 h-4 mr-2" />
                    <span>Sozlamalar</span>
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
