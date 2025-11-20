import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PremiumUpgradeCard() {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6">
      {/* Decorative gradient orb */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
      
      <div className="relative space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Premiumga o'ting</h3>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Premium rejada:
        </p>

        <ul className="space-y-2">
          {[
            "Cheksiz muloqot",
            "Rasm va fayl tahlili",
            "Maxsus rejimlar",
            "Tez javoblar",
          ].map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-foreground">{benefit}</span>
            </li>
          ))}
        </ul>

        <Button
          className="w-full mt-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          onClick={() => navigate("/settings")}
        >
          <Crown className="w-4 h-4 mr-2" />
          Premiumga o'tish
        </Button>
      </div>
    </div>
  );
}
