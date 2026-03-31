import { NextResponse } from 'next/server'
import { getAuthPayload } from './auth'
import { syncUser } from './user-sync'

/**
 * Get authenticated user with Cubes+ local profile.
 * Returns NextResponse error if not authenticated.
 */
export async function getAuthenticatedUser() {
  const payload = await getAuthPayload()
  if (!payload) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const user = await syncUser(payload)
  return { user }
}

/**
 * Standard error response helper.
 */
export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Standard success response helper.
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}
