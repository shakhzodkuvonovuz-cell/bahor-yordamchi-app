import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import bahorLogo from "@/assets/bahor-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Phone, Chrome } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/modes");
    }
  }, [user, authLoading, navigate]);

  const mapSupabaseError = (error: any): string => {
    const msg = error?.message?.toLowerCase() || "";
    
    if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
      return "Email yoki parol noto'g'ri.";
    }
    if (msg.includes("already registered") || msg.includes("user already registered")) {
      return "Bu email bilan hisob allaqachon mavjud.";
    }
    if (msg.includes("password") && (msg.includes("weak") || msg.includes("at least"))) {
      return "Parol kamida 8 ta belgidan iborat bo'lsin.";
    }
    if (msg.includes("rate limit") || msg.includes("too many")) {
      return "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.";
    }
    if (msg.includes("email not confirmed")) {
      return "Emailingizni tasdiqlang.";
    }
    
    return "Xatolik yuz berdi. Qayta urinib ko'ring.";
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Iltimos, to'g'ri email kiriting.");
      return;
    }
    
    if (password.length < 8) {
      toast.error("Parol kamida 8 ta belgidan iborat bo'lsin.");
      return;
    }

    setLoading(true);
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        
        if (error) {
          toast.error(mapSupabaseError(error));
        } else {
          toast.success("Muvaffaqiyatli ro'yxatdan o'tdingiz!");
          navigate("/modes");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        if (error) {
          toast.error(mapSupabaseError(error));
        } else {
          toast.success("Muvaffaqiyatli kirdingiz!");
          navigate("/modes");
        }
      }
    } catch (err) {
      toast.error("Xatolik yuz berdi. Qayta urinib ko'ring.");
    }
    
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Iltimos, emailingizni kiriting.");
      return;
    }

    setResetLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`
    });
    
    if (error) {
      toast.error("Xatolik yuz berdi. Qayta urinib ko'ring.");
    } else {
      toast.success("Parolni tiklash havolasi emailingizga yuborildi.");
    }
    
    setResetLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-[400px] mx-auto">
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img 
              src={bahorLogo} 
              alt="Bahor AI" 
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-xl font-semibold text-foreground">Bahor AI</h1>
          </div>
          <p className="text-muted-foreground text-[13px]">
            Ma'lumotlaringiz xavfsiz saqlanadi.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-2xl shadow-premium-md border border-border/40 p-6">
          {/* Card Header with OAuth Icons */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground">
              {isSignUp ? "Ro'yxatdan o'tish" : "Kirish"}
            </h2>
            <div className="flex items-center gap-2">
              <Link to="/auth/google">
                <Button
                  variant="outline"
                  size="icon"
                  className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-primary/10 hover:border-primary/50 transition-all"
                >
                  <Chrome className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/auth/phone">
                <Button
                  variant="outline"
                  size="icon"
                  className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-primary/10 hover:border-primary/50 transition-all"
                >
                  <Phone className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="pl-10 h-12 rounded-xl border-border/50 focus:border-primary text-[15px]"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-medium">
                Parol
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kamida 8 ta belgi"
                className="h-12 rounded-xl border-border/50 focus:border-primary text-[15px]"
                required
                minLength={8}
                disabled={loading}
              />
            </div>

            {!isSignUp && (
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={resetLoading}
                className="text-[13px] text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {resetLoading ? "Yuborilmoqda..." : "Parolni unutdingizmi?"}
              </button>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl font-medium text-[15px] transition-all active:scale-[0.98]" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Kutilmoqda...
                </>
              ) : (
                isSignUp ? "Ro'yxatdan o'tish" : "Kirish"
              )}
            </Button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
            >
              {isSignUp 
                ? "Allaqachon hisobingiz bormi? " 
                : "Hisobingiz yo'qmi? "}
              <span className="text-primary font-medium">
                {isSignUp ? "Kirish" : "Ro'yxatdan o'tish"}
              </span>
            </button>
          </div>
        </div>

        {/* Footer Consent */}
        <p className="text-[11px] text-center text-muted-foreground mt-5 px-4 leading-relaxed">
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