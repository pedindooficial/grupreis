import { getSession } from "next-auth/react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "https://localhost:4000/api"
    : "https://your-backend-placeholder-url.com/api");

export function apiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const url = apiUrl(path);
  const headers: HeadersInit = {
    ...(options?.headers || {})
  };
  
  // Don't set Content-Type for FormData, let browser set it with boundary
  if (!(options?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add user info from session for authentication
  // Note: getSession() only works in client components
  // For server components, use getServerSession() instead
  if (typeof window !== "undefined") {
    try {
      const session = await getSession();
      if (session?.user) {
        const user = session.user as any;
        headers["x-user-id"] = user.id || "";
        headers["x-user-email"] = user.email || "";
      }
    } catch (err) {
      // Session not available, continue without auth headers
      // This is expected in some cases (e.g., public routes)
    }
  }
  
  return fetch(url, {
    ...options,
    headers
  });
}
