import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { CircleNavigator } from "./CircleNavigator";
import { CircleOutcomesPane, type AICard } from "./CircleOutcomesPane";

interface CircleStudioLayoutProps {
  circleId: string;
  circleName: string;
  circleGoal?: string | null;
  isAdmin?: boolean;
  membersCount?: number;
  pendingRequestsCount?: number;
  onShowMembers?: () => void;
  onShowRequests?: () => void;
  onCreateCircle?: () => void;
  onSendToChat?: (content: string, title: string) => void;
  children: ReactNode;
  className?: string;
}

/**
 * 3-pane studio layout for Circles on desktop.
 * Left: Circle navigator
 * Center: Main content (chat, files, etc.)
 * Right: Outcomes/Natijalar library
 */
export function CircleStudioLayout({
  circleId,
  circleName,
  circleGoal,
  isAdmin = false,
  membersCount = 0,
  pendingRequestsCount = 0,
  onShowMembers,
  onShowRequests,
  onCreateCircle,
  onSendToChat,
  children,
  className,
}: CircleStudioLayoutProps) {
  const [outcomesCollapsed, setOutcomesCollapsed] = useState(false);

  return (
    <div className={cn("flex h-full w-full overflow-hidden", className)}>
      {/* Left Pane - Circle Navigator (hidden on mobile, shown on lg+) */}
      <div className="hidden lg:flex w-[280px] flex-shrink-0">
        <CircleNavigator
          currentCircleId={circleId}
          membersCount={membersCount}
          pendingRequestsCount={isAdmin ? pendingRequestsCount : 0}
          onShowMembers={onShowMembers}
          onShowRequests={onShowRequests}
          onCreateCircle={onCreateCircle}
        />
      </div>

      {/* Center Pane - Main Content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </div>

      {/* Right Pane - Outcomes (hidden on mobile, shown on lg+) */}
      <div
        className={cn(
          "hidden lg:flex flex-shrink-0 transition-all duration-200",
          outcomesCollapsed ? "w-12" : "w-[360px]"
        )}
      >
        <CircleOutcomesPane
          circleId={circleId}
          isCollapsed={outcomesCollapsed}
          onToggleCollapse={() => setOutcomesCollapsed(!outcomesCollapsed)}
          onSendToChat={onSendToChat}
        />
      </div>
    </div>
  );
}

export { type AICard };
