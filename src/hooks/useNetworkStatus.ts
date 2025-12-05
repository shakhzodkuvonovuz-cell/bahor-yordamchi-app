import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
  });

  const handleOnline = useCallback(() => {
    setStatus(prev => ({ isOnline: true, wasOffline: prev.wasOffline || !prev.isOnline }));
  }, []);

  const handleOffline = useCallback(() => {
    setStatus({ isOnline: false, wasOffline: true });
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return status;
}

// Helper to check network before making requests
export function checkNetwork(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
