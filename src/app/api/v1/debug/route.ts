import { cookies, headers } from 'next/headers'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

/**
 * GET /api/v1/debug — Debug auth flow (TEMPORARY — remove before production)
 */
export async function GET() {
  const cookieStore = await cookies()
  const headerStore = await headers()

  const token = cookieStore.get('payload-token')?.value
  const secret = process.env.PAYLOAD_SECRET
  const cookieHeader = headerStore.get('cookie')

  let decoded = null
  let verifyError = null

  if (token && secret) {
    try {
      decoded = jwt.verify(token, secret)
    } catch (err) {
      verifyError = err instanceof Error ? err.message : String(err)
    }
  }

  return NextResponse.json({
    hasCookieHeader: !!cookieHeader,
    cookieHeaderLength: cookieHeader?.length ?? 0,
    hasPayloadToken: !!token,
    tokenLength: token?.length ?? 0,
    tokenFirst20: token?.slice(0, 20) ?? null,
    hasSecret: !!secret,
    secretLength: secret?.length ?? 0,
    secretFirst10: secret?.slice(0, 10) ?? null,
    secretLast10: secret?.slice(-10) ?? null,
    decoded: decoded ? { id: (decoded as Record<string, unknown>).id, email: (decoded as Record<string, unknown>).email } : null,
    verifyError,
  })
}
