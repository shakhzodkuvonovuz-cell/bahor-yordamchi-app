import { useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ManageSubscriptionCardProps {
  profile: {
    plan?: string | null;
  };
}

export default function ManageSubscriptionCard({ profile }: ManageSubscriptionCardProps) {
  const [portalLoading, setPortalLoading] = useState(false);

  const getPlanLabel = () => {
    switch (profile?.plan) {
      case 'premium':
      case 'monthly': return 'Premium';
      case 'ultra':
      case 'yearly': return 'Ultra';
      default: return 'Premium';
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-portal', {
        body: {}
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error("Portal URL not received");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast({
        title: "Xatolik",
        description: "Boshqarish sahifasini ochishda xatolik.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <section className="bg-card border border-border/40 rounded-2xl p-4 shadow-premium-sm w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {getPlanLabel()} reja
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {profile.plan === 'ultra' || profile.plan === 'yearly' ? 'Yillik obuna' : 'Oylik obuna'}
          </p>
        </div>
        <Button 
          size="sm"
          variant="outline"
          onClick={handleManageSubscription}
          disabled={portalLoading}
          className="shrink-0 min-h-[44px]"
        >
          {portalLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Boshqarish
              <ExternalLink className="w-3 h-3 ml-1" />
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
