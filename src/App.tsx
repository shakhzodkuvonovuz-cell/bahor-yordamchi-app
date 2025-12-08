import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicRoute } from "@/components/PublicRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import OfflineBanner from "@/components/OfflineBanner";
import { AppShellV2 } from "@/components/layout/AppShellV2";
import { setupOAuthDeepLinkListener, isNativePlatform } from "@/lib/auth/googleAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import AuthEmail from "./pages/AuthEmail";
import AuthGoogle from "./pages/AuthGoogle";
import AuthPhone from "./pages/AuthPhone";
import AuthCallback from "./pages/AuthCallback";
import Landing from "./pages/Landing";
import AdminEntitlements from "./pages/AdminEntitlements";
import Feedback from "./pages/Feedback";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Support from "./pages/Support";
import DocumentTools from "./pages/DocumentTools";
import Circles from "./pages/Circles";
import CircleDetail from "./pages/CircleDetail";
import JoinCircle from "./pages/JoinCircle";
import ModesList from "./pages/ModesList";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Redirect helpers for old /spaces URLs
const SpaceIdRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/circles/${id}`} replace />;
};

const SpaceInviteRedirect = () => {
  const { code } = useParams();
  return <Navigate to={`/circles/invite/${code}`} replace />;
};

// Visual Viewport Height Handler for mobile keyboard
const VisualViewportHandler = () => {
  useEffect(() => {
    const setVvh = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--vvh', `${h * 0.01}px`);
    };
    
    setVvh();
    window.visualViewport?.addEventListener('resize', setVvh);
    window.addEventListener('resize', setVvh);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', setVvh);
      window.removeEventListener('resize', setVvh);
    };
  }, []);
  
  return null;
};

// OAuth Deep Link Handler for Capacitor
const OAuthDeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }

    console.log('[App] Setting up OAuth deep link listener');

    const onSuccess = () => {
      console.log('[App] OAuth success, navigating to /modes');
      toast.success('Muvaffaqiyatli kirdingiz!');
      navigate('/modes', { replace: true });
    };

    const onError = (error: string) => {
      console.error('[App] OAuth error:', error);
      toast.error('Kirishda xatolik: ' + error);
      navigate('/auth', { replace: true });
    };

    const cleanup = setupOAuthDeepLinkListener(onSuccess, onError);

    return () => {
      cleanup();
    };
  }, [navigate]);

  return null;
};

// Device Registration Handler - registers device on app startup
const DeviceRegistrationHandler = () => {
  const { user, signOut, session } = useAuth();

  useEffect(() => {
    // Need both user AND session to be valid before registering
    if (!user || !session) return;

    const DEVICE_ID_KEY = 'bahor_device_id';
    
    // Generate device ID if not exists
    const getDeviceId = () => {
      let deviceId = localStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        const nav = window.navigator;
        const screen = window.screen;
        const components = [
          nav.userAgent, nav.language, screen.width, screen.height,
          screen.colorDepth, new Date().getTimezoneOffset(), nav.hardwareConcurrency || 'unknown',
        ];
        let hashCode = 0;
        const hash = components.join('|');
        for (let i = 0; i < hash.length; i++) {
          hashCode = ((hashCode << 5) - hashCode) + hash.charCodeAt(i);
          hashCode = hashCode & hashCode;
        }
        const random = Math.random().toString(36).substring(2, 15);
        const timestamp = Date.now().toString(36);
        deviceId = `${Math.abs(hashCode).toString(36)}-${random}-${timestamp}`;
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    };

    const getDeviceLabel = () => {
      const ua = navigator.userAgent;
      if (/iPhone/.test(ua)) return 'iPhone';
      if (/iPad/.test(ua)) return 'iPad';
      if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android Phone' : 'Android Tablet';
      if (/Macintosh/.test(ua)) return 'Mac';
      if (/Windows/.test(ua)) return 'Windows PC';
      if (/Linux/.test(ua)) return 'Linux';
      return 'Unknown Device';
    };

    const registerDevice = async () => {
      try {
        const deviceId = getDeviceId();
        const { data, error } = await supabase.functions.invoke('register-device', {
          body: { device_id: deviceId, device_label: getDeviceLabel() },
        });

        if (error) {
          console.error('Device registration error:', error);
          return;
        }

        // Check if current device was revoked
        const isActive = data?.devices?.some((d: { device_id: string }) => d.device_id === deviceId);
        if (data?.devices && !isActive) {
          toast.error("Sessiya boshqa qurilmadan tugatildi", {
            description: "Iltimos, qayta kiring.",
            duration: 5000,
          });
          setTimeout(() => signOut(), 2000);
        }
      } catch (err) {
        console.error('Device registration failed:', err);
      }
    };

    // Small delay to ensure session token is fully propagated
    const timer = setTimeout(registerDevice, 500);
    return () => clearTimeout(timer);
  }, [user, session, signOut]);

  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          <BrowserRouter>
            <AuthProvider>
              <TooltipProvider>
              {/* Visual Viewport Handler for mobile keyboard */}
                <VisualViewportHandler />
                {/* OAuth Deep Link Handler for Capacitor */}
                <OAuthDeepLinkHandler />
                {/* Device Registration Handler - registers on every app load */}
                <DeviceRegistrationHandler />
                <OfflineBanner />
                <Toaster />
                <Sonner />
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  
                  {/* Auth routes - redirect to /modes if already logged in */}
                  <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
                  <Route path="/auth/email" element={<PublicRoute><AuthEmail /></PublicRoute>} />
                  <Route path="/auth/google" element={<PublicRoute><AuthGoogle /></PublicRoute>} />
                  <Route path="/auth/phone" element={<PublicRoute><AuthPhone /></PublicRoute>} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  
                  {/* Protected routes - wrapped in AppShell */}
                  <Route 
                    path="/modes" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <Home />
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/modes-list" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <ModesList />
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/support" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <Support />
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/chat/:mode" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <Chat />
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <Settings />
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/feedback" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <Feedback />
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/entitlements" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <AdminEntitlements />
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/tools/documents" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <DocumentTools />
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/circles" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <Circles />
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/circles/:id" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <ErrorBoundary>
                            <CircleDetail />
                          </ErrorBoundary>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  {/* Invite routes - support both /circles/invite/:code and /invite/:code */}
                  <Route path="/circles/invite/:code" element={<JoinCircle />} />
                  <Route path="/invite/:code" element={<JoinCircle />} />
                  <Route path="/join/:code" element={<JoinCircle />} />
                  {/* Redirects from old /spaces URLs */}
                  <Route path="/spaces" element={<Navigate to="/circles" replace />} />
                  <Route path="/spaces/:id" element={<SpaceIdRedirect />} />
                  <Route path="/spaces/invite/:code" element={<SpaceInviteRedirect />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
