// Platform detection utility for Capacitor-wrapped app
// Detects iOS/Android/Web and native vs mobile-web

export interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isNative: boolean;
  isMobileWeb: boolean;
  isDesktop: boolean;
  platform: 'ios' | 'android' | 'web';
}

// Cache result to avoid repeated detection
let cachedPlatform: PlatformInfo | null = null;

export function getPlatform(): PlatformInfo {
  if (cachedPlatform) return cachedPlatform;
  
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  
  // Check for Capacitor native context
  const isNative = typeof (window as any).Capacitor !== 'undefined' && 
                   (window as any).Capacitor.isNativePlatform?.() === true;
  
  // Detect iOS (includes iPad on iPadOS 13+)
  const isIOS = /iPad|iPhone|iPod/.test(ua) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Detect Android
  const isAndroid = /Android/.test(ua);
  
  // Mobile web = mobile device but not native Capacitor
  const isMobile = isIOS || isAndroid || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isMobileWeb = isMobile && !isNative;
  
  // Desktop = not mobile at all
  const isDesktop = !isMobile;
  
  // Determine platform string
  let platform: 'ios' | 'android' | 'web' = 'web';
  if (isIOS) platform = 'ios';
  else if (isAndroid) platform = 'android';
  
  cachedPlatform = {
    isIOS,
    isAndroid,
    isNative,
    isMobileWeb,
    isDesktop,
    platform,
  };
  
  return cachedPlatform;
}

// Convenience exports
export const isIOS = () => getPlatform().isIOS;
export const isAndroid = () => getPlatform().isAndroid;
export const isNative = () => getPlatform().isNative;
export const isMobileWeb = () => getPlatform().isMobileWeb;
export const isDesktop = () => getPlatform().isDesktop;
