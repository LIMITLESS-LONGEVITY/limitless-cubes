import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/programs/:id/fork — Fork (copy) a program to current user's library
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  if (auth.user.role === 'junior_coach') {
    return errorResponse('Junior coaches cannot fork programs', 403)
  }

  const original = await prisma.program.findFirst({
    where: { id, deletedAt: null },
    include: {
      domains: true,
      programSessions: { orderBy: { position: 'asc' } },
    },
  })

  if (!original) {
    return errorResponse('Program not found', 404)
  }

  const membership = auth.user.memberships[0]

  const forked = await prisma.program.create({
    data: {
      name: `${original.name} (Fork)`,
      description: original.description,
      durationSeconds: original.durationSeconds,
      difficultyLevelId: original.difficultyLevelId,
      creatorNotes: null,
      status: 'draft',
      visibility: 'private',
      allDomains: original.allDomains,
      forkedFromId: original.id,
      createdBy: auth.user.id,
      organizationId: membership?.organizationId ?? null,
      ...(original.domains.length > 0 && {
        domains: {
          create: original.domains.map((d) => ({ domainId: d.domainId })),
        },
      }),
      ...(original.programSessions.length > 0 && {
        programSessions: {
          create: original.programSessions.map((ps) => ({
            sessionId: ps.sessionId,
            position: ps.position,
            dayLabel: ps.dayLabel,
            notes: ps.notes,
          })),
        },
      }),
    },
    include: {
      domains: { include: { domain: true } },
      difficultyLevel: true,
      creator: { select: { id: true, fullName: true, avatarUrl: true } },
      programSessions: {
        orderBy: { position: 'asc' },
        include: {
          session: {
            select: {
              id: true,
              name: true,
              durationSeconds: true,
              status: true,
              _count: { select: { sessionExercises: true } },
            },
          },
        },
      },
      _count: { select: { likes: true, forks: true } },
    },
  })

  return successResponse(forked, 201)
}
