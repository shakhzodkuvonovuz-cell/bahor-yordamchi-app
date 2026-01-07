import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppContainer } from "@/components/layout";

type PaymentStatus = "loading" | "confirmed" | "pending" | "failed" | "canceled" | "timeout" | "error";

const MAX_POLL_TIME_MS = 45000; // 45 seconds max polling
const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const transactionId = searchParams.get("transactionId");
  
  const [status, setStatus] = useState<PaymentStatus>("loading");
  const [message, setMessage] = useState("");
  const pollStartTime = useRef<number>(Date.now());
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = useCallback(async () => {
    if (!transactionId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus("error");
        setMessage("Iltimos, qayta kiring");
        return "stop";
      }
      
      const { data, error } = await supabase.functions.invoke("atmos-transaction-info", {
        body: { transaction_id: transactionId },
      });
      
      if (error) {
        console.error("Error checking payment status:", error);
        setStatus("error");
        setMessage("To'lov holatini tekshirishda xatolik");
        return "stop";
      }
      
      if (data.status === "confirmed") {
        setStatus("confirmed");
        setMessage(data.message || "To'lov muvaffaqiyatli amalga oshirildi!");
        return "stop";
      } else if (data.status === "failed") {
        setStatus("failed");
        setMessage("To'lov amalga oshmadi");
        return "stop";
      } else if (data.status === "canceled") {
        setStatus("canceled");
        setMessage("To'lov bekor qilindi");
        return "stop";
      } else {
        // Still pending
        setStatus("pending");
        return "continue";
      }
    } catch (err) {
      console.error("Payment check error:", err);
      setStatus("error");
      setMessage("Xatolik yuz berdi");
      return "stop";
    }
  }, [transactionId]);

  useEffect(() => {
    if (!transactionId) {
      setStatus("error");
      setMessage("Transaction ID yo'q");
      return;
    }

    pollStartTime.current = Date.now();

    // Initial check
    checkStatus();

    // Start polling
    pollIntervalRef.current = setInterval(async () => {
      const elapsed = Date.now() - pollStartTime.current;
      
      // Check timeout (45 seconds)
      if (elapsed >= MAX_POLL_TIME_MS) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        setStatus("timeout");
        setMessage("To'lov holatini aniqlashda vaqt tugadi");
        return;
      }

      const result = await checkStatus();
      if (result === "stop" && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [transactionId, checkStatus]);

  // Navigate to settings and refresh profile on success
  const handleSuccessNavigate = () => {
    // Trigger a profile refresh by navigating with state
    navigate("/settings", { state: { refreshProfile: true } });
  };

  const handleRetry = () => {
    navigate("/settings");
  };

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
      case "timeout":
      case "error":
        return <AlertCircle className="w-16 h-16 text-amber-500" />;
    }
  };
  
  const getStatusTitle = () => {
    switch (status) {
      case "loading":
        return "To'lov tekshirilmoqda…";
      case "pending":
        return "To'lov kutilmoqda…";
      case "confirmed":
        return "To'lov muvaffaqiyatli!";
      case "failed":
        return "To'lov amalga oshmadi";
      case "canceled":
        return "To'lov bekor qilindi";
      case "timeout":
        return "Vaqt tugadi";
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
          
          <div className="flex flex-col gap-2 pt-4">
            {status === "confirmed" && (
              <Button onClick={handleSuccessNavigate} className="w-full">
                Sozlamalarga o'tish
              </Button>
            )}
            
            {(status === "failed" || status === "canceled" || status === "error" || status === "timeout") && (
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Qayta urinib ko'ring
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </AppContainer>
  );
}
