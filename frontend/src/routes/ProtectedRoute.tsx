import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "./paths";
import type { AuthUser } from "../api/auth";

interface ProtectedRouteProps {
  /** Allowed roles. If omitted, any authenticated user passes. */
  roles?: AuthUser["role"][];
}

/**
 * Wraps protected routes with two checks:
 *  1. Must be authenticated (has a valid token + persisted user).
 *  2. Must have one of the required roles (if specified).
 *
 * Unauthenticated → redirect to /login
 * Wrong role       → redirect to the user's own home route
 */
export default function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return <Outlet />;
}

/** Default landing page for each role after login or an unauthorized redirect. */
export function roleHome(role: AuthUser["role"]): string {
  switch (role) {
    case "ADMIN":   return ROUTES.ADMIN_DASHBOARD;
    case "KITCHEN": return ROUTES.KDS;
    case "CASHIER": return ROUTES.POS_SESSION;
    default:        return ROUTES.LOGIN;
  }
}
