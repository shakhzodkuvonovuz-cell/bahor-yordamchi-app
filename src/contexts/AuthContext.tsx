import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { signInWithGoogleUnified } from '@/lib/auth/googleAuth';
import { toast } from 'sonner';

export interface UserProfile {
  id: string;
  user_id: string;
  /** Email is sourced from the auth user (not stored in DB) */
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  plan: 'free' | 'premium' | 'ultra' | 'monthly' | 'yearly';
  daily_limit: number;
  messages_today: number;
  last_reset_date: string | null;
  language: string;
  theme: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (redirectPath?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch or create profile
  const fetchOrCreateProfile = useCallback(async (authUser: User) => {
    setProfileLoading(true);
    try {
      // First try to get existing profile (via invoker-secured view)
      const { data: existingProfile, error: fetchError } = await supabase
        .from('my_profile')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Profile fetch error:', fetchError);
        setProfileLoading(false);
        return;
      }

      if (existingProfile) {
        setProfile({
          ...(existingProfile as unknown as Omit<UserProfile, 'email'>),
          email: authUser.email ?? null,
        } as UserProfile);
        setProfileLoading(false);
        return;
      }

      // Create new profile if doesn't exist
      const newProfile = {
        user_id: authUser.id,
        full_name: authUser.user_metadata?.full_name || null,
        first_name: authUser.user_metadata?.first_name || null,
        last_name: authUser.user_metadata?.last_name || null,
        avatar_url: authUser.user_metadata?.avatar_url || null,
        plan: 'free' as const,
        daily_limit: 5,
        messages_today: 0,
        language: 'uz',
        theme: 'light',
      };

      const { data: createdProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (insertError) {
        // Profile might have been created by trigger, try fetching again
        const { data: retryProfile } = await supabase
          .from('my_profile')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle();
        
        if (retryProfile) {
          setProfile({
            ...(retryProfile as unknown as Omit<UserProfile, 'email'>),
            email: authUser.email ?? null,
          } as UserProfile);
        }
      } else {
        // createdProfile is from base table (no phone). Normalize through my_profile for consistency.
        const { data: normalized } = await supabase
          .from('my_profile')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle();

        const base = (normalized ?? createdProfile) as any;
        setProfile({
          ...base,
          phone: base.phone ?? null,
          email: authUser.email ?? null,
        } as UserProfile);
      }
    } catch (err) {
      console.error('Profile fetch/create failed:', err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('my_profile')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        const base = data as any;
        setProfile({
          ...base,
          phone: base.phone ?? null,
          email: user.email ?? null,
        } as UserProfile);
      }
    } catch (err) {
      console.error('Profile refresh failed:', err);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Fetch/create profile on sign in (deferred to avoid deadlock)
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          setTimeout(() => {
            fetchOrCreateProfile(session.user);
          }, 0);
        }

        // Clear profile on sign out
        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session and VALIDATE it server-side
    const validateSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('[AuthContext] getSession error, clearing state:', sessionError.message);
          localStorage.removeItem('sb-akqtmyvwylfejbgwcyll-auth-token');
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          toast.error("Sessiya muddati tugadi. Iltimos, qayta kiring.", {
            description: "Session expired. Please log in again."
          });
          return;
        }
        
        if (session) {
          // Validate the session is still valid server-side using getUser()
          const { data: { user: validatedUser }, error: validationError } = await supabase.auth.getUser();
          
          if (validationError || !validatedUser) {
            // Session is invalid server-side - clear it locally
            console.warn('[AuthContext] Session invalid server-side, clearing local state:', validationError?.message);
            localStorage.removeItem('sb-akqtmyvwylfejbgwcyll-auth-token');
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            toast.error("Sessiya muddati tugadi. Iltimos, qayta kiring.", {
              description: "Session expired. Please log in again."
            });
            return;
          }
          
          // Session is valid
          setSession(session);
          setUser(validatedUser);
          setLoading(false);
          fetchOrCreateProfile(validatedUser);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('[AuthContext] Unexpected error validating session:', err);
        localStorage.removeItem('sb-akqtmyvwylfejbgwcyll-auth-token');
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };
    
    validateSession();

    return () => subscription.unsubscribe();
  }, [fetchOrCreateProfile]);

  const signUpWithEmail = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl }
    });
    return { error: error as Error | null };
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async (redirectPath: string = '/modes') => {
    // Use unified Google auth that handles both Web and Capacitor
    return signInWithGoogleUnified(redirectPath);
  };


  const signOut = async () => {
    // Always clear local state first, even if server signout fails
    // This handles the case where session is already invalid server-side
    setUser(null);
    setSession(null);
    setProfile(null);
    
    // Attempt server signout (may fail if session already invalid, that's ok)
    const { error } = await supabase.auth.signOut();
    
    // Clear any localStorage remnants
    localStorage.removeItem('sb-akqtmyvwylfejbgwcyll-auth-token');
    
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      profileLoading,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
