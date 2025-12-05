import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import bahorLogo from "@/assets/bahor-logo.png";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('next') || '/modes';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if we already have a session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          navigate(redirectTo, { replace: true });
          return;
        }

        // Get the code from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const errorParam = params.get("error");
        const errorDescription = params.get("error_description");

        if (errorParam) {
          setError(errorDescription || "Kirish bekor qilindi.");
          return;
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            setError("Sessiya yaratishda xatolik yuz berdi. Qayta urinib ko'ring.");
          } else {
            navigate(redirectTo, { replace: true });
          }
        } else {
          // No code and no error, try to get session from hash fragment
          const { data, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            setError("Xatolik yuz berdi. Qayta urinib ko'ring.");
          } else if (data.session) {
            navigate(redirectTo, { replace: true });
          } else {
            setError("Sessiya topilmadi. Qayta kiring.");
          }
        }
      } catch (err) {
        setError("Kutilmagan xatolik yuz berdi.");
      }
    };

    handleCallback();
  }, [navigate, redirectTo]);

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
