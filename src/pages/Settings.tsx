import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { ArrowLeft, User, Globe, Moon, Sun, Shield, HelpCircle, FileText, Mail, LogOut, ChevronRight, CreditCard, Bell, Zap, Edit, Crown, Lock, RotateCcw, Loader2, Infinity, Download, Trash2, Info, ExternalLink, Calendar } from "lucide-react";
import PaymentVerifyModal from "@/components/PaymentVerifyModal";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/i18n/LanguageProvider";
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
import ProfileCompletionCard from "@/components/ProfileCompletionCard";
import DataManagementModal from "@/components/DataManagementModal";
import UserPreferencesSection from "@/components/UserPreferencesSection";
import { APP_INFO } from "@/data/appIdentity";

import { useDailyUsageServer } from "@/hooks/useEntitlements";
import { useTrialStatus } from "@/hooks/useTrialStatus";

import { supabase } from "@/integrations/supabase/client";

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const { user, profile, profileLoading, signOut, refreshProfile } = useAuth();
  const { usage, loading: usageLoading, isPremium, isDevBypass, hasReachedLimit } = useDailyUsageServer();
  const { status: trialStatus, refresh: refreshTrialStatus } = useTrialStatus();
  
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [subscriptionDrawerOpen, setSubscriptionDrawerOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [dataManagementOpen, setDataManagementOpen] = useState(false);
  
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
    if (user?.email) return user.email[0].toUpperCase();
    return "BA";
  };

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.full_name) {
      return profile.full_name;
    }
    return t('settings.user');
  };

  const getPlanLabel = () => {
    if (isDevBypass) return t('settings.devUnlimited');
    if (usage.plan === 'beta_premium') return t('plan.betaPremium');
    switch (profile?.plan) {
      case 'free': return t('settings.free');
      case 'premium':
      case 'monthly': return t('settings.premium');
      case 'ultra':
      case 'yearly': return t('settings.ultra');
      default: return t('settings.free');
    }
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: t('settings.error'),
        description: t('settings.logoutError'),
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  return (
    <>
      <SEO 
        title="Sozlamalar" 
        description="Bahor AI sozlamalari. Profil, mavzu, til va boshqa sozlamalarni boshqaring."
        url="/settings"
        noIndex
      />
      <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header - 44px min hit area */}
      <header className="sticky top-0 bg-card/95 backdrop-blur-lg border-b border-border/40 shadow-premium-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => {
              // Deterministic back: check location.state.from first, then URL param, then default
              const stateFrom = (location.state as { from?: string })?.from;
              const searchParams = new URLSearchParams(location.search);
              const urlFrom = searchParams.get('from');
              const targetPath = stateFrom || urlFrom || "/modes";
              navigate(targetPath, { replace: true });
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary rounded-xl transition-colors shrink-0"
            aria-label={t('settings.back')}
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground truncate">{t('settings.title')}</h1>
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
                    <div className="relative shrink-0">
                      <Avatar className="w-16 h-16 sm:w-20 sm:h-20">
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
                            {user?.email}
                          </p>
                          {profile && (
                            <div className="mt-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                isDevBypass
                                  ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30'
                                  : usage.plan === 'beta_premium'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-secondary text-secondary-foreground'
                              }`}>
                                {isDevBypass && <Shield className="w-3 h-3" />}
                                {usage.plan === 'beta_premium' && !isDevBypass && <Crown className="w-3 h-3" />}
                                {getPlanLabel()}
                                {isDevBypass && <Infinity className="w-3 h-3 ml-0.5" />}
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
                          <span className="hidden sm:inline">{t('settings.edit')}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Usage Progress Bar */}
              {profile && (
                <section className="bg-card border border-border/40 rounded-2xl p-4 shadow-premium-sm w-full">
              {isDevBypass ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{t('settings.usageToday')}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('settings.devUnlimited')} {t('settings.plan')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm font-medium">{t('settings.unlimited')}</span>
                        <Infinity className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <UsageProgressBar 
                      used={usage.used}
                      limit={usage.limit}
                      plan={profile.plan || 'free'}
                    />
                  )}
                </section>
              )}

              {/* Subscription Status */}
              {profile && trialStatus && trialStatus.isPremium && (
                <section className="bg-card border border-primary/30 rounded-2xl p-4 shadow-premium-sm w-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Crown className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {language === "uz" ? "Joriy reja" : "Current Plan"}
                        </p>
                        <p className="text-lg font-bold text-primary">
                          {trialStatus.plan === 'dev_unlimited' ? 'Dev Unlimited' : 
                           trialStatus.plan === 'beta_premium' ? 'Beta Premium' : 'Premium'}
                        </p>
                      </div>
                    </div>
                    {trialStatus.betaExpiresAt && (
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-xs">
                            {language === "uz" ? "Tugaydi" : "Expires"}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(trialStatus.betaExpiresAt).toLocaleDateString(language === "uz" ? "uz-UZ" : "en-US", {
                            year: "numeric",
                            month: "short", 
                            day: "numeric"
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <PaymentVerifyModal onVerified={() => {
                      refreshProfile();
                      refreshTrialStatus();
                    }} />
                  </div>
                </section>
              )}

              {/* Profile Completion Card */}
              {profile && (
                <ProfileCompletionCard
                  firstName={profile.first_name}
                  lastName={profile.last_name}
                  phone={profile.phone}
                  avatarUrl={profile.avatar_url}
                  onBonusAwarded={() => {
                    toast({ description: language === "uz" ? "Profil to'liq! Bonus berildi!" : "Profile complete! Bonus awarded!" });
                  }}
                />
              )}

              {/* Premium Upgrade Card - always show, payment coming soon */}
              <PremiumUpgradeCard />
            </>
          )}

          {/* Notifications Section */}
          <section className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-premium-sm w-full">
            <header className="px-4 py-3 border-b border-border/40">
              <h2 className="text-[15px] font-semibold text-foreground">{t('settings.notifications')}</h2>
            </header>
            <div className="divide-y divide-border/40">
              <div className="px-4 min-h-[56px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Bell className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-[15px]">{t('settings.news')}</p>
                    <p className="text-[13px] text-muted-foreground">{t('settings.newsDesc')}</p>
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
                    <p className="font-medium text-foreground text-[15px]">{t('settings.tips')}</p>
                    <p className="text-[13px] text-muted-foreground">{t('settings.tipsDesc')}</p>
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
                    <p className="font-medium text-foreground text-[15px]">{t('settings.discounts')}</p>
                    <p className="text-[13px] text-muted-foreground">{t('settings.discountsDesc')}</p>
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
              <h2 className="text-[15px] font-semibold text-foreground">{t('settings.experience')}</h2>
            </header>
            <div className="divide-y divide-border/40">
              {/* Animations */}
              <div className="px-4 min-h-[56px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Zap className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-[15px]">{t('settings.animations')}</p>
                    <p className="text-[13px] text-muted-foreground">{t('settings.animationsDesc')}</p>
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
                    <p className="font-medium text-foreground text-[15px]">{t('settings.smartSuggestions')}</p>
                    <p className="text-[13px] text-muted-foreground">{t('settings.smartSuggestionsDesc')}</p>
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

          {/* User Preferences Section */}
          <UserPreferencesSection />


          {/* Security Section */}
          <section className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-premium-sm w-full">
            <header className="px-4 py-3 border-b border-border/40">
              <h2 className="text-[15px] font-semibold text-foreground">{t('settings.security')}</h2>
            </header>
            <div className="divide-y divide-border/40">
              {/* Change Password */}
              <button
                onClick={() => toast({ description: t('settings.comingSoon') })}
                className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground text-[15px]">{t('settings.changePassword')}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>

              {/* Logout All Devices */}
              <button
                onClick={async () => {
                  try {
                    await signOut();
                    toast({ description: t('settings.logoutSuccess') });
                    navigate("/auth");
                  } catch (error) {
                    toast({ description: t('settings.error'), variant: "destructive" });
                  }
                }}
                className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Shield className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground text-[15px]">{t('settings.logoutAllDevices')}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>

              {/* Data Management */}
              <button
                onClick={() => setDataManagementOpen(true)}
                className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Download className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground text-[15px]">
                    {language === "uz" ? "Ma'lumotlarni boshqarish" : "Data Management"}
                  </span>
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
            <span>{t('settings.logout')}</span>
          </button>

          {/* Section 2: Ilova (App) */}
          <section className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-premium-sm w-full">
            <header className="px-4 py-3 border-b border-border/40">
              <h2 className="text-[15px] font-semibold text-foreground">{t('settings.appSettings')}</h2>
            </header>
            <div className="divide-y divide-border/40">
              {/* Til (Language) */}
              <Collapsible open={openSection === "language"} onOpenChange={() => toggleSection("language")}>
                <CollapsibleTrigger className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground text-[15px]">{t('settings.language')}</span>
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
                    <span className="font-medium text-foreground text-[15px]">{t('settings.theme')}</span>
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
                      <span>{t('settings.themeLight')}</span>
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
                      <span>{t('settings.themeDark')}</span>
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
                      <span className="font-medium text-foreground text-[15px]">{t('settings.subscription')}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[90vh] bg-background">
                  <DrawerHeader className="text-center border-b border-border/40">
                    <DrawerTitle className="text-lg font-semibold">{t('settings.subscription')}</DrawerTitle>
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
              <h2 className="text-[15px] font-semibold text-foreground">{t('settings.helpLegal')}</h2>
            </header>
            <div className="divide-y divide-border/40">
              {/* Yordam markazi */}
              <button
                onClick={() => navigate("/support")}
                className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground text-[15px]">{t('settings.helpCenter')}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>

              {/* Xatolik haqida xabar berish */}
              <button
                onClick={() => navigate("/feedback")}
                className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground text-[15px]">{t('settings.reportBug')}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>

              {/* Foydalanish shartlari */}
              <button
                onClick={() => navigate("/terms")}
                className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground text-[15px]">{t('settings.terms')}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>

              {/* Maxfiylik siyosati */}
              <button
                onClick={() => navigate("/privacy")}
                className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground text-[15px]">{t('settings.privacy')}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>

              {/* Bahor AI haqida */}
              <Collapsible open={openSection === "about"} onOpenChange={() => toggleSection("about")}>
                <CollapsibleTrigger className="w-full px-4 min-h-[56px] flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground text-[15px]">{t('settings.aboutBahor')}</span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${openSection === "about" ? "rotate-90" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-4 bg-muted/30 space-y-3">
                  {/* Tagline */}
                  <p className="text-sm text-muted-foreground italic">
                    "{APP_INFO.tagline[language as keyof typeof APP_INFO.tagline] || APP_INFO.tagline.en}"
                  </p>
                  
                  {/* Founder */}
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-muted-foreground shrink-0">{t('settings.about.founder')}:</span>
                    <span className="text-sm font-medium text-foreground">
                      {language === 'uz' ? APP_INFO.founder.uz : APP_INFO.founder.en}
                    </span>
                  </div>
                  
                  {/* Team */}
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-muted-foreground shrink-0">{t('settings.about.team')}:</span>
                    <span className="text-sm font-medium text-foreground">{t('settings.about.teamValue')}</span>
                  </div>
                  
                  {/* Website */}
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-muted-foreground shrink-0">{t('settings.about.website')}:</span>
                    <a 
                      href={APP_INFO.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      bahorai.com
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  
                  {/* Support */}
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-muted-foreground shrink-0">{t('settings.about.support')}:</span>
                    <a 
                      href={`mailto:${APP_INFO.support}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {APP_INFO.support}
                    </a>
                  </div>
                  
                  {/* Status */}
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-muted-foreground shrink-0">{t('settings.about.status')}:</span>
                    <span className="text-sm font-medium text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {APP_INFO.status}
                    </span>
                  </div>
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
              {t('settings.viewAllPlans')}
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

      {/* Data Management Modal */}
      <DataManagementModal
        open={dataManagementOpen}
        onOpenChange={setDataManagementOpen}
      />
    </div>
    </>
  );
}
