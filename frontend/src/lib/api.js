/* Fetch wrapper for the Node API (blueprint 6.5).
   Base URL + Bearer token, one refresh on 401, standard { error, details } errors. */

import { markSynced } from "./useOnline.js";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

const TOKEN_KEY = "agrimart.access_token";

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

export const api = {
  get: (path, { signal } = {}) => request(path, { signal }),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
  upload,
};
