import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import AuthErrorPage from "./pages/AuthErrorPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/error" element={<AuthErrorPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<HomePage />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
