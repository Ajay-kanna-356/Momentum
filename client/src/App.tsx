import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import AuthErrorPage from "./pages/AuthErrorPage";
import LoginPage from "./pages/LoginPage";
import { Layout } from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import GoalsPage from "./pages/GoalsPage";
import HabitsPage from "./pages/HabitsPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import JournalPage from "./pages/JournalPage";
import SchedulePage from "./pages/SchedulePage";
import AnalyticsPage from "./pages/AnalyticsPage";

import WeeklyReviewPage from "./pages/WeeklyReviewPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/error" element={<AuthErrorPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* Future routes will go here */}
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/activities" element={<ActivitiesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/insights" element={<WeeklyReviewPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/settings" element={<div className="p-4">Settings (WIP)</div>} />
          </Route>
        </Route>
        
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
