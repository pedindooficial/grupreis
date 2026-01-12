/**
 * Secure request helpers with timeout, rate limiting, and error handling
 */

const DEFAULT_TIMEOUT = 60000; // 60 seconds (increased for slower connections)
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Rate limiting: track requests per endpoint
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute per endpoint

/**
 * Checks if request should be rate limited
 */
function checkRateLimit(url: string): boolean {
  const now = Date.now();
  const key = new URL(url, window.location.origin).pathname;
  const limit = rateLimitMap.get(key);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  limit.count++;
  return true;
}

/**
 * Creates an AbortController with timeout
 */
function createTimeoutController(timeout: number): AbortController {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  // Clear timeout if controller is aborted manually
  controller.signal.addEventListener("abort", () => clearTimeout(timeoutId));
  return controller;
}

/**
 * Validates API URL to prevent SSRF attacks
 */
function validateApiUrl(url: string): boolean {
  // Allow relative URLs (they will be resolved to current origin)
  if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) {
    return true;
  }

  try {
    // Parse the URL to get its origin
    const urlObj = new URL(url);
    const urlOrigin = urlObj.origin;
    
    // Extract base URL from VITE_API_URL
    const apiUrlEnv = import.meta.env.VITE_API_URL || "";
    let apiBaseOrigin = "";
    
    if (apiUrlEnv) {
      try {
        // Remove /api suffix if present for origin comparison
        const cleanApiUrl = apiUrlEnv.replace(/\/api\/?$/, "");
        const apiUrlObj = new URL(cleanApiUrl);
        apiBaseOrigin = apiUrlObj.origin;
      } catch {
        // If VITE_API_URL is not a full URL, try to extract origin from it directly
        try {
          const apiUrlObj = new URL(apiUrlEnv);
          apiBaseOrigin = apiUrlObj.origin;
        } catch {
          // Skip if still can't parse
        }
      }
    }
    
    // Build list of allowed origins
    // Include common development and production origins
    const allowedOrigins = [
      window.location.origin,
      apiBaseOrigin,
      // Development origins
      "http://localhost:3000",
      "https://localhost:3000",
      "http://localhost:4000",
      "https://localhost:4000",
      "http://127.0.0.1:3000",
      "https://127.0.0.1:3000",
      "http://127.0.0.1:4000",
      "https://127.0.0.1:4000",
      // Production origins
      "https://gruporeis.cloud",
      "https://api.reisfundacoes.com"
    ].filter(Boolean);

    // Check if URL origin matches any allowed origin
    const isAllowed = allowedOrigins.some((origin) => urlOrigin === origin);
    
    // In development, log validation failures for debugging
    if (import.meta.env.DEV && !isAllowed) {
      console.warn("[URL Validation] Rejected URL:", {
        url,
        urlOrigin,
        allowedOrigins,
        apiBaseOrigin,
        viteApiUrl: import.meta.env.VITE_API_URL,
        currentOrigin: window.location.origin
      });
    }
    
    return isAllowed;
  } catch (error) {
    // If URL parsing fails, it might be a malformed URL
    // In development, log for debugging
    if (import.meta.env.DEV) {
      console.warn("[URL Validation] Failed to parse URL:", url, error);
    }
    // Deny malformed URLs for security
    return false;
  }
}

/**
 * Secure fetch with timeout, retry logic, and rate limiting
 */
export async function secureFetch(
  url: string,
  options: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  // Validate URL
  if (!validateApiUrl(url)) {
    throw new Error("URL inválida ou não permitida");
  }

  // Check rate limit
  if (!checkRateLimit(url)) {
    throw new Error("Muitas requisições. Tente novamente em alguns instantes.");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Create a new controller for each attempt
    const controller = createTimeoutController(timeout);
    
    // Use timeout controller signal, or merge with options.signal if available
    let signal = controller.signal;
    if (options.signal) {
      // Try to use AbortSignal.any if available (Chrome 120+)
      if (typeof AbortSignal.any === "function") {
        try {
          signal = AbortSignal.any([controller.signal, options.signal]);
        } catch {
          // Fallback if AbortSignal.any fails
          signal = controller.signal;
        }
      } else {
        // Fallback: use timeout controller signal (timeout takes precedence)
        signal = controller.signal;
      }
    }

    try {
      // Don't set Content-Type for FormData, let browser set it with boundary
      const headers: Record<string, string> = {};
      if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
      }
      
      // Merge with existing headers
      if (options.headers) {
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
      
      const fetchPromise = fetch(url, {
        ...options,
        signal,
        headers
      });

      const response = await fetchPromise;

      // Clear rate limit on success
      const key = new URL(url, window.location.origin).pathname;
      rateLimitMap.delete(key);

      return response;
    } catch (error: any) {
      lastError = error;

      // Check if it's a timeout/abort error
      const isTimeout = error.name === "AbortError" || 
                       error.name === "TimeoutError" ||
                       (error.message && error.message.includes("aborted"));

      if (isTimeout) {
        // Only throw timeout error on last attempt
        if (attempt === MAX_RETRIES - 1) {
          throw new Error("Requisição expirada. Tente novamente.");
        }
        // Continue to retry on timeout if we have attempts left
        // Wait a bit longer before retrying after timeout
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt) * 2)
        );
        continue;
      }

      // Don't retry on 4xx errors (client errors)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt))
        );
      }
    }
  }

  throw lastError || new Error("Falha na requisição após múltiplas tentativas");
}

/**
 * Secure fetch with JSON parsing
 */
export async function secureFetchJson<T = any>(
  url: string,
  options: RequestInit = {},
  timeout?: number
): Promise<T> {
  const response = await secureFetch(url, options, timeout);

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: any;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText || "Erro desconhecido" };
    }
    throw new Error(errorData.error || `Erro ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  return response.text() as any;
}

/**
 * Clears rate limit for a specific endpoint (useful for testing or manual reset)
 */
export function clearRateLimit(url?: string): void {
  if (url) {
    const key = new URL(url, window.location.origin).pathname;
    rateLimitMap.delete(key);
  } else {
    rateLimitMap.clear();
  }
}

