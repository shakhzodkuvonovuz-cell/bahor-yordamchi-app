import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, ExternalLink } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/i18n/LanguageProvider";

export default function SubscriptionStatus() {
  const { t } = useTranslation();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, refreshProfile } = useAuth();

  // Handle checkout success/cancel URL params
  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    if (checkoutStatus === "success") {
      toast({
        title: t('subscription.successTitle'),
        description: t('subscription.successDesc'),
      });
      // Refresh profile to get updated plan
      refreshProfile();
      // Clear the URL param
      searchParams.delete("checkout");
      setSearchParams(searchParams);
    } else if (checkoutStatus === "cancel") {
      toast({
        title: t('subscription.cancelTitle'),
        description: t('subscription.cancelDesc'),
      });
      searchParams.delete("checkout");
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, refreshProfile, t]);

  const handleUpgradeClick = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
        body: {}
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Checkout URL not received");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: t('common.error'),
        description: t('subscription.checkoutError'),
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-portal', {
        body: {}
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error("Portal URL not received");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast({
        title: t('common.error'),
        description: t('subscription.portalError'),
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const isPremium = profile?.plan === 'premium' || profile?.plan === 'monthly' || profile?.plan === 'ultra' || profile?.plan === 'yearly';

  return (
    <div className="space-y-6 py-2">
      {/* Current Plan Status */}
      {isPremium && (
        <Card className="p-4 border-primary/40 bg-gradient-to-br from-primary/10 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t('subscription.yourPlan')}</p>
              <p className="text-lg font-bold text-primary">Premium</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageSubscription}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {t('subscription.manage')}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Pricing Cards Grid */}
      <div className="flex flex-col lg:flex-row gap-6 max-w-[1100px] mx-auto px-4 sm:px-6">
        {/* Free Plan */}
        <Card className={`flex flex-col p-6 border-border/50 shadow-md hover:shadow-lg transition-shadow bg-card relative flex-1 ${!isPremium ? 'ring-2 ring-primary' : ''}`}>
          {!isPremium && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full">
              {t('subscription.currentPlan')}
            </div>
          )}
          <div className="mb-4 mt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t('subscription.forStarting')}</p>
            <h3 className="text-2xl font-bold mb-2">Free (beta)</h3>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-bold">0</span>
              <span className="text-lg text-muted-foreground">UZS</span>
            </div>
            <p className="text-sm text-muted-foreground">{t('subscription.freeDesc')}</p>
          </div>
          
          <ul className="space-y-2.5 mb-6 flex-1">
            <li className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground">•</span>
              <span>{t('subscription.freeFeature1')}</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground">•</span>
              <span>{t('subscription.freeFeature2')}</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground">•</span>
              <span>{t('subscription.freeFeature3')}</span>
            </li>
          </ul>
          
          <p className="text-xs text-muted-foreground/70 mt-auto">
            {t('subscription.betaNote')}
          </p>
        </Card>

        {/* Monthly Plan - Most Popular */}
        <Card className={`flex flex-col p-6 border-primary/40 shadow-lg hover:shadow-xl transition-shadow bg-card relative flex-1 ${isPremium ? 'ring-2 ring-primary' : ''}`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full shadow-lg whitespace-nowrap">
            {isPremium ? t('subscription.yourPlan') : t('subscription.mostPopular')}
          </div>
          
          <div className="mb-4 mt-2">
            <h3 className="text-2xl font-bold mb-2">{t('subscription.premiumMonthly')}</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold">$5</span>
              <span className="text-lg text-muted-foreground line-through ml-2">49,000 UZS</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{t('subscription.perMonth')}</p>
            <p className="text-xs text-primary font-medium">
              {t('subscription.cheaperNote')}
            </p>
          </div>
          
          <ul className="space-y-2.5 mb-6 flex-1">
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary">✓</span>
              <span>{t('subscription.premiumFeature1')}</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary">✓</span>
              <span>{t('subscription.premiumFeature2')}</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary">✓</span>
              <span>{t('subscription.premiumFeature3')}</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary">✓</span>
              <span>{t('subscription.premiumFeature4')}</span>
            </li>
          </ul>
          
          {isPremium ? (
            <Button 
              variant="outline"
              className="w-full h-11 rounded-lg font-medium transition-all mt-auto"
              onClick={handleManageSubscription}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {t('subscription.manageSubscription')}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </>
              )}
            </Button>
          ) : (
            <Button 
              className="w-full h-11 rounded-lg font-medium shadow-md hover:shadow-lg transition-all mt-auto"
              onClick={handleUpgradeClick}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('subscription.select')
              )}
            </Button>
          )}
        </Card>

        {/* Yearly Plan - Best Value */}
        <Card className="flex flex-col p-6 border-border/50 shadow-md hover:shadow-lg transition-shadow bg-card relative flex-1 opacity-60">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-accent text-accent-foreground text-xs font-semibold rounded-full shadow-lg whitespace-nowrap">
            {t('subscription.comingSoon')}
          </div>
          
          <div className="mb-4 mt-2">
            <h3 className="text-2xl font-bold mb-2">{t('subscription.yearlyPlan')}</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold">340,000</span>
              <span className="text-lg text-muted-foreground">UZS</span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{t('subscription.perYear')}</p>
            <p className="text-xs text-accent-foreground font-medium mb-1">
              {t('subscription.yearlyEquivalent')}
            </p>
            <p className="text-xs text-primary font-medium">
              {t('subscription.yearlySavings')}
            </p>
          </div>
          
          <ul className="space-y-2.5 mb-6 flex-1">
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary">✓</span>
              <span>{t('subscription.yearlyFeature1')}</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary">✓</span>
              <span>{t('subscription.yearlyFeature2')}</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary">✓</span>
              <span>{t('subscription.yearlyFeature3')}</span>
            </li>
          </ul>
          
          <Button 
            variant="outline"
            className="w-full h-11 rounded-lg font-medium transition-all mt-auto"
            disabled
          >
            {t('subscription.comingSoon')}
          </Button>
        </Card>
      </div>
      
      {/* Bottom Note */}
      <p className="text-center text-sm text-muted-foreground/80 max-w-2xl mx-auto leading-relaxed px-4">
        {t('subscription.testModeNote')}
      </p>
    </div>
  );
}