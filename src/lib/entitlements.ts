import { supabase } from '@/integrations/supabase/client';

export interface Entitlement {
  plan: 'free' | 'premium';
  isPremium: boolean;
  expiresAt: string | null;
  flags: Record<string, boolean>;
  note?: string | null;
  isDevBypass?: boolean;
}

export interface DailyUsageData {
  date: string;
  used: number;
  limit: number;
  isPremium: boolean;
  isDevBypass: boolean;
}

interface EntitlementRpcResult {
  plan?: string;
  isPremium?: boolean;
  expiresAt?: string | null;
  flags?: Record<string, boolean>;
  note?: string | null;
}

/**
 * Fetch the current user's entitlement from the database
 */
export async function fetchUserEntitlement(userId: string): Promise<Entitlement> {
  try {
    // Use the RPC function to get effective entitlement
    const { data, error } = await supabase.rpc('get_effective_entitlement', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error fetching entitlement:', error);
      return {
        plan: 'free',
        isPremium: false,
        expiresAt: null,
        flags: {},
      };
    }

    // Cast the JSON response
    const result = data as EntitlementRpcResult | null;

    return {
      plan: (result?.plan as 'free' | 'premium') || 'free',
      isPremium: result?.isPremium || false,
      expiresAt: result?.expiresAt || null,
      flags: result?.flags || {},
      note: result?.note,
    };
  } catch (err) {
    console.error('Entitlement fetch failed:', err);
    return {
      plan: 'free',
      isPremium: false,
      expiresAt: null,
      flags: {},
    };
  }
}

/**
 * Fetch the current user's daily usage from the edge function (includes devBypass check)
 */
export async function fetchDailyUsage(userId: string): Promise<DailyUsageData> {
  const today = new Date().toISOString().split('T')[0];

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { date: today, used: 0, limit: 5, isPremium: false, isDevBypass: false };
    }

    // Call edge function which has access to DEV_UNLIMITED_EMAILS
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-entitlements?action=my-entitlement`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      console.error('Failed to fetch entitlement:', res.status);
      return { date: today, used: 0, limit: 5, isPremium: false, isDevBypass: false };
    }

    const data = await res.json();
    
    return {
      date: data.usage?.date || today,
      used: data.usage?.used || 0,
      limit: data.usage?.limit || 5,
      isPremium: data.isPremium || false,
      isDevBypass: data.isDevBypass || false,
    };
  } catch (err) {
    console.error('Daily usage fetch failed:', err);
    return { date: today, used: 0, limit: 5, isPremium: false, isDevBypass: false };
  }
}

/**
 * Check if a user is an admin (for admin pages)
 */
export async function checkAdminStatus(): Promise<{ isAdmin: boolean; email: string; isDevBypass: boolean }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { isAdmin: false, email: '', isDevBypass: false };
    }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-entitlements?action=status`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      return { isAdmin: false, email: '', isDevBypass: false };
    }

    const result = await res.json();
    return {
      isAdmin: result.isAdmin || false,
      email: result.email || '',
      isDevBypass: result.isDevBypass || false,
    };
  } catch (err) {
    console.error('Admin check failed:', err);
    return { isAdmin: false, email: '', isDevBypass: false };
  }
}

/**
 * Admin: lookup user entitlement by email
 */
export async function adminLookupUser(email: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-entitlements?action=lookup&email=${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Lookup failed');
  return data;
}

/**
 * Admin: set user entitlement
 */
export async function adminSetEntitlement(params: {
  email: string;
  plan: 'free' | 'premium';
  expiresAt?: string | null;
  note?: string;
  flags?: Record<string, boolean>;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-entitlements?action=set`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Set failed');
  return data;
}

/**
 * Admin: revoke user entitlement (set to free)
 */
export async function adminRevokeEntitlement(email: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-entitlements?action=revoke`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Revoke failed');
  return data;
}
