import { ReactNode, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  MessageSquare, 
  Users, 
  FileText, 
  Settings, 
  Menu,
  X,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";
import bahorLogo from "@/assets/bahor-logo.png";

interface AppShellProps {
  children: ReactNode;
}

interface NavItem {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", labelKey: "nav.modes", icon: Home, path: "/modes" },
  { id: "chat", labelKey: "nav.chat", icon: MessageSquare, path: "/chat/general" },
  { id: "circles", labelKey: "nav.circles", icon: Users, path: "/circles" },
  { id: "tools", labelKey: "nav.tools", icon: FileText, path: "/tools/documents" },
  { id: "settings", labelKey: "settings.title", icon: Settings, path: "/settings" },
];

export function AppShell({ children }: AppShellProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    setDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar - Fixed left */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card/50 backdrop-blur-sm fixed left-0 top-0 h-screen z-40">
        {/* Logo Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <img 
            src={bahorLogo} 
            alt="Bahor AI" 
            className="h-9 w-auto object-contain" 
          />
          <span className="font-bold text-lg text-foreground">Bahor AI</span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200",
                  active 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", active && "text-primary")} />
                <span className="text-sm">{t(item.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © 2024 Bahor AI
          </p>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-sm border-b border-border z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        
        <div className="flex items-center gap-2">
          <img 
            src={bahorLogo} 
            alt="Bahor AI" 
            className="h-8 w-auto object-contain" 
          />
          <span className="font-bold text-foreground">Bahor AI</span>
        </div>
        
        <div className="w-9" /> {/* Spacer for centering */}
      </header>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-50"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside 
        className={cn(
          "lg:hidden fixed top-0 left-0 h-full w-72 bg-card border-r border-border z-50 transform transition-transform duration-300 ease-out",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <img 
              src={bahorLogo} 
              alt="Bahor AI" 
              className="h-9 w-auto object-contain" 
            />
            <span className="font-bold text-lg text-foreground">Bahor AI</span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 -mr-2 rounded-xl hover:bg-secondary transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Drawer Nav Items */}
        <nav className="py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-200",
                  active 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", active && "text-primary")} />
                <span className="text-base">{t(item.labelKey)}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 min-h-screen",
        // Account for sidebar on desktop
        "lg:ml-60",
        // Account for top bar on mobile
        "pt-14 lg:pt-0"
      )}>
        {children}
      </main>
    </div>
  );
}
