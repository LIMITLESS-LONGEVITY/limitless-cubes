import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

/**
 * GET /api/v1/search?q=<query>&limit=5
 *
 * Federated search across exercises, sessions, and programs.
 * Used by OS Dashboard unified search.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const q = request.nextUrl.searchParams.get('q')
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 5), 20)

  if (!q || q.length < 2) {
    return errorResponse('Search query must be at least 2 characters', 400)
  }

  const searchFilter = {
    OR: [
      { name: { contains: q, mode: 'insensitive' as const } },
      { description: { contains: q, mode: 'insensitive' as const } },
    ],
    deletedAt: null,
    status: 'published' as const,
  }

  const [exercises, sessions, programs] = await Promise.all([
    prisma.exercise.findMany({
      where: searchFilter,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        durationSeconds: true,
        creator: { select: { fullName: true } },
      },
    }),
    prisma.session.findMany({
      where: searchFilter,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        durationSeconds: true,
        creator: { select: { fullName: true } },
        _count: { select: { sessionExercises: true } },
      },
    }),
    prisma.program.findMany({
      where: searchFilter,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        durationSeconds: true,
        creator: { select: { fullName: true } },
        _count: { select: { programSessions: true } },
      },
    }),
  ])

  return successResponse({
    exercises: exercises.map((e) => ({ ...e, type: 'exercise' })),
    sessions: sessions.map((s) => ({ ...s, type: 'session' })),
    programs: programs.map((p) => ({ ...p, type: 'program' })),
    total: exercises.length + sessions.length + programs.length,
  })
}
