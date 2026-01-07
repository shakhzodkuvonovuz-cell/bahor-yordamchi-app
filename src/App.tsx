import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicRoute } from "@/components/PublicRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import OfflineBanner from "@/components/OfflineBanner";
import { AppShellV2 } from "@/components/layout/AppShellV2";
import { setupOAuthDeepLinkListener, isNativePlatform } from "@/lib/auth/googleAuth";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";


// Eager load only landing (first paint) and auth (critical path)
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";

// Lazy load all other routes for code splitting
const Home = lazy(() => import("./pages/Home"));
const Chat = lazy(() => import("./pages/Chat"));
const Settings = lazy(() => import("./pages/Settings"));
const AuthEmail = lazy(() => import("./pages/AuthEmail"));
const AuthGoogle = lazy(() => import("./pages/AuthGoogle"));

const AuthReset = lazy(() => import("./pages/AuthReset"));
const AdminEntitlements = lazy(() => import("./pages/AdminEntitlements"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Support = lazy(() => import("./pages/Support"));
const DocumentTools = lazy(() => import("./pages/DocumentTools"));
const Circles = lazy(() => import("./pages/Circles"));
const CircleDetail = lazy(() => import("./pages/CircleDetail"));
const JoinCircle = lazy(() => import("./pages/JoinCircle"));
const ModesList = lazy(() => import("./pages/ModesList"));
const Tarjimon = lazy(() => import("./pages/Tarjimon"));
const ChatsHistory = lazy(() => import("./pages/ChatsHistory"));
const Agent = lazy(() => import("./pages/Agent"));
const AgentWorkspace = lazy(() => import("./pages/AgentWorkspace"));
const ImageStudioV2 = lazy(() => import("./pages/ImageStudioV2"));
const VideoStudio = lazy(() => import("./pages/VideoStudio"));
const PaymentReturn = lazy(() => import("./pages/PaymentReturn"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Minimal loading fallback - fast, lightweight skeleton
const PageSkeleton = () => (
  <div className="flex flex-col min-h-screen bg-background p-4">
    <Skeleton className="h-12 w-32 mb-4" />
    <Skeleton className="h-8 w-48 mb-2" />
    <Skeleton className="h-4 w-64 mb-6" />
    <div className="flex-1 flex flex-col gap-3">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-3/4 rounded-xl" />
    </div>
  </div>
);

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

// Wrap lazy components with Suspense
const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageSkeleton />}>
    {children}
  </Suspense>
);

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
                <OfflineBanner />
                <Toaster />
                <Sonner />
                <Routes>
                  {/* Public routes - Landing is eager loaded for fast first paint */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/terms" element={<LazyRoute><Terms /></LazyRoute>} />
                  <Route path="/privacy" element={<LazyRoute><Privacy /></LazyRoute>} />
                  
                  {/* Auth routes - redirect to /modes if already logged in */}
                  <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
                  <Route path="/auth/email" element={<PublicRoute><LazyRoute><AuthEmail /></LazyRoute></PublicRoute>} />
                  <Route path="/auth/google" element={<PublicRoute><LazyRoute><AuthGoogle /></LazyRoute></PublicRoute>} />
                  
                  <Route path="/auth/reset" element={<LazyRoute><AuthReset /></LazyRoute>} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  
                  {/* Protected routes - wrapped in AppShell with lazy loading */}
                  <Route 
                    path="/modes" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><Home /></LazyRoute>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/chats" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><ChatsHistory /></LazyRoute>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/modes-list" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><ModesList /></LazyRoute>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/support" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><Support /></LazyRoute>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/chat/:mode" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><Chat /></LazyRoute>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><Settings /></LazyRoute>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/feedback" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><Feedback /></LazyRoute>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/entitlements" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><AdminEntitlements /></LazyRoute>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/tools/documents" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><DocumentTools /></LazyRoute>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/circles" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><Circles /></LazyRoute>
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
                            <LazyRoute><CircleDetail /></LazyRoute>
                          </ErrorBoundary>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  {/* Tarjimon - Translator */}
                  <Route 
                    path="/tarjimon" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><Tarjimon /></LazyRoute>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  {/* Agent Mode */}
                  <Route 
                    path="/agent" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><Agent /></LazyRoute>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/agent/workspace/:runId" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><AgentWorkspace /></LazyRoute>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  {/* Image Studio */}
                  <Route 
                    path="/image-studio" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><ImageStudioV2 /></LazyRoute>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  {/* Video Studio */}
                  <Route 
                    path="/video-studio" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><VideoStudio /></LazyRoute>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  {/* Payment return page */}
                  <Route 
                    path="/payment/return" 
                    element={
                      <ProtectedRoute>
                        <AppShellV2>
                          <LazyRoute><PaymentReturn /></LazyRoute>
                        </AppShellV2>
                      </ProtectedRoute>
                    } 
                  />
                  {/* Invite routes - support both /circles/invite/:code and /invite/:code */}
                  <Route path="/circles/invite/:code" element={<LazyRoute><JoinCircle /></LazyRoute>} />
                  <Route path="/invite/:code" element={<LazyRoute><JoinCircle /></LazyRoute>} />
                  <Route path="/join/:code" element={<LazyRoute><JoinCircle /></LazyRoute>} />
                  {/* Redirects from old /spaces URLs */}
                  <Route path="/spaces" element={<Navigate to="/circles" replace />} />
                  <Route path="/spaces/:id" element={<SpaceIdRedirect />} />
                  <Route path="/spaces/invite/:code" element={<SpaceInviteRedirect />} />
                  <Route path="*" element={<LazyRoute><NotFound /></LazyRoute>} />
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
