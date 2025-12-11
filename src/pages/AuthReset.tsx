import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, Lock, Loader2, CheckCircle, AlertCircle, KeyRound } from "lucide-react";
import { toast } from "sonner";
import bahorLogo from "@/assets/bahor-logo.png";
import { useTranslation } from "@/i18n/LanguageProvider";
import { SEO } from "@/components/SEO";

export default function AuthReset() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  
  // Check if user arrived via reset link (has access_token or error in URL hash/params)
  const [mode, setMode] = useState<"request" | "set-password" | "success" | "error">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check URL for reset token or error on mount
  useEffect(() => {
    const checkResetToken = async () => {
      // Check URL hash for access_token (Supabase redirect with token)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const errorCode = hashParams.get("error_code") || searchParams.get("error_code");
      const errorDescription = hashParams.get("error_description") || searchParams.get("error_description");
      
      // Check for expired/invalid link errors
      if (errorCode || errorDescription) {
        const errorMsg = errorDescription || errorCode;
        if (errorMsg?.toLowerCase().includes("expired") || errorCode === "otp_expired") {
          setError(t('reset.linkExpired'));
        } else if (errorMsg?.toLowerCase().includes("invalid") || errorCode === "access_denied") {
          setError(t('reset.linkInvalid'));
        } else {
          setError(t('reset.unknownError'));
        }
        setMode("error");
        setCheckingSession(false);
        return;
      }
      
      // If we have an access token, try to set up the session
      if (accessToken) {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            setError(t('reset.sessionError'));
            setMode("error");
          } else if (session) {
            // User is authenticated via reset link - show password form
            setMode("set-password");
          } else {
            // Try to refresh/verify the session from the token
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              setError(t('reset.sessionExpired'));
              setMode("error");
            } else {
              setMode("set-password");
            }
          }
        } catch (err) {
          setError(t('reset.sessionCheckError'));
          setMode("error");
        }
      }
      
      setCheckingSession(false);
    };
    
    checkResetToken();
  }, [searchParams, t]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError(t('reset.enterEmail'));
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      
      if (error) {
        if (error.message.includes("rate limit")) {
          setError(t('reset.rateLimited'));
        } else {
          setError(t('reset.error'));
        }
      } else {
        setMode("success");
        toast.success(t('reset.success'));
      }
    } catch (err) {
      setError(t('reset.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 8) {
      setError(t('reset.minChars'));
      return;
    }
    
    if (password !== confirmPassword) {
      setError(t('reset.mismatch'));
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        if (error.message.includes("same")) {
          setError(t('reset.samePassword'));
        } else {
          setError(t('reset.updateError'));
        }
      } else {
        toast.success(t('reset.updateSuccess'));
        navigate("/modes", { replace: true });
      }
    } catch (err) {
      setError(t('reset.networkError'));
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Parolni tiklash"
        description="Bahor AI hisobingiz parolini tiklang. Email orqali yangi parol o'rnating."
        url="/auth/reset"
        noIndex
      />
      <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/auth")}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-lg font-medium">
          {mode === "set-password" ? t('reset.newPassword') : t('reset.title')}
        </span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <img src={bahorLogo} alt="Bahor AI" className="h-10 w-10" />
          <span className="text-xl font-semibold">Bahor AI</span>
        </div>

        {/* Error State */}
        {mode === "error" && (
          <div className="w-full max-w-sm space-y-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">{t('reset.invalidLink')}</h2>
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
            <Button 
              className="w-full" 
              onClick={() => {
                setMode("request");
                setError(null);
                // Clear URL hash
                window.history.replaceState(null, "", window.location.pathname);
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              {t('reset.requestNew')}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => navigate("/auth")}
            >
              {t('reset.backToLogin')}
            </Button>
          </div>
        )}

        {/* Success State - Email Sent */}
        {mode === "success" && (
          <div className="w-full max-w-sm space-y-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">{t('reset.emailSent')}</h2>
              <p className="text-muted-foreground text-sm">
                <strong>{email}</strong> {t('reset.emailSentDesc')}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium mb-1">{t('reset.important')}</p>
              <ul className="list-disc list-inside space-y-1 text-left">
                <li>{t('reset.expiresIn')}</li>
                <li>{t('reset.checkSpam')}</li>
                <li>{t('reset.oneTimeUse')}</li>
              </ul>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setMode("request");
                setEmail("");
              }}
            >
              {t('reset.sendAnother')}
            </Button>
          </div>
        )}

        {/* Request Reset Form */}
        {mode === "request" && (
          <form onSubmit={handleRequestReset} className="w-full max-w-sm space-y-6">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <KeyRound className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">{t('reset.title')}</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {t('reset.description')}
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder={t('reset.emailPlaceholder')}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="pl-10 h-12"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full h-12" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t('reset.sendLink')
                )}
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {t('reset.rememberPassword')}{" "}
              <button
                type="button"
                onClick={() => navigate("/auth/email")}
                className="text-primary hover:underline"
              >
                {t('auth.login')}
              </button>
            </p>
          </form>
        )}

        {/* Set New Password Form */}
        {mode === "set-password" && (
          <form onSubmit={handleSetPassword} className="w-full max-w-sm space-y-6">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">{t('reset.createNew')}</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {t('reset.createNewDesc')}
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder={t('reset.newPasswordPlaceholder')}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  className="pl-10 h-12"
                  autoComplete="new-password"
                  autoFocus
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder={t('reset.confirmPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  className="pl-10 h-12"
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full h-12" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t('reset.updatePassword')
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
    </>
  );
}