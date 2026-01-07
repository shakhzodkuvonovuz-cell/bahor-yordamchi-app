import { useEffect, useState } from "react";
import { Crown, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import TransactionCheckModal from "@/components/TransactionCheckModal";
import PricingPlansSection from "@/components/PricingPlansSection";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_end: string;
}

export default function PremiumUpgradeCard() {
  const { t, language } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPricing, setShowPricing] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("id, plan, status, current_period_end")
          .eq("status", "active")
          .maybeSingle();

        if (!error && data) {
          setSubscription(data);
        }
      } catch (err) {
        console.error("Error fetching subscription:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const isPremium = profile?.plan === "premium" || profile?.plan === "ultra" || profile?.plan === "monthly" || profile?.plan === "yearly";
  
  const formatExpiryDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "d MMMM yyyy", { locale: language === "uz" ? uz : undefined });
    } catch {
      return dateStr;
    }
  };

  const benefits = [
    t('premium.benefit1'),
    t('premium.benefit2'),
    t('premium.benefit3'),
    t('premium.benefit4'),
  ];

  // Show active subscription status
  if (isPremium && subscription) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-6">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl" />
        
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Crown className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Premium aktiv</h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Hozirgi reja:</span>
              <span className="font-medium text-foreground capitalize">{subscription.plan}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Amal qilish muddati:</span>
              <span className="font-medium text-foreground">
                {formatExpiryDate(subscription.current_period_end)}
              </span>
            </div>
          </div>

          <ul className="space-y-2 pt-2">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-foreground">{benefit}</span>
              </li>
            ))}
          </ul>

          <TransactionCheckModal onSuccess={refreshProfile} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Show upgrade options
  if (showPricing) {
    return (
      <div className="space-y-4">
        <PricingPlansSection />
        <div className="text-center">
          <TransactionCheckModal onSuccess={refreshProfile} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6">
      {/* Decorative gradient orb */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
      
      <div className="relative space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground">{t('premium.upgrade')}</h3>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('premium.inPlan')}
        </p>

        <ul className="space-y-2">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-foreground">{benefit}</span>
            </li>
          ))}
        </ul>

        <Button
          className="w-full mt-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          onClick={() => setShowPricing(true)}
        >
          <Crown className="w-4 h-4 mr-2" />
          Rejani ko'tarish
        </Button>

        <div className="text-center">
          <TransactionCheckModal onSuccess={refreshProfile} />
        </div>
      </div>
    </div>
  );
}
