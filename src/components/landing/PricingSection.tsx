import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { WaitlistModal } from "./WaitlistModal";

interface PricingSectionProps {
  onOpenApp: () => void;
}

export function PricingSection({ onOpenApp }: PricingSectionProps) {
  const ref = useScrollAnimation({ threshold: 0.1 });
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");

  const plans = [
    {
      name: "Bepul (beta)",
      price: "0",
      features: ["Kuniga 5 ta xabar", "Asosiy suhbat rejimi", "Cheklangan funksiyalar"],
      cta: "Boshlash",
      action: "start" as const,
    },
    {
      name: "Oylik reja",
      price: "49,000",
      features: ["Cheksiz xabarlar", "Barcha maxsus rejimlar", "Fayl va rasm tahlili", "Tezkor javoblar", "Web qidiruv"],
      cta: "Premiumga yozilish (waitlist)",
      action: "waitlist" as const,
      highlighted: true,
      badge: "Eng mashhur",
      planType: "monthly" as const,
    },
    {
      name: "Yillik reja",
      price: "340,000",
      features: ["Barcha oylik reja imkoniyatlari", "42% tejash", "Birinchi bo'lib yangi funksiyalar"],
      cta: "Premiumga yozilish (waitlist)",
      action: "waitlist" as const,
      badge: "Eng tejamkor",
      planType: "yearly" as const,
    },
  ];

  const handlePlanClick = (plan: typeof plans[0]) => {
    if (plan.action === "start") {
      onOpenApp();
    } else if (plan.action === "waitlist" && plan.planType) {
      setSelectedPlan(plan.planType);
      setWaitlistOpen(true);
    }
  };

  return (
    <section id="narxlar" className="py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-6">
        <div
          ref={ref.ref}
          className={`text-center mb-12 transition-all duration-600 ${
            ref.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 text-foreground">
            Narxlar
          </h2>
          <p className="text-base md:text-lg text-white/65">O'zingizga mos rejani tanlang</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative p-6 rounded-2xl transition-all duration-500 border ${
                plan.highlighted
                  ? "glass-premium border-primary/40 shadow-glow scale-[1.02]"
                  : "glass-premium border-border/30"
              } ${ref.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {plan.badge}
                  </span>
                </div>
              )}
              <div className="mb-4 pt-2">
                <h3 className="font-bold text-foreground mb-3">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">UZS</span>
                </div>
              </div>
              <ul className="space-y-2 mb-5">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full h-10 rounded-xl font-medium ${
                  plan.highlighted
                    ? "shadow-lg shadow-primary/25"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
                onClick={() => handlePlanClick(plan)}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Beta davrida tariflar o'zgarishi mumkin.
        </p>
      </div>

      <WaitlistModal
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        defaultPlan={selectedPlan}
      />
    </section>
  );
}
