import { Link } from "react-router-dom";
import "./AuthPages.css";

export default function AuthErrorPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Google sign-in failed</h1>
        <p className="auth-subtitle">
          We could not complete Google authentication. Please try again.
        </p>
        <Link className="auth-link-button" to="/login">
          Back to login
        </Link>
      </div>
    </div>
  );
}
