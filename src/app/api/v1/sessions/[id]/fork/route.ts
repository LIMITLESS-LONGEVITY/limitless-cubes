import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/sessions/:id/fork — Fork (copy) a session to current user's library
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  if (auth.user.role === 'junior_coach') {
    return errorResponse('Junior coaches cannot fork sessions', 403)
  }

  const original = await prisma.session.findFirst({
    where: { id, deletedAt: null },
    include: {
      domains: true,
      sessionExercises: { orderBy: { position: 'asc' } },
    },
  })

  if (!original) {
    return errorResponse('Session not found', 404)
  }

  const membership = auth.user.memberships[0]

  const forked = await prisma.session.create({
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
      ...(original.sessionExercises.length > 0 && {
        sessionExercises: {
          create: original.sessionExercises.map((se) => ({
            exerciseId: se.exerciseId,
            position: se.position,
            phaseId: se.phaseId,
            restAfterSeconds: se.restAfterSeconds,
            overrideDurationSeconds: se.overrideDurationSeconds,
            sets: se.sets,
            reps: se.reps,
            notes: se.notes,
          })),
        },
      }),
    },
    include: {
      domains: { include: { domain: true } },
      difficultyLevel: true,
      creator: { select: { id: true, fullName: true, avatarUrl: true } },
      sessionExercises: {
        orderBy: { position: 'asc' },
        include: {
          exercise: {
            include: {
              media: { orderBy: { position: 'asc' }, take: 1 },
              difficultyLevel: true,
            },
          },
          phase: true,
        },
      },
      _count: { select: { programSessions: true, likes: true, forks: true } },
    },
  })

  return successResponse(forked, 201)
}
