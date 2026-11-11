import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth.jsx";

/* Route guard: signed-in only, and role restricted when roles is given. */
export default function RequireRole({ roles, redirectTo = "/login", children }) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <p className="mx-auto max-w-[var(--container-content)] px-4 py-16 text-body-sm text-fg-muted">
        Checking session…
      </p>
    );
  }

  if (!profile) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
