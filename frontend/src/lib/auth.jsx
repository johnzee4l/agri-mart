import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, getToken, setToken, setUnauthorizedHandler } from "./api.js";

/* AuthContext (blueprint 6.5): login, register, logout, profile, role, token in
   localStorage, automatic logout after 30 minutes of inactivity. */

const AuthContext = createContext(null);

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "visibilitychange"];

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const idleTimer = useRef(null);

  const logout = useCallback(async () => {
    try {
      if (getToken()) await api.post("/auth/logout");
    } catch {
      // Logging out locally must succeed even when the API is unreachable.
    }
    setToken(null);
    setProfile(null);

    // Cached orders and /me are personal, so they leave with the session.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.controller?.postMessage({ type: "CLEAR_PRIVATE" });
    }
  }, []);

  const refreshSession = useCallback(async () => {
    // TODO(Member 2, Phase 1): POST /auth/refresh with the stored refresh token.
    // Returns false until the endpoint exists, so the user is logged out on 401.
    return false;
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(refreshSession);
    return () => setUnauthorizedHandler(null);
  }, [refreshSession]);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    let active = true;
    api
      .get("/me")
      .then((data) => active && setProfile(data?.data ?? data))
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) setToken(null);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!profile) return;
    const reset = () => {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(logout, IDLE_TIMEOUT_MS);
    };
    reset();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    return () => {
      window.clearTimeout(idleTimer.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [profile, logout]);

  const login = useCallback(async (email, password) => {
    const data = await api.post("/auth/login", { email, password });
    setToken(data.access_token);
    setProfile(data.profile ?? null);
    return data.profile ?? null;
  }, []);

  /* FR-15. Saves the profile and keeps the context in sync with the API. */
  const saveProfile = useCallback(async (patch) => {
    const data = await api.patch("/me", patch);
    const next = data?.data ?? data ?? {};
    setProfile((current) => ({ ...(current ?? {}), ...next }));
    return next;
  }, []);

  /* FR-14. Signup, forgot and reset never sign the user in directly. */
  const register = useCallback(
    (payload) => api.post("/auth/register", payload),
    [],
  );

  const forgotPassword = useCallback(
    (email) => api.post("/auth/forgot-password", { email }),
    [],
  );

  const resetPassword = useCallback(
    (payload) => api.post("/auth/reset-password", payload),
    [],
  );

  const value = useMemo(
    () => ({
      profile,
      role: profile?.role ?? null,
      isAuthenticated: Boolean(profile),
      loading,
      login,
      saveProfile,
      register,
      forgotPassword,
      resetPassword,
      logout,
    }),
    [profile, loading, login, saveProfile, register, forgotPassword, resetPassword, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
