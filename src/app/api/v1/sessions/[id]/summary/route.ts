import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/sessions/:id/summary — Lightweight session card for PATHS/HUB embeds
 *
 * No auth required for published content (service key or cookie).
 * Returns minimal data for rendering an embed card.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    const session = await prisma.session.findFirst({
      where: { id, deletedAt: null, status: 'published' },
      select: {
        id: true,
        name: true,
        description: true,
        durationSeconds: true,
        difficultyLevel: { select: { label: true } },
        creator: { select: { fullName: true } },
        domains: { include: { domain: { select: { name: true } } } },
        _count: { select: { sessionExercises: true, likes: true } },
      },
    })

    if (!session) return errorResponse('Session not found', 404)

    return successResponse({
      id: session.id,
      name: session.name,
      description: session.description,
      durationSeconds: session.durationSeconds,
      difficulty: session.difficultyLevel?.label ?? null,
      creator: session.creator.fullName,
      domains: session.domains.map((d) => d.domain.name),
      exerciseCount: session._count.sessionExercises,
      likes: session._count.likes,
    })
  } catch (err) {
    console.error('Session summary error:', err)
    return errorResponse('Internal server error', 500)
  }
}
