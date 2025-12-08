import { ReactNode, useState, useEffect } from "react";
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

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [drawerOpen]);

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
    <div className="min-h-[100dvh] bg-background flex w-full app-shell">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:block fixed left-0 top-0 h-[100dvh] z-40 transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}>
        <SidebarV2 
          collapsed={collapsed} 
          onCollapse={setCollapsed}
        />
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-md border-b border-border z-40 flex items-center justify-between px-4 safe-area-top">
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

      {/* Mobile Drawer Overlay - true modal with fixed position */}
      {drawerOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-[100] animate-fade-in"
          onClick={() => setDrawerOpen(false)}
          style={{ touchAction: 'none' }}
        />
      )}

      {/* Mobile Drawer - fixed position, full height */}
      <aside 
        className={cn(
          "lg:hidden fixed top-0 left-0 z-[101] w-[280px] bg-card transform transition-transform duration-300 ease-out shadow-2xl",
          "h-[100dvh]",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ touchAction: drawerOpen ? 'auto' : 'none' }}
      >
        <div className="flex items-center justify-end p-2 border-b border-border safe-area-top">
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>
        <div className="h-[calc(100dvh-56px)] overflow-y-auto overscroll-contain">
          <SidebarV2 onNavigate={() => setDrawerOpen(false)} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 min-h-[100dvh] transition-all duration-300",
        collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]",
        "pt-14 lg:pt-0"
      )}>
        {children}
      </main>
    </div>
  );
}
