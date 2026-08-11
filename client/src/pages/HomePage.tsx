import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AuthPages.css";

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  if (!user) {
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-card home-card">
        <div className="auth-brand">
          <span className="auth-logo">M</span>
          <h1>Welcome back</h1>
        </div>
        <div className="user-profile">
          {user.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={user.name}
              className="user-avatar"
            />
          ) : (
            <div className="user-avatar user-avatar-fallback">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="user-details">
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <p className="user-meta">Momentum user #{user.id}</p>
          </div>
        </div>
        <p className="auth-subtitle success-text">
          Authentication is working. You are signed in with a valid JWT.
        </p>
        <button type="button" className="logout-button" onClick={() => void handleLogout()}>
          Log out
        </button>
      </div>
    </div>
  );
}
