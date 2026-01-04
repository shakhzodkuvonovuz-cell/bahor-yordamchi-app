import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import bahorLogo from "@/assets/bahor-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail, AlertCircle, CheckCircle, Eye, EyeOff, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackSignupStarted, trackSignupCompleted, trackLoginCompleted } from "@/lib/analytics";
import { useTranslation } from "@/i18n/LanguageProvider";
import { SEO } from "@/components/SEO";

export default function AuthEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('next') || '/modes';
  const { t } = useTranslation();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Email verification pending state
  const [verificationPending, setVerificationPending] = useState(false);
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Password reset state
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const mapSupabaseError = (err: any): string => {
    const msg = err?.message?.toLowerCase() || "";
    
    if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
      return t('auth.error.invalidCredentials');
    }
    if (msg.includes("already registered") || msg.includes("user already registered")) {
      return t('auth.error.alreadyRegistered');
    }
    if (msg.includes("password") && (msg.includes("weak") || msg.includes("at least"))) {
      return t('auth.error.weakPassword');
    }
    if (msg.includes("rate limit") || msg.includes("too many")) {
      return t('auth.error.tooManyAttempts');
    }
    if (msg.includes("email not confirmed")) {
      return t('auth.error.emailNotConfirmed');
    }
    if (!email.includes("@")) {
      return t('auth.error.invalidEmail');
    }
    
    return t('auth.error.generic');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !email.includes("@")) {
      setError(t('auth.error.invalidEmail'));
      return;
    }
    
    if (password.length < 8) {
      setError(t('auth.error.weakPassword'));
      return;
    }

    // Signup-specific validation
    if (isSignUp) {
      if (!confirmPassword) {
        setError(t('auth.error.confirmRequired'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('auth.error.passwordMismatch'));
        return;
      }
    }

    setLoading(true);
    
    try {
      if (isSignUp) {
        trackSignupStarted("email");
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
          }
        });
        
        if (signUpError) {
          setError(mapSupabaseError(signUpError));
        } else {
          // Check if email confirmation is required
          // If user.identities is empty, it means the user already exists
          if (data.user && data.user.identities && data.user.identities.length === 0) {
            setError(t('auth.error.alreadyRegistered'));
          } else if (data.user && !data.session) {
            // Email confirmation required - send branded email and show pending state
            trackSignupCompleted("email");
            
            // Send branded verification email via edge function
            try {
              await supabase.functions.invoke('auth-send-email', {
                body: {
                  type: 'signup',
                  email,
                  redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
                }
              });
            } catch (emailErr) {
              console.warn('Failed to send branded email, falling back to default:', emailErr);
            }
            
            setVerificationPending(true);
          } else if (data.session) {
            // Auto-confirmed (shouldn't happen with our settings, but handle it)
            trackSignupCompleted("email");
            navigate(redirectTo);
          }
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        if (signInError) {
          setError(mapSupabaseError(signInError));
        } else {
          trackLoginCompleted("email");
          navigate(redirectTo);
        }
      }
    } catch (err) {
      setError(t('auth.error.generic'));
    }
    
    setLoading(false);
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Send branded verification email via edge function
      const { error } = await supabase.functions.invoke('auth-send-email', {
        body: {
          type: 'resend',
          email,
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
        }
      });
      
      if (error) {
        // Fall back to default Supabase resend
        await supabase.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
          }
        });
      }
    } catch (err) {
      setError(t('auth.error.generic'));
    }
    
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!email || !email.includes("@")) {
      setError(t('auth.error.enterEmail'));
      return;
    }

    setResetLoading(true);
    setError(null);
    
    try {
      // Send branded recovery email via edge function
      const { error } = await supabase.functions.invoke('auth-send-email', {
        body: {
          type: 'recovery',
          email,
          redirectTo: `${window.location.origin}/auth/reset`
        }
      });
      
      if (error) {
        // Fall back to default Supabase password reset
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset`
        });
      }
      
      setResetSuccess(true);
    } catch (err) {
      setError(t('auth.error.generic'));
    }
    
    setResetLoading(false);
  };

  return (
    <>
      <SEO 
        title="Email orqali kirish"
        description="Bahor AI hisobingizga email va parol orqali kiring yoki ro'yxatdan o'ting."
        url="/auth/email"
        noIndex
      />
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-primary/5">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[420px] mx-auto animate-fade-in">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <img 
                src={bahorLogo} 
                alt="Bahor AI" 
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
              />
              <h1 className="text-2xl sm:text-2xl font-bold text-foreground">Bahor AI</h1>
            </div>
          </div>

          {/* Auth Card */}
          <div className="bg-card rounded-[24px] shadow-xl border border-border/30 p-6 sm:p-8 animate-scale-in">
            {/* Email Verification Pending State */}
            {verificationPending ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Inbox className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {t('auth.checkEmail')}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {t('auth.verificationSent')}
                </p>
                <p className="text-sm font-medium text-foreground mb-6">
                  {email}
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  {t('auth.verificationHint')}
                </p>
                
                {/* Error Banner */}
                {error && (
                  <div className="mb-5 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-start gap-3 animate-fade-in">
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                
                <Button 
                  onClick={handleResendVerification}
                  disabled={loading}
                  variant="outline"
                  className="w-full h-12 rounded-xl mb-3"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t('auth.sending')}
                    </>
                  ) : (
                    t('auth.resendEmail')
                  )}
                </Button>
                <Button 
                  onClick={() => {
                    setVerificationPending(false);
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  variant="ghost"
                  className="w-full h-12 rounded-xl text-muted-foreground"
                >
                  {t('auth.useDifferentEmail')}
                </Button>
              </div>
            ) : (
              <>
            {/* Back Button & Title */}
            <div className="flex items-center gap-3 mb-6">
              <Link to={`/auth${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}>
                <button className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors">
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>
              <h2 className="text-lg font-semibold text-foreground">
                {isSignUp ? t('auth.signupTitle') : t('auth.emailTitle')}
              </h2>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-5 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-start gap-3 animate-fade-in">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Password Reset Panel */}
            {showResetPanel ? (
              <div className="space-y-4">
                {resetSuccess ? (
                  <div className="text-center py-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {t('auth.resetSent')}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('auth.resetSentDesc')}
                    </p>
                    <Button 
                      onClick={() => {
                        setShowResetPanel(false);
                        setResetSuccess(false);
                      }}
                      variant="outline"
                      className="w-full h-12 rounded-xl"
                    >
                      {t('auth.back')}
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('auth.resetDesc')}
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-[13px] font-medium">
                        {t('auth.email')}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="reset-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="pl-11 h-12 rounded-[14px] border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-[15px]"
                          disabled={resetLoading}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handlePasswordReset}
                      disabled={resetLoading}
                      className="w-full h-12 rounded-[14px] font-medium text-[15px] shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                    >
                      {resetLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          {t('auth.sending')}
                        </>
                      ) : (
                        t('auth.sendResetLink')
                      )}
                    </Button>
                    <button
                      onClick={() => setShowResetPanel(false)}
                      className="w-full text-[13px] text-muted-foreground hover:text-foreground transition-colors py-2"
                    >
                      {t('auth.back')}
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* Email Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[13px] font-medium">
                    {t('auth.email')}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      placeholder="email@example.com"
                      className="pl-11 h-12 rounded-[14px] border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-[15px]"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[13px] font-medium">
                    {t('auth.password')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder={t('auth.passwordHint')}
                      className="h-12 rounded-[14px] border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-[15px] pr-12"
                      required
                      minLength={8}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password - Signup only */}
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-[13px] font-medium">
                      {t('auth.confirmPassword')}
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setError(null);
                        }}
                        placeholder={t('auth.confirmPassword')}
                        className="h-12 rounded-[14px] border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-[15px] pr-12"
                        required
                        minLength={8}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setShowResetPanel(true)}
                    className="text-[13px] text-primary hover:text-primary/80 transition-colors min-h-[44px] flex items-center"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-[14px] font-medium text-[15px] shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t('auth.waiting')}
                    </>
                  ) : (
                    isSignUp ? t('auth.signup') : t('auth.login')
                  )}
                </Button>
              </form>
            )}

            {/* Toggle Sign Up / Sign In */}
            {!showResetPanel && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setConfirmPassword("");
                  }}
                  className="text-[14px] text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
                >
                  {isSignUp 
                    ? t('auth.haveAccount') + " " 
                    : t('auth.noAccount') + " "}
                  <span className="text-primary font-medium">
                    {isSignUp ? t('auth.login') : t('auth.signup')}
                  </span>
                </button>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}