import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TrialStatus {
  plan: string;
  isTrialActive: boolean;
  isPremium: boolean;
  isDevBypass: boolean;
  trialStartedAt: string | null;
  trialExpiresAt: string | null;
  daysRemaining: number;
  limits: {
    messages: number;
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
    messages: number;
    searches: number;
    vision: number;
    files: number;
  };
  resetsAt: string;
}

const defaultStatus: TrialStatus = {
  plan: 'free',
  isTrialActive: false,
  isPremium: false,
  isDevBypass: false,
  trialStartedAt: null,
  trialExpiresAt: null,
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
      // First ensure trial is initialized
      await supabase.rpc('get_or_create_trial', { p_user_id: user.id, p_trial_days: 7 });
      
      // Then get full status
      const { data, error } = await supabase.rpc('get_trial_status', { p_user_id: user.id });
      
      if (error) {
        console.error('Failed to fetch trial status:', error);
        setStatus(defaultStatus);
        return;
      }

      // Also check if user is dev bypass via edge function
      const { data: { session } } = await supabase.auth.getSession();
      let isDevBypass = false;
      
      if (session) {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-entitlements?action=status`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
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
      
      setStatus({
        plan: trialData?.plan || 'free',
        isTrialActive: trialData?.is_trial_active || false,
        isPremium: trialData?.is_premium || false,
        isDevBypass,
        trialStartedAt: trialData?.trial_started_at || null,
        trialExpiresAt: trialData?.trial_expires_at || null,
        daysRemaining: trialData?.days_remaining || 0,
        limits: {
          messages: trialData?.limits?.messages || 5,
          searches: trialData?.limits?.searches || 0,
          vision: trialData?.limits?.vision || 0,
          files: trialData?.limits?.files || 0,
        },
        used: {
          messages: trialData?.used?.messages || 0,
          searches: trialData?.used?.searches || 0,
          vision: trialData?.used?.vision || 0,
          files: trialData?.used?.files || 0,
        },
        remaining: {
          messages: trialData?.remaining?.messages || 5,
          searches: trialData?.remaining?.searches || 0,
          vision: trialData?.remaining?.vision || 0,
          files: trialData?.remaining?.files || 0,
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
