import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          <BrowserRouter>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/email" element={<AuthEmail />} />
                  <Route path="/auth/google" element={<AuthGoogle />} />
                  <Route path="/auth/phone" element={<AuthPhone />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/modes" element={<Home />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/support" element={<Support />} />
                  <Route 
                    path="/chat/:mode" 
                    element={
                      <ProtectedRoute>
                        <Chat />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/feedback" 
                    element={
                      <ProtectedRoute>
                        <Feedback />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/entitlements" 
                    element={
                      <ProtectedRoute>
                        <AdminEntitlements />
                      </ProtectedRoute>
                    } 
                  />
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
