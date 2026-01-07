import { useState } from "react";
import { Search, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface TransactionCheckModalProps {
  onSuccess?: () => void;
}

export default function TransactionCheckModal({ onSuccess }: TransactionCheckModalProps) {
  const [open, setOpen] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    status: "confirmed" | "pending" | "failed" | "canceled" | "error";
    message: string;
  } | null>(null);

  const handleCheck = async () => {
    if (!transactionId.trim()) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("atmos-transaction-info", {
        body: { transaction_id: transactionId.trim() },
      });
      
      if (error) {
        setResult({
          status: "error",
          message: "Tekshirishda xatolik yuz berdi",
        });
        return;
      }
      
      if (data.status === "confirmed") {
        setResult({
          status: "confirmed",
          message: data.message || "To'lov muvaffaqiyatli tasdiqlandi!",
        });
        onSuccess?.();
      } else if (data.status === "failed") {
        setResult({
          status: "failed",
          message: "To'lov amalga oshmadi",
        });
      } else if (data.status === "canceled") {
        setResult({
          status: "canceled",
          message: "To'lov bekor qilindi",
        });
      } else {
        setResult({
          status: "pending",
          message: "To'lov hali kutilmoqda...",
        });
      }
    } catch (err) {
      console.error("Transaction check error:", err);
      setResult({
        status: "error",
        message: "Xatolik yuz berdi",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!result) return null;
    
    switch (result.status) {
      case "confirmed":
        return <CheckCircle2 className="w-12 h-12 text-emerald-500" />;
      case "failed":
      case "canceled":
        return <XCircle className="w-12 h-12 text-destructive" />;
      case "error":
        return <AlertCircle className="w-12 h-12 text-amber-500" />;
      case "pending":
        return <Loader2 className="w-12 h-12 text-primary animate-spin" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs text-primary hover:underline mt-2">
          To'lov tasdiqlanmadimi? Tekshirish
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>To'lovni tekshirish</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Transaction ID
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Masalan: 123456789"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                disabled={loading}
              />
              <Button onClick={handleCheck} disabled={loading || !transactionId.trim()}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              ATMOS to'lov sahifasidan transaction ID ni kiriting
            </p>
          </div>
          
          {result && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              {getStatusIcon()}
              <p className={`font-medium ${
                result.status === "confirmed" 
                  ? "text-emerald-600 dark:text-emerald-400" 
                  : result.status === "pending"
                    ? "text-primary"
                    : "text-destructive"
              }`}>
                {result.message}
              </p>
              
              {result.status === "confirmed" && (
                <Button 
                  onClick={() => {
                    setOpen(false);
                    window.location.reload();
                  }}
                  className="mt-2"
                >
                  Sahifani yangilash
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
