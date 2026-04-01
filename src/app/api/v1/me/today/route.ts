import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-utils'

export async function GET() {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  // Stub response — will be replaced by Track A (wearable loop) implementation
  return NextResponse.json({
    greeting: `Good morning`,
    scheduledWorkout: null,
    readiness: null,
    alternatives: [],
  })
}
