import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Globe, Moon, Sun, Shield, HelpCircle, FileText, Mail, LogOut, ChevronRight, CreditCard } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage, Language } from "@/hooks/useLanguage";
import { getTranslation } from "@/data/translations";
import { useAuth, signOut } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import SubscriptionStatus from "@/components/SubscriptionStatus";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const t = getTranslation(language);
  
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [subscriptionDrawerOpen, setSubscriptionDrawerOpen] = useState(false);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Xatolik",
        description: "Chiqishda xatolik yuz berdi",
        variant: "destructive",
      });
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary-glow/10">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border shadow-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
            aria-label={t.settings.back}
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{t.settings.title}</h1>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-60px)]">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Section 1: Hisob (Account) */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">{t.settings.account}</h2>
            </div>
            <div className="divide-y divide-border">
              {/* Profil */}
              <Collapsible open={openSection === "profile"} onOpenChange={() => toggleSection("profile")}>
                <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{t.settings.profile}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openSection === "profile" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-4 bg-muted/30">
                  <div className="space-y-3">
                    {user?.email && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Email:</p>
                        <p className="text-sm font-medium text-foreground">{user.email}</p>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Profil ma'lumotlarini to'liq tahrirlash funksiyasi tez orada qo'shiladi.
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Xavfsizlik */}
              <Collapsible open={openSection === "security"} onOpenChange={() => toggleSection("security")}>
                <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{t.settings.security}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openSection === "security" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Parolni o'zgartirish va xavfsizlik sozlamalari tez kunda qo'shiladi.
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full px-6 py-4 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <LogOut className="w-5 h-5 text-red-500" />
                <span className="font-medium text-red-500">{t.settings.logout}</span>
              </button>
            </div>
          </div>

          {/* Section 2: Ilova (App) */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">{t.settings.app}</h2>
            </div>
            <div className="divide-y divide-border">
              {/* Til (Language) */}
              <Collapsible open={openSection === "language"} onOpenChange={() => toggleSection("language")}>
                <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{t.settings.language}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openSection === "language" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-4 bg-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setLanguage("uz")}
                      className={`py-3 px-4 rounded-xl font-medium transition-all ${
                        language === "uz"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      O'zbekcha
                    </button>
                    <button
                      onClick={() => setLanguage("en")}
                      className={`py-3 px-4 rounded-xl font-medium transition-all ${
                        language === "en"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setLanguage("ru")}
                      className={`py-3 px-4 rounded-xl font-medium transition-all ${
                        language === "ru"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      Русский
                    </button>
                    <button
                      onClick={() => setLanguage("tr")}
                      className={`py-3 px-4 rounded-xl font-medium transition-all ${
                        language === "tr"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      Türkçe
                    </button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Mavzu (Theme) */}
              <Collapsible open={openSection === "theme"} onOpenChange={() => toggleSection("theme")}>
                <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? (
                      <Moon className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Sun className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="font-medium text-foreground">{t.settings.theme}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openSection === "theme" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-4 bg-muted/30">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                        theme === "light"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Sun className="w-4 h-4" />
                        <span>Yorug'</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                        theme === "dark"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Moon className="w-4 h-4" />
                        <span>Qorong'i</span>
                      </div>
                    </button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Obuna holati (Subscription) */}
              <Drawer open={subscriptionDrawerOpen} onOpenChange={setSubscriptionDrawerOpen}>
                <DrawerTrigger asChild>
                  <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{t.settings.subscription}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[90vh]">
                  <DrawerHeader>
                    <DrawerTitle>Obuna holati</DrawerTitle>
                  </DrawerHeader>
                  <ScrollArea className="px-4 pb-6">
                    <SubscriptionStatus />
                  </ScrollArea>
                </DrawerContent>
              </Drawer>
            </div>
          </div>

          {/* Section 3: Yordam va huquqiy (Support & Legal) */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">{t.settings.helpLegal}</h2>
            </div>
            <div className="divide-y divide-border">
              {/* Yordam markazi */}
              <Collapsible open={openSection === "help"} onOpenChange={() => toggleSection("help")}>
                <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{t.settings.helpCenter}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openSection === "help" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    FAQ va qo'llanmalar tez orada qo'shiladi. Hozircha savollaringiz bo'lsa, bizga email orqali murojaat qiling: <a href="mailto:support@bahorai.com" className="text-primary underline">support@bahorai.com</a>
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Xatolik haqida xabar berish */}
              <Collapsible open={openSection === "bug"} onOpenChange={() => toggleSection("bug")}>
                <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{t.settings.reportBug}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openSection === "bug" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Xatolik haqida yozish uchun: <a href="mailto:support@bahorai.com?subject=Xatolik haqida" className="text-primary underline">support@bahorai.com</a>
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Foydalanish shartlari */}
              <Collapsible open={openSection === "terms"} onOpenChange={() => toggleSection("terms")}>
                <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{t.settings.terms}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openSection === "terms" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Foydalanish shartlari sahifasi tayyorlanmoqda. Ilovani ishlatish orqali siz odob-axloq va qonuniylik qoidalariga rioya qilishingizga rozilik bildirasiz.
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Maxfiylik siyosati */}
              <Collapsible open={openSection === "privacy"} onOpenChange={() => toggleSection("privacy")}>
                <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{t.settings.privacy}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openSection === "privacy" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Maxfiylik siyosati tez kunda to'liq ko'rinishda qo'shiladi. Hozircha: biz foydalanuvchilarning ma'lumotlarini mas'uliyat bilan saqlashga va ularni uchinchi tomonlarga bermaslikka harakat qilamiz.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
