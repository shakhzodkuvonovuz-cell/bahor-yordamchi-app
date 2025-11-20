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
  
  // Notification settings
  const [pushNotifications, setPushNotifications] = useState(true);
  const [newsUpdates, setNewsUpdates] = useState(true);
  const [suggestions, setSuggestions] = useState(true);
  
  // Experience settings
  const [animations, setAnimations] = useState(true);
  const [smartSuggestions, setSmartSuggestions] = useState(true);

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
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xl font-bold">
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
                  <p className="text-sm font-medium text-foreground">Reja: Free (Beta)</p>
                  <p className="text-xs text-muted-foreground">Kunlik limit: 5 ta xabar</p>
                </div>
              </div>
              <Button 
                size="sm"
                onClick={() => setSubscriptionDrawerOpen(true)}
                className="bg-gradient-to-r from-primary to-primary/80"
              >
                <Crown className="w-4 h-4 mr-1" />
                Yangilash
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
                    <p className="font-medium text-foreground">Push xabarnomalar</p>
                    <p className="text-xs text-muted-foreground">Muhim xabarlar uchun</p>
                  </div>
                </div>
                <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
              </div>
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Bahor AI yangiliklari</p>
                    <p className="text-xs text-muted-foreground">Yangi funksiyalar haqida</p>
                  </div>
                </div>
                <Switch checked={newsUpdates} onCheckedChange={setNewsUpdates} />
              </div>
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Zap className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Tavsiyalar</p>
                    <p className="text-xs text-muted-foreground">Foydali maslahatlar</p>
                  </div>
                </div>
                <Switch checked={suggestions} onCheckedChange={setSuggestions} />
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
                    <p className="font-medium text-foreground">Animatsiyalar</p>
                    <p className="text-xs text-muted-foreground">Interfeys effektlari</p>
                  </div>
                </div>
                <Switch checked={animations} onCheckedChange={setAnimations} />
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
                <Switch checked={smartSuggestions} onCheckedChange={setSmartSuggestions} />
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
              <Collapsible open={openSection === "password"} onOpenChange={() => toggleSection("password")}>
                <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">Parolni o'zgartirish</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openSection === "password" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Parolni o'zgartirish funksiyasi tez orada qo'shiladi.
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Sessions */}
              <Collapsible open={openSection === "sessions"} onOpenChange={() => toggleSection("sessions")}>
                <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">Sessiyalarni ko'rish</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openSection === "sessions" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Faol sessiyalarni ko'rish va boshqarish tez orada qo'shiladi.
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* 2FA Placeholder */}
              <Collapsible open={openSection === "2fa"} onOpenChange={() => toggleSection("2fa")}>
                <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <div className="text-left">
                      <p className="font-medium text-foreground">2-qadamli himoya</p>
                      <p className="text-xs text-muted-foreground">Tez orada</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openSection === "2fa" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    2-qadamli autentifikatsiya tez orada qo'shiladi.
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full px-6 py-3.5 flex items-center gap-3 hover:underline transition-all group"
              >
                <LogOut className="w-5 h-5 text-red-500 group-hover:text-red-600 transition-colors" />
                <span className="font-medium text-red-500 group-hover:text-red-600 transition-colors">{t.settings.logout}</span>
              </button>
            </div>
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
