import { useLocation, useNavigate } from "react-router-dom";
import { 
  Sparkles,
  MessageSquare, 
  Users, 
  FileText, 
  Settings,
  MessageCircle,
  Crown,
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";
import bahorLogo from "@/assets/bahor-logo.png";

interface SidebarV2Props {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  onNavigate?: () => void;
}

interface NavItem {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  path: string;
  badge?: string;
}

const PRIMARY_NAV: NavItem[] = [
  { id: "home", labelKey: "nav.modes", icon: Sparkles, path: "/modes" },
  { id: "chat", labelKey: "nav.chat", icon: MessageSquare, path: "/chat/general" },
  { id: "circles", labelKey: "nav.circles", icon: Users, path: "/circles" },
  { id: "tools", labelKey: "nav.tools", icon: FileText, path: "/tools/documents" },
  { id: "settings", labelKey: "settings.title", icon: Settings, path: "/settings" },
];

const SECONDARY_NAV: NavItem[] = [
  { id: "feedback", labelKey: "feedback.title", icon: MessageCircle, path: "/feedback" },
  { id: "premium", labelKey: "subscription.upgrade", icon: Crown, path: "/settings" },
  { id: "help", labelKey: "support.title", icon: HelpCircle, path: "/support" },
];

export function SidebarV2({ collapsed = false, onCollapse, onNavigate }: SidebarV2Props) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/modes") {
      return location.pathname === "/modes";
    }
    if (path === "/chat/general") {
      return location.pathname.startsWith("/chat");
    }
    if (path === "/circles") {
      return location.pathname.startsWith("/circles");
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <div className={cn(
      "h-full flex flex-col bg-card border-r border-border transition-all duration-300",
      collapsed ? "w-[72px]" : "w-[260px]"
    )}>
      {/* Logo Header */}
      <div className={cn(
        "flex items-center border-b border-border h-16 px-4",
        collapsed ? "justify-center" : "gap-3"
      )}>
        <img 
          src={bahorLogo} 
          alt="Bahor AI" 
          className="h-8 w-8 object-contain flex-shrink-0" 
        />
        {!collapsed && (
          <span className="font-bold text-lg text-foreground">Bahor AI</span>
        )}
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              title={collapsed ? t(item.labelKey) : undefined}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg transition-all duration-200",
                collapsed ? "justify-center px-2 py-3" : "px-3 py-2.5",
                active 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "flex-shrink-0 transition-colors",
                collapsed ? "w-5 h-5" : "w-5 h-5",
                active && "text-primary"
              )} />
              {!collapsed && (
                <span className="text-sm truncate">{t(item.labelKey)}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="px-4">
        <div className="h-px bg-border" />
      </div>

      {/* Secondary Navigation */}
      <nav className="py-3 px-2 space-y-1">
        {SECONDARY_NAV.map((item) => {
          const Icon = item.icon;
          const isPremium = item.id === "premium";
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              title={collapsed ? t(item.labelKey) : undefined}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg transition-all duration-200",
                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
                isPremium 
                  ? "text-amber-500 hover:bg-amber-500/10"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "flex-shrink-0",
                collapsed ? "w-4 h-4" : "w-4 h-4",
                isPremium && "text-amber-500"
              )} />
              {!collapsed && (
                <span className="text-xs truncate">{t(item.labelKey)}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle - Desktop Only */}
      {onCollapse && (
        <div className="p-2 border-t border-border">
          <button
            onClick={() => onCollapse(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
