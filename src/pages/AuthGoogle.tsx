import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import bahorLogo from "@/assets/bahor-logo.png";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AuthGoogle() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/modes");
    }
  }, [user, authLoading, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) {
      if (error.message?.includes("provider") || error.message?.includes("not enabled")) {
        setError("Google kirish hozircha sozlanmagan. Iltimos, keyinroq urinib ko'ring.");
      } else {
        setError("Xatolik yuz berdi. Qayta urinib ko'ring.");
      }
      setLoading(false);
    }
    // If no error, user will be redirected to Google
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
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
            Ma'lumotlaringiz xavfsiz saqlanadi.
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
              Google orqali kirish
            </h2>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-destructive font-medium">{error}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Agar muammo davom etsa, Email orqali kiring.
                </p>
              </div>
            </div>
          )}

          {/* Google Button */}
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            variant="outline"
            className="w-full h-12 rounded-xl font-medium transition-all hover:scale-[0.99] active:scale-[0.97] hover:bg-muted/50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Kutilmoqda...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google orqali davom etish
              </>
            )}
          </Button>

          {/* Back to Email Link */}
          <div className="mt-6 text-center">
            <Link 
              to="/auth" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Email orqali kirish
            </Link>
          </div>
        </div>

        {/* Footer Consent */}
        <p className="text-xs text-center text-muted-foreground mt-6 px-4 leading-relaxed">
          Davom etish orqali siz{" "}
          <a href="#" className="text-primary hover:underline">
            Foydalanish shartlari
          </a>{" "}
          va{" "}
          <a href="#" className="text-primary hover:underline">
            Maxfiylik siyosati
          </a>
          ga rozilik bildirasiz.
        </p>
      </div>
    </div>
  );
}
