import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { updateSessionSchema } from '@/lib/validation'
import { checkContentAccess } from '@/lib/purchase-gate'

interface RouteParams {
  params: Promise<{ id: string }>
}

const sessionDetailInclude = {
  domains: { include: { domain: true } },
  difficultyLevel: true,
  creator: { select: { id: true, fullName: true, avatarUrl: true } },
  sessionExercises: {
    orderBy: { position: 'asc' as const },
    include: {
      exercise: {
        include: {
          media: { orderBy: { position: 'asc' as const } },
          difficultyLevel: true,
          domains: { include: { domain: true } },
        },
      },
      phase: true,
    },
  },
  forkedFrom: {
    select: { id: true, name: true, creator: { select: { id: true, fullName: true } } },
  },
  _count: { select: { programSessions: true, likes: true, forks: true, sessionVersions: true } },
}

/**
 * GET /api/v1/sessions/:id — Get session detail with full exercise composition
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const session = await prisma.session.findFirst({
    where: { id, deletedAt: null },
    include: sessionDetailInclude,
  })

  if (!session) {
    return errorResponse('Session not found', 404)
  }

  // Purchase gate: marketplace content returns preview for non-purchasers
  const userOrgIds = auth.user.memberships.map((m) => m.organizationId)
  const access = await checkContentAccess(auth.user.id, 'session', id, session.visibility, session.createdBy, userOrgIds)

  if (access === 'denied') return errorResponse('Access denied', 403)
  if (access === 'preview') {
    return successResponse({
      id: session.id,
      name: session.name,
      description: session.description,
      durationSeconds: session.durationSeconds,
      visibility: session.visibility,
      marketplacePrice: session.marketplacePrice,
      downloadCount: session.downloadCount,
      creator: session.creator,
      difficultyLevel: session.difficultyLevel,
      domains: session.domains,
      _count: session._count,
      _preview: true,
    })
  }

  return successResponse(session)
}

/**
 * PATCH /api/v1/sessions/:id — Update session metadata and/or exercise composition
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const existing = await prisma.session.findFirst({
    where: { id, deletedAt: null },
  })

  if (!existing) {
    return errorResponse('Session not found', 404)
  }

  const isCreator = existing.createdBy === auth.user.id
  const isHeadCoachPlus = auth.user.role === 'head_coach'
  const isOrgAdmin = auth.user.memberships.some(
    (m) => m.organizationId === existing.organizationId && (m.isOwner || m.isAdmin)
  )

  if (!isCreator && !isHeadCoachPlus && !isOrgAdmin) {
    return errorResponse('Not authorized to edit this session', 403)
  }

  const body = await request.json()
  const parsed = updateSessionSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('Validation failed', 400)
  }

  const { domainIds, exercises, ...data } = parsed.data
  const updateData: Record<string, unknown> = { ...data }

  const session = await prisma.$transaction(async (tx) => {
    // Update domains if provided
    if (domainIds !== undefined) {
      await tx.sessionDomain.deleteMany({ where: { sessionId: id } })
      if (domainIds.length > 0) {
        await tx.sessionDomain.createMany({
          data: domainIds.map((domainId) => ({ sessionId: id, domainId })),
        })
      }
    }

    // Update exercise composition if provided — delete all and recreate
    if (exercises !== undefined) {
      await tx.sessionExercise.deleteMany({ where: { sessionId: id } })

      if (exercises.length > 0) {
        await tx.sessionExercise.createMany({
          data: exercises.map((e) => ({
            sessionId: id,
            exerciseId: e.exerciseId,
            position: e.position,
            phaseId: e.phaseId ?? null,
            restAfterSeconds: e.restAfterSeconds ?? null,
            overrideDurationSeconds: e.overrideDurationSeconds ?? null,
            sets: e.sets ?? null,
            reps: e.reps ?? null,
            notes: e.notes ?? null,
          })),
        })

        // Recalculate duration
        const exerciseIds = [...new Set(exercises.map((e) => e.exerciseId))]
        const exerciseRecords = await tx.exercise.findMany({
          where: { id: { in: exerciseIds } },
          select: { id: true, durationSeconds: true },
        })
        const durationMap = new Map(exerciseRecords.map((e) => [e.id, e.durationSeconds]))

        const durationSeconds = exercises.reduce((total, se) => {
          const baseDuration = se.overrideDurationSeconds ?? durationMap.get(se.exerciseId) ?? 0
          const sets = se.sets ?? 1
          const rest = se.restAfterSeconds ?? 0
          return total + baseDuration * sets + rest
        }, 0)

        updateData.durationSeconds = durationSeconds
      } else {
        updateData.durationSeconds = 0
      }
    }

    return tx.session.update({
      where: { id },
      data: updateData,
      include: sessionDetailInclude,
    })
  })

  return successResponse(session)
}

/**
 * DELETE /api/v1/sessions/:id — Soft delete session
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const existing = await prisma.session.findFirst({
    where: { id, deletedAt: null },
    include: { _count: { select: { programSessions: true } } },
  })

  if (!existing) {
    return errorResponse('Session not found', 404)
  }

  const isCreator = existing.createdBy === auth.user.id
  const isHeadCoachPlus = auth.user.role === 'head_coach'
  const isOrgAdmin = auth.user.memberships.some(
    (m) => m.organizationId === existing.organizationId && (m.isOwner || m.isAdmin)
  )

  if (!isCreator && !isHeadCoachPlus && !isOrgAdmin) {
    return errorResponse('Not authorized to delete this session', 403)
  }

  // Deletion guard: block if used in any program
  if (existing._count.programSessions > 0) {
    return errorResponse(
      `Cannot delete: session is used in ${existing._count.programSessions} program(s). Archive it instead.`,
      409
    )
  }

  if (auth.user.role === 'junior_coach' && existing.status !== 'draft') {
    return errorResponse('Junior coaches can only delete draft content', 403)
  }

  await prisma.session.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return successResponse({ message: 'Session deleted' })
}
