import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import InstallPrompt from "@/components/InstallPrompt";

// Lazy-loaded pages for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const VehicleList = lazy(() => import("./pages/VehicleList"));
const VehicleForm = lazy(() => import("./pages/VehicleForm"));
const ClaimList = lazy(() => import("./pages/ClaimList"));
const ClaimWizard = lazy(() => import("./pages/ClaimWizard"));
const ClaimDetail = lazy(() => import("./pages/ClaimDetail"));
const PanelShops = lazy(() => import("./pages/PanelShops"));
const Profile = lazy(() => import("./pages/Profile"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const InsuranceCompanies = lazy(() => import("./pages/InsuranceCompanies"));
const Auth = lazy(() => import("./pages/Auth"));
const About = lazy(() => import("./pages/About"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Legal = lazy(() => import("./pages/Legal"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ExternalLogin = lazy(() => import("./pages/ExternalLogin"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const DeleteDataRequest = lazy(() => import("./pages/DeleteDataRequest"));

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, isDeactivated, signOut } = useAuth();
  const { t } = useTranslation();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!session) return <Navigate to="/auth" replace />;
  if (isDeactivated) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-lg font-bold text-foreground">{t('deactivated.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('deactivated.description')}</p>
        <button onClick={signOut} className="text-sm text-primary underline underline-offset-2">{t('common.signOut')}</button>
      </div>
    </div>
  );
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/external-login" element={<ExternalLogin />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/vehicles" element={<ProtectedRoute><VehicleList /></ProtectedRoute>} />
              <Route path="/vehicles/new" element={<ProtectedRoute><VehicleForm /></ProtectedRoute>} />
              <Route path="/vehicles/:id/edit" element={<ProtectedRoute><VehicleForm /></ProtectedRoute>} />
              <Route path="/claims" element={<ProtectedRoute><ClaimList /></ProtectedRoute>} />
              <Route path="/claims/new" element={<ProtectedRoute><ClaimWizard /></ProtectedRoute>} />
              <Route path="/claims/:id/edit" element={<ProtectedRoute><ClaimWizard /></ProtectedRoute>} />
              <Route path="/claims/:id" element={<ProtectedRoute><ClaimDetail /></ProtectedRoute>} />
              <Route path="/panel-shops" element={<ProtectedRoute><PanelShops /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/insurance-companies" element={<ProtectedRoute><InsuranceCompanies /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/about" element={<About />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <InstallPrompt />
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
