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
  if (localStorage.getItem(MIGRATION_FLAG_KEY)) {
    return false;
  }
  
  const stored = localStorage.getItem("bahorai_chats_v2");
  if (!stored) {
    return false;
  }
  
  try {
    const data = JSON.parse(stored);
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
  const { t } = useTranslation();
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
                {t('migration.title')}
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                {t('migration.description')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6">
              <Button variant="outline" onClick={handleSkip} className="flex-1">
                {t('migration.skip')}
              </Button>
              <Button onClick={handleMigrate} className="flex-1">
                {t('migration.import')}
              </Button>
            </DialogFooter>
          </>
        );

      case "migrating":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">
                {t('migration.importing')}
              </DialogTitle>
            </DialogHeader>
            <div className="py-8">
              <Progress value={progress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground mt-4">
                {t('migration.pleaseWait')}
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
                {t('migration.success')}
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                {result && t('migration.imported', { count: result.imported })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6">
              <Button onClick={handleClose} className="w-full">
                {t('onboarding.continue')}
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
                {t('migration.error')}
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                {t('migration.errorDesc')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6">
              <Button variant="outline" onClick={handleSkip} className="flex-1">
                {t('migration.skip')}
              </Button>
              <Button onClick={() => setState("prompt")} className="flex-1">
                {t('migration.tryAgain')}
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
