import { secureFetch } from "@/utils/requestHelpers";
import { safeErrorLog } from "@/utils/security";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "https://localhost:4000/api"
    : "https://gruporeis.cloud/api");

export function apiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch(
  path: string,
  options?: RequestInit & { timeout?: number }
): Promise<Response> {
  const url = apiUrl(path);
  const headers: Record<string, string> = {};
  const timeout = options?.timeout;
  
  // Copy existing headers
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, options.headers);
    }
  }
  
  // Don't set Content-Type for FormData, let browser set it with boundary
  if (!(options?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add user info from localStorage for authentication
  if (typeof window !== "undefined") {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        headers["x-user-id"] = user.id || "";
        headers["x-user-email"] = user.email || "";
      }
    } catch (err) {
      // User not available, continue without auth headers
      // This is expected in some cases (e.g., public routes)
      safeErrorLog("Failed to parse user from localStorage", err);
    }
  }
  
  // Remove timeout from options before passing to secureFetch
  const { timeout: _, ...fetchOptions } = options || {};
  
  try {
    return await secureFetch(url, {
      ...fetchOptions,
      headers
    }, timeout);
  } catch (error: any) {
    safeErrorLog("API fetch error", error);
    throw error;
  }
}
