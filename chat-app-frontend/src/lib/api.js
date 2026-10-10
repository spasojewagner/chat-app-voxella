import axios from "axios";

// Same origin by default: Vite proxies /api in development and the API serves the app in production.
// Set VITE_API_URL only when the API lives on another domain (and add that domain to CORS_ORIGIN).
export const API_URL = import.meta.env.VITE_API_URL ?? "";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  timeout: 20_000,
});

let onUnauthorized = () => {};
/** Lets the auth store react to an expired session without a circular import. */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    const isAuthCall = url.startsWith("/auth/");
    if (error.response?.status === 401 && !isAuthCall) onUnauthorized();
    return Promise.reject(error);
  },
);

/** A message fit to show the user for any failed request. */
export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === "ECONNABORTED") return "The server took too long to answer.";
  if (error?.request && !error.response) return "Can't reach the server. Check your connection.";
  return fallback;
}

/** Field errors from a 422 response, keyed by field name. */
export function fieldErrors(error) {
  const issues = error?.response?.data?.issues ?? [];
  return Object.fromEntries(issues.map((i) => [i.path.split(".").at(-1), i.message]));
}

/** Uploaded files live on the API; local ones come back as /uploads/... paths. */
export function mediaUrl(path) {
  if (!path) return "";
  return path.startsWith("/uploads/") ? `${API_URL}${path}` : path;
}
