import { Crown, Sparkles, Clock, MessageCircle, Search, Image, FileText, Shield, Infinity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from '@/i18n/LanguageProvider';
import { TrialStatus } from '@/hooks/useTrialStatus';

interface TrialStatusCardProps {
  status: TrialStatus;
}

export default function TrialStatusCard({ status }: TrialStatusCardProps) {
  const { t } = useTranslation();

  // Dev unlimited - show unlimited badge
  if (status.isDevBypass || status.plan === 'dev_unlimited') {
    return (
      <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-purple-500/20">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-purple-300">{t('plan.devUnlimited')}</p>
            <p className="text-sm text-muted-foreground">{t('plan.noLimits')}</p>
          </div>
          <Infinity className="w-5 h-5 text-purple-400" />
        </div>
      </Card>
    );
  }

  // Beta Premium active
  if (status.plan === 'beta_premium' && status.isBetaActive) {
    const messagePercent = status.limits.messages > 0 
      ? (status.used.messages / status.limits.messages) * 100 
      : 0;
    
    return (
      <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-emerald-300">{t('plan.betaPremium')}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{status.daysRemaining} {t('trial.daysLeft')}</span>
          </div>
        </div>
        
        {/* Messages usage */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <span>{t('trial.messages')}</span>
            </div>
            <span className="text-muted-foreground">
              {status.used.messages}/{status.limits.messages}
            </span>
          </div>
          <Progress value={messagePercent} className="h-2" />
        </div>

        {/* Feature counters */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Search className="w-3.5 h-3.5" />
            <span>{status.remaining.searches}/{status.limits.searches}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Image className="w-3.5 h-3.5" />
            <span>{status.remaining.vision}/{status.limits.vision}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            <span>{status.remaining.files}/{status.limits.files}</span>
          </div>
        </div>
      </Card>
    );
  }

  // Free plan (beta expired or never had)
  const messagePercent = status.limits.messages > 0 
    ? (status.used.messages / status.limits.messages) * 100 
    : 0;

  return (
    <Card className="p-4 bg-muted/50 border-border">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium">{t('plan.free')}</span>
        <span className="text-sm text-muted-foreground">
          {status.used.messages}/{status.limits.messages} {t('trial.messagesPerDay')}
        </span>
      </div>
      <Progress 
        value={messagePercent} 
        className="h-2 mb-3" 
      />
      <p className="text-sm text-muted-foreground">
        {t('plan.upgradeForMore')}
      </p>
    </Card>
  );
}
