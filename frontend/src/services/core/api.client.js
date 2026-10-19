import axios from "axios";

/**
 * Configured axios instance for API communication.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
  timeout: 60000, // in milli-second or 10 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Reads the saved token safely. localStorage only stores strings, so a
 * bad write like setItem("authToken", null) comes back as the text "null",
 * which is truthy. Treat those leftovers as "no token".
 */
export function readStoredToken() {
  const token = localStorage.getItem("authToken");
  return token && token !== "null" && token !== "undefined" ? token : null;
}

/** Event name AuthContext listens for when the server rejects our token. */
export const SESSION_EXPIRED_EVENT = "auth:session-expired";

/**
 * Request interceptor to attach the JWT token to headers.
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = readStoredToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * Response interceptor to handle global errors and auth session expirations.
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const isAuthEndpoint =
      error.config?.url?.includes("/api/auth/login") ||
      error.config?.url?.includes("/api/auth/register") ||
      error.config?.url?.includes("/api/auth/me");

    if (error.response?.status === 401 && !isAuthEndpoint) {
      // This file is not a React component, so it can't call useNavigate().
      // Instead of a full page reload (window.location.href), announce the
      // expired session; AuthContext hears it, clears state and navigates.
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    return Promise.reject(error);
  },
);

export { apiClient };
