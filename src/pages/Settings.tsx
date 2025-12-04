import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Globe, Moon, Sun, Shield, HelpCircle, FileText, Mail, LogOut, ChevronRight, CreditCard, Bell, Zap, Edit, Crown, Lock, RotateCcw } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage, Language } from "@/hooks/useLanguage";
import { getTranslation } from "@/data/translations";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import ProfileEditModal from "@/components/ProfileEditModal";
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload";
import PremiumUpgradeCard from "@/components/PremiumUpgradeCard";
import UsageProgressBar from "@/components/UsageProgressBar";
import SettingsProfileSkeleton from "@/components/SettingsProfileSkeleton";


export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { user, profile, profileLoading, signOut, refreshProfile } = useAuth();
  const t = getTranslation(language);
  
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [subscriptionDrawerOpen, setSubscriptionDrawerOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  
  // Load preferences from localStorage
  const loadPreferences = () => {
    const saved = localStorage.getItem("bahorai_preferences");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load preferences:", e);
      }
    }
    return {
      pushNotifications: true,
      newsUpdates: true,
      suggestions: true,
      animations: true,
      smartSuggestions: true,
    };
  };
  
  const [preferences, setPreferences] = useState(loadPreferences);
  
  // Save preferences to localStorage whenever they change
  const updatePreference = (key: string, value: boolean) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    localStorage.setItem("bahorai_preferences", JSON.stringify(updated));
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (profile?.full_name) {
      const parts = profile.full_name.split(' ');
      return parts.length > 1 
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : parts[0][0].toUpperCase();
    }
    if (profile?.email || user?.email) {
      return (profile?.email || user?.email)[0].toUpperCase();
    }
    return "BA";
  };

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.full_name) {
      return profile.full_name;
    }
    return "Foydalanuvchi";
  };

  const getPlanLabel = () => {
    switch (profile?.plan) {
      case 'free': return 'Bepul';
      case 'premium':
      case 'monthly': return 'Premium';
      case 'ultra':
      case 'yearly': return 'Ultra';
      default: return 'Bepul';
    }
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
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header - 44px min hit area */}
      <header className="sticky top-0 bg-card/95 backdrop-blur-lg border-b border-border/40 shadow-premium-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary rounded-xl transition-colors shrink-0"
            aria-label={t.settings.back}
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground truncate">{t.settings.title}</h1>
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-56px)]">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 overflow-x-hidden">
          
          {/* Loading Skeleton */}
          {profileLoading ? (
            <SettingsProfileSkeleton />
          ) : (
            <>
              {/* Profile Section */}
              <section className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-premium-sm w-full">
                <div className="px-4 sm:px-6 py-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Profile Photo */}
                    <div 
                      className="relative cursor-pointer group shrink-0" 
                      onClick={() => {
                        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                        input?.click();
                      }}
                    >
                      <Avatar className="w-16 h-16 sm:w-20 sm:h-20 transition-opacity group-hover:opacity-80">
                        <AvatarImage src={profile?.avatar_url || ""} />
                        <AvatarFallback className="bg-gradient-to-br from-primary via-primary/60 to-primary/30 text-primary-foreground text-lg sm:text-xl font-bold">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <ProfilePhotoUpload 
                        currentAvatarUrl={profile?.avatar_url}
                        onPhotoUpdated={refreshProfile}
                      />
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg sm:text-xl font-bold text-foreground truncate">
                            {getDisplayName()}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate mt-0.5 max-w-[180px] sm:max-w-none">
                            {profile?.email || user?.email}
                          </p>
                          {profile && (
                            <div className="mt-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                profile.plan === 'free' 
                                  ? 'bg-secondary text-secondary-foreground'
                                  : 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30'
                              }`}>
                                {profile.plan !== 'free' && <Crown className="w-3 h-3" />}
                                {getPlanLabel()}
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProfileEditOpen(true)}
                          className="shrink-0 self-start"
                        >
                          <Edit className="w-4 h-4 sm:mr-1" />
                          <span className="hidden sm:inline">Tahrirlash</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Usage Progress Bar */}
              {profile && (
                <section className="bg-card border border-border/40 rounded-2xl p-4 shadow-premium-sm w-full">
                  <UsageProgressBar 
                    used={profile.messages_today || 0}
                    limit={profile.daily_limit || 5}
                    plan={profile.plan || 'free'}
                  />
                  {/* Dev Reset Button */}
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      localStorage.removeItem(`bahorai_usage_${today}`);
                      refreshProfile();
                      toast({
                        description: "Kunlik limit qayta o'rnatildi (test uchun)",
                      });
                    }}
                    className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limitni qayta o'rnatish (dev)</span>
                  </button>
                </section>
              )}

              {/* Premium Upgrade Card for free users */}
              {profile?.plan === 'free' && <PremiumUpgradeCard />}

              {/* Manage Subscription for premium users */}
              {profile && profile.plan !== 'free' && (
                <section className="bg-card border border-border/40 rounded-2xl p-4 shadow-premium-sm w-full">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {getPlanLabel()} reja
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {profile.plan === 'ultra' || profile.plan === 'yearly' ? 'Yillik obuna' : 'Oylik obuna'}
                      </p>
                    </div>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setSubscriptionDrawerOpen(true)}
                      className="shrink-0 min-h-[44px]"
                    >
                      Boshqarish
                    </Button>
                  </div>
                </section>
              )}
            </>
          )}

          {/* Notifications Section */}
          <section className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-premium-sm w-full">
            <header className="px-4 py-3 border-b border-border/40">
              <h2 className="text-[15px] font-semibold text-foreground">Bildirishnomalar</h2>
            </header>
            <div className="divide-y divide-border/40">
              <div className="px-4 min-h-[56px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Bell className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-[15px]">Yangiliklar</p>
                    <p className="text-[13px] text-muted-foreground">Yangi funksiyalar</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.newsUpdates} 
                  onCheckedChange={(checked) => updatePreference('newsUpdates', checked)}
                  className="shrink-0"
                />
              </div>
              <div className="px-4 min-h-[56px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Zap className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-[15px]">Maslahatlar</p>
                    <p className="text-[13px] text-muted-foreground">Foydali g'oyalar</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.suggestions} 
                  onCheckedChange={(checked) => updatePreference('suggestions', checked)}
                  className="shrink-0"
                />
              </div>
              <div className="px-4 min-h-[56px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <CreditCard className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-[15px]">Chegirmalar</p>
                    <p className="text-[13px] text-muted-foreground">Maxsus takliflar</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.pushNotifications} 
                  onCheckedChange={(checked) => updatePreference('pushNotifications', checked)}
                  className="shrink-0"
                />
              </div>
            </div>
          </section>

          {/* App Experience Section */}
          <section className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-premium-sm w-full">
            <header className="px-4 py-3 border-b border-border/40">
              <h2 className="text-[15px] font-semibold text-foreground">Bahor AI tajribasi</h2>
            </header>
            <div className="divide-y divide-border/40">
              {/* Animations */}
              <div className="px-4 min-h-[56px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Zap className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-[15px]">Animatsiyalar</p>
                    <p className="text-[13px] text-muted-foreground">Interfeys effektlari</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.animations} 
                  onCheckedChange={(checked) => updatePreference('animations', checked)}
                  className="shrink-0"
                />
              </div>

              {/* Smart Suggestions */}
              <div className="px-4 min-h-[56px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Zap className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-[15px]">Aqlli takliflar</p>
                    <p className="text-[13px] text-muted-foreground">Tavsiya etilgan savollar</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.smartSuggestions} 
                  onCheckedChange={(checked) => updatePreference('smartSuggestions', checked)}
                  className="shrink-0"
                />
              </div>
            </div>
          </section>

          {/* Security Section */}
          <section className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-premium-sm w-full">
            <header className="px-4 py-3 border-b border-border/40">
              <h2 className="text-[15px] font-semibold text-foreground">Xavfsizlik</h2>
            </header>
            <div className="divide-y divide-border/40">
              {/* Change Password */}
              <button
                onClick={() => toast({ description: "Bu funksiya tez orada qo'shiladi" })}
                className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground text-[15px]">Parolni o'zgartirish</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>

              {/* Logout All Devices */}
              <button
                onClick={async () => {
                  try {
                    await signOut();
                    toast({ description: "Barcha qurilmalardan chiqdingiz" });
                    navigate("/auth");
                  } catch (error) {
                    toast({ description: "Xatolik yuz berdi", variant: "destructive" });
                  }
                }}
                className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Shield className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground text-[15px]">Barcha qurilmalardan chiqish</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            </div>
          </section>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 text-destructive hover:text-destructive/80 font-medium text-[15px] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.settings.logout}</span>
          </button>

          {/* Section 2: Ilova (App) */}
          <section className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-premium-sm w-full">
            <header className="px-4 py-3 border-b border-border/40">
              <h2 className="text-[15px] font-semibold text-foreground">Ilova sozlamalari</h2>
            </header>
            <div className="divide-y divide-border/40">
              {/* Til (Language) */}
              <Collapsible open={openSection === "language"} onOpenChange={() => toggleSection("language")}>
                <CollapsibleTrigger className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground text-[15px]">{t.settings.language}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${openSection === "language" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-2">
                    {(["uz", "en", "ru", "tr"] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={`min-h-[44px] px-3 rounded-xl font-medium transition-all text-[15px] ${
                          language === lang
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {lang === "uz" ? "O'zbekcha" : lang === "en" ? "English" : lang === "ru" ? "Русский" : "Türkçe"}
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Mavzu (Theme) */}
              <Collapsible open={openSection === "theme"} onOpenChange={() => toggleSection("theme")}>
                <CollapsibleTrigger className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? (
                      <Moon className="w-5 h-5 text-muted-foreground shrink-0" />
                    ) : (
                      <Sun className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-medium text-foreground text-[15px]">{t.settings.theme}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${openSection === "theme" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-3 bg-muted/30">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex-1 min-h-[44px] px-3 rounded-xl font-medium transition-all text-[15px] flex items-center justify-center gap-2 ${
                        theme === "light"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      <Sun className="w-4 h-4 shrink-0" />
                      <span>Yorug'</span>
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex-1 min-h-[44px] px-3 rounded-xl font-medium transition-all text-[15px] flex items-center justify-center gap-2 ${
                        theme === "dark"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      <Moon className="w-4 h-4 shrink-0" />
                      <span>Qorong'i</span>
                    </button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Obuna holati (Subscription) - secondary link */}
              <Drawer open={subscriptionDrawerOpen} onOpenChange={setSubscriptionDrawerOpen}>
                <DrawerTrigger asChild>
                  <button className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground text-[15px]">{t.settings.subscription}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[90vh] bg-background">
                  <DrawerHeader className="text-center border-b border-border/40">
                    <DrawerTitle className="text-lg font-semibold">Obuna holati</DrawerTitle>
                  </DrawerHeader>
                  <ScrollArea className="px-4 pb-6 pt-4">
                    <SubscriptionStatus />
                  </ScrollArea>
                </DrawerContent>
              </Drawer>
            </div>
          </section>

          {/* Section 3: Yordam va huquqiy (Support & Legal) */}
          <section className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-premium-sm w-full">
            <header className="px-4 py-3 border-b border-border/40">
              <h2 className="text-[15px] font-semibold text-foreground">{t.settings.helpLegal}</h2>
            </header>
            <div className="divide-y divide-border/40">
              {/* Yordam markazi */}
              <Collapsible open={openSection === "help"} onOpenChange={() => toggleSection("help")}>
                <CollapsibleTrigger className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground text-[15px]">{t.settings.helpCenter}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${openSection === "help" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-3 bg-muted/30">
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    FAQ va qo'llanmalar tez orada qo'shiladi. Savollaringiz bo'lsa: <a href="mailto:support@bahorai.com" className="text-primary underline">support@bahorai.com</a>
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Xatolik haqida xabar berish */}
              <Collapsible open={openSection === "bug"} onOpenChange={() => toggleSection("bug")}>
                <CollapsibleTrigger className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground text-[15px]">{t.settings.reportBug}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${openSection === "bug" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-3 bg-muted/30">
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Xatolik haqida: <a href="mailto:support@bahorai.com?subject=Xatolik haqida" className="text-primary underline">support@bahorai.com</a>
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Foydalanish shartlari */}
              <Collapsible open={openSection === "terms"} onOpenChange={() => toggleSection("terms")}>
                <CollapsibleTrigger className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground text-[15px]">{t.settings.terms}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${openSection === "terms" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-3 bg-muted/30">
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Foydalanish shartlari sahifasi tayyorlanmoqda.
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Maxfiylik siyosati */}
              <Collapsible open={openSection === "privacy"} onOpenChange={() => toggleSection("privacy")}>
                <CollapsibleTrigger className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground text-[15px]">{t.settings.privacy}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${openSection === "privacy" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-3 bg-muted/30">
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Maxfiylik siyosati tez kunda qo'shiladi.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </section>

          {/* Pricing Plans - Secondary text link for free users */}
          {profile?.plan === 'free' && (
            <button
              onClick={() => setSubscriptionDrawerOpen(true)}
              className="w-full text-center text-[13px] text-primary hover:underline transition-colors py-2"
            >
              Barcha rejalar va narxlarni ko'rish →
            </button>
          )}

          {/* Bottom Padding */}
          <div className="h-6" />
        </div>
      </ScrollArea>

      {/* Profile Edit Modal */}
      {profile && (
        <ProfileEditModal
          open={profileEditOpen}
          onOpenChange={setProfileEditOpen}
          profile={profile}
          onProfileUpdated={refreshProfile}
        />
      )}
    </div>
  );
}
