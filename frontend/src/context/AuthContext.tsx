import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { logoutRequest, type AuthUser } from "../api/auth";
import { ROUTES } from "../routes/paths";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
}

interface AuthContextValue extends AuthState {
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadInitialState(): AuthState {
  return {
    user: null,
    accessToken: localStorage.getItem("accessToken"),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadInitialState);
  const navigate = useNavigate();

  const setAuth = useCallback((user: AuthUser, accessToken: string, refreshToken: string) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    setState({ user, accessToken });
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try { await logoutRequest(refreshToken); } catch { /* ignore */ }
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setState({ user: null, accessToken: null });
    navigate(ROUTES.LOGIN);
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        setAuth,
        logout,
        isAuthenticated: !!state.accessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
