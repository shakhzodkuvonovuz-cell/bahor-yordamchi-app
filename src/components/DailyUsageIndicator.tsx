import { MessageSquare, AlertCircle } from "lucide-react";

interface DailyUsageIndicatorProps {
  used: number;
  limit: number;
  isNearLimit: boolean;
  hasReachedLimit: boolean;
}

export default function DailyUsageIndicator({ 
  used, 
  limit, 
  isNearLimit, 
  hasReachedLimit 
}: DailyUsageIndicatorProps) {
  return (
    <div className="flex justify-center py-2">
      <div 
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
          ${hasReachedLimit 
            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            : isNearLimit 
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          }
        `}
      >
        {hasReachedLimit ? (
          <AlertCircle className="w-3.5 h-3.5" />
        ) : (
          <MessageSquare className="w-3.5 h-3.5" />
        )}
        <span>
          Bugungi limit: <span className="font-bold">{used} / {limit}</span> so'rov
        </span>
      </div>
    </div>
  );
}
