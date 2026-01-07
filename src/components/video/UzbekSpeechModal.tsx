import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { VolumeX, Globe, X } from "lucide-react";

interface UzbekSpeechModalProps {
  open: boolean;
  onClose: () => void;
  onSilent: () => void;
  onEnglishSpeech: () => void;
}

export function UzbekSpeechModal({
  open,
  onClose,
  onSilent,
  onEnglishSpeech,
}: UzbekSpeechModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <VolumeX className="w-5 h-5 text-amber-500" />
            O'zbek nutqi hali qo'llab-quvvatlanmaydi
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-2">
            <p>
              Sizning promptingizda gaplashuv yoki ovozli hikoya so'ralganga o'xshaydi, 
              lekin hozircha video modelimiz o'zbek tilida nutq yarata olmaydi.
            </p>
            <p className="font-medium">Qanday davom etishni tanlang:</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={onSilent}
          >
            <VolumeX className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="text-left">
              <div className="font-medium">Ovozsiz video</div>
              <div className="text-xs text-muted-foreground">
                Nutqsiz, faqat vizual video yaratiladi
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={onEnglishSpeech}
          >
            <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="text-left">
              <div className="font-medium">Inglizcha nutq</div>
              <div className="text-xs text-muted-foreground">
                Dialoglarni ingliz tiliga o'zgartirib, ovozli video yaratiladi
              </div>
            </div>
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} className="gap-2">
            <X className="w-4 h-4" />
            Bekor qilish
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Detect if prompt likely requests speech/voiceover in Uzbek
export function detectUzbekSpeechRequest(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  
  // Uzbek speech/dialogue keywords
  const uzbekSpeechKeywords = [
    "gapirsin", "gapiryapti", "gapiradi", "gaplashsin", "gaplashadi",
    "aytsin", "aytadi", "aytmoqda", "deydi", "desa", "deb",
    "ovoz", "ovozda", "nutq", "nutqda", "hikoya qilsin", "hikoya qiladi",
    "so'zlaydi", "so'zlasin", "so'zlash", "suhbat", "suhbatlashadi",
    "qichqirsin", "qichqiradi", "kuylaydi", "kuylasin", "ashula",
    "qo'shiq", "matn aytsin", "dialog", "dialoglar", "dialogda",
    "muloqot", "monolog", "voiceover", "voice-over", "voice over",
    "narrator", "narration", "narator", "hikoyachi",
    "ovozli", "gapirib", "aytib", "so'zlab",
  ];
  
  // Check for Uzbek language indicators (common Uzbek patterns)
  const uzbekPatterns = [
    /[a-z]+'[a-z]+/i, // Uzbek apostrophe usage like o'z, qo'l
    /\b(va|bu|uchun|bilan|kerak|qilish|bo'lsin|edi|ekan)\b/i,
    /\b(men|sen|u|biz|siz|ular)\b/i,
  ];
  
  const hasUzbekPattern = uzbekPatterns.some(p => p.test(prompt));
  const hasSpeechKeyword = uzbekSpeechKeywords.some(kw => lowerPrompt.includes(kw));
  
  // Also check for general speech keywords that might indicate voice request
  const generalSpeechKeywords = [
    "говорит", "разговор", "речь", // Russian
    "speaking", "talking", "says", "dialogue", "narration", "voiceover",
  ];
  const hasGeneralSpeech = generalSpeechKeywords.some(kw => lowerPrompt.includes(kw));
  
  return hasUzbekPattern && (hasSpeechKeyword || hasGeneralSpeech);
}

// Convert speech parts to English instruction
export function convertSpeechToEnglish(prompt: string): string {
  // Add instruction to generate English speech instead
  const englishInstruction = " (Generate any spoken dialogue or narration in English language)";
  return prompt + englishInstruction;
}
