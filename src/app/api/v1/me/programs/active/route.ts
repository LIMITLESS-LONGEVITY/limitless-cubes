import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-utils'

export async function GET() {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  // Stub response — returns actual active program assignments when Track A is built
  return NextResponse.json([])
}
