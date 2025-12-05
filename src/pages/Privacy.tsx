import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-card/95 backdrop-blur-lg border-b border-border/40 shadow-premium-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Maxfiylik siyosati</h1>
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-56px)]">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-muted-foreground text-sm">
              Oxirgi yangilanish: 2025-yil, yanvar
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-6">1. Qanday ma'lumotlar yig'iladi</h2>
            <p className="text-foreground/80">
              Bahor AI quyidagi ma'lumotlarni yig'adi:
            </p>
            <ul className="list-disc pl-5 text-foreground/80 space-y-1">
              <li>Hisob ma'lumotlari (email, telefon raqami)</li>
              <li>Suhbat tarixi (savollar va javoblar)</li>
              <li>Yuklangan fayllar va rasmlar</li>
              <li>Qurilma ma'lumotlari (brauzer turi, til)</li>
            </ul>

            <h2 className="text-lg font-semibold text-foreground mt-6">2. Ma'lumotlardan foydalanish</h2>
            <p className="text-foreground/80">
              Yig'ilgan ma'lumotlardan quyidagi maqsadlarda foydalanamiz:
            </p>
            <ul className="list-disc pl-5 text-foreground/80 space-y-1">
              <li>AI yordamchisi xizmatini taqdim etish</li>
              <li>Suhbat tarixini saqlash va sinxronlash</li>
              <li>Xizmat sifatini yaxshilash</li>
              <li>Texnik muammolarni hal qilish</li>
            </ul>

            <h2 className="text-lg font-semibold text-foreground mt-6">3. Ma'lumotlar xavfsizligi</h2>
            <p className="text-foreground/80">
              Ma'lumotlaringiz Supabase serverlarida xavfsiz saqlanadi. Biz SSL shifrlash va zamonaviy xavfsizlik protokollaridan foydalanamiz. Suhbatlaringiz faqat sizga ko'rinadi.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-6">4. Uchinchi tomonlar</h2>
            <p className="text-foreground/80">
              Bahor AI quyidagi xizmatlardan foydalanadi:
            </p>
            <ul className="list-disc pl-5 text-foreground/80 space-y-1">
              <li>Supabase — ma'lumotlar bazasi va autentifikatsiya</li>
              <li>AI modellar — javoblar generatsiya qilish uchun</li>
            </ul>
            <p className="text-foreground/80 mt-2">
              Biz ma'lumotlaringizni reklama maqsadida sotmaymiz yoki baham ko'rmaymiz.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-6">5. Sizning huquqlaringiz</h2>
            <p className="text-foreground/80">
              Siz istalgan vaqtda:
            </p>
            <ul className="list-disc pl-5 text-foreground/80 space-y-1">
              <li>Suhbat tarixini o'chirishingiz mumkin</li>
              <li>Hisobingizni o'chirishni so'rashingiz mumkin</li>
              <li>Ma'lumotlaringiz haqida so'rov yuborishingiz mumkin</li>
            </ul>

            <h2 className="text-lg font-semibold text-foreground mt-6">6. Bog'lanish</h2>
            <p className="text-foreground/80">
              Maxfiylik haqida savollar uchun: <a href="mailto:support@bahorai.com" className="text-primary hover:underline">support@bahorai.com</a>
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
