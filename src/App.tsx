import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Wrap = ({ children }: { children: React.ReactNode }) => <AppLayout>{children}</AppLayout>;

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<Navigate to="/" replace />} />
    <Route path="/" element={<Wrap><Dashboard /></Wrap>} />
    <Route path="/calendar" element={<Wrap><CalendarPage /></Wrap>} />
    <Route path="/tasks" element={<Wrap><TasksPage /></Wrap>} />
    <Route path="/patients" element={<Wrap><PatientsPage /></Wrap>} />
    <Route path="/patients/:id" element={<Wrap><PatientProfilePage /></Wrap>} />
    <Route path="/patients/:id/labs/new" element={<NewLabResultsPage />} />
    <Route path="/clinical-hours" element={<Wrap><ClinicalHoursPage /></Wrap>} />
    <Route path="/notes" element={<Wrap><NotesPage /></Wrap>} />
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
