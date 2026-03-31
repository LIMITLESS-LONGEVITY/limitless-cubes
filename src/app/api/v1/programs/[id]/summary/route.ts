import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/programs/:id/summary — Lightweight program card for HUB stay bookings
 *
 * No auth required for published content.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    const program = await prisma.program.findFirst({
      where: { id, deletedAt: null, status: 'published' },
      select: {
        id: true,
        name: true,
        description: true,
        durationSeconds: true,
        difficultyLevel: { select: { label: true } },
        creator: { select: { fullName: true } },
        domains: { include: { domain: { select: { name: true } } } },
        _count: { select: { programSessions: true, likes: true } },
      },
    })

    if (!program) return errorResponse('Program not found', 404)

    return successResponse({
      id: program.id,
      name: program.name,
      description: program.description,
      durationSeconds: program.durationSeconds,
      difficulty: program.difficultyLevel?.label ?? null,
      creator: program.creator.fullName,
      domains: program.domains.map((d) => d.domain.name),
      sessionCount: program._count.programSessions,
      likes: program._count.likes,
    })
  } catch (err) {
    console.error('Program summary error:', err)
    return errorResponse('Internal server error', 500)
  }
}
