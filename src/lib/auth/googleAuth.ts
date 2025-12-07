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
 * Parse OAuth data from deep link URL
 * Supports both formats:
 * - Hash tokens: bahorai://auth-callback#access_token=...&refresh_token=...
 * - Code flow: bahorai://auth-callback?code=...
 */
type OAuthData = 
  | { type: 'tokens'; accessToken: string; refreshToken: string }
  | { type: 'code'; code: string };

const parseOAuthDataFromUrl = (url: string): OAuthData | null => {
  try {
    // First check for ?code= (PKCE code flow)
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    
    if (code) {
      console.log('[GoogleAuth] Found authorization code in URL');
      return { type: 'code', code };
    }

    // Then check for #access_token (implicit flow)
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const hashFragment = url.substring(hashIndex + 1);
      const params = new URLSearchParams(hashFragment);

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        console.log('[GoogleAuth] Found tokens in URL hash');
        return { type: 'tokens', accessToken, refreshToken };
      }
    }

    console.log('[GoogleAuth] No valid OAuth data in URL');
    return null;
  } catch (err) {
    console.error('[GoogleAuth] Failed to parse OAuth data from URL:', err);
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

    const oauthData = parseOAuthDataFromUrl(url);

    if (!oauthData) {
      console.log('[GoogleAuth] No valid OAuth data in deep link, ignoring');
      return;
    }

    try {
      let sessionError: Error | null = null;
      let userEmail: string | null = null;

      if (oauthData.type === 'code') {
        // PKCE code flow - exchange code for session
        console.log('[GoogleAuth] Exchanging authorization code for session...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(oauthData.code);
        sessionError = error;
        userEmail = data?.user?.email ?? null;
      } else {
        // Implicit flow - set session directly with tokens
        console.log('[GoogleAuth] Setting session with tokens...');
        const { data, error } = await supabase.auth.setSession({
          access_token: oauthData.accessToken,
          refresh_token: oauthData.refreshToken,
        });
        sessionError = error;
        userEmail = data?.user?.email ?? null;
      }

      if (sessionError) {
        console.error('[GoogleAuth] Failed to establish session:', sessionError);
        onError(sessionError.message);
        return;
      }

      console.log('[GoogleAuth] Session established successfully:', userEmail);

      // Close the browser
      try {
        await Browser.close();
        console.log('[GoogleAuth] Browser closed');
      } catch (browserErr) {
        console.log('[GoogleAuth] Browser close failed (may be already closed):', browserErr);
      }

      onSuccess();
    } catch (err) {
      console.error('[GoogleAuth] Unexpected error establishing session:', err);
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
