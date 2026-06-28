"use client"

import { decodeJwt, type JWTPayload } from 'jose'

/**
 * Client-safe JWT payload extraction.
 * Decodes the JWT payload WITHOUT signature verification.
 * Security verification happens server-side; this is only used
 * by the auth store to check expiry for auto-refresh.
 */
export async function verifyTokenClient(token: string): Promise<JWTPayload | null> {
  try {
    const payload = decodeJwt(token)
    return payload
  } catch {
    return null
  }
}