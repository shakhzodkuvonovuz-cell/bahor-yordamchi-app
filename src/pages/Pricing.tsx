import { SEO } from "@/components/SEO";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PricingPlansSection from "@/components/PricingPlansSection";

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <>
      <SEO 
        title="Premium Rejalar" 
        description="Bahor AI Premium rejalarini tanlang. Uzcard va Humo orqali to'lang."
        url="/pricing"
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 bg-card/95 backdrop-blur-lg border-b border-border/40 shadow-premium-sm z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary rounded-xl transition-colors shrink-0"
              aria-label="Orqaga"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Premium Rejalar</h1>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-6">
          <PricingPlansSection />
        </div>
      </div>
    </>
  );
}
