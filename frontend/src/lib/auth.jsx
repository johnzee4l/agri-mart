import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  api,
  API_BASE_URL,
  ApiError,
  clearSession,
  getRefreshToken,
  getSessionExpiry,
  getToken,
  setUnauthorizedHandler,
  storeSession,
} from "./api.js";
import { disconnectSocket } from "./socket.js";
import { applyMutation, clearOutbox } from "./offlineOutbox.js";

/* AuthContext (blueprint 6.5): login, register, logout, profile, role, token in
   localStorage, automatic logout after 30 minutes of inactivity. */

const AuthContext = createContext(null);

/* The last known profile, so a cold start with no connection still knows who is signed
   in and can open settings. It carries no token and is cleared on sign-out. */
const PROFILE_KEY = "agrimart.profile";

function readCachedProfile() {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cacheProfile(profile) {
  try {
    if (profile) window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    else window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Storage can be blocked; the session simply behaves as before.
  }
}

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "visibilitychange"];

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const idleTimer = useRef(null);
  const refreshing = useRef(null);

  const logout = useCallback(async () => {
    try {
      if (getToken()) await api.post("/auth/logout");
    } catch {
      // Logging out locally must succeed even when the API is unreachable.
    }
    clearSession();
    setProfile(null);
    cacheProfile(null);
    // Queued settings belong to the session that made them.
    clearOutbox();
    disconnectSocket();

    // Cached orders and /me are personal, so they leave with the session.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.controller?.postMessage({ type: "CLEAR_PRIVATE" });
    }
  }, []);

  /* One refresh at a time: several requests can receive a 401 together, and rotating
     the refresh token twice would leave the second attempt with a revoked token. */
  const refreshSession = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    if (!refreshing.current) {
      refreshing.current = (async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          const payload = await response.json().catch(() => null);
          if (!response.ok || !payload?.access_token) {
            clearSession();
            cacheProfile(null);
            setProfile(null);
            return false;
          }

          storeSession(payload);
          return true;
        } catch {
          // A network failure is not a dead session; keep the token for the next try.
          return false;
        } finally {
          refreshing.current = null;
        }
      })();
    }

    return refreshing.current;
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
      .then((data) => {
        if (!active) return;
        const next = data?.data ?? data;
        setProfile(next);
        cacheProfile(next);
      })
      .catch((error) => {
        if (!active) return;

        if (error instanceof ApiError && error.status === 401) {
          clearSession();
          cacheProfile(null);
          setProfile(null);
          return;
        }

        // No connection: stay signed in on the cached profile so settings still open.
        setProfile(readCachedProfile());
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
    storeSession(data);
    setProfile(data.profile ?? null);
    cacheProfile(data.profile ?? null);
    return data.profile ?? null;
  }, []);

  /* Keep a long-lived session ahead of expiry without waiting for a 401. Five minutes
     of headroom is enough for tabs that sleep between requests. */
  useEffect(() => {
    if (!profile) return undefined;

    const tick = () => {
      const expiresAt = getSessionExpiry();
      if (expiresAt && expiresAt * 1000 - Date.now() < 5 * 60 * 1000) refreshSession();
    };

    tick();
    const timer = window.setInterval(tick, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [profile, refreshSession]);

  /* FR-15, FR-20. Saves the profile and keeps the context in sync with the API. With
     no connection the change is queued in the outbox, applied locally so the header
     updates, and replayed when the store is reachable again. */
  const saveProfile = useCallback(async (patch) => {
    const result = await applyMutation({
      method: "PATCH",
      path: "/me",
      body: patch,
      label: "Profile details",
      key: "profile",
    });

    const next = result.queued ? { ...patch } : (result.data?.data ?? result.data ?? {});
    setProfile((current) => {
      const merged = { ...(current ?? {}), ...next };
      cacheProfile(merged);
      return merged;
    });

    return { data: next, queued: result.queued };
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
