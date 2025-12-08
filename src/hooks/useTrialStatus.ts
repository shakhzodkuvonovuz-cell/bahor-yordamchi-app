import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PlanType } from '@/lib/entitlements';

export interface TrialStatus {
  plan: PlanType;
  isBetaActive: boolean;
  isPremium: boolean;  // true for dev_unlimited and beta_premium
  isDevBypass: boolean;
  betaExpiresAt: string | null;
  daysRemaining: number;
  limits: {
    messages: number;  // -1 for unlimited
    searches: number;
    vision: number;
    files: number;
  };
  used: {
    messages: number;
    searches: number;
    vision: number;
    files: number;
  };
  remaining: {
    messages: number;  // -1 for unlimited
    searches: number;
    vision: number;
    files: number;
  };
  resetsAt: string;
}

const defaultStatus: TrialStatus = {
  plan: 'free',
  isBetaActive: false,
  isPremium: false,
  isDevBypass: false,
  betaExpiresAt: null,
  daysRemaining: 0,
  limits: { messages: 5, searches: 0, vision: 0, files: 0 },
  used: { messages: 0, searches: 0, vision: 0, files: 0 },
  remaining: { messages: 5, searches: 0, vision: 0, files: 0 },
  resetsAt: new Date().toISOString().split('T')[0],
};

export function useTrialStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<TrialStatus>(defaultStatus);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setStatus(defaultStatus);
      setLoading(false);
      return;
    }

    try {
      // Validate session with server first
      const { data: { user: validUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !validUser) {
        console.log('Session invalid, using default trial status');
        setStatus(defaultStatus);
        return;
      }

      // Initialize trial for user (14 days by default)
      await supabase.rpc('get_or_create_trial', { p_user_id: user.id, p_trial_days: 14 });
      
      // Get full status
      const { data, error } = await supabase.rpc('get_trial_status', { p_user_id: user.id });
      
      if (error) {
        console.error('Failed to fetch trial status:', error);
        setStatus(defaultStatus);
        return;
      }

      // Check if user is dev bypass via edge function - get fresh session
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      let isDevBypass = false;
      
      if (freshSession) {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-entitlements?action=status`,
            {
              headers: {
                Authorization: `Bearer ${freshSession.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          if (res.ok) {
            const result = await res.json();
            isDevBypass = result.isDevBypass || false;
          }
        } catch (e) {
          // Ignore - not critical
        }
      }

      const trialData = data as any;
      const plan = (isDevBypass ? 'dev_unlimited' : trialData?.plan || 'free') as PlanType;
      const isBetaActive = trialData?.is_beta_active || false;
      const isPremium = isDevBypass || plan === 'dev_unlimited' || plan === 'beta_premium';
      
      setStatus({
        plan,
        isBetaActive,
        isPremium,
        isDevBypass,
        betaExpiresAt: trialData?.beta_expires_at || null,
        daysRemaining: trialData?.days_remaining || 0,
        limits: {
          messages: trialData?.limits?.messages ?? (plan === 'free' ? 5 : plan === 'beta_premium' ? 10 : -1),
          searches: trialData?.limits?.searches ?? 0,
          vision: trialData?.limits?.vision ?? 0,
          files: trialData?.limits?.files ?? 0,
        },
        used: {
          messages: trialData?.used?.messages || 0,
          searches: trialData?.used?.searches || 0,
          vision: trialData?.used?.vision || 0,
          files: trialData?.used?.files || 0,
        },
        remaining: {
          messages: trialData?.remaining?.messages ?? 5,
          searches: trialData?.remaining?.searches ?? 0,
          vision: trialData?.remaining?.vision ?? 0,
          files: trialData?.remaining?.files ?? 0,
        },
        resetsAt: trialData?.resets_at || new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      console.error('Trial status fetch failed:', err);
      setStatus(defaultStatus);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
