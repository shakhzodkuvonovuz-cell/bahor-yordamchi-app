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
          {/* Card Header with OAuth Icons */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              {isSignUp ? "Ro'yxatdan o'tish" : "Kirish"}
            </h2>
            <div className="flex items-center gap-2">
              <Link to="/auth/google">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:border-primary/50 transition-all"
                >
                  <Chrome className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/auth/phone">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:border-primary/50 transition-all"
                >
                  <Phone className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
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
                  className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary focus:ring-primary/20"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Parol
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kamida 8 ta belgi"
                className="h-11 rounded-xl border-border/60 focus:border-primary focus:ring-primary/20"
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
                className="text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {resetLoading ? "Yuborilmoqda..." : "Parolni unutdingizmi?"}
              </button>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 rounded-xl font-medium transition-all hover:scale-[0.99] active:scale-[0.97]" 
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
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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