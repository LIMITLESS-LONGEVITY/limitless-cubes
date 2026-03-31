import { cookies } from 'next/headers'

export interface JWTPayload {
  id: number
  email: string
  collection: string
  sid?: string
}

const PATHS_API_URL = process.env.PATHS_API_URL || 'https://app.limitless-longevity.health/learn'

/**
 * Validate the shared payload-token cookie by calling PATHS /api/users/me.
 *
 * We delegate JWT verification to PATHS (the auth authority) rather than
 * verifying locally, because Payload CMS's internal JWT signing may differ
 * from standard jose/jsonwebtoken verification.
 *
 * The result is cached per-request via Next.js deduplication (same fetch
 * URL within a single request lifecycle is automatically deduped).
 */
export async function getAuthPayload(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) return null

  try {
    const res = await fetch(`${PATHS_API_URL}/api/users/me`, {
      headers: {
        Authorization: `JWT ${token}`,
      },
      cache: 'no-store',
    })

    if (!res.ok) return null

    const data = await res.json()
    if (!data.user) return null

    return {
      id: data.user.id,
      email: data.user.email,
      collection: data.user.collection || 'users',
      sid: data.user.sessions?.[0]?.id,
    }
  } catch {
    return null
  }
}

/**
 * Get the authenticated user or throw 401.
 */
export async function requireAuth(): Promise<JWTPayload> {
  const payload = await getAuthPayload()
  if (!payload) {
    throw new Error('Unauthorized')
  }
  return payload
}
