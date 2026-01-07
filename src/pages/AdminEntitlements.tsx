import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Crown, UserCheck, AlertCircle, Loader2, Shield, Calendar, Trash2, CreditCard, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { checkAdminStatus, adminLookupUser, adminSetEntitlement, adminRevokeEntitlement, type PlanType } from '@/lib/entitlements';
import { supabase } from '@/integrations/supabase/client';
interface LookupResult {
  user: {
    id: string;
    email: string;
    name: string;
  };
  entitlement: {
    plan: string;
    expires_at: string | null;
    flags: Record<string, boolean>;
    note: string | null;
  };
  isDevBypass: boolean;
}

export default function AdminEntitlements() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  
  // Admin can set: free, beta_premium, dev_unlimited
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('beta_premium');
  const [expiryDate, setExpiryDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Payment setup
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [ipLoading, setIpLoading] = useState(false);
  const [ipError, setIpError] = useState<string | null>(null);
  
  const fetchPublicIp = async () => {
    setIpLoading(true);
    setIpError(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-public-ip');
      if (error) throw error;
      setPublicIp(data.ip);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'IP olishda xatolik';
      setIpError(message);
    } finally {
      setIpLoading(false);
    }
  };
  
  const copyIp = () => {
    if (publicIp) {
      navigator.clipboard.writeText(publicIp);
      toast.success('IP nusxalandi');
    }
  };

  useEffect(() => {
    async function check() {
      if (authLoading) return;
      if (!user) {
        navigate('/auth');
        return;
      }
      
      setCheckingAdmin(true);
      const { isAdmin: admin } = await checkAdminStatus();
      setIsAdmin(admin);
      setCheckingAdmin(false);
      
      if (!admin) {
        toast.error("Admin ruxsati yo'q");
      }
    }
    check();
  }, [user, authLoading, navigate]);

  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      toast.error('Email kiriting');
      return;
    }
    
    setSearching(true);
    setLookupResult(null);
    
    try {
      const result = await adminLookupUser(searchEmail.trim());
      setLookupResult(result);
      const plan = result.entitlement?.plan as PlanType || 'free';
      setSelectedPlan(plan === 'dev_unlimited' || plan === 'beta_premium' ? plan : 'free');
      setExpiryDate(result.entitlement?.expires_at ? result.entitlement.expires_at.split('T')[0] : '');
      setNote(result.entitlement?.note || '');
    } catch (err: any) {
      toast.error(err.message || 'Foydalanuvchi topilmadi');
    } finally {
      setSearching(false);
    }
  };

  const handleGrant = async () => {
    if (!lookupResult) return;
    
    setSaving(true);
    try {
      await adminSetEntitlement({
        email: lookupResult.user.email,
        plan: selectedPlan,
        expiresAt: expiryDate ? new Date(expiryDate).toISOString() : null,
        note: note || undefined,
      });
      
      const planLabel = selectedPlan === 'dev_unlimited' ? 'Dev Unlimited' : selectedPlan === 'beta_premium' ? 'Beta Premium' : 'Free';
      toast.success(`${planLabel} berildi`);
      
      // Refresh lookup
      const result = await adminLookupUser(lookupResult.user.email);
      setLookupResult(result);
    } catch (err: any) {
      toast.error(err.message || 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!lookupResult) return;
    
    setSaving(true);
    try {
      await adminRevokeEntitlement(lookupResult.user.email);
      toast.success('Premium bekor qilindi');
      
      // Refresh lookup
      const result = await adminLookupUser(lookupResult.user.email);
      setLookupResult(result);
      setSelectedPlan('free');
      setExpiryDate('');
    } catch (err: any) {
      toast.error(err.message || 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Ruxsat yo'q</h1>
        <p className="text-muted-foreground mb-6">Bu sahifaga faqat adminlar kirishi mumkin.</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Bosh sahifaga
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/settings')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">Admin: Entitlements</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/atmos-health')}
          >
            ATMOS Health
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Search Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="w-4 h-4" />
              Foydalanuvchi qidirish
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Email manzili..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result Card */}
        {lookupResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="w-4 h-4" />
                Foydalanuvchi ma'lumotlari
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User Info */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{lookupResult.user.email}</p>
                <p className="text-sm text-muted-foreground mt-2">Ism</p>
                <p className="font-medium">{lookupResult.user.name}</p>
              </div>

              {/* Current Status */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Hozirgi holat</p>
                  <div className="flex items-center gap-2 mt-1">
                    {lookupResult.entitlement.plan === 'premium' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
                        <Crown className="w-3 h-3" />
                        Premium
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                        Bepul
                      </span>
                    )}
                    {lookupResult.isDevBypass && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                        <Shield className="w-3 h-3" />
                        Dev Unlimited
                      </span>
                    )}
                  </div>
                </div>
                {lookupResult.entitlement.expires_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tugash</p>
                    <p className="text-sm font-medium">
                      {new Date(lookupResult.entitlement.expires_at).toLocaleDateString('uz-UZ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Edit Form */}
              <div className="border-t border-border pt-4 space-y-4">
                <h3 className="font-medium">O'zgartirish</h3>
                
                {/* Plan Selection */}
                <div className="space-y-2">
                  <Label>Reja</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={selectedPlan === 'free' ? 'default' : 'outline'}
                      onClick={() => setSelectedPlan('free')}
                      className="flex-1"
                    >
                      Bepul
                    </Button>
                    <Button
                      type="button"
                      variant={selectedPlan === 'beta_premium' ? 'default' : 'outline'}
                      onClick={() => setSelectedPlan('beta_premium')}
                      className="flex-1"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Beta Premium
                    </Button>
                    <Button
                      type="button"
                      variant={selectedPlan === 'dev_unlimited' ? 'default' : 'outline'}
                      onClick={() => setSelectedPlan('dev_unlimited')}
                      className="flex-1"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Dev
                    </Button>
                  </div>
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Tugash sanasi (ixtiyoriy)
                  </Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Bo'sh qoldirilsa, muddatsiz premium beriladi
                  </p>
                </div>

                {/* Note */}
                <div className="space-y-2">
                  <Label>Izoh (ixtiyoriy)</Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Beta tester, Friend, etc."
                    rows={2}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleGrant} 
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Crown className="w-4 h-4 mr-2" />
                    )}
                    {selectedPlan === 'dev_unlimited' ? 'Dev berish' : selectedPlan === 'beta_premium' ? 'Beta Premium berish' : "Free ga o'tkazish"}
                  </Button>
                  
                  {(lookupResult.entitlement.plan === 'beta_premium' || lookupResult.entitlement.plan === 'dev_unlimited') && (
                    <Button 
                      onClick={handleRevoke} 
                      disabled={saving}
                      variant="destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Setup Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="w-4 h-4" />
              Payment Gateway Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Uzbekistan payment gateways (Click, Payme, Uzum) require a static IP for API whitelisting.
            </p>
            
            {/* Current IP Check */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button 
                  onClick={fetchPublicIp} 
                  variant="outline" 
                  size="sm"
                  disabled={ipLoading}
                >
                  {ipLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Check Current IP
                </Button>
              </div>
              
              {publicIp && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <code className="flex-1 font-mono text-lg">{publicIp}</code>
                  <Button size="icon" variant="ghost" onClick={copyIp}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              {ipError && (
                <p className="text-sm text-destructive">{ipError}</p>
              )}
            </div>
            
            <Alert variant="destructive" className="border-destructive/30">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Important:</strong> Supabase Edge Functions do NOT have static IPs. 
                The IP changes on every request. You need a proxy service for static IP.
              </AlertDescription>
            </Alert>

            {/* Fixie Proxy Setup */}
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                🔧 Solution: Fixie Proxy (~$20/month)
              </h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Sign up at <a href="https://usefixie.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">usefixie.com</a></li>
                <li>Get your static IP and proxy URL</li>
                <li>Add <code className="px-1 py-0.5 rounded bg-muted">FIXIE_URL</code> secret in Lovable Cloud</li>
                <li>Give the Fixie static IP to your payment gateway</li>
              </ol>
              
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <p className="text-xs font-medium">Edge Function Usage Example:</p>
                <pre className="text-xs overflow-x-auto p-2 rounded bg-background border">
{`// In your Edge Function
const FIXIE_URL = Deno.env.get('FIXIE_URL');
const proxyUrl = new URL(FIXIE_URL);

const response = await fetch(paymentGatewayUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  // Deno uses this for proxy
  client: Deno.createHttpClient({
    proxy: { url: FIXIE_URL }
  }),
  body: JSON.stringify(payload)
});`}
                </pre>
              </div>
            </div>

            {/* Alternative: VPS */}
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                💰 Cheaper Alternative: VPS Proxy (~$4/month)
              </h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Create a $4/month DigitalOcean Droplet or Hetzner VPS</li>
                <li>Install nginx as reverse proxy</li>
                <li>Point Edge Functions to VPS, VPS forwards to payment gateway</li>
                <li>Give the VPS static IP to payment gateway</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                Requires basic Linux/nginx knowledge. More setup, but significantly cheaper.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dev Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4" />
              Dev Unlimited haqida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <code className="px-1 py-0.5 rounded bg-muted">DEV_UNLIMITED_EMAILS</code> secret-iga qo'shilgan 
              emaillar avtomatik cheksiz limit oladi. Bu database-dan mustaqil ishlaydi.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Yangi dev qo'shish uchun Lovable Cloud → Secrets → DEV_UNLIMITED_EMAILS ni tahrirlang 
              (vergul bilan ajratilgan emaillar).
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
