import bahorLogo from "@/assets/bahor-logo.png";
import { Button } from "@/components/ui/button";

export default function Signup() {
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
            onClick={() => {
              // TODO: Implement Google OAuth
              console.log("Google signup");
            }}
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
            onClick={() => {
              // TODO: Implement phone signup
              console.log("Phone signup");
            }}
          >
            Telefon raqami bilan davom etish
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 text-base"
            onClick={() => {
              // TODO: Implement email signup
              console.log("Email signup");
            }}
          >
            Email orqali ro'yxatdan o'tish
          </Button>
        </div>

        {/* Legal Footer */}
        <p className="text-xs text-center text-muted-foreground px-4">
          Ro'yxatdan o'tish orqali siz foydalanuvchi shartlari va maxfiylik siyosatiga rozilik
          bildirasiz.
        </p>
      </div>
    </div>
  );
}
