import { useState, useEffect } from 'react';
import { Infinity, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

interface ToolsUsageData {
  used: number;
  limit: number;
  isPremium: boolean;
  isDevBypass: boolean;
}

export default function ToolsUsageBadge() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [usage, setUsage] = useState<ToolsUsageData>({ used: 0, limit: 10, isPremium: false, isDevBypass: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchUsage = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Call edge function to get tools usage
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-entitlements?action=my-entitlement`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          const isDevBypass = data.isDevBypass || false;
          const plan = data.plan || 'free';
          const isPremium = isDevBypass || plan === 'dev_unlimited' || plan === 'beta_premium';
          
          // Get monthly PDF usage from usage_counters (or default to 0)
          const today = new Date();
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
          
          // For now, estimate PDF usage based on files created this month
          const { count } = await supabase
            .from('user_files')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', monthStart);
          
          const used = count || 0;
          const limit = isDevBypass ? -1 : isPremium ? 50 : 10;
          
          setUsage({ used, limit, isPremium, isDevBypass });
        }
      } catch (err) {
        console.error('Failed to fetch tools usage:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [user]);

  const labels = {
    uz: { thisMonth: 'bu oy' },
    en: { thisMonth: 'this month' },
    ru: { thisMonth: 'в этом месяце' },
    tr: { thisMonth: 'bu ay' },
  };
  const t = labels[language as keyof typeof labels] || labels.uz;

  if (loading) {
    return <div className="h-6 w-20 animate-pulse rounded-full bg-secondary" />;
  }

  if (usage.isDevBypass || usage.limit === -1) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
        <Infinity className="w-3.5 h-3.5" />
        <span>Unlimited</span>
      </div>
    );
  }

  const remaining = Math.max(usage.limit - usage.used, 0);
  const isAtLimit = remaining === 0;
  const isNearLimit = remaining <= 2 && remaining > 0;

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        isAtLimit 
          ? 'bg-destructive/10 text-destructive' 
          : isNearLimit 
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
            : 'bg-secondary text-secondary-foreground'
      }`}
    >
      <FileText className="w-3 h-3" />
      <span>{usage.used}/{usage.limit}</span>
      <span className="text-muted-foreground">{t.thisMonth}</span>
    </div>
  );
}
