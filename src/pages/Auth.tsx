import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import bahorLogo from "@/assets/bahor-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Phone, Chrome } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { user, signUpWithEmail, signInWithEmail, signInWithGoogle, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  
  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  
  // Phone state
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  
  // Google state
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/modes");
    }
  }, [user, navigate]);

  // Email handlers
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Email noto'g'ri formatda.");
      return;
    }
    
    if (password.length < 8) {
      toast.error("Parol kamida 8 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    setEmailLoading(true);
    
    if (isSignUp) {
      const { error } = await signUpWithEmail(email, password);
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Bu email allaqachon ro'yxatdan o'tgan.");
        } else {
          toast.error("Ro'yxatdan o'tishda xatolik yuz berdi.");
        }
      } else {
        toast.success("Muvaffaqiyatli ro'yxatdan o'tdingiz!");
      }
    } else {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        toast.error("Email yoki parol noto'g'ri.");
      } else {
        toast.success("Muvaffaqiyatli kirdingiz!");
      }
    }
    
    setEmailLoading(false);
  };

  // Google handler
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error("Google orqali kirishda xatolik yuz berdi.");
      setGoogleLoading(false);
    }
    // Don't set loading false - redirect will handle it
  };

  // Phone handlers
  const handleSendOtp = async () => {
    if (!phone || phone.length < 9) {
      toast.error("Telefon raqamini to'g'ri kiriting (masalan: +998901234567).");
      return;
    }

    setPhoneLoading(true);
    const { error } = await sendPhoneOtp(phone);
    
    if (error) {
      toast.error("SMS yuborishda xatolik: " + error.message);
    } else {
      setOtpSent(true);
      toast.success("Tasdiqlash kodi yuborildi!");
    }
    setPhoneLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      toast.error("Tasdiqlash kodini to'g'ri kiriting.");
      return;
    }

    setPhoneLoading(true);
    const { error } = await verifyPhoneOtp(phone, otpCode);
    
    if (error) {
      toast.error("Kod noto'g'ri yoki muddati o'tgan.");
    } else {
      toast.success("Muvaffaqiyatli kirdingiz!");
    }
    setPhoneLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <img src={bahorLogo} alt="Bahor AI Logo" className="w-28 sm:w-36 object-contain" />
          <h1 className="text-3xl font-bold text-foreground">Bahor AI</h1>
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Kirish yoki ro'yxatdan o'tish</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Bahor AI dan foydalanish uchun hisobingizga kiring
          </p>
        </div>

        {/* Auth Tabs */}
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email" className="flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="google" className="flex items-center gap-1.5">
              <Chrome className="w-4 h-4" />
              <span className="hidden sm:inline">Google</span>
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex items-center gap-1.5">
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Telefon</span>
            </TabsTrigger>
          </TabsList>

          {/* Email Tab */}
          <TabsContent value="email" className="mt-4">
            <form onSubmit={handleEmailSubmit} className="space-y-4 p-4 border border-border rounded-lg bg-card">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  disabled={emailLoading}
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
                  disabled={emailLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={emailLoading}>
                {emailLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {isSignUp ? "Ro'yxatdan o'tish" : "Kirish"}
              </Button>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isSignUp ? "Hisobingiz bormi? Kirish" : "Hisobingiz yo'qmi? Ro'yxatdan o'tish"}
              </button>
            </form>
          </TabsContent>

          {/* Google Tab */}
          <TabsContent value="google" className="mt-4">
            <div className="p-4 border border-border rounded-lg bg-card space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Google hisobingiz orqali bir marta bosish bilan kiring
              </p>
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Google orqali kirish
              </Button>
            </div>
          </TabsContent>

          {/* Phone Tab */}
          <TabsContent value="phone" className="mt-4">
            <div className="p-4 border border-border rounded-lg bg-card space-y-4">
              {!otpSent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon raqami</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+998901234567"
                      disabled={phoneLoading}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleSendOtp}
                    disabled={phoneLoading}
                  >
                    {phoneLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Kod yuborish
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    {phone} raqamiga yuborilgan kodni kiriting
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="otp">Tasdiqlash kodi</Label>
                    <Input
                      id="otp"
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      disabled={phoneLoading}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleVerifyOtp}
                    disabled={phoneLoading}
                  >
                    {phoneLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Tasdiqlash
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode("");
                    }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Raqamni o'zgartirish
                  </button>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground px-4">
          Davom etish orqali siz foydalanuvchi shartlari va maxfiylik siyosatiga rozilik bildirasiz.
        </p>
      </div>
    </div>
  );
}
