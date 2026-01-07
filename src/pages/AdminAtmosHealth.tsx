import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Loader2, AlertCircle, CheckCircle2, XCircle, RefreshCw, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { checkAdminStatus } from '@/lib/entitlements';
import { supabase } from '@/integrations/supabase/client';

interface HealthResult {
  status: 'ok' | 'fail';
  latency_ms: number;
  token_preview: string | null;
  error: string | null;
  checked_at: string;
  api_base: string;
}

export default function AdminAtmosHealth() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<HealthResult | null>(null);
  const [lastError, setLastError] = useState<{ message: string; time: string } | null>(null);

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
    }
    check();
  }, [user, authLoading, navigate]);

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('atmos-health');
      
      if (error) {
        throw new Error(error.message);
      }
      
      setResult(data as HealthResult);
      
      if (data.status === 'fail' && data.error) {
        setLastError({
          message: data.error,
          time: data.checked_at,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setResult({
        status: 'fail',
        latency_ms: 0,
        token_preview: null,
        error: message,
        checked_at: new Date().toISOString(),
        api_base: 'unknown',
      });
      setLastError({
        message,
        time: new Date().toISOString(),
      });
    } finally {
      setChecking(false);
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
            onClick={() => navigate('/admin/entitlements')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">ATMOS Health Check</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Health Check Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wifi className="w-4 h-4" />
              ATMOS Token Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Test the ATMOS payment gateway token endpoint connectivity.
            </p>
            
            <Button 
              onClick={runHealthCheck} 
              disabled={checking}
              className="w-full"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run Health Check
                </>
              )}
            </Button>

            {/* Result Display */}
            {result && (
              <div className={`p-4 rounded-lg border ${
                result.status === 'ok' 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-destructive/10 border-destructive/30'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  {result.status === 'ok' ? (
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  ) : (
                    <XCircle className="w-8 h-8 text-destructive" />
                  )}
                  <div>
                    <p className={`text-xl font-bold ${
                      result.status === 'ok' ? 'text-green-500' : 'text-destructive'
                    }`}>
                      {result.status === 'ok' ? 'OK' : 'FAIL'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(result.checked_at).toLocaleString('uz-UZ')}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Latency:</span>
                    <span className="font-mono">{result.latency_ms}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">API Base:</span>
                    <span className="font-mono text-xs">{result.api_base}</span>
                  </div>
                  {result.token_preview && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Token:</span>
                      <span className="font-mono text-green-500">{result.token_preview}</span>
                    </div>
                  )}
                  {result.error && (
                    <div className="mt-3 p-2 rounded bg-destructive/20">
                      <p className="text-destructive font-medium text-xs break-all">
                        {result.error}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Error Card */}
        {lastError && (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <AlertCircle className="w-4 h-4" />
                Last Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Time: {new Date(lastError.time).toLocaleString('uz-UZ')}
                </p>
                <p className="text-sm font-mono text-destructive break-all">
                  {lastError.message}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/admin/entitlements')}
              >
                ← Entitlements
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/settings')}
              >
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
