import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import bahorLogo from "@/assets/bahor-logo.png";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { trackLoginCompleted } from "@/lib/analytics";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('next') || '/modes';
  const isNativeCallback = searchParams.get('native') === 'true';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL first
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const errorParam = params.get("error");
        const errorDescription = params.get("error_description");

        if (errorParam) {
          setError(errorDescription || "Kirish bekor qilindi.");
          return;
        }

        // Exchange code for session if we have one
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            setError("Sessiya yaratishda xatolik yuz berdi. Qayta urinib ko'ring.");
            return;
          }

          trackLoginCompleted("google");

          // If this is a native app callback, close the browser
          // The app will pick up the session via onAuthStateChange
          if (isNativeCallback && Capacitor.isNativePlatform()) {
            console.log('[AuthCallback] Native callback - closing browser');
            try {
              await Browser.close();
            } catch (e) {
              console.log('[AuthCallback] Browser close failed:', e);
            }
            // Navigate within the app
            navigate(redirectTo, { replace: true });
            return;
          }

          // Web flow - just navigate
          navigate(redirectTo, { replace: true });
          return;
        }

        // No code - check if we already have a session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          if (isNativeCallback && Capacitor.isNativePlatform()) {
            try {
              await Browser.close();
            } catch (e) {
              console.log('[AuthCallback] Browser close failed:', e);
            }
          }
          navigate(redirectTo, { replace: true });
          return;
        }

        // No code, no session, no error - something went wrong
        setError("Sessiya topilmadi. Qayta kiring.");
      } catch (err) {
        console.error('[AuthCallback] Error:', err);
        setError("Kutilmagan xatolik yuz berdi.");
      }
    };

    handleCallback();
  }, [navigate, redirectTo, isNativeCallback]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-background to-primary/5">
      <div className="w-full max-w-[420px] mx-auto animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img 
            src={bahorLogo} 
            alt="Bahor AI" 
            className="w-12 h-12 object-contain"
          />
          <h1 className="text-xl font-bold text-foreground">Bahor AI</h1>
        </div>

        {/* Card */}
        <div className="bg-card rounded-[24px] shadow-xl border border-border/30 p-8 text-center animate-scale-in">
          {error ? (
            <>
              <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Xatolik
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {error}
              </p>
              <Link to="/auth">
                <Button className="w-full h-12 rounded-[14px] shadow-lg shadow-primary/20">
                  Orqaga
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Kutilmoqda...
              </h2>
              <p className="text-sm text-muted-foreground">
                Hisobingizga kirilmoqda
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
