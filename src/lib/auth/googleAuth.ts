/**
 * Google OAuth Authentication Module
 * 
 * Handles Google sign-in for both Web and Capacitor (Android APK) platforms.
 * 
 * Platform Detection:
 * - Web: Uses standard Supabase OAuth redirect
 * - Capacitor (Native): Uses system browser + deep link return
 * 
 * Deep Link Format: bahorai://auth-callback#access_token=...&refresh_token=...
 * 
 * ==========================================================
 * SUPABASE AUTH CONFIG CHECKLIST (for developers):
 * ==========================================================
 * 
 * Supabase Dashboard → Authentication → URL Configuration:
 * - Site URL: https://www.bahorai.com
 * - Additional Redirect URLs (add ALL):
 *   - https://www.bahorai.com/*
 *   - http://localhost:5173/*
 *   - capacitor://localhost/*
 *   - bahorai://auth-callback
 * 
 * Google Cloud Console → APIs & Credentials:
 * - Authorized redirect URI: https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
 * 
 * ==========================================================
 */

import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

// Detect if running as native app
export const isNativePlatform = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

// Get platform name for logging
export const getPlatformName = (): string => {
  try {
    return Capacitor.getPlatform();
  } catch {
    return 'web';
  }
};

/**
 * Parse OAuth tokens from deep link URL
 * Format: bahorai://auth-callback#access_token=...&refresh_token=...&...
 */
const parseOAuthTokensFromUrl = (url: string): { accessToken: string; refreshToken: string } | null => {
  try {
    // Extract hash fragment
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) {
      console.log('[GoogleAuth] No hash fragment in URL');
      return null;
    }

    const hashFragment = url.substring(hashIndex + 1);
    const params = new URLSearchParams(hashFragment);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      console.log('[GoogleAuth] Missing tokens in URL', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken 
      });
      return null;
    }

    return { accessToken, refreshToken };
  } catch (err) {
    console.error('[GoogleAuth] Failed to parse tokens from URL:', err);
    return null;
  }
};

/**
 * Set up deep link listener for OAuth callback (native only)
 * Call this once on app startup in App.tsx
 */
export const setupOAuthDeepLinkListener = (
  onSuccess: () => void,
  onError: (error: string) => void
): (() => void) => {
  if (!isNativePlatform()) {
    // Web doesn't need deep link listener
    return () => {};
  }

  console.log('[GoogleAuth] Setting up OAuth deep link listener');

  const handleAppUrlOpen = async ({ url }: { url: string }) => {
    console.log('[GoogleAuth] Deep link received:', url);

    // Check if this is our auth callback
    if (!url.startsWith('bahorai://auth-callback')) {
      console.log('[GoogleAuth] Ignoring non-auth deep link');
      return;
    }

    const tokens = parseOAuthTokensFromUrl(url);

    if (!tokens) {
      console.log('[GoogleAuth] No valid tokens in deep link, ignoring');
      return;
    }

    try {
      console.log('[GoogleAuth] Setting session with tokens...');
      
      const { data, error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      if (error) {
        console.error('[GoogleAuth] Failed to set session:', error);
        onError(error.message);
        return;
      }

      console.log('[GoogleAuth] Session set successfully:', data.user?.email);

      // Close the browser
      try {
        await Browser.close();
        console.log('[GoogleAuth] Browser closed');
      } catch (browserErr) {
        console.log('[GoogleAuth] Browser close failed (may be already closed):', browserErr);
      }

      onSuccess();
    } catch (err) {
      console.error('[GoogleAuth] Unexpected error setting session:', err);
      onError('Failed to complete sign in');
    }
  };

  // Add listener
  App.addListener('appUrlOpen', handleAppUrlOpen);

  // Return cleanup function
  return () => {
    App.removeAllListeners();
  };
};

/**
 * Unified Google Sign-In function
 * Handles both Web and Capacitor platforms
 */
export const signInWithGoogleUnified = async (
  redirectPath: string = '/modes'
): Promise<{ error: Error | null }> => {
  const platform = getPlatformName();
  console.log('[GoogleAuth] Starting Google sign-in on platform:', platform);

  if (isNativePlatform()) {
    // NATIVE (Capacitor) FLOW
    // Use skipBrowserRedirect + open system browser + wait for deep link
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'bahorai://auth-callback',
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('[GoogleAuth] Native OAuth error:', error);
        return { error: error as Error };
      }

      if (!data.url) {
        console.error('[GoogleAuth] No OAuth URL returned');
        return { error: new Error('Failed to get OAuth URL') };
      }

      console.log('[GoogleAuth] Opening browser for OAuth:', data.url);
      await Browser.open({ url: data.url });

      // The deep link listener will handle the callback
      return { error: null };
    } catch (err) {
      console.error('[GoogleAuth] Native sign-in failed:', err);
      return { error: err as Error };
    }
  } else {
    // WEB FLOW
    // Use standard redirect-based OAuth
    try {
      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`;
      
      console.log('[GoogleAuth] Web OAuth redirect to:', callbackUrl);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (error) {
        console.error('[GoogleAuth] Web OAuth error:', error);
        return { error: error as Error };
      }

      // User will be redirected to Google
      return { error: null };
    } catch (err) {
      console.error('[GoogleAuth] Web sign-in failed:', err);
      return { error: err as Error };
    }
  }
};
