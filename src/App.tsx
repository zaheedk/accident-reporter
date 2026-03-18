import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import VehicleList from "./pages/VehicleList";
import VehicleForm from "./pages/VehicleForm";
import ClaimList from "./pages/ClaimList";
import ClaimWizard from "./pages/ClaimWizard";
import ClaimDetail from "./pages/ClaimDetail";
import PanelShops from "./pages/PanelShops";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/vehicles" element={<ProtectedRoute><VehicleList /></ProtectedRoute>} />
            <Route path="/vehicles/new" element={<ProtectedRoute><VehicleForm /></ProtectedRoute>} />
            <Route path="/vehicles/:id/edit" element={<ProtectedRoute><VehicleForm /></ProtectedRoute>} />
            <Route path="/claims" element={<ProtectedRoute><ClaimList /></ProtectedRoute>} />
            <Route path="/claims/new" element={<ProtectedRoute><ClaimWizard /></ProtectedRoute>} />
            <Route path="/claims/:id/edit" element={<ProtectedRoute><ClaimWizard /></ProtectedRoute>} />
            <Route path="/claims/:id" element={<ProtectedRoute><ClaimDetail /></ProtectedRoute>} />
            <Route path="/panel-shops" element={<ProtectedRoute><PanelShops /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
