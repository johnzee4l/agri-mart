/* Fetch wrapper for the Node API (blueprint 6.5).
   Base URL + Bearer token, one refresh on 401, standard { error, details } errors. */

import { markSynced } from "./useOnline.js";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

const TOKEN_KEY = "agrimart.access_token";
const REFRESH_KEY = "agrimart.refresh_token";
const EXPIRES_KEY = "agrimart.expires_at";

let onUnauthorized = null;

/** Registered by AuthProvider so a failed refresh can log the user out. */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token) {
  if (token) localStorage.setItem(REFRESH_KEY, token);
  else localStorage.removeItem(REFRESH_KEY);
}

export function getSessionExpiry() {
  return Number(localStorage.getItem(EXPIRES_KEY)) || 0;
}

export function setSessionExpiry(expiresAt) {
  if (expiresAt) localStorage.setItem(EXPIRES_KEY, String(expiresAt));
  else localStorage.removeItem(EXPIRES_KEY);
}

/** Login and refresh share the same stored session fields. */
export function storeSession(session) {
  if (!session) return;
  setToken(session.access_token ?? null);
  setRefreshToken(session.refresh_token ?? null);
  setSessionExpiry(session.expires_at ?? null);
}

export function clearSession() {
  setToken(null);
  setRefreshToken(null);
  setSessionExpiry(null);
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = "GET", body, retry = true, signal } = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (response.status === 401 && retry && onUnauthorized) {
    const refreshed = await onUnauthorized();
    if (refreshed) return request(path, { method, body, retry: false, signal });
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      payload?.error ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.details,
    );
  }

  markSynced();

  return payload;
}

/** multipart/form-data, used only by POST /uploads. Same token, refresh and error
    handling as the JSON requests, and the browser sets the boundary itself. */
async function upload(path, file, { field = "file", retry = true } = {}) {
  const form = new FormData();
  form.append(field, file);

  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });

  if (response.status === 401 && retry && onUnauthorized) {
    const refreshed = await onUnauthorized();
    if (refreshed) return upload(path, file, { field, retry: false });
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      payload?.error ?? `Upload failed with status ${response.status}`,
      response.status,
      payload?.details,
    );
  }

  markSynced();

  return payload;
}

/** CSV reports answer with a file, not JSON, so they need their own reader. */
async function download(path, { retry = true } = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });

  if (response.status === 401 && retry && onUnauthorized) {
    const refreshed = await onUnauthorized();
    if (refreshed) return download(path, { retry: false });
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(
      payload?.error ?? `Download failed with status ${response.status}`,
      response.status,
      payload?.details,
    );
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? "report.csv";

  return { blob: await response.blob(), filename };
}

export const api = {
  get: (path, { signal } = {}) => request(path, { signal }),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
  upload,
  download,
};
