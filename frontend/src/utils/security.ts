/**
 * Security utilities for token management, safe logging, and security checks
 */

const TOKEN_KEY = "client_token";
const TOKEN_EXPIRY_KEY = "client_token_expiry";

/**
 * Safe logging - only logs in development
 */
export function safeLog(...args: any[]): void {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
}

/**
 * Safe error logging - logs errors in all environments but sanitizes sensitive data
 */
export function safeErrorLog(message: string, error?: any): void {
  const sanitizedError = error
    ? {
        message: error.message,
        name: error.name,
        stack: import.meta.env.DEV ? error.stack : undefined
      }
    : undefined;

  if (import.meta.env.DEV) {
    console.error(message, sanitizedError || error);
  } else {
    // In production, you might want to send to an error tracking service
    console.error(message);
  }
}

/**
 * Stores client token securely
 * Note: In production, consider using httpOnly cookies instead
 */
export function storeClientToken(token: string, expiresIn?: number): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    if (expiresIn) {
      const expiryTime = Date.now() + expiresIn * 1000;
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    }
  } catch (error) {
    safeErrorLog("Failed to store token", error);
  }
}

/**
 * Retrieves client token
 */
export function getClientToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    safeErrorLog("Failed to retrieve token", error);
    return null;
  }
}

/**
 * Removes client token
 */
export function removeClientToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch (error) {
    safeErrorLog("Failed to remove token", error);
  }
}

/**
 * Checks if token is expired
 */
export function isTokenExpired(): boolean {
  try {
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryTime) return false; // No expiry info, assume valid

    const expiry = parseInt(expiryTime, 10);
    return Date.now() >= expiry;
  } catch (error) {
    safeErrorLog("Failed to check token expiry", error);
    return true; // Assume expired on error
  }
}

/**
 * Validates token format (basic JWT structure check)
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  // JWT format: header.payload.signature (3 parts separated by dots)
  const parts = token.split(".");
  return parts.length === 3;
}

/**
 * Decodes JWT payload (without verification - for client-side checks only)
 */
export function decodeTokenPayload(token: string): any | null {
  try {
    if (!isValidTokenFormat(token)) return null;

    const parts = token.split(".");
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch (error) {
    safeErrorLog("Failed to decode token", error);
    return null;
  }
}

/**
 * Gets token expiration from JWT payload
 */
export function getTokenExpiration(token: string): number | null {
  const payload = decodeTokenPayload(token);
  if (!payload || !payload.exp) return null;
  return payload.exp * 1000; // Convert to milliseconds
}

/**
 * Checks if token is valid (format and expiration)
 */
export function isTokenValid(token?: string): boolean {
  const tokenToCheck = token || getClientToken();
  if (!tokenToCheck) return false;

  if (!isValidTokenFormat(tokenToCheck)) return false;

  // Check expiration from JWT payload
  const expiration = getTokenExpiration(tokenToCheck);
  if (expiration && Date.now() >= expiration) {
    removeClientToken(); // Clean up expired token
    return false;
  }

  // Also check localStorage expiry if available
  if (isTokenExpired()) {
    removeClientToken();
    return false;
  }

  return true;
}

/**
 * Sanitizes data before logging (removes sensitive fields)
 */
export function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== "object") return data;

  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "apiKey",
    "authorization",
    "creditCard",
    "cvv",
    "ssn"
  ];

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some((field) => lowerKey.includes(field))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Validates origin for postMessage (prevents XSS)
 */
export function isValidOrigin(origin: string): boolean {
  const allowedOrigins = [
    window.location.origin,
    import.meta.env.VITE_API_URL || "",
    "https://www.reisfundacoes.com",
    "http://localhost:5173"
  ].filter(Boolean);

  return allowedOrigins.includes(origin);
}

/**
 * Escapes HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

