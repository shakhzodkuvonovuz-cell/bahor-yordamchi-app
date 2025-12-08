import { ReactNode, useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarV2 } from "./SidebarV2";
import bahorLogo from "@/assets/bahor-logo.png";

interface AppShellV2Props {
  children: ReactNode;
}

export function AppShellV2({ children }: AppShellV2Props) {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/modes") return "Suhbat";
    if (path === "/modes-list") return "Rejimlar";
    if (path.startsWith("/chat")) return "Chat";
    if (path.startsWith("/circles")) return "Doiralar";
    if (path.startsWith("/tools")) return "Asboblar";
    if (path === "/settings") return "Sozlamalar";
    if (path === "/feedback") return "Fikr bildirish";
    if (path === "/support") return "Yordam";
    return "Bahor AI";
  };

  return (
    <div className="min-h-screen bg-background flex w-full app-shell">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:block fixed left-0 top-0 h-screen z-40 transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}>
        <SidebarV2 
          collapsed={collapsed} 
          onCollapse={setCollapsed}
        />
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-md border-b border-border z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        
        <div className="flex items-center gap-2">
          <img 
            src={bahorLogo} 
            alt="Bahor AI" 
            className="h-7 w-7 object-contain" 
          />
          <span className="font-semibold text-foreground">{getPageTitle()}</span>
        </div>
        
        <div className="w-9" />
      </header>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50 animate-fade-in"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside 
        className={cn(
          "lg:hidden fixed top-0 left-0 h-full w-[280px] bg-card z-50 transform transition-transform duration-300 ease-out shadow-xl",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-end p-2 border-b border-border">
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>
        <SidebarV2 onNavigate={() => setDrawerOpen(false)} />
      </aside>

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 min-h-screen transition-all duration-300",
        collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]",
        "pt-14 lg:pt-0"
      )}>
        {children}
      </main>
    </div>
  );
}
