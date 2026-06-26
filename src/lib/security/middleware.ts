import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Security Middleware
 * 
 * Applied to all API routes and pages.
 * Implements:
 * - Content Security Policy (CSP)
 * - HTTP Strict Transport Security (HSTS)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Referrer-Policy
 * - Permissions-Policy
 */

// ─── Security Headers ────────────────────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),

  // HTTP Strict Transport Security (1 year, include subdomains)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
  ].join(', '),

  // Cross-Origin policies
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

/**
 * Apply security headers to a response.
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value)
  }
  return response
}

/**
 * Next.js middleware entry point.
 * Applied to all routes.
 */
export function securityMiddleware(request: NextRequest) {
  const response = NextResponse.next()

  // Apply security headers
  applySecurityHeaders(response)

  // Remove sensitive headers that might leak server info
  response.headers.delete('X-Powered-By')
  response.headers.delete('Server')

  return response
}

// ─── Rate Limiting ───────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Rate limit configuration per endpoint type.
 */
const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  default: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 req/min
  auth: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 req/min for auth
  sync: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 req/min for sync
  health: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 req/min for health
}

/**
 * Apply rate limiting to a request.
 * Returns true if the request is allowed, false if rate limited.
 */
export function checkRateLimit(
  identifier: string,
  endpointType: string = 'default'
): { allowed: boolean; remaining: number; resetAt: number } {
  const limit = RATE_LIMITS[endpointType] || RATE_LIMITS.default
  const now = Date.now()
  const key = `${endpointType}:${identifier}`

  let entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    // New window
    entry = {
      count: 1,
      resetAt: now + limit.windowMs,
    }
    rateLimitStore.set(key, entry)
    return {
      allowed: true,
      remaining: limit.maxRequests - 1,
      resetAt: entry.resetAt,
    }
  }

  entry.count++

  if (entry.count > limit.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  return {
    allowed: true,
    remaining: limit.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Get rate limit headers for a response.
 */
export function getRateLimitHeaders(
  remaining: number,
  resetAt: number,
  limit: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
  }
}

/**
 * Higher-order function to apply rate limiting to an API route.
 */
export const rateLimitConfig = RATE_LIMITS

export function withRateLimit(endpointType: string = 'default') {
  return (
    handler: (req: Request, ...args: unknown[]) => Promise<Response>
  ): ((req: Request, ...args: unknown[]) => Promise<Response>) => {
    return async (req: Request, ...args: unknown[]) => {
      // Get client IP from headers
      const forwardedFor = req.headers.get('x-forwarded-for')
      const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown'
      const identifier = ip

      const limit = RATE_LIMITS[endpointType] || RATE_LIMITS.default
      const { allowed, remaining, resetAt } = checkRateLimit(identifier, endpointType)

      if (!allowed) {
        return new Response(
          JSON.stringify({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${Math.ceil((resetAt - Date.now()) / 1000)} seconds.`,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
              ...getRateLimitHeaders(remaining, resetAt, limit.maxRequests),
            },
          }
        )
      }

      const response = await handler(req, ...args)

      // Add rate limit headers to response
      const headers = getRateLimitHeaders(remaining, resetAt, limit.maxRequests)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }

      return response
    }
  }
}

// ─── Input Validation ────────────────────────────────────────────

/**
 * Validate request body against a schema.
 * Uses simple runtime validation (can be extended with Zod).
 */
export function validateBody<T>(
  body: unknown,
  requiredFields: string[]
): { valid: true; data: T } | { valid: false; error: string; missingFields: string[] } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object', missingFields: requiredFields }
  }

  const record = body as Record<string, unknown>
  const missingFields = requiredFields.filter((field) => {
    const value = record[field]
    return value === undefined || value === null || value === ''
  })

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
      missingFields,
    }
  }

  return { valid: true, data: body as T }
}

/**
 * Sanitize a string input to prevent injection attacks.
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

/**
 * Validate and sanitize an email address.
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

/**
 * Validate a UUID string.
 */
export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}