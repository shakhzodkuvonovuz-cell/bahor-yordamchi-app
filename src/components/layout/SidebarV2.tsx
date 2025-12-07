import { useLocation, useNavigate } from "react-router-dom";
import { 
  PenLine,
  MessageSquare, 
  Sparkles,
  Users, 
  FileText, 
  MessageCircle,
  Crown,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Languages
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
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
  isNewChat?: boolean;
  isPlaceholder?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { id: "new-chat", labelKey: "sidebar.new_chat", icon: PenLine, path: "/chat/general", isNewChat: true },
  { id: "chat", labelKey: "sidebar.chat", icon: MessageSquare, path: "/modes" },
  { id: "modes", labelKey: "sidebar.modes", icon: Sparkles, path: "/modes-list" },
  { id: "translator", labelKey: "sidebar.translator", icon: Languages, path: "/modes?mode=translator", isPlaceholder: true },
  { id: "circles", labelKey: "nav.circles", icon: Users, path: "/circles" },
  { id: "tools", labelKey: "nav.tools", icon: FileText, path: "/tools/documents" },
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
  const { profile } = useAuth();
  const { toast } = useToast();

  const isActive = (path: string, isNewChat?: boolean) => {
    // New chat button is never "active" visually
    if (isNewChat) return false;
    if (path === "/modes") {
      return location.pathname === "/modes";
    }
    if (path === "/modes-list") {
      return location.pathname === "/modes-list";
    }
    if (path === "/circles") {
      return location.pathname.startsWith("/circles");
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (item: NavItem) => {
    if (item.isNewChat) {
      // Navigate to chat with new=1 to trigger new chat creation
      navigate("/chat/general?new=1");
    } else if (item.isPlaceholder) {
      // For translator, show "coming soon" toast
      toast({
        title: t('button.comingSoon'),
        description: t('settings.comingSoon'),
      });
    } else {
      navigate(item.path);
    }
    onNavigate?.();
  };

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (profile?.full_name) {
      const parts = profile.full_name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return profile.full_name[0].toUpperCase();
    }
    if (profile?.email) {
      return profile.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <div className={cn(
      "h-full flex flex-col bg-card border-r border-border transition-all duration-300",
      collapsed ? "w-[72px]" : "w-[260px]"
    )}>
      {/* Logo Header with Collapse Toggle */}
      <div className={cn(
        "flex items-center border-b border-border h-16 px-3",
        collapsed ? "justify-center" : "justify-between"
      )}>
        <div className="flex items-center gap-2.5">
          <img 
            src={bahorLogo} 
            alt="Bahor AI" 
            className="h-8 w-8 object-contain flex-shrink-0" 
          />
          {!collapsed && (
            <span className="font-bold text-lg text-foreground">Bahor AI</span>
          )}
        </div>
        {/* Collapse Toggle in Header */}
        {onCollapse && !collapsed && (
          <button
            onClick={() => onCollapse(!collapsed)}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {onCollapse && collapsed && (
          <button
            onClick={() => onCollapse(!collapsed)}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.isNewChat);
          const isNewChatBtn = item.isNewChat;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              title={collapsed ? t(item.labelKey) : undefined}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl transition-all duration-200",
                collapsed ? "justify-center px-2 py-3" : "px-4 py-3",
                isNewChatBtn 
                  ? "bg-secondary/60 text-foreground hover:bg-secondary font-medium border border-border/50 mb-2" 
                  : active 
                    ? "bg-accent text-accent-foreground font-medium" 
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "flex-shrink-0 transition-colors",
                "w-5 h-5"
              )} />
              {!collapsed && (
                <span className="text-sm truncate">{t(item.labelKey)}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="px-4 py-2">
        <div className="h-px bg-border/60" />
      </div>

      {/* Secondary Navigation */}
      <nav className="py-2 px-3 space-y-1">
        {SECONDARY_NAV.map((item) => {
          const Icon = item.icon;
          const isPremium = item.id === "premium";
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              title={collapsed ? t(item.labelKey) : undefined}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg transition-all duration-200",
                collapsed ? "justify-center px-2 py-2.5" : "px-4 py-2.5",
                isPremium 
                  ? "text-amber-500 hover:bg-amber-500/10"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "flex-shrink-0",
                "w-4 h-4",
                isPremium && "text-amber-500"
              )} />
              {!collapsed && (
                <span className="text-xs truncate">{t(item.labelKey)}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Account Section */}
      <div className="px-3 py-3 border-t border-border">
        <button
          onClick={() => { navigate("/settings"); onNavigate?.(); }}
          title={collapsed ? t("sidebar.account") : undefined}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl transition-all duration-200 hover:bg-accent/50",
            collapsed ? "justify-center px-2 py-3" : "px-3 py-3",
            location.pathname === "/settings" && "bg-accent"
          )}
        >
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.first_name || profile?.full_name?.split(" ")[0] || t("sidebar.account")}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.email || ""}
              </p>
            </div>
          )}
        </button>
      </div>

    </div>
  );
}
