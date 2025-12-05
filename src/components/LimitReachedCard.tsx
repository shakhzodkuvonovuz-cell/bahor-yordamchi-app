import { Crown, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n/LanguageProvider";

interface LimitReachedCardProps {
  onDismiss?: () => void;
}

export default function LimitReachedCard({ onDismiss }: LimitReachedCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex justify-center my-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="max-w-md w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-900/50 border-2 border-primary/20 rounded-2xl p-6 shadow-lg">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground mb-1">
              Bugungi limit tugadi
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ertaga yana 5 ta savol berishingiz mumkin.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/feedback")}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Feedback yuborish
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={onDismiss}
          >
            <Clock className="w-4 h-4 mr-2" />
            Yopish
          </Button>
        </div>
      </div>
    </div>
  );
}
