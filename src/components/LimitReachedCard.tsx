import { Crown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface LimitReachedCardProps {
  onDismiss?: () => void;
}

export default function LimitReachedCard({ onDismiss }: LimitReachedCardProps) {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center my-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="max-w-md w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-900/50 border-2 border-primary/20 rounded-2xl p-6 shadow-lg">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground mb-1">
              Bugungi bepul limit tugadi
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bahor AI'ni to'liq ishlatish uchun Premium rejaga o'ting. Cheksiz suhbat, fayl va rasm tahlili, maxsus rejimlar va tezkor javoblar siz uchun ochiladi.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            onClick={() => navigate("/settings")}
          >
            <Crown className="w-4 h-4 mr-2" />
            Premiumga o'tish
          </Button>
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onDismiss}
          >
            <Clock className="w-4 h-4 mr-2" />
            Ertaga davom ettiraman
          </Button>
        </div>
      </div>
    </div>
  );
}
