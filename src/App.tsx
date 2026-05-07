import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import InstallPrompt from "@/components/InstallPrompt";
import OnboardingTour from "@/components/OnboardingTour";
import DeepLinkHandler from "@/components/DeepLinkHandler";
import WidgetInstallPrompt from "@/components/WidgetInstallPrompt";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { installSyncTriggers, runSync } from "@/lib/sync-engine";

// Boot the offline sync engine (foreground + reconnect triggers).
installSyncTriggers();

// Home is eagerly imported so the public landing page paints on first render (improves LCP)
import Home from "./pages/Home";

// Lazy-loaded pages for code splitting

const Dashboard = lazy(() => import("./pages/Dashboard"));
const VehicleList = lazy(() => import("./pages/VehicleList"));
const VehicleForm = lazy(() => import("./pages/VehicleForm"));
const ClaimList = lazy(() => import("./pages/ClaimList"));
const ClaimWizard = lazy(() => import("./pages/ClaimWizard"));
const QuickCapture = lazy(() => import("./pages/QuickCapture"));
const ClaimDetail = lazy(() => import("./pages/ClaimDetail"));
const PanelShops = lazy(() => import("./pages/PanelShops"));
const TowCompanies = lazy(() => import("./pages/TowCompanies"));
const Profile = lazy(() => import("./pages/Profile"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const InsuranceCompanies = lazy(() => import("./pages/InsuranceCompanies"));
const Auth = lazy(() => import("./pages/Auth"));
const About = lazy(() => import("./pages/About"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Legal = lazy(() => import("./pages/Legal"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ExternalLogin = lazy(() => import("./pages/ExternalLogin"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const DeleteDataRequest = lazy(() => import("./pages/DeleteDataRequest"));
const Documents = lazy(() => import("./pages/Documents"));
const Family = lazy(() => import("./pages/Family"));
const WidgetSetup = lazy(() => import("./pages/WidgetSetup"));
const FaultGuide = lazy(() => import("./pages/FaultGuide"));

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// Re-fetch all queries AND drain the offline write queue when the device reconnects.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    queryClient.invalidateQueries();
    void runSync();
  });
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, isDeactivated, signOut } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!session) {
    // Preserve a family invite code across the auth round-trip so it can be
    // auto-accepted after sign in (Google OAuth strips query params).
    if (typeof window !== 'undefined' && window.location.pathname === '/family') {
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        try { localStorage.setItem('pending_family_invite', code); } catch {}
      }
    }
    return <Navigate to="/auth" replace />;
  }
  if (isDeactivated) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-lg font-bold text-foreground">Account Deactivated</h1>
        <p className="text-sm text-muted-foreground">Your account has been deactivated by an administrator. Please contact support for assistance.</p>
        <button onClick={signOut} className="text-sm text-primary underline underline-offset-2">Sign out</button>
      </div>
    </div>
  );
  return <>{children}</>;
}

function NativeHomeRedirect() {
  const { session, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (Capacitor.isNativePlatform()) {
    return session ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />;
  }
  return session ? <Navigate to="/dashboard" replace /> : <Home />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <OnboardingTour />
        <WidgetInstallPrompt />
        <SyncStatusBadge />
        <BrowserRouter>
          <DeepLinkHandler />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/external-login" element={<ExternalLogin />} />
              <Route path="/" element={<NativeHomeRedirect />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/vehicles" element={<ProtectedRoute><VehicleList /></ProtectedRoute>} />
              <Route path="/vehicles/new" element={<ProtectedRoute><VehicleForm /></ProtectedRoute>} />
              <Route path="/vehicles/:id/edit" element={<ProtectedRoute><VehicleForm /></ProtectedRoute>} />
              <Route path="/claims" element={<ProtectedRoute><ClaimList /></ProtectedRoute>} />
              <Route path="/claims/new" element={<ProtectedRoute><ClaimWizard /></ProtectedRoute>} />
              <Route path="/claims/quick-capture" element={<ProtectedRoute><QuickCapture /></ProtectedRoute>} />
              <Route path="/claims/:id/edit" element={<ProtectedRoute><ClaimWizard /></ProtectedRoute>} />
              <Route path="/claims/:id" element={<ProtectedRoute><ClaimDetail /></ProtectedRoute>} />
              <Route path="/panel-shops" element={<PanelShops />} />
              <Route path="/tow-companies" element={<TowCompanies />} />
              <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/insurance-companies" element={<ProtectedRoute><InsuranceCompanies /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/family" element={<ProtectedRoute><Family /></ProtectedRoute>} />
              <Route path="/widget-setup" element={<ProtectedRoute><WidgetSetup /></ProtectedRoute>} />
              <Route path="/fault-guide" element={<FaultGuide />} />
              <Route path="/about" element={<About />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/delete-account" element={<ProtectedRoute><DeleteAccount /></ProtectedRoute>} />
              <Route path="/delete-data-request" element={<ProtectedRoute><DeleteDataRequest /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            
          </Suspense>
        </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
