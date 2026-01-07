import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppContainer } from "@/components/layout";

type PaymentStatus = "loading" | "confirmed" | "pending" | "failed" | "canceled" | "error";

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const transactionId = searchParams.get("transactionId");
  
  const [status, setStatus] = useState<PaymentStatus>("loading");
  const [message, setMessage] = useState("");
  const [pollCount, setPollCount] = useState(0);
  
  const maxPolls = 30; // Max 30 polls (1 minute at 2s intervals)
  
  useEffect(() => {
    if (!transactionId) {
      setStatus("error");
      setMessage("Transaction ID yo'q");
      return;
    }
    
    const checkStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus("error");
          setMessage("Iltimos, qayta kiring");
          return;
        }
        
        const { data, error } = await supabase.functions.invoke("atmos-transaction-info", {
          body: { transaction_id: transactionId },
        });
        
        if (error) {
          console.error("Error checking payment status:", error);
          setStatus("error");
          setMessage("To'lov holatini tekshirishda xatolik");
          return;
        }
        
        if (data.status === "confirmed") {
          setStatus("confirmed");
          setMessage(data.message || "To'lov muvaffaqiyatli amalga oshirildi!");
        } else if (data.status === "failed") {
          setStatus("failed");
          setMessage("To'lov amalga oshmadi");
        } else if (data.status === "canceled") {
          setStatus("canceled");
          setMessage("To'lov bekor qilindi");
        } else {
          // Still pending
          setStatus("pending");
          setPollCount((prev) => prev + 1);
        }
      } catch (err) {
        console.error("Payment check error:", err);
        setStatus("error");
        setMessage("Xatolik yuz berdi");
      }
    };
    
    // Initial check
    checkStatus();
    
    // Poll while pending
    const interval = setInterval(() => {
      if (status === "pending" && pollCount < maxPolls) {
        checkStatus();
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [transactionId, status, pollCount]);
  
  const getStatusIcon = () => {
    switch (status) {
      case "loading":
      case "pending":
        return <Loader2 className="w-16 h-16 text-primary animate-spin" />;
      case "confirmed":
        return <CheckCircle2 className="w-16 h-16 text-emerald-500" />;
      case "failed":
      case "canceled":
        return <XCircle className="w-16 h-16 text-destructive" />;
      case "error":
        return <AlertCircle className="w-16 h-16 text-amber-500" />;
    }
  };
  
  const getStatusTitle = () => {
    switch (status) {
      case "loading":
        return "To'lov tekshirilmoqda...";
      case "pending":
        return "To'lov kutilmoqda...";
      case "confirmed":
        return "To'lov muvaffaqiyatli!";
      case "failed":
        return "To'lov amalga oshmadi";
      case "canceled":
        return "To'lov bekor qilindi";
      case "error":
        return "Xatolik yuz berdi";
    }
  };
  
  return (
    <AppContainer className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-xl">{getStatusTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {message && (
            <p className="text-muted-foreground">{message}</p>
          )}
          
          {status === "pending" && (
            <p className="text-sm text-muted-foreground">
              To'lovni tugatganingizdan so'ng, bu sahifa avtomatik yangilanadi...
            </p>
          )}
          
          {pollCount >= maxPolls && status === "pending" && (
            <p className="text-sm text-amber-500">
              To'lov holatini aniqlashda ko'p vaqt ketdi. Iltimos, keyinroq tekshiring.
            </p>
          )}
          
          <div className="flex flex-col gap-2 pt-4">
            {status === "confirmed" && (
              <Button onClick={() => navigate("/chat")} className="w-full">
                Chatga o'tish
              </Button>
            )}
            
            {(status === "failed" || status === "canceled" || status === "error") && (
              <Button onClick={() => navigate("/settings")} variant="outline" className="w-full">
                Sozlamalarga qaytish
              </Button>
            )}
            
            {status === "pending" && pollCount >= maxPolls && (
              <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                Qayta tekshirish
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </AppContainer>
  );
}
