import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SubscriptionStatus() {
  const { toast } = useToast();

  const handleUpgradeClick = () => {
    toast({
      title: "Tez orada",
      description: "To'lov tizimi tez orada qo'shiladi. Hozircha Bahor AI beta rejimida bepul ishlamoqda.",
    });
  };

  return (
    <div className="space-y-6 py-2">
      {/* Pricing Cards Grid */}
      <div className="flex flex-col lg:flex-row gap-6 max-w-[1100px] mx-auto px-4 sm:px-6">
        {/* Free Plan */}
        <Card className="flex flex-col p-6 border-border/50 shadow-md hover:shadow-lg transition-shadow bg-card relative flex-1">
          <div className="mb-4">
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
        <Card className="flex flex-col p-6 border-primary/40 shadow-lg hover:shadow-xl transition-shadow bg-card relative flex-1">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full shadow-lg whitespace-nowrap">
            Eng mashhur reja
          </div>
          
          <div className="mb-4 mt-2">
            <h3 className="text-2xl font-bold mb-2">Oylik reja</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold">49,000</span>
              <span className="text-lg text-muted-foreground">UZS</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">/ oy</p>
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
              <span>Ko'proq kunlik xabar limiti</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary">✓</span>
              <span>Kelajakda ustuvor qo'llab-quvvatlash va yangiliklar</span>
            </li>
          </ul>
          
          <Button 
            className="w-full h-11 rounded-lg font-medium shadow-md hover:shadow-lg transition-all mt-auto"
            onClick={handleUpgradeClick}
          >
            Tanlash
          </Button>
        </Card>

        {/* Yearly Plan - Best Value */}
        <Card className="flex flex-col p-6 border-border/50 shadow-md hover:shadow-lg transition-shadow bg-card relative flex-1">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-accent text-accent-foreground text-xs font-semibold rounded-full shadow-lg whitespace-nowrap">
            Eng tejamkor
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
            className="w-full h-11 rounded-lg font-medium hover:bg-accent transition-all mt-auto"
            onClick={handleUpgradeClick}
          >
            Tanlash
          </Button>
        </Card>
      </div>
      
      {/* Bottom Note */}
      <p className="text-center text-sm text-muted-foreground/80 max-w-2xl mx-auto leading-relaxed px-4">
        Hozircha barcha foydalanuvchilar bepul beta rejimdan foydalanishyapti. Pullik rejimlar keyinroq ishga tushiriladi.
      </p>
    </div>
  );
}
