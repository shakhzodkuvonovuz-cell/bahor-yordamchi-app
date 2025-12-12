import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { WaitlistModal } from "./WaitlistModal";

interface FinalCtaProps {
  onOpenApp: () => void;
}

export function FinalCta({ onOpenApp }: FinalCtaProps) {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-primary/10 pointer-events-none" />
      
      <div className="max-w-3xl mx-auto px-6 text-center relative">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 text-foreground">
          Bahor AI'ni bugun sinab ko'ring
        </h2>
        <p className="text-base md:text-lg text-white/65 mb-8">
          Bepul boshlang. Premiumga qiziqsangiz — waitlistga yoziling.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={onOpenApp}
            size="lg"
            className="h-12 px-8 font-semibold rounded-xl shadow-lg shadow-primary/25 hover:translate-x-0.5 transition-transform"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Bahor AI'ni ochish
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-8 font-medium rounded-xl hover:translate-x-0.5 transition-transform"
            onClick={() => setWaitlistOpen(true)}
          >
            Premiumga yozilish
          </Button>
        </div>
      </div>

      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </section>
  );
}
