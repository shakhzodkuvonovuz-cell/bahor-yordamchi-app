import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserEntitlement, fetchDailyUsage, type Entitlement, type DailyUsageData } from '@/lib/entitlements';

export function useEntitlements() {
  const { user } = useAuth();
  const [entitlement, setEntitlement] = useState<Entitlement>({
    plan: 'free',
    isPremium: false,
    expiresAt: null,
    flags: {},
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setEntitlement({
        plan: 'free',
        isPremium: false,
        expiresAt: null,
        flags: {},
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchUserEntitlement(user.id);
      setEntitlement(data);
    } catch (err) {
      console.error('Failed to fetch entitlement:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entitlement, loading, refresh };
}

export function useDailyUsageServer() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<DailyUsageData>({
    date: new Date().toISOString().split('T')[0],
    used: 0,
    limit: 5,
    isPremium: false,
    isDevBypass: false,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setUsage({
        date: new Date().toISOString().split('T')[0],
        used: 0,
        limit: 5,
        isPremium: false,
        isDevBypass: false,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchDailyUsage(user.id);
      setUsage(data);
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasReachedLimit = !usage.isPremium && !usage.isDevBypass && usage.used >= usage.limit;
  const isNearLimit = !usage.isPremium && !usage.isDevBypass && usage.used >= usage.limit - 1;

  return { 
    usage, 
    loading, 
    refresh,
    hasReachedLimit,
    isNearLimit,
    isPremium: usage.isPremium,
    isDevBypass: usage.isDevBypass,
  };
}
