import { useState } from "react";
import { Crown, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PricingPlansSection() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handlePayWithAtmos = async (plan: "monthly" | "yearly") => {
    setLoadingPlan(plan);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Iltimos, avval tizimga kiring");
        return;
      }
      
      const { data, error } = await supabase.functions.invoke("atmos-create-transaction", {
        body: { plan },
      });
      
      if (error) {
        console.error("Payment init error:", error);
        toast.error("To'lovni boshlashda xatolik yuz berdi");
        return;
      }
      
      if (!data?.checkout_url) {
        toast.error("To'lov havolasini olishda xatolik");
        return;
      }
      
      // Store transaction ID for return page
      const returnUrl = `${window.location.origin}/payment/return?transactionId=${data.transaction_id}`;
      
      // Open checkout in new tab or same window
      window.open(data.checkout_url, "_blank");
      
      // Also navigate to return page in current window after a short delay
      setTimeout(() => {
        window.location.href = returnUrl;
      }, 1000);
      
    } catch (err) {
      console.error("Payment error:", err);
      toast.error("To'lovda xatolik yuz berdi");
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      name: "Bepul reja",
      price: "0 UZS",
      period: "",
      features: [
        "Kuniga 5 ta so'rov",
        "Bahor AI asosiy rejimlari",
        "Standart javob tezligi",
      ],
      buttonText: "Hozirgi reja",
      buttonVariant: "outline" as const,
      disabled: true,
      plan: null,
    },
    {
      name: "Premium",
      price: "49,000 UZS",
      period: "/ oyiga",
      popular: true,
      features: [
        "Cheksiz so'rovlar",
        "Fayl va rasm tahlili",
        "Barcha maxsus rejimlar",
        "Tezroq javoblar",
        "Kelajakdagi yangi funksiyalarga ustuvor kirish",
      ],
      buttonText: "ATMOS orqali to'lash",
      buttonVariant: "default" as const,
      plan: "monthly" as const,
    },
    {
      name: "Yillik Premium",
      price: "340,000 UZS",
      period: "/ yiliga",
      savings: "~42% tejash",
      features: [
        "1 yil davomida Premium",
        "Barcha Premium imkoniyatlar",
        "Oylik rejaga nisbatan tejash",
        "Ustuvor qo'llab-quvvatlash",
      ],
      buttonText: "ATMOS orqali to'lash",
      buttonVariant: "outline" as const,
      plan: "yearly" as const,
    },
  ];

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Rejalar va narxlar</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          O'zingizga mos rejani tanlang va Bahor AI'ning to'liq imkoniyatlaridan foydalaning
        </p>
      </div>

      <div className="p-6 space-y-4">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`
              relative rounded-2xl border p-5 transition-all
              ${plan.popular 
                ? 'border-primary/50 bg-gradient-to-br from-primary/5 to-transparent' 
                : 'border-border bg-card/50'
              }
            `}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  Eng mashhur
                </span>
              </div>
            )}

            {plan.savings && (
              <div className="absolute -top-3 right-4">
                <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {plan.savings}
                </span>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                )}
              </div>
            </div>

            <ul className="space-y-2 mb-4">
              {plan.features.map((feature, featureIndex) => (
                <li key={featureIndex} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant={plan.buttonVariant}
              className={`w-full ${plan.popular ? 'bg-gradient-to-r from-primary to-primary/80' : ''}`}
              disabled={plan.disabled || loadingPlan === plan.plan}
              onClick={() => {
                if (plan.plan) {
                  handlePayWithAtmos(plan.plan);
                }
              }}
            >
              {loadingPlan === plan.plan ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Yuklanmoqda...
                </>
              ) : (
                plan.buttonText
              )}
            </Button>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 bg-muted/30 border-t border-border">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          💳 To'lov ATMOS orqali amalga oshiriladi. Humo, UzCard va boshqa kartalar qabul qilinadi.
        </p>
      </div>
    </div>
  );
}
