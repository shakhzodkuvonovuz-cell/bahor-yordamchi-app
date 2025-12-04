import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Globe, Moon, Sun, Shield, HelpCircle, FileText, Mail, LogOut, ChevronRight, CreditCard, Bell, Zap, Edit, Crown, Lock } from "lucide-react";
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
  const { user, signOut } = useAuth();
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No session found");
        return;
      }

      // Call edge function to get profile
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("Error loading profile:", error);
        return;
      }

      const profileData = await response.json();
      
      // Load avatar from localStorage (overrides backend avatarUrl if present)
      const localAvatar = localStorage.getItem("bahorai_user_avatar");
      if (localAvatar) {
        profileData.avatarUrl = localAvatar;
      }
      
      setProfile(profileData);
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
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
    }
    if (profile?.email || user?.email) {
      return (profile?.email || user?.email)[0].toUpperCase();
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
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary rounded-xl transition-colors shrink-0"
            aria-label={t.settings.back}
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground truncate">{t.settings.title}</h1>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-60px)]">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
          
          {/* Profile Section */}
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] w-full">
            <div className="px-4 sm:px-6 py-5">
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
                    <AvatarImage src={profile?.avatarUrl || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-primary via-primary/60 to-primary/30 text-primary-foreground text-lg sm:text-xl font-bold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <ProfilePhotoUpload 
                    currentAvatarUrl={profile?.avatarUrl}
                    onPhotoUpdated={loadProfile}
                  />
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-foreground truncate">
                        {profile?.firstName && profile?.lastName
                          ? `${profile.firstName} ${profile.lastName}`
                          : "Foydalanuvchi"}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate mt-0.5 max-w-[180px] sm:max-w-none">
                        {profile?.email || user?.email}
                      </p>
                      {profile?.plan && (
                        <div className="mt-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            profile.plan === 'free' 
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30'
                          }`}>
                            {profile.plan === 'free' && 'Bepul'}
                            {profile.plan === 'monthly' && <><Crown className="w-3 h-3" /> Premium</>}
                            {profile.plan === 'yearly' && <><Crown className="w-3 h-3" /> Premium</>}
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
          </div>

          {/* Account Overview Card */}
          <div className="bg-gradient-to-br from-card to-primary/5 border border-border/50 rounded-2xl p-4 sm:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] w-full">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="space-y-2 min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-bold text-foreground">Hisob holati</h3>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-foreground">
                    Reja: {profile?.plan === 'free' && 'Bepul'}
                    {profile?.plan === 'monthly' && 'Premium (oylik)'}
                    {profile?.plan === 'yearly' && 'Premium (yillik)'}
                  </p>
                  {profile?.plan === 'free' && profile?.messagesToday !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {profile.messagesToday} / {profile.dailyLimit} so'rov ishlatildi
                    </p>
                  )}
                  {profile?.plan !== 'free' && (
                    <p className="text-xs text-muted-foreground">
                      Cheksiz so'rovlar
                    </p>
                  )}
                </div>
              </div>
              <Button 
                size="sm"
                onClick={() => setSubscriptionDrawerOpen(true)}
                className={`w-full sm:w-auto ${profile?.plan === 'free' 
                  ? "bg-gradient-to-r from-primary to-primary/80"
                  : ""
                }`}
                variant={profile?.plan === 'free' ? 'default' : 'outline'}
              >
                <Crown className="w-4 h-4 mr-1.5" />
                {profile?.plan === 'free' ? 'Premium' : 'Boshqarish'}
              </Button>
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-border/30" />

          {/* Notifications Section */}
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] w-full">
            <div className="px-4 sm:px-6 py-4 border-b border-border">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Bildirishnomalar</h2>
            </div>
            <div className="divide-y divide-border">
              <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Bell className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm sm:text-base truncate">Yangiliklar</p>
                    <p className="text-xs text-muted-foreground truncate">Yangi funksiyalar</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.newsUpdates} 
                  onCheckedChange={(checked) => updatePreference('newsUpdates', checked)}
                  className="shrink-0"
                />
              </div>
              <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Zap className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm sm:text-base truncate">Maslahatlar</p>
                    <p className="text-xs text-muted-foreground truncate">Foydali g'oyalar</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.suggestions} 
                  onCheckedChange={(checked) => updatePreference('suggestions', checked)}
                  className="shrink-0"
                />
              </div>
              <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <CreditCard className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm sm:text-base truncate">Chegirmalar</p>
                    <p className="text-xs text-muted-foreground truncate">Maxsus takliflar</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.pushNotifications} 
                  onCheckedChange={(checked) => updatePreference('pushNotifications', checked)}
                  className="shrink-0"
                />
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-border/30" />

          {/* App Experience Section */}
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] w-full">
            <div className="px-4 sm:px-6 py-4 border-b border-border">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Bahor AI tajribasi</h2>
            </div>
            <div className="divide-y divide-border">
              {/* Response Speed */}
              <Collapsible open={openSection === "speed"} onOpenChange={() => toggleSection("speed")}>
                <CollapsibleTrigger className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Zap className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="font-medium text-foreground text-sm sm:text-base">Javob tezligi</p>
                      <p className="text-xs text-muted-foreground">Standart</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${openSection === "speed" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 sm:px-6 py-4 bg-muted/30">
                  <div className="space-y-3">
                    <button className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm">
                      Standart
                    </button>
                    <button className="w-full py-3 px-4 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium flex items-center justify-center gap-2 text-sm">
                      <Crown className="w-4 h-4 shrink-0" />
                      <span>Tezkor (Premium)</span>
                    </button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Animations */}
              <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Zap className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm sm:text-base">Animatsiyalar</p>
                    <p className="text-xs text-muted-foreground truncate">Interfeys effektlari</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.animations} 
                  onCheckedChange={(checked) => updatePreference('animations', checked)}
                  className="shrink-0"
                />
              </div>

              {/* Smart Suggestions */}
              <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Zap className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm sm:text-base">Aqlli takliflar</p>
                    <p className="text-xs text-muted-foreground truncate">Tavsiya etilgan savollar</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.smartSuggestions} 
                  onCheckedChange={(checked) => updatePreference('smartSuggestions', checked)}
                  className="shrink-0"
                />
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-border/30" />

          {/* Security Section */}
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] w-full">
            <div className="px-4 sm:px-6 py-4 border-b border-border">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Xavfsizlik</h2>
            </div>
            <div className="divide-y divide-border">
              {/* Change Password */}
              <button
                onClick={() => toast({ description: "Bu funksiya tez orada qo'shiladi" })}
                className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground text-sm sm:text-base">Parolni o'zgartirish</span>
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
                className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Shield className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground text-sm sm:text-base truncate">Barcha qurilmalardan chiqish</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
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
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] w-full">
            <div className="px-4 sm:px-6 py-4 border-b border-border">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Ilova sozlamalari</h2>
            </div>
            <div className="divide-y divide-border">
              {/* Til (Language) */}
              <Collapsible open={openSection === "language"} onOpenChange={() => toggleSection("language")}>
                <CollapsibleTrigger className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground text-sm sm:text-base">{t.settings.language}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${openSection === "language" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 sm:px-6 py-4 bg-muted/30">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <button
                      onClick={() => setLanguage("uz")}
                      className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-medium transition-all text-sm ${
                        language === "uz"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      O'zbekcha
                    </button>
                    <button
                      onClick={() => setLanguage("en")}
                      className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-medium transition-all text-sm ${
                        language === "en"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setLanguage("ru")}
                      className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-medium transition-all text-sm ${
                        language === "ru"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      Русский
                    </button>
                    <button
                      onClick={() => setLanguage("tr")}
                      className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-medium transition-all text-sm ${
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
                <CollapsibleTrigger className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {theme === "dark" ? (
                      <Moon className="w-5 h-5 text-muted-foreground shrink-0" />
                    ) : (
                      <Sun className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-medium text-foreground text-sm sm:text-base">{t.settings.theme}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${openSection === "theme" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 sm:px-6 py-4 bg-muted/30">
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-medium transition-all text-sm ${
                        theme === "light"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        <Sun className="w-4 h-4 shrink-0" />
                        <span>Yorug'</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-medium transition-all text-sm ${
                        theme === "dark"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        <Moon className="w-4 h-4 shrink-0" />
                        <span>Qorong'i</span>
                      </div>
                    </button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Obuna holati (Subscription) - secondary link style */}
              <Drawer open={subscriptionDrawerOpen} onOpenChange={setSubscriptionDrawerOpen}>
                <DrawerTrigger asChild>
                  <button className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <CreditCard className="w-5 h-5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground text-sm sm:text-base">{t.settings.subscription}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
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
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] w-full">
            <div className="px-4 sm:px-6 py-4 border-b border-border">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">{t.settings.helpLegal}</h2>
            </div>
            <div className="divide-y divide-border">
              {/* Yordam markazi */}
              <Collapsible open={openSection === "help"} onOpenChange={() => toggleSection("help")}>
                <CollapsibleTrigger className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <HelpCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground text-sm sm:text-base">{t.settings.helpCenter}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${openSection === "help" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 sm:px-6 py-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground leading-relaxed break-words">
                    FAQ va qo'llanmalar tez orada qo'shiladi. Savollaringiz bo'lsa: <a href="mailto:support@bahorai.com" className="text-primary underline break-all">support@bahorai.com</a>
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Xatolik haqida xabar berish */}
              <Collapsible open={openSection === "bug"} onOpenChange={() => toggleSection("bug")}>
                <CollapsibleTrigger className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground text-sm sm:text-base">{t.settings.reportBug}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${openSection === "bug" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 sm:px-6 py-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground leading-relaxed break-words">
                    Xatolik haqida: <a href="mailto:support@bahorai.com?subject=Xatolik haqida" className="text-primary underline break-all">support@bahorai.com</a>
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Foydalanish shartlari */}
              <Collapsible open={openSection === "terms"} onOpenChange={() => toggleSection("terms")}>
                <CollapsibleTrigger className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground text-sm sm:text-base">{t.settings.terms}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${openSection === "terms" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 sm:px-6 py-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Foydalanish shartlari sahifasi tayyorlanmoqda.
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Maxfiylik siyosati */}
              <Collapsible open={openSection === "privacy"} onOpenChange={() => toggleSection("privacy")}>
                <CollapsibleTrigger className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground text-sm sm:text-base">{t.settings.privacy}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${openSection === "privacy" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 sm:px-6 py-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Maxfiylik siyosati tez kunda qo'shiladi.
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
