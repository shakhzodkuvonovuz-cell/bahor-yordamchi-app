import { Progress } from "@/components/ui/progress";
import { Crown } from "lucide-react";

interface UsageProgressBarProps {
  used: number;
  limit: number;
  plan: string;
}

export default function UsageProgressBar({ used, limit, plan }: UsageProgressBarProps) {
  const percentage = Math.min((used / limit) * 100, 100);
  const remaining = Math.max(limit - used, 0);
  const isNearLimit = percentage >= 80;
  const isAtLimit = used >= limit;

  const getPlanLabel = () => {
    switch (plan) {
      case 'free': return 'Bepul';
      case 'premium':
      case 'monthly': return 'Premium';
      case 'ultra':
      case 'yearly': return 'Ultra';
      default: return 'Bepul';
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Bugungi foydalanish</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          plan === 'free' 
            ? 'bg-secondary text-secondary-foreground'
            : 'bg-primary/10 text-primary'
        }`}>
          {plan !== 'free' && <Crown className="w-3 h-3" />}
          {getPlanLabel()}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <Progress 
          value={percentage} 
          className={`h-2.5 ${isAtLimit ? 'bg-destructive/20' : isNearLimit ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-secondary'}`}
        />
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${isAtLimit ? 'text-destructive' : isNearLimit ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
            {used} / {limit} so'rov
          </span>
          <span className="text-muted-foreground">
            {remaining > 0 ? `${remaining} ta qoldi` : 'Limit tugadi'}
          </span>
        </div>
      </div>

      {/* Warning message */}
      {isAtLimit && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          Bugungi limitingiz tugadi. Ertaga qaytadan urinib ko'ring yoki Premiumga o'ting.
        </p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
          Limitga yaqinlashyapsiz. Cheksiz so'rovlar uchun Premiumga o'ting.
        </p>
      )}
    </div>
  );
}
