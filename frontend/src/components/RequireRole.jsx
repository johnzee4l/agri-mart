import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth.jsx";

/* Route guard: signed-in only, and role restricted when roles is given. Pass
   denyRoles for pages that stay open to guests but must not open for those roles —
   the storefront is for customers, so staff are sent to the console instead. */
export default function RequireRole({ roles, denyRoles, redirectTo = "/login", children }) {
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
    /* A denyRoles page is a public storefront page, so guests keep browsing. */
    if (denyRoles) return children;
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  const isStaff = profile.role === "admin" || profile.role === "staff";

  if (denyRoles && denyRoles.includes(profile.role)) {
    return <Navigate to="/admin" replace />;
  }

  /* Send each role to its own home. Staff cannot open the customer pages and
     customers cannot open the console, so a fixed target would loop. */
  if (roles && !roles.includes(profile.role)) {
    return <Navigate to={isStaff ? "/admin" : "/account"} replace />;
  }

  return children;
}
