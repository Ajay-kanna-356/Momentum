import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AuthPages.css";

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setError("No authentication token was returned.");
      return;
    }

    void completeLogin(token)
      .then(() => {
        navigate("/home", { replace: true });
      })
      .catch(() => {
        setError("Could not verify your session. Please try signing in again.");
      });
  }, [searchParams, completeLogin, navigate]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Sign-in failed</h1>
          <p className="auth-subtitle">{error}</p>
          <Link className="auth-link-button" to="/login">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-subtitle">Completing sign-in...</p>
      </div>
    </div>
  );
}
