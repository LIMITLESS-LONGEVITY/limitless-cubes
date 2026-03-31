import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export interface JWTPayload {
  id: number
  email: string
  collection: string
  sid?: string
  iat: number
  exp: number
}

/**
 * Validate the shared payload-token cookie from LIMITLESS SSO.
 * Uses jose library (same as Payload CMS) for JWT verification.
 * Returns the decoded JWT payload or null if invalid/missing.
 */
export async function getAuthPayload(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) return null

  try {
    const secret = process.env.PAYLOAD_SECRET
    if (!secret) throw new Error('PAYLOAD_SECRET not configured')

    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, secretKey)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

/**
 * Get the authenticated user or throw 401.
 * Use in API route handlers.
 */
export async function requireAuth(): Promise<JWTPayload> {
  const payload = await getAuthPayload()
  if (!payload) {
    throw new Error('Unauthorized')
  }
  return payload
}
