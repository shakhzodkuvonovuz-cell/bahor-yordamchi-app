import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import bahorLogo from "@/assets/bahor-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Phone, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n/LanguageProvider";
import { SEO } from "@/components/SEO";

export default function AuthPhone() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('next') || '/modes';
  const { t } = useTranslation();
  
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const validatePhone = (phoneNumber: string): boolean => {
    // Must start with + and have 10-15 digits total
    const phoneRegex = /^\+[0-9]{10,15}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ""));
  };

  const handleSendOtp = async () => {
    setError(null);
    
    const cleanPhone = phone.replace(/\s/g, "");
    
    if (!validatePhone(cleanPhone)) {
      setError(t('auth.phoneInvalid'));
      return;
    }

    setLoading(true);
    
    const { error } = await supabase.auth.signInWithOtp({
      phone: cleanPhone,
      options: { channel: "sms" }
    });
    
    if (error) {
      if (error.message?.includes("not enabled") || error.message?.includes("provider")) {
        setError(t('auth.smsNotEnabled'));
      } else if (error.message?.includes("rate limit")) {
        setError(t('auth.tooManyAttempts'));
      } else {
        setError(t('auth.error'));
      }
    } else {
      setStep("otp");
      setCooldown(30);
      toast.success(t('auth.codeSent'));
    }
    
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setError(null);
    
    if (!otpCode || otpCode.length < 4) {
      setError(t('auth.enterCodeCorrectly'));
      return;
    }

    setLoading(true);
    
    const { error } = await supabase.auth.verifyOtp({
      phone: phone.replace(/\s/g, ""),
      token: otpCode,
      type: "sms"
    });
    
    if (error) {
      if (error.message?.includes("expired")) {
        setError(t('auth.codeExpired'));
      } else if (error.message?.includes("invalid")) {
        setError(t('auth.codeInvalid'));
      } else {
        setError(t('auth.error'));
      }
    } else {
      toast.success(t('auth.loginSuccess'));
      navigate(redirectTo);
    }
    
    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    await handleSendOtp();
  };

  return (
    <>
      <SEO 
        title="Telefon orqali kirish"
        description="Bahor AI hisobingizga telefon raqamingiz orqali SMS kod bilan kiring."
        url="/auth/phone"
        noIndex
      />
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-[420px] mx-auto">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src={bahorLogo} 
              alt="Bahor AI" 
              className="w-12 h-12 object-contain"
            />
            <h1 className="text-2xl font-bold text-foreground">Bahor AI</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {t('auth.dataSafe')}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border/50 p-6 sm:p-8">
          {/* Back Button & Title */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/auth">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl hover:bg-muted"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h2 className="text-lg font-semibold text-foreground">
              {t('auth.phoneTitle')}
            </h2>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {step === "phone" ? (
            /* Step 1: Phone Input */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  {t('auth.phoneLabel')}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('auth.phonePlaceholder')}
                    className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary focus:ring-primary/20"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('auth.phoneHint')}
                </p>
              </div>

              <Button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full h-11 rounded-xl font-medium transition-all hover:scale-[0.99] active:scale-[0.97]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t('auth.sending')}
                  </>
                ) : (
                  t('auth.sendCode')
                )}
              </Button>
            </div>
          ) : (
            /* Step 2: OTP Input */
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {phone} {t('auth.enterCode')}
              </p>

              <div className="space-y-2">
                <Label htmlFor="otp" className="text-sm font-medium">
                  {t('auth.verificationCode')}
                </Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  maxLength={6}
                  className="h-11 rounded-xl border-border/60 focus:border-primary focus:ring-primary/20 text-center text-lg tracking-widest"
                  disabled={loading}
                />
              </div>

              <Button
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full h-11 rounded-xl font-medium transition-all hover:scale-[0.99] active:scale-[0.97]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t('auth.verifying')}
                  </>
                ) : (
                  t('auth.verify')
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setOtpCode("");
                    setError(null);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('auth.changeNumber')}
                </button>
                
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || loading}
                  className="text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? t('auth.resendCodeIn').replace('{seconds}', String(cooldown)) : t('auth.resendCode')}
                </button>
              </div>
            </div>
          )}

          {/* Back to Email Link */}
          <div className="mt-6 text-center">
            <Link 
              to="/auth" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('auth.backToEmail')}
            </Link>
          </div>
        </div>

        {/* Footer Consent */}
        <p className="text-xs text-center text-muted-foreground mt-6 px-4 leading-relaxed">
          {t('auth.consent')}{" "}
          <Link to="/terms" className="text-primary hover:underline">
            {t('auth.termsLink')}
          </Link>{" "}
          {t('auth.and')}{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            {t('auth.privacyLink')}
          </Link>
          {t('auth.consentEnd')}
        </p>
      </div>
    </div>
    </>
  );
}
