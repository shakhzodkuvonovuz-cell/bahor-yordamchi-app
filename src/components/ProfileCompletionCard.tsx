import { useEffect, useState } from "react";
import { CheckCircle, User, Phone, Camera } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { Progress } from "@/components/ui/progress";

interface ProfileCompletionCardProps {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  onBonusAwarded?: () => void;
}

const PROFILE_BONUS_KEY = "bahorai_profile_bonus";

export default function ProfileCompletionCard({
  firstName,
  lastName,
  phone,
  avatarUrl,
  onBonusAwarded,
}: ProfileCompletionCardProps) {
  const { language } = useTranslation();
  const [bonusShown, setBonusShown] = useState(false);

  // Calculate completion percentage
  const hasName = Boolean(firstName && lastName);
  const hasPhone = Boolean(phone);
  const hasAvatar = Boolean(avatarUrl);

  const completionItems = [
    { done: hasName, weight: 40 },
    { done: hasPhone, weight: 20 },
    { done: hasAvatar, weight: 40 },
  ];

  const percentage = completionItems.reduce(
    (acc, item) => acc + (item.done ? item.weight : 0),
    0
  );

  // Check for bonus (100% completion reward)
  useEffect(() => {
    if (percentage === 100 && !localStorage.getItem(PROFILE_BONUS_KEY)) {
      localStorage.setItem(PROFILE_BONUS_KEY, "1");
      setBonusShown(true);
      onBonusAwarded?.();
    }
  }, [percentage, onBonusAwarded]);

  const labels = {
    title: language === "uz" ? "Profil to'liqligi" : language === "ru" ? "Заполненность профиля" : "Profile completion",
    name: language === "uz" ? "Ism va familiya" : language === "ru" ? "Имя и фамилия" : "Name",
    phone: language === "uz" ? "Telefon raqami" : language === "ru" ? "Номер телефона" : "Phone",
    avatar: language === "uz" ? "Profil rasmi" : language === "ru" ? "Фото профиля" : "Profile photo",
    bonus: language === "uz" ? "Bonus: +5 ta xabar (beta)" : language === "ru" ? "Бонус: +5 сообщений (бета)" : "Bonus: +5 messages (beta)",
    complete: language === "uz" ? "Profil to'liq!" : language === "ru" ? "Профиль заполнен!" : "Profile complete!",
  };

  if (percentage === 100 && !bonusShown) {
    return null; // Hide when complete and bonus already shown
  }

  return (
    <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-premium-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{labels.title}</h3>
        <span className="text-sm font-medium text-primary">{percentage}%</span>
      </div>

      <Progress value={percentage} className="h-2 mb-4" />

      <div className="space-y-2">
        <div className={`flex items-center gap-2 text-sm ${hasName ? "text-primary" : "text-muted-foreground"}`}>
          {hasName ? <CheckCircle className="w-4 h-4" /> : <User className="w-4 h-4" />}
          <span>{labels.name}</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${hasPhone ? "text-primary" : "text-muted-foreground"}`}>
          {hasPhone ? <CheckCircle className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          <span>{labels.phone}</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${hasAvatar ? "text-primary" : "text-muted-foreground"}`}>
          {hasAvatar ? <CheckCircle className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          <span>{labels.avatar}</span>
        </div>
      </div>

      {bonusShown && percentage === 100 && (
        <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl text-sm text-primary font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4" />
          {labels.complete} {labels.bonus}
        </div>
      )}
    </div>
  );
}
