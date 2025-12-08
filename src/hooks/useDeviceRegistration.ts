import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DEVICE_ID_KEY = 'bahor_device_id';

interface Device {
  id: string;
  device_id: string;
  device_label: string | null;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
}

interface DeviceRegistrationResult {
  success: boolean;
  devices: Device[];
  limit: number;
  plan: string;
}

// Generate a stable device ID
function generateDeviceId(): string {
  const nav = window.navigator;
  const screen = window.screen;
  
  // Create a fingerprint from available browser data
  const components = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || 'unknown',
  ];
  
  // Simple hash function
  const hash = components.join('|');
  let hashCode = 0;
  for (let i = 0; i < hash.length; i++) {
    const char = hash.charCodeAt(i);
    hashCode = ((hashCode << 5) - hashCode) + char;
    hashCode = hashCode & hashCode;
  }
  
  // Add random component for uniqueness and timestamp
  const random = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  
  return `${Math.abs(hashCode).toString(36)}-${random}-${timestamp}`;
}

// Get or create stable device ID
function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// Get device label from user agent
function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) {
    if (/Mobile/.test(ua)) return 'Android Phone';
    return 'Android Tablet';
  }
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux';
  
  return 'Unknown Device';
}

export function useDeviceRegistration() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceLimit, setDeviceLimit] = useState(2);
  const [isRevoked, setIsRevoked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentDeviceId] = useState(() => getDeviceId());

  const registerDevice = useCallback(async () => {
    if (!user) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('register-device', {
        body: {
          device_id: currentDeviceId,
          device_label: getDeviceLabel(),
        },
      });

      if (error) {
        console.error('Device registration error:', error);
        return null;
      }

      const result = data as DeviceRegistrationResult;
      setDevices(result.devices || []);
      setDeviceLimit(result.limit || 2);
      
      // Check if current device is in the active list
      const isActive = result.devices?.some(d => d.device_id === currentDeviceId);
      setIsRevoked(!isActive);

      return result;
    } catch (err) {
      console.error('Device registration failed:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, currentDeviceId]);

  const fetchDevices = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', user.id)
      .order('last_seen_at', { ascending: false });

    if (!error && data) {
      setDevices(data as Device[]);
      
      // Check if current device is revoked
      const currentDevice = data.find(d => d.device_id === currentDeviceId);
      setIsRevoked(currentDevice?.revoked_at !== null);
    }
  }, [user, currentDeviceId]);

  const revokeOtherDevices = useCallback(async () => {
    if (!user) return false;

    try {
      // Call edge function to revoke all other devices
      const { data, error } = await supabase.functions.invoke('register-device', {
        body: {
          device_id: currentDeviceId,
          device_label: getDeviceLabel(),
          revoke_others: true,
        },
      });

      if (error) {
        console.error('Revoke others error:', error);
        return false;
      }

      await fetchDevices();
      return true;
    } catch (err) {
      console.error('Revoke others failed:', err);
      return false;
    }
  }, [user, currentDeviceId, fetchDevices]);

  // Register device on auth
  useEffect(() => {
    if (user) {
      registerDevice();
    }
  }, [user, registerDevice]);

  return {
    devices,
    deviceLimit,
    currentDeviceId,
    isRevoked,
    loading,
    registerDevice,
    fetchDevices,
    revokeOtherDevices,
  };
}

export { getDeviceId };
