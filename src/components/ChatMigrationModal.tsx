import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/i18n/LanguageProvider";
import { migrateFromLocalStorage } from "@/lib/chatStore";
import { loadChatsFromStorage } from "@/utils/chatStorage";
import { DatabaseBackup, X, Check, AlertCircle } from "lucide-react";

interface ChatMigrationModalProps {
  open: boolean;
  onComplete: () => void;
  userId: string;
}

type MigrationState = "prompt" | "migrating" | "success" | "error" | "skipped";

const MIGRATION_FLAG_KEY = "bahorai_migration_complete";

export function checkMigrationNeeded(): boolean {
  // Check if migration already done
  if (localStorage.getItem(MIGRATION_FLAG_KEY)) {
    return false;
  }
  
  // Check if there's localStorage data to migrate
  const stored = localStorage.getItem("bahorai_chats_v2");
  if (!stored) {
    return false;
  }
  
  try {
    const data = JSON.parse(stored);
    // Check if there's any actual data
    return Object.keys(data).length > 0;
  } catch {
    return false;
  }
}

export function markMigrationComplete(): void {
  localStorage.setItem(MIGRATION_FLAG_KEY, "true");
}

export function clearLocalStorageChats(): void {
  localStorage.removeItem("bahorai_chats_v2");
}

export function ChatMigrationModal({ open, onComplete, userId }: ChatMigrationModalProps) {
  const { language } = useTranslation();
  const [state, setState] = useState<MigrationState>("prompt");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; failed: number } | null>(null);

  const handleMigrate = async () => {
    setState("migrating");
    setProgress(10);

    try {
      const localData = loadChatsFromStorage();
      setProgress(30);

      const migrationResult = await migrateFromLocalStorage(userId, localData);
      setProgress(90);

      setResult(migrationResult);
      
      // Clear localStorage after successful migration
      clearLocalStorageChats();
      markMigrationComplete();
      
      setProgress(100);
      setState("success");
    } catch (error) {
      console.error("Migration failed:", error);
      setState("error");
    }
  };

  const handleSkip = () => {
    markMigrationComplete();
    clearLocalStorageChats();
    setState("skipped");
    setTimeout(onComplete, 500);
  };

  const handleClose = () => {
    if (state === "success" || state === "skipped") {
      onComplete();
    }
  };

  const getContent = () => {
    switch (state) {
      case "prompt":
        return (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <DatabaseBackup className="w-8 h-8 text-primary" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">
                {language === "uz" ? "Eski chatlaringizni tiklaymizmi?" : 
                 language === "en" ? "Import your chat history?" :
                 language === "ru" ? "Импортировать историю чатов?" :
                 "Sohbet geçmişini içe aktarılsın mı?"}
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                {language === "uz" 
                  ? "Avvalgi suhbatlaringizni yangi tizimga o'tkazamiz. Bunda hech qanday ma'lumot yo'qolmaydi."
                  : language === "en"
                  ? "We'll transfer your previous conversations to the new system. No data will be lost."
                  : language === "ru"
                  ? "Мы перенесем ваши предыдущие разговоры в новую систему. Данные не будут потеряны."
                  : "Önceki konuşmalarınızı yeni sisteme aktaracağız. Hiçbir veri kaybolmayacak."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6">
              <Button variant="outline" onClick={handleSkip} className="flex-1">
                {language === "uz" ? "O'tkazib yuborish" : 
                 language === "en" ? "Skip" :
                 language === "ru" ? "Пропустить" :
                 "Atla"}
              </Button>
              <Button onClick={handleMigrate} className="flex-1">
                {language === "uz" ? "Tiklash" : 
                 language === "en" ? "Import" :
                 language === "ru" ? "Импортировать" :
                 "İçe Aktar"}
              </Button>
            </DialogFooter>
          </>
        );

      case "migrating":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">
                {language === "uz" ? "Ma'lumotlar tiklanmoqda..." : 
                 language === "en" ? "Importing data..." :
                 language === "ru" ? "Импорт данных..." :
                 "Veriler içe aktarılıyor..."}
              </DialogTitle>
            </DialogHeader>
            <div className="py-8">
              <Progress value={progress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground mt-4">
                {language === "uz" ? "Iltimos, kutib turing..." : 
                 language === "en" ? "Please wait..." :
                 language === "ru" ? "Пожалуйста, подождите..." :
                 "Lütfen bekleyin..."}
              </p>
            </div>
          </>
        );

      case "success":
        return (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">
                {language === "uz" ? "Muvaffaqiyatli!" : 
                 language === "en" ? "Success!" :
                 language === "ru" ? "Успешно!" :
                 "Başarılı!"}
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                {result && (
                  language === "uz" 
                    ? `${result.imported} ta suhbat tiklandi.`
                    : language === "en"
                    ? `${result.imported} conversations imported.`
                    : language === "ru"
                    ? `${result.imported} разговоров импортировано.`
                    : `${result.imported} konuşma içe aktarıldı.`
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6">
              <Button onClick={handleClose} className="w-full">
                {language === "uz" ? "Davom etish" : 
                 language === "en" ? "Continue" :
                 language === "ru" ? "Продолжить" :
                 "Devam Et"}
              </Button>
            </DialogFooter>
          </>
        );

      case "error":
        return (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">
                {language === "uz" ? "Xatolik yuz berdi" : 
                 language === "en" ? "Error occurred" :
                 language === "ru" ? "Произошла ошибка" :
                 "Bir hata oluştu"}
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                {language === "uz" 
                  ? "Ma'lumotlarni tiklashda xatolik. Keyinroq urinib ko'ring."
                  : language === "en"
                  ? "Failed to import data. Please try again later."
                  : language === "ru"
                  ? "Не удалось импортировать данные. Попробуйте позже."
                  : "Veriler içe aktarılamadı. Daha sonra tekrar deneyin."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6">
              <Button variant="outline" onClick={handleSkip} className="flex-1">
                {language === "uz" ? "O'tkazib yuborish" : 
                 language === "en" ? "Skip" :
                 language === "ru" ? "Пропустить" :
                 "Atla"}
              </Button>
              <Button onClick={() => setState("prompt")} className="flex-1">
                {language === "uz" ? "Qayta urinish" : 
                 language === "en" ? "Try Again" :
                 language === "ru" ? "Попробовать снова" :
                 "Tekrar Dene"}
              </Button>
            </DialogFooter>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        {getContent()}
      </DialogContent>
    </Dialog>
  );
}
