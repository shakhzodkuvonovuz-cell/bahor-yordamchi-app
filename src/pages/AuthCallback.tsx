import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import bahorLogo from "@/assets/bahor-logo.png";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if we already have a session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          navigate("/modes", { replace: true });
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
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            setError("Sessiya yaratishda xatolik yuz berdi. Qayta urinib ko'ring.");
          } else {
            navigate("/modes", { replace: true });
          }
        } else {
          // No code and no error, try to get session from hash fragment
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            setError("Xatolik yuz berdi. Qayta urinib ko'ring.");
          } else if (data.session) {
            navigate("/modes", { replace: true });
          } else {
            setError("Sessiya topilmadi. Qayta kiring.");
          }
        }
      } catch (err) {
        setError("Kutilmagan xatolik yuz berdi.");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-[420px] mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img 
            src={bahorLogo} 
            alt="Bahor AI" 
            className="w-12 h-12 object-contain"
          />
          <h1 className="text-2xl font-bold text-foreground">Bahor AI</h1>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border/50 p-6 sm:p-8 text-center">
          {error ? (
            <>
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Xatolik
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {error}
              </p>
              <Link to="/auth">
                <Button className="w-full h-11 rounded-xl">
                  Orqaga
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
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
