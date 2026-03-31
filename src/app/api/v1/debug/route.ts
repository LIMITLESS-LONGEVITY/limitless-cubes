import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const PATHS_API_URL = process.env.PATHS_API_URL || 'https://paths-api.onrender.com/learn'

/**
 * GET /api/v1/debug — Debug auth flow (TEMPORARY)
 */
export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  const result: Record<string, unknown> = {
    hasToken: !!token,
    tokenLength: token?.length ?? 0,
    pathsApiUrl: PATHS_API_URL,
  }

  if (token) {
    try {
      const url = `${PATHS_API_URL}/api/users/me`
      result.fetchUrl = url

      const res = await fetch(url, {
        headers: { Authorization: `JWT ${token}` },
        cache: 'no-store',
      })

      result.fetchStatus = res.status
      result.fetchOk = res.ok

      if (res.ok) {
        const data = await res.json()
        result.user = { id: data.user?.id, email: data.user?.email }
      } else {
        result.fetchBody = await res.text().catch(() => 'could not read body')
      }
    } catch (err) {
      result.fetchError = err instanceof Error ? err.message : String(err)
      result.fetchErrorStack = err instanceof Error ? err.stack?.split('\n').slice(0, 3) : null
    }
  }

  return NextResponse.json(result)
}
