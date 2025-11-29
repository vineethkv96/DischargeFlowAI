import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Patients from "./pages/Patients";
import PatientDetails from "./pages/PatientDetails";
import OverviewDashboard from "./pages/OverviewDashboard";
import DischargeFlowPatients from "./pages/DischargeFlowPatients";
import DischargeFlowDashboard from "./pages/DischargeFlowDashboard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/overview"
              element={
                <ProtectedRoute>
                  <OverviewDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients"
              element={
                <ProtectedRoute>
                  <Patients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/:id"
              element={
                <ProtectedRoute>
                  <PatientDetails />
                </ProtectedRoute>
              }
            />
            {/* DischargeFlow Routes */}
            <Route
              path="/dischargeflow"
              element={
                <ProtectedRoute>
                  <DischargeFlowPatients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dischargeflow/patient/:patientId"
              element={
                <ProtectedRoute>
                  <DischargeFlowDashboard />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
