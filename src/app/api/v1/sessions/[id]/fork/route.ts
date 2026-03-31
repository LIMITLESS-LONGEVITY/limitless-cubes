import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { getOrgContext } from '@/lib/org-context'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/sessions/:id/fork — Fork a session (deep copy with attribution)
 *
 * Creates a new session owned by the current user. Copies all sessionExercise
 * composition (positions, phases, rest, overrides). Links via forkedFromId.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const original = await prisma.session.findFirst({
    where: { id, deletedAt: null },
    include: {
      domains: true,
      sessionExercises: { orderBy: { position: 'asc' } },
    },
  })

  if (!original) return errorResponse('Session not found', 404)

  const orgContext = await getOrgContext(auth.user)
  const isSameOrg = orgContext && original.organizationId === orgContext.organizationId
  const isPublic = original.visibility === 'community' || original.visibility === 'marketplace'

  if (!isSameOrg && !isPublic) {
    return errorResponse('Cannot fork private content from another organization', 403)
  }

  const forked = await prisma.session.create({
    data: {
      name: `${original.name} (fork)`,
      description: original.description,
      durationSeconds: original.durationSeconds,
      difficultyLevelId: original.difficultyLevelId,
      creatorNotes: null,
      status: 'draft',
      visibility: 'private',
      version: 1,
      forkedFromId: original.id,
      allDomains: original.allDomains,
      organizationId: orgContext?.organizationId ?? null,
      createdBy: auth.user.id,
      domains: {
        create: original.domains.map((d) => ({ domainId: d.domainId })),
      },
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
    },
    include: {
      domains: { include: { domain: true } },
      difficultyLevel: true,
      creator: { select: { id: true, fullName: true, avatarUrl: true } },
      forkedFrom: { select: { id: true, name: true, creator: { select: { fullName: true } } } },
    },
  })

  if (original.createdBy !== auth.user.id) {
    await prisma.notification.create({
      data: {
        userId: original.createdBy,
        type: 'fork_received',
        message: `${auth.user.fullName} forked your session "${original.name}"`,
        sessionId: original.id,
        actorId: auth.user.id,
      },
    })
  }

  return successResponse(forked, 201)
}
