import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DailyLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DailyLimitModal({ open, onOpenChange }: DailyLimitModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bugungi bepul limit yakunlandi</DialogTitle>
          <DialogDescription>
            Siz bugungi bepul 5 ta javob limitiga yetdingiz.
            Ertaga qaytib keling yoki tez orada chiqariladigan pullik rejani kuting.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Tushunarli
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
