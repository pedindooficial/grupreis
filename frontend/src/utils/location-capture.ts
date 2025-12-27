/**
 * Helper functions for Location Capture functionality
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export interface CreateLocationCaptureParams {
  description?: string;
  resourceType?: "job" | "client" | "team" | "other";
  resourceId?: string;
  expiresInHours?: number;
}

export interface LocationCaptureToken {
  _id: string;
  token: string;
  url: string;
  expiresAt: Date;
}

/**
 * Create a new location capture token
 */
export async function createLocationCaptureToken(
  params: CreateLocationCaptureParams
): Promise<LocationCaptureToken> {
  const response = await fetch(`${API_URL}/location-capture/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to create location capture token");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get the full URL for a location capture page
 */
export function getLocationCaptureUrl(token: string): string {
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}/location-capture/${token}`;
  }
  return `/location-capture/${token}`;
}

/**
 * Generate a shareable link with QR code support
 */
export async function generateLocationCaptureLink(
  params: CreateLocationCaptureParams
): Promise<{ token: string; url: string; qrCodeUrl: string }> {
  const tokenData = await createLocationCaptureToken(params);
  const fullUrl = getLocationCaptureUrl(tokenData.token);
  
  // Generate QR code URL using a public API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fullUrl)}`;
  
  return {
    token: tokenData.token,
    url: fullUrl,
    qrCodeUrl,
  };
}

