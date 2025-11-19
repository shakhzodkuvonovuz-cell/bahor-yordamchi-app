import bahorLogo from "@/assets/bahor-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signUpWithEmail, signInWithGoogle, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Signup() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleGoogleSignup = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    
    if (error) {
      toast.error("Google orqali kirishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
      setLoading(false);
    }
    // Supabase will handle redirect, so we don't setLoading(false) here
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email || !email.includes("@")) {
      toast.error("Email noto'g'ri formatda.");
      return;
    }
    
    if (password.length < 8) {
      toast.error("Parol kamida 8 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    setLoading(true);
    const { data, error } = await signUpWithEmail(email, password);

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Bu email allaqachon ro'yxatdan o'tgan.");
      } else {
        toast.error("Ro'yxatdan o'tishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
      }
      setLoading(false);
      return;
    }

    if (data.user) {
      toast.success("Muvaffaqiyatli ro'yxatdan o'tdingiz!");
      navigate("/");
    }
    
    setLoading(false);
  };

  const handlePhoneClick = () => {
    toast.info("Telefon raqami orqali kirish tez orada qo'shiladi.");
  };

  const handleGuestMode = async () => {
    // Ensure user is signed out before entering guest mode
    await supabase.auth.signOut();
    navigate("/");
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background dark:bg-slate-950">
      <div className="w-full max-w-md mx-auto space-y-8">
        {/* Logo and Brand */}
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <img src={bahorLogo} alt="Bahor AI Logo" className="w-32 sm:w-40 object-contain" />
          <h1 className="text-4xl font-bold text-foreground">Bahor AI</h1>
        </div>

        {/* Hero Title and Subtitle */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-foreground">
            Birinchi o'zbek sun'iy intellekti — o'zbeklar uchun.
          </h2>
          <p className="text-base text-muted-foreground">
            Kuchli, tez va o'zbek tiliga moslashtirilgan AI yordamchi
          </p>
        </div>

        {/* Signup Buttons */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google orqali davom etish
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 text-base"
            onClick={handlePhoneClick}
            disabled={loading}
          >
            Telefon raqami bilan davom etish
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 text-base"
            onClick={() => setShowEmailForm(!showEmailForm)}
            disabled={loading}
          >
            Email orqali ro'yxatdan o'tish
          </Button>

          {/* Continue as guest option */}
          <Button
            variant="ghost"
            className="w-full h-12 text-base text-muted-foreground"
            onClick={handleGuestMode}
            disabled={loading}
          >
            Ilovasiz davom etish (mehmon rejimi)
          </Button>
        </div>

        {/* Email Signup Form */}
        {showEmailForm && (
          <form onSubmit={handleEmailSignup} className="space-y-4 p-4 border border-border rounded-lg bg-card">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parol</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kamida 8 ta belgi"
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Yuklanmoqda..." : "Ro'yxatdan o'tish"}
            </Button>
          </form>
        )}

        {/* Legal Footer */}
        <p className="text-xs text-center text-muted-foreground px-4">
          Ro'yxatdan o'tish orqali siz foydalanuvchi shartlari va maxfiylik siyosatiga rozilik
          bildirasiz.
        </p>
      </div>
    </div>
  );
}
