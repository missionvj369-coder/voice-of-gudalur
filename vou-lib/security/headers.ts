/**
 * Security header configuration.
 * 
 * Applied via proxy.ts to all responses.
 */

export const SECURITY_HEADERS: Record<string, string> = {
  // Force HTTPS for 1 year, include subdomains
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  
  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  
  // Referrer policy
  "Referrer-Policy": "strict-origin-when-cross-origin",
  
  // Permissions policy — disable unnecessary features
  "Permissions-Policy": [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "payment=()",
    "usb=()",
    "magnetometer=()",
    "gyroscope=()",
    "accelerometer=()",
  ].join(", "),
  
  // Cross-origin policies
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  
  // Legacy X-Frame-Options (defense in depth with CSP)
  "X-Frame-Options": "DENY",
  
  // XSS protection (legacy browsers)
  "X-XSS-Protection": "0", // Modern browsers rely on CSP instead
};

/**
 * Content Security Policy.
 * Restrictive — no unsafe-eval, no unsafe-inline.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * CORS configuration.
 * Only these origins are allowed for API requests.
 */
export const ALLOWED_ORIGINS = [
  "https://voiceofgudalur.space",
  "https://sign.voiceofgudalur.space",
  "https://www.voiceofgudalur.space",
];

/**
 * Check if an origin is allowed.
 */
export function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get CORS headers for a given origin.
 */
export function getCorsHeaders(origin: string): Record<string, string> {
  if (isAllowedOrigin(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key, X-Request-ID, X-CSRF-Token",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    };
  }
  return {};
}
