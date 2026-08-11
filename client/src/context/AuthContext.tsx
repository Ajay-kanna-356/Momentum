import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearStoredToken,
  fetchCurrentUser,
  getStoredToken,
  logout as logoutRequest,
  setStoredToken,
} from "../services/auth.service";
import type { User } from "../types/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  completeLogin: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getStoredToken();

    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch {
      clearStoredToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const completeLogin = useCallback(async (token: string) => {
    setStoredToken(token);
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearStoredToken();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      completeLogin,
      logout,
    }),
    [user, isLoading, completeLogin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
