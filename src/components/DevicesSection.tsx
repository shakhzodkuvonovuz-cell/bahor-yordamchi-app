import { useState, useEffect } from 'react';
import { Smartphone, Monitor, Tablet, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeviceRegistration } from '@/hooks/useDeviceRegistration';
import { useTranslation } from '@/i18n/LanguageProvider';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Device {
  id: string;
  device_id: string;
  device_label: string | null;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
}

export function DevicesSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentDeviceId, deviceLimit } = useDeviceRegistration();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);

  const fetchDevices = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', user.id)
      .order('last_seen_at', { ascending: false });

    if (!error && data) {
      setDevices(data as Device[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
  }, [user]);

  const handleRevokeOthers = async () => {
    if (!user) return;
    
    setRevoking(true);
    try {
      const { error } = await supabase.functions.invoke('register-device', {
        body: {
          device_id: currentDeviceId,
          device_label: getDeviceLabel(),
          revoke_others: true,
        },
      });

      if (error) throw error;
      
      toast.success(t('settings.devicesRevokedSuccess') || "Boshqa qurilmalar chiqarildi");
      await fetchDevices();
    } catch (err) {
      console.error('Revoke error:', err);
      toast.error(t('errors.generic') || "Xatolik yuz berdi");
    } finally {
      setRevoking(false);
    }
  };

  const getDeviceIcon = (label: string | null) => {
    if (!label) return <Smartphone className="w-5 h-5" />;
    if (label.includes('iPhone') || label.includes('Android Phone')) return <Smartphone className="w-5 h-5" />;
    if (label.includes('iPad') || label.includes('Tablet')) return <Tablet className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('uz-UZ', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const activeDevices = devices.filter(d => !d.revoked_at);
  const revokedDevices = devices.filter(d => d.revoked_at);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.devices') || "Qurilmalar"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-14 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          {t('settings.devices') || "Qurilmalar"}
        </CardTitle>
        <CardDescription>
          {t('settings.devicesDescription') || `Faol qurilmalar: ${activeDevices.length}/${deviceLimit}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active devices */}
        <div className="space-y-2">
          {activeDevices.map(device => (
            <div
              key={device.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                device.device_id === currentDeviceId
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {getDeviceIcon(device.device_label)}
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {device.device_label || 'Unknown'}
                    {device.device_id === currentDeviceId && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {t('settings.thisDevice') || "Bu qurilma"}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('settings.lastSeen') || "Oxirgi faollik"}: {formatDate(device.last_seen_at)}
                  </div>
                </div>
              </div>
              {device.device_id === currentDeviceId && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </div>
          ))}
        </div>

        {/* Revoked devices (collapsed) */}
        {revokedDevices.length > 0 && (
          <details className="group">
            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
              {t('settings.revokedDevices') || "Chiqarilgan qurilmalar"} ({revokedDevices.length})
            </summary>
            <div className="mt-2 space-y-2">
              {revokedDevices.slice(0, 5).map(device => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 opacity-60"
                >
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(device.device_label)}
                    <div>
                      <div className="font-medium line-through">
                        {device.device_label || 'Unknown'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('settings.revokedAt') || "Chiqarilgan"}: {formatDate(device.revoked_at!)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Sign out other devices button */}
        {activeDevices.length > 1 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleRevokeOthers}
            disabled={revoking}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {revoking
              ? (t('common.loading') || "Yuklanmoqda...")
              : (t('settings.signOutOtherDevices') || "Boshqa qurilmalardan chiqish")
            }
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android Phone' : 'Android Tablet';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown Device';
}
