import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface GuestLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GuestLimitModal({ open, onOpenChange }: GuestLimitModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>To'liq Bahor AI imkoniyatlari uchun ro'yxatdan o'ting</DialogTitle>
          <DialogDescription>
            Siz sinov tariqasida 5 ta bepul savol limitiga yetdingiz.
            Cheksiz foydalanish uchun hisob yarating va har kuni yangi savollar berib turing.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button onClick={() => navigate("/signup")} className="w-full sm:w-auto">
            Ro'yxatdan o'tish
          </Button>
          <Button onClick={() => navigate("/login")} variant="outline" className="w-full sm:w-auto">
            Tizimga kirish
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="ghost" className="w-full sm:w-auto">
            Keyinroq
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
