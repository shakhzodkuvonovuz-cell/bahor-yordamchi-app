import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Globe, Moon, Sun, Shield, HelpCircle, FileText, Mail, LogOut, ChevronRight, CreditCard, Bell, Zap, Edit, Crown, Lock } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage, Language } from "@/hooks/useLanguage";
import { getTranslation } from "@/data/translations";
import { useAuth, signOut } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import ProfileEditModal from "@/components/ProfileEditModal";
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload";
import PremiumUpgradeCard from "@/components/PremiumUpgradeCard";
import PricingPlansSection from "@/components/PricingPlansSection";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const t = getTranslation(language);
  
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [subscriptionDrawerOpen, setSubscriptionDrawerOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
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

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error);
      } else if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "BA";
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
    <div className="min-h-screen bg-background dark:bg-slate-950">{/* Header */}
      <div className="sticky top-0 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm z-10">
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
          
          {/* Profile Section */}
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
            <div className="px-6 py-6">
              <div className="flex items-start gap-4">
                {/* Profile Photo */}
                <div 
                  className="relative cursor-pointer group" 
                  onClick={() => {
                    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                    input?.click();
                  }}
                >
                  <Avatar className="w-20 h-20 transition-opacity group-hover:opacity-80">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-primary via-primary/60 to-primary/30 text-primary-foreground text-xl font-bold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <ProfilePhotoUpload 
                    currentAvatarUrl={profile?.avatar_url}
                    onPhotoUpdated={loadProfile}
                  />
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-foreground truncate">
                        {profile?.first_name && profile?.last_name
                          ? `${profile.first_name} ${profile.last_name}`
                          : "Foydalanuvchi"}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {user?.email}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileEditOpen(true)}
                      className="shrink-0"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Tahrirlash
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Overview Card */}
          <div className="bg-gradient-to-br from-card to-primary/5 border border-border/50 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">Hisob holati</h3>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Reja: Bepul reja</p>
                  <p className="text-xs text-muted-foreground">
                    Hozir siz bepul rejadasiz. Kuniga 5 ta so'rov limiti mavjud.
                  </p>
                </div>
              </div>
              <Button 
                size="sm"
                onClick={() => setSubscriptionDrawerOpen(true)}
                className="bg-gradient-to-r from-primary to-primary/80 shrink-0"
              >
                <Crown className="w-4 h-4 mr-1" />
                Premiumga o'tish
              </Button>
            </div>
          </div>

          {/* Premium Upgrade Card - Only for free users */}
          <PremiumUpgradeCard />

          {/* Separator */}
          <div className="h-px bg-border/30" />

          {/* Notifications Section */}
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Bildirishnomalar</h2>
            </div>
            <div className="divide-y divide-border">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Bahor AI yangiliklari</p>
                    <p className="text-xs text-muted-foreground">Yangi funksiyalar haqida</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.newsUpdates} 
                  onCheckedChange={(checked) => updatePreference('newsUpdates', checked)} 
                />
              </div>
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Zap className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Foydali maslahatlar va g'oyalar</p>
                    <p className="text-xs text-muted-foreground">Bahor AI tajribasi</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.suggestions} 
                  onCheckedChange={(checked) => updatePreference('suggestions', checked)} 
                />
              </div>
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Chegirmalar va aksiyalar</p>
                    <p className="text-xs text-muted-foreground">Maxsus takliflar</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.pushNotifications} 
                  onCheckedChange={(checked) => updatePreference('pushNotifications', checked)} 
                />
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-border/30" />

          {/* App Experience Section */}
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Bahor AI tajribasi</h2>
            </div>
            <div className="divide-y divide-border">{/* ... keep existing code ... */}

              {/* Response Speed */}
              <Collapsible open={openSection === "speed"} onOpenChange={() => toggleSection("speed")}>
                <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-muted-foreground" />
                    <div className="text-left">
                      <p className="font-medium text-foreground">Javob tezligi</p>
                      <p className="text-xs text-muted-foreground">Standart</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openSection === "speed" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-4 bg-muted/30">
                  <div className="space-y-3">
                    <button className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium">
                      Standart
                    </button>
                    <button className="w-full py-3 px-4 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium flex items-center justify-center gap-2">
                      <Crown className="w-4 h-4" />
                      Tezkor (Premium)
                    </button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Animations */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Zap className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Chat animatsiyalari</p>
                    <p className="text-xs text-muted-foreground">Interfeys effektlari</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.animations} 
                  onCheckedChange={(checked) => updatePreference('animations', checked)} 
                />
              </div>

              {/* Smart Suggestions */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Zap className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Aqlli takliflar</p>
                    <p className="text-xs text-muted-foreground">Tavsiya etilgan savollar</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.smartSuggestions} 
                  onCheckedChange={(checked) => updatePreference('smartSuggestions', checked)} 
                />
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-border/30" />

          {/* Security Section */}
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Xavfsizlik</h2>
            </div>
            <div className="divide-y divide-border">
              {/* Change Password */}
              <button
                onClick={() => toast({ description: "Bu funksiya tez orada qo'shiladi" })}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">Parolni o'zgartirish</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Logout All Devices */}
              <button
                onClick={async () => {
                  try {
                    await supabase.auth.signOut();
                    toast({ description: "Barcha qurilmalardan chiqdingiz" });
                    navigate("/login");
                  } catch (error) {
                    toast({ description: "Xatolik yuz berdi", variant: "destructive" });
                  }
                }}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">Barcha qurilmalardan chiqish</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-border/30" />

          {/* Logout Button */}
          <div className="flex justify-center">
            <button
              onClick={handleLogout}
              className="text-red-500 hover:text-red-600 font-medium text-sm hover:underline transition-all"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span>{t.settings.logout}</span>
              </div>
            </button>
          </div>

          {/* Separator */}
          <div className="h-px bg-border/30" />

          {/* Section 2: Ilova (App) */}
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Ilova sozlamalari</h2>
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
                <DrawerContent className="max-h-[90vh] bg-background dark:bg-slate-950">
                  <DrawerHeader className="text-center border-b border-border/30">
                    <DrawerTitle className="text-xl font-bold">Obuna holati</DrawerTitle>
                  </DrawerHeader>
                  <ScrollArea className="px-4 pb-6 pt-4">
                    <SubscriptionStatus />
                  </ScrollArea>
                </DrawerContent>
              </Drawer>
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-border/30" />

          {/* Section 3: Yordam va huquqiy (Support & Legal) */}
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
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

          {/* Separator */}
          <div className="h-px bg-border/30" />

          {/* Pricing Plans Section */}
          <PricingPlansSection />

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
          onProfileUpdated={loadProfile}
        />
      )}
    </div>
  );
}
