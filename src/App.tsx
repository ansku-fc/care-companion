import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { NavHistoryProvider } from "@/hooks/useNavHistory";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import TasksPage from "./pages/TasksPage";
import PatientsPage from "./pages/PatientsPage";
import PatientProfilePage from "./pages/PatientProfilePage";
import NewLabResultsPage from "./pages/NewLabResultsPage";
import ClinicalHoursPage from "./pages/ClinicalHoursPage";
import NotesPage from "./pages/NotesPage";
import AuthPage from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/" element={<Protected><Dashboard /></Protected>} />
    <Route path="/calendar" element={<Protected><CalendarPage /></Protected>} />
    <Route path="/tasks" element={<Protected><TasksPage /></Protected>} />
    <Route path="/patients" element={<Protected><PatientsPage /></Protected>} />
    <Route path="/patients/:id" element={<Protected><PatientProfilePage /></Protected>} />
    <Route path="/patients/:id/labs/new" element={<Protected><NewLabResultsPage /></Protected>} />
    <Route path="/clinical-hours" element={<Protected><ClinicalHoursPage /></Protected>} />
    <Route path="/notes" element={<Protected><NotesPage /></Protected>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NavHistoryProvider>
            <AppRoutes />
          </NavHistoryProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
