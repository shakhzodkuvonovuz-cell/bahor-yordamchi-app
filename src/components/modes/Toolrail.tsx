import { useNavigate, useLocation } from "react-router-dom";
import { Home, MessageCircle, Wrench, Users, FolderOpen, Settings, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ToolrailItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  route: string;
  isUpgrade?: boolean;
}

const TOOLRAIL_ITEMS: ToolrailItem[] = [
  { id: "home", icon: <Home className="w-5 h-5" />, label: "Bosh sahifa", route: "/modes" },
  { id: "chat", icon: <MessageCircle className="w-5 h-5" />, label: "Chat", route: "/chat/general" },
  { id: "tools", icon: <Wrench className="w-5 h-5" />, label: "Asboblar", route: "/tools/documents" },
  { id: "circles", icon: <Users className="w-5 h-5" />, label: "Doiralar", route: "/circles" },
  { id: "files", icon: <FolderOpen className="w-5 h-5" />, label: "Fayllar", route: "/tools/documents" },
  { id: "settings", icon: <Settings className="w-5 h-5" />, label: "Sozlamalar", route: "/settings" },
];

export default function Toolrail() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (route: string) => {
    if (route === "/modes" && location.pathname === "/modes") return true;
    if (route !== "/modes" && location.pathname.startsWith(route)) return true;
    return false;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 z-40">
        <div className="flex flex-col gap-1 p-2 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg">
          {TOOLRAIL_ITEMS.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate(item.route)}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                    isActive(item.route)
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  {item.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Divider */}
          <div className="h-px bg-border/50 my-1" />

          {/* Upgrade Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate("/settings")}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-amber-500 hover:bg-amber-500/10 transition-all duration-200"
              >
                <Crown className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Premium
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
