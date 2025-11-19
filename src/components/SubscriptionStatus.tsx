import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SubscriptionStatus() {
  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Joriy rejim</CardTitle>
            <Badge variant="secondary">Bepul rejim (beta)</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Kunlik limit:</span> 5 ta xabar
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Rasm yuklash:</span> tez orada qo'shiladi
          </p>
        </CardContent>
      </Card>

      {/* Future Plans Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Kelajak rejalar (hali yoqilmagan)
        </h3>

        {/* Monthly Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Oylik rejim</CardTitle>
            <CardDescription className="text-base font-semibold text-foreground">
              49 000 so'm / oy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cheklangan bo'lmagan chat, ustuvor navbat, tezroq javoblar
            </p>
            <Button variant="secondary" className="w-full" disabled>
              Tez orada
            </Button>
          </CardContent>
        </Card>

        {/* Yearly Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Yillik rejim</CardTitle>
            <CardDescription className="text-base font-semibold text-foreground">
              34 000 so'm / oy <span className="text-sm font-normal">(yiliga to'lov)</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ko'proq tejash, kelgusi narx oshishidan himoya
            </p>
            <Button variant="secondary" className="w-full" disabled>
              Tez orada
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Note */}
      <div className="px-4 py-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground leading-relaxed text-center">
          Hozircha barcha foydalanuvchilar bepul beta rejimdan foydalanishyapti. Pullik rejimlar keyinroq ishga tushiriladi.
        </p>
      </div>
    </div>
  );
}
