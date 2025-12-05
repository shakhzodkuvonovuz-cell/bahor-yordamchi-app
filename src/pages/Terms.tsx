import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/i18n/LanguageProvider";

export default function Terms() {
  const navigate = useNavigate();
  const { t, language } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-card/95 backdrop-blur-lg border-b border-border/40 shadow-premium-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary rounded-xl transition-colors"
            aria-label={t('settings.back')}
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{t('terms.title')}</h1>
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-56px)]">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {/* Translation notice for non-Uzbek users */}
            {language !== 'uz' && (
              <div className="bg-muted/50 border border-border/40 rounded-xl p-4 text-sm text-muted-foreground mb-4">
                {language === 'en' && "These terms are provided in Uzbek. Translation is for convenience only."}
                {language === 'ru' && "Эти условия предоставлены на узбекском языке. Перевод предоставлен для удобства."}
                {language === 'tr' && "Bu şartlar Özbekçe olarak sunulmaktadır. Çeviri yalnızca kolaylık sağlamak içindir."}
              </div>
            )}

            <p className="text-muted-foreground text-sm">
              {t('terms.lastUpdated')}
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-6">1. Umumiy qoidalar</h2>
            <p className="text-foreground/80">
              Bahor AI — bu sun'iy intellekt yordamchisi bo'lib, foydalanuvchilarga turli mavzularda yordam berish uchun mo'ljallangan. Xizmatdan foydalanish orqali siz ushbu shartlarga rozilik bildirasiz.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-6">2. Xizmatdan foydalanish</h2>
            <p className="text-foreground/80">
              Bahor AI dan foydalanishda quyidagilarga rioya qiling:
            </p>
            <ul className="list-disc pl-5 text-foreground/80 space-y-1">
              <li>Noqonuniy maqsadlarda foydalanmang</li>
              <li>Boshqa foydalanuvchilarga zarar keltirmang</li>
              <li>Tizimga zararli dasturlar yuklamang</li>
              <li>Haqiqiy ma'lumotlaringizni ko'rsating</li>
            </ul>

            <h2 className="text-lg font-semibold text-foreground mt-6">3. Kontent va javobgarlik</h2>
            <p className="text-foreground/80">
              Bahor AI tomonidan berilgan javoblar ma'lumot berish maqsadida taqdim etiladi. Tibbiy, huquqiy yoki moliyaviy masalalarda mutaxassislarga murojaat qiling. Biz javoblarning to'liq aniqligi uchun kafolat bermaymiz.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-6">4. Beta versiya</h2>
            <p className="text-foreground/80">
              Bahor AI hozirda beta versiyada. Xatoliklar yuz berishi mumkin. Xatoliklarni topganingizda bizga xabar bering — bu xizmatni yaxshilashga yordam beradi.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-6">5. O'zgartirishlar</h2>
            <p className="text-foreground/80">
              Biz ushbu shartlarni istalgan vaqtda o'zgartirish huquqini saqlab qolamiz. O'zgarishlar e'lon qilingandan so'ng xizmatdan foydalanishni davom ettirsangiz, yangi shartlarga rozilik bildirgan hisoblanasiz.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-6">6. Bog'lanish</h2>
            <p className="text-foreground/80">
              Savollar uchun: <a href="mailto:support@bahorai.com" className="text-primary hover:underline">support@bahorai.com</a>
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
