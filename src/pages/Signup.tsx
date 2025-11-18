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
            Birinchi O'zbek Sun'iy Intellekti — Bahor AI
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
            Continue with Google
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
