import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, ExternalLink } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function SubscriptionStatus() {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, refreshProfile } = useAuth();

  // Handle checkout success/cancel URL params
  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    if (checkoutStatus === "success") {
      toast({
        title: "Tabriklaymiz! 🎉",
        description: "Premium rejaga muvaffaqiyatli o'tdingiz!",
      });
      // Refresh profile to get updated plan
      refreshProfile();
      // Clear the URL param
      searchParams.delete("checkout");
      setSearchParams(searchParams);
    } else if (checkoutStatus === "cancel") {
      toast({
        title: "Bekor qilindi",
        description: "To'lov bekor qilindi.",
      });
      searchParams.delete("checkout");
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, refreshProfile]);

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
        title: "Xatolik",
        description: "To'lov sahifasini ochishda xatolik. Qayta urinib ko'ring.",
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
        title: "Xatolik",
        description: "Boshqarish sahifasini ochishda xatolik.",
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
              <p className="text-sm font-medium text-foreground">Sizning rejangiz</p>
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
                  Boshqarish
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
              Joriy reja
            </div>
          )}
          <div className="mb-4 mt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Boshlash uchun</p>
            <h3 className="text-2xl font-bold mb-2">Free (beta)</h3>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-bold">0</span>
              <span className="text-lg text-muted-foreground">UZS</span>
            </div>
            <p className="text-sm text-muted-foreground">Boshlang'ich foydalanish uchun cheklangan rejim.</p>
          </div>
          
          <ul className="space-y-2.5 mb-6 flex-1">
            <li className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground">•</span>
              <span>Cheklangan — kuniga 5 ta xabar gacha</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground">•</span>
              <span>Fayl va rasm yuklash imkoniyati yo'q</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground">•</span>
              <span>Faqat umumiy suhbat (maxsus rejimlar yo'q)</span>
            </li>
          </ul>
          
          <p className="text-xs text-muted-foreground/70 mt-auto">
            Cheklovlar beta davrida o'zgarishi mumkin.
          </p>
        </Card>

        {/* Monthly Plan - Most Popular */}
        <Card className={`flex flex-col p-6 border-primary/40 shadow-lg hover:shadow-xl transition-shadow bg-card relative flex-1 ${isPremium ? 'ring-2 ring-primary' : ''}`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full shadow-lg whitespace-nowrap">
            {isPremium ? 'Sizning rejangiz' : 'Eng mashhur reja'}
          </div>
          
          <div className="mb-4 mt-2">
            <h3 className="text-2xl font-bold mb-2">Premium oylik</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold">$5</span>
              <span className="text-lg text-muted-foreground line-through ml-2">49,000 UZS</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">/ oy (test rejimi)</p>
            <p className="text-xs text-primary font-medium">
              Taxminan 80% arzonroq chet el AI chatbotlaridan
            </p>
          </div>
          
          <ul className="space-y-2.5 mb-6 flex-1">
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary">✓</span>
              <span>Barcha maxsus rejimlar ochiq (IELTS, kod, biznes, moliya va boshqalar)</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary">✓</span>
              <span>Fayl va rasm yuklash hamda tahlil qilish</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary">✓</span>
              <span>Kuniga 200 ta xabar limiti</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary">✓</span>
              <span>Kelajakda ustuvor qo'llab-quvvatlash va yangiliklar</span>
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
                  Obunani boshqarish
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
                  Yuklanmoqda...
                </>
              ) : (
                "Tanlash"
              )}
            </Button>
          )}
        </Card>

        {/* Yearly Plan - Best Value */}
        <Card className="flex flex-col p-6 border-border/50 shadow-md hover:shadow-lg transition-shadow bg-card relative flex-1 opacity-60">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-accent text-accent-foreground text-xs font-semibold rounded-full shadow-lg whitespace-nowrap">
            Tez orada
          </div>
          
          <div className="mb-4 mt-2">
            <h3 className="text-2xl font-bold mb-2">Yillik reja</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold">340,000</span>
              <span className="text-lg text-muted-foreground">UZS</span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">/ yil</p>
            <p className="text-xs text-accent-foreground font-medium mb-1">
              Taxminan 28,300 UZS / oy ekvivalent
            </p>
            <p className="text-xs text-primary font-medium">
              Oylik rejaga nisbatan taxminan 42% tejamkor
            </p>
          </div>
          
          <ul className="space-y-2.5 mb-6 flex-1">
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary">✓</span>
              <span>Barcha oylik reja imkoniyatlari</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary">✓</span>
              <span>Yiliga bir marta to'lov — ko'proq tejash</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary">✓</span>
              <span>Beta foydalanuvchilari uchun maxsus bonuslar (kelajakda)</span>
            </li>
          </ul>
          
          <Button 
            variant="outline"
            className="w-full h-11 rounded-lg font-medium transition-all mt-auto"
            disabled
          >
            Tez orada
          </Button>
        </Card>
      </div>
      
      {/* Bottom Note */}
      <p className="text-center text-sm text-muted-foreground/80 max-w-2xl mx-auto leading-relaxed px-4">
        Test rejimi faol. Stripe orqali xavfsiz to'lov.
      </p>
    </div>
  );
}
