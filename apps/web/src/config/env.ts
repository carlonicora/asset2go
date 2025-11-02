/**
 * Runtime environment configuration
 * All values are embedded at build time from .env
 *
 * For Docker deployments:
 * - Client-side (browser): Uses NEXT_PUBLIC_API_URL (e.g., http://asset2go.test:3500)
 * - Server-side (SSR): Uses API_INTERNAL_URL (e.g., http://api:3500) to communicate within Docker network
 */

export const ENV = {
  // Use internal Docker API URL for SSR, fall back to public URL for non-Docker or client-side
  API_URL:
    (typeof window === "undefined" ? process.env.API_INTERNAL_URL : undefined) || process.env.NEXT_PUBLIC_API_URL!,
  APP_URL: process.env.NEXT_PUBLIC_ADDRESS!,
  VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
} as const;

// Validate required env vars
if (!ENV.API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is required but not set");
}

if (!ENV.APP_URL) {
  throw new Error("NEXT_PUBLIC_ADDRESS is required but not set");
}
