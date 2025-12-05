import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import bahorLogo from "@/assets/bahor-logo.png";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AuthGoogle() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('next') || '/modes';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
        }
      });
      
      if (oauthError) {
        if (oauthError.message?.includes("provider") || oauthError.message?.includes("not enabled")) {
          setError("Google kirish hozircha sozlanmagan. Email yoki telefon orqali kiring.");
        } else {
          setError("Xatolik yuz berdi. Qayta urinib ko'ring.");
        }
        setLoading(false);
      }
      // If no error, user will be redirected to Google
    } catch (err) {
      setError("Xatolik yuz berdi. Qayta urinib ko'ring.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-primary/5">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[420px] mx-auto animate-fade-in">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img 
                src={bahorLogo} 
                alt="Bahor AI" 
                className="w-12 h-12 object-contain"
              />
              <h1 className="text-xl font-bold text-foreground">Bahor AI</h1>
            </div>
          </div>

          {/* Auth Card */}
          <div className="bg-card rounded-[24px] shadow-xl border border-border/30 p-6 sm:p-8 animate-scale-in">
            {/* Back Button & Title */}
            <div className="flex items-center gap-3 mb-6">
              <Link to="/auth">
                <button className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors">
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>
              <h2 className="text-lg font-semibold text-foreground">
                Google orqali kirish
              </h2>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-5 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-start gap-3 animate-fade-in">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-destructive">{error}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Link to="/auth/email">
                      <Button variant="outline" size="sm" className="h-9 rounded-xl text-[13px]">
                        Email orqali
                      </Button>
                    </Link>
                    <Link to="/auth/phone">
                      <Button variant="outline" size="sm" className="h-9 rounded-xl text-[13px]">
                        Telefon orqali
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Google Button */}
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              variant="outline"
              className="w-full h-14 rounded-[14px] font-medium text-[15px] border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-3" />
                  Kutilmoqda...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google orqali davom etish
                </>
              )}
            </Button>

            <p className="text-[13px] text-muted-foreground text-center mt-4">
              Google hisobingiz bilan bir zumda kiring
            </p>

            {/* Back to other methods */}
            <div className="mt-6 pt-6 border-t border-border/30">
              <p className="text-[13px] text-muted-foreground text-center mb-3">
                Boshqa usul bilan kirish
              </p>
              <div className="flex gap-3">
                <Link to="/auth/email" className="flex-1">
                  <Button variant="ghost" className="w-full h-11 rounded-xl text-[13px]">
                    Email
                  </Button>
                </Link>
                <Link to="/auth/phone" className="flex-1">
                  <Button variant="ghost" className="w-full h-11 rounded-xl text-[13px]">
                    Telefon
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
