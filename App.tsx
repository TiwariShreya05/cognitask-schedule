import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AddTasks from "./pages/AddTasks";
import WeeklySchedule from "./pages/WeeklySchedule";
import Dashboard from "./pages/Dashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import NotFound from "./pages/NotFound";
import { isLoggedIn, isManager, getCurrentUser } from "./lib/auth";
import { getReminders, removeReminder } from "./lib/taskStore";
import { toast } from "./hooks/use-toast";

const queryClient = new QueryClient();

function EmployeeRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (isManager()) return <Navigate to="/manager" replace />;
  return <>{children}</>;
}

function ManagerRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (!isManager()) return <Navigate to="/tasks" replace />;
  return <>{children}</>;
}

function ReminderChecker() {
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;

    const checkReminders = () => {
      const reminders = getReminders().filter(r => r.username === user.username);
      const now = new Date().getTime();

      for (const r of reminders) {
        const reminderTime = new Date(r.time).getTime();

        // Fire if within 30 seconds of reminder time
        if (now >= reminderTime && now - reminderTime < 30000) {
          if (r.type === 'upcoming') {
            toast({
              title: "⏰ Upcoming Task",
              description: `"${r.taskName}" starts in 15 minutes!`,
            });
          } else {
            toast({
              title: "📋 Task Due Now",
              description: `Time to work on: ${r.taskName}`,
            });
          }
          removeReminder(r.taskId, r.type);
        }
        // Clean up past reminders older than 2 minutes
        if (now - reminderTime > 120000) {
          removeReminder(r.taskId, r.type);
        }
      }
    };

    // Check immediately on mount
    checkReminders();

    const interval = setInterval(checkReminders, 10000);
    return () => clearInterval(interval);
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ReminderChecker />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/tasks" element={<EmployeeRoute><AddTasks /></EmployeeRoute>} />
          <Route path="/schedule" element={<EmployeeRoute><WeeklySchedule /></EmployeeRoute>} />
          <Route path="/dashboard" element={<EmployeeRoute><Dashboard /></EmployeeRoute>} />
          <Route path="/manager" element={<ManagerRoute><ManagerDashboard /></ManagerRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
