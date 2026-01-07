import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n/LanguageProvider";

interface PaymentVerifyModalProps {
  onVerified?: () => void;
}

export default function PaymentVerifyModal({ onVerified }: PaymentVerifyModalProps) {
  const { language } = useTranslation();
  const [open, setOpen] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    status: "confirmed" | "pending" | "failed" | "canceled" | "error";
    message?: string;
  } | null>(null);

  const handleVerify = async () => {
    if (!transactionId.trim()) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("atmos-transaction-info", {
        body: { transaction_id: transactionId.trim() },
      });
      
      if (error) {
        setResult({ status: "error", message: error.message });
        return;
      }
      
      setResult({
        status: data.status,
        message: data.message || (data.status === "confirmed" 
          ? language === "uz" ? "To'lov tasdiqlandi!" : "Payment confirmed!"
          : data.status === "pending"
            ? language === "uz" ? "To'lov hali kutilmoqda" : "Payment still pending"
            : language === "uz" ? "To'lov amalga oshmadi" : "Payment failed"),
      });
      
      if (data.status === "confirmed" && onVerified) {
        onVerified();
      }
    } catch (err) {
      setResult({ 
        status: "error", 
        message: language === "uz" ? "Xatolik yuz berdi" : "An error occurred" 
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!result) return null;
    switch (result.status) {
      case "confirmed":
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case "pending":
        return <AlertCircle className="w-12 h-12 text-yellow-500" />;
      case "failed":
      case "canceled":
      case "error":
        return <XCircle className="w-12 h-12 text-destructive" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors">
          {language === "uz" ? "To'lov tasdiqlanmadimi? Tekshirish" : "Payment not confirmed? Check"}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === "uz" ? "To'lovni tekshirish" : "Verify Payment"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {language === "uz" ? "Tranzaksiya ID" : "Transaction ID"}
            </label>
            <Input
              placeholder={language === "uz" ? "Tranzaksiya raqamini kiriting" : "Enter transaction ID"}
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {language === "uz" 
                ? "To'lov sahifasidan yoki bank xabaridan oling" 
                : "Get from payment page or bank message"}
            </p>
          </div>
          
          {result && (
            <div className="flex flex-col items-center gap-3 py-4">
              {getStatusIcon()}
              <p className={`text-sm font-medium text-center ${
                result.status === "confirmed" ? "text-green-600 dark:text-green-400" :
                result.status === "pending" ? "text-yellow-600 dark:text-yellow-400" :
                "text-destructive"
              }`}>
                {result.message}
              </p>
            </div>
          )}
          
          <Button
            onClick={handleVerify}
            disabled={loading || !transactionId.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {language === "uz" ? "Tekshirilmoqda..." : "Checking..."}
              </>
            ) : (
              language === "uz" ? "Tekshirish" : "Verify"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
