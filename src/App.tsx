import { lazyWithRetry } from "@/lib/lazy-with-retry";
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

const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const VehicleList = lazyWithRetry(() => import("./pages/VehicleList"));
const VehicleForm = lazyWithRetry(() => import("./pages/VehicleForm"));
const ClaimList = lazyWithRetry(() => import("./pages/ClaimList"));
const ClaimWizard = lazyWithRetry(() => import("./pages/ClaimWizard"));
const QuickCapture = lazyWithRetry(() => import("./pages/QuickCapture"));
const ClaimDetail = lazyWithRetry(() => import("./pages/ClaimDetail"));
const PanelShops = lazyWithRetry(() => import("./pages/PanelShops"));
const TowCompanies = lazyWithRetry(() => import("./pages/TowCompanies"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const UserManagement = lazyWithRetry(() => import("./pages/UserManagement"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const InsuranceCompanies = lazyWithRetry(() => import("./pages/InsuranceCompanies"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const About = lazyWithRetry(() => import("./pages/About"));
const HowItWorks = lazyWithRetry(() => import("./pages/HowItWorks"));
const FAQ = lazyWithRetry(() => import("./pages/FAQ"));
const Legal = lazyWithRetry(() => import("./pages/Legal"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Blog = lazyWithRetry(() => import("./pages/Blog"));
const BlogPost = lazyWithRetry(() => import("./pages/BlogPost"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const ExternalLogin = lazyWithRetry(() => import("./pages/ExternalLogin"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const DeleteAccount = lazyWithRetry(() => import("./pages/DeleteAccount"));
const DeleteDataRequest = lazyWithRetry(() => import("./pages/DeleteDataRequest"));
const AccountDeletion = lazyWithRetry(() => import("./pages/AccountDeletion"));
const Documents = lazyWithRetry(() => import("./pages/Documents"));
const Family = lazyWithRetry(() => import("./pages/Family"));
const Fleet = lazyWithRetry(() => import("./pages/Fleet"));
const Broker = lazyWithRetry(() => import("./pages/Broker"));
const RentalPartner = lazyWithRetry(() => import("./pages/RentalPartner"));
const RentalPartnersAdmin = lazyWithRetry(() => import("./pages/admin/RentalPartners"));
const SeoDashboard = lazyWithRetry(() => import("./pages/admin/SeoDashboard"));
const ShopOutreach = lazyWithRetry(() => import("./pages/admin/ShopOutreach"));
const OutreachUnsubscribe = lazyWithRetry(() => import("./pages/OutreachUnsubscribe"));
const WidgetSetup = lazyWithRetry(() => import("./pages/WidgetSetup"));
const FaultGuide = lazyWithRetry(() => import("./pages/FaultGuide"));
const Rights = lazyWithRetry(() => import("./pages/Rights"));
const RightsTopic = lazyWithRetry(() => import("./pages/RightsTopic"));
const NotAtFaultCarHire = lazyWithRetry(() => import("./pages/NotAtFaultCarHire"));
const FaultQuiz = lazyWithRetry(() => import("./pages/FaultQuiz"));
const HazardRadar = lazyWithRetry(() => import("./pages/HazardRadar"));
const CouncilReport = lazyWithRetry(() => import("./pages/CouncilReport"));
const PanelBeatersIndex = lazyWithRetry(() => import("./pages/PanelBeatersIndex"));
const PanelBeatersLocation = lazyWithRetry(() => import("./pages/PanelBeatersLocation"));
const PanelShopDetail = lazyWithRetry(() => import("./pages/PanelShopDetail"));
const PanelBeatersByMakeIndex = lazyWithRetry(() => import("./pages/PanelBeatersByMakeIndex"));
const PanelBeatersByMake = lazyWithRetry(() => import("./pages/PanelBeatersByMake"));
const TowTrucksIndex = lazyWithRetry(() => import("./pages/TowTrucksIndex"));
const TowTrucksRegion = lazyWithRetry(() => import("./pages/TowTrucksRegion"));
const Shop = lazyWithRetry(() => import("./pages/Shop"));
const ShopJobDetail = lazyWithRetry(() => import("./pages/ShopJobDetail"));
const PublicJobTracker = lazyWithRetry(() => import("./pages/PublicJobTracker"));

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
    // Preserve a family/fleet invite code across the auth round-trip so it can
    // be auto-accepted after sign in (Google OAuth strips query params).
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const code = new URLSearchParams(window.location.search).get('code');
      if (code && path === '/family') {
        try { localStorage.setItem('pending_family_invite', code); } catch {}
      }
      if (code && path === '/fleet') {
        try { localStorage.setItem('pending_fleet_invite', code); } catch {}
      }
      if (code && path === '/broker') {
        try { localStorage.setItem('pending_broker_invite', code); } catch {}
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
              <Route path="/login" element={<Auth />} />
              <Route path="/signup" element={<Auth />} />
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
              <Route path="/panel-beaters" element={<PanelBeatersIndex />} />
              <Route path="/panel-beaters/:slug" element={<PanelBeatersLocation />} />
              <Route path="/panel-beaters/:slug/:shop" element={<PanelShopDetail />} />
              <Route path="/panel-beaters-for" element={<PanelBeatersByMakeIndex />} />
              <Route path="/panel-beaters-for/:make" element={<PanelBeatersByMake />} />
              <Route path="/tow-trucks" element={<TowTrucksIndex />} />
              <Route path="/tow-trucks/:slug" element={<TowTrucksRegion />} />
              <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/insurance-companies" element={<ProtectedRoute><InsuranceCompanies /></ProtectedRoute>} />
              <Route path="/admin/rental-partners" element={<ProtectedRoute><RentalPartnersAdmin /></ProtectedRoute>} />
              <Route path="/admin/seo" element={<ProtectedRoute><SeoDashboard /></ProtectedRoute>} />
              <Route path="/admin/outreach" element={<ProtectedRoute><ShopOutreach /></ProtectedRoute>} />
              <Route path="/outreach/unsubscribe" element={<OutreachUnsubscribe />} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/family" element={<ProtectedRoute><Family /></ProtectedRoute>} />
              <Route path="/fleet" element={<ProtectedRoute><Fleet /></ProtectedRoute>} />
              <Route path="/broker" element={<ProtectedRoute><Broker /></ProtectedRoute>} />
              <Route path="/rental-partner" element={<ProtectedRoute><RentalPartner /></ProtectedRoute>} />
              <Route path="/widget-setup" element={<ProtectedRoute><WidgetSetup /></ProtectedRoute>} />
              <Route path="/fault-guide" element={<FaultGuide />} />
              <Route path="/rights" element={<Rights />} />
              <Route path="/rights/:slug" element={<RightsTopic />} />
              <Route path="/not-at-fault-car-hire" element={<NotAtFaultCarHire />} />
              <Route path="/fault-quiz" element={<FaultQuiz />} />
              <Route path="/hazard-radar" element={<ProtectedRoute><HazardRadar /></ProtectedRoute>} />
              <Route path="/report-to-council" element={<CouncilReport />} />
              <Route path="/about" element={<About />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/account-deletion" element={<AccountDeletion />} />
              <Route path="/delete-my-account" element={<AccountDeletion />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/delete-account" element={<ProtectedRoute><DeleteAccount /></ProtectedRoute>} />
              <Route path="/delete-data-request" element={<ProtectedRoute><DeleteDataRequest /></ProtectedRoute>} />
              <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
              <Route path="/shop/jobs/:id" element={<ProtectedRoute><ShopJobDetail /></ProtectedRoute>} />
              <Route path="/job/:slug" element={<PublicJobTracker />} />
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
