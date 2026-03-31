import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { updateExerciseSchema } from '@/lib/validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/exercises/:id — Get exercise detail
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const exercise = await prisma.exercise.findFirst({
    where: { id, deletedAt: null },
    include: {
      domains: { include: { domain: true } },
      difficultyLevel: true,
      creator: { select: { id: true, fullName: true, avatarUrl: true } },
      media: { orderBy: { position: 'asc' } },
      forkedFrom: { select: { id: true, name: true, creator: { select: { id: true, fullName: true } } } },
      _count: { select: { sessionExercises: true, likes: true, forks: true, versions: true } },
    },
  })

  if (!exercise) {
    return errorResponse('Exercise not found', 404)
  }

  return successResponse(exercise)
}

/**
 * PATCH /api/v1/exercises/:id — Update exercise
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const existing = await prisma.exercise.findFirst({
    where: { id, deletedAt: null },
  })

  if (!existing) {
    return errorResponse('Exercise not found', 404)
  }

  // Only creator or Head Coach+ can edit
  const isCreator = existing.createdBy === auth.user.id
  const isHeadCoachPlus = auth.user.role === 'head_coach'
  const isOrgAdmin = auth.user.memberships.some(
    (m) => m.organizationId === existing.organizationId && (m.isOwner || m.isAdmin)
  )

  if (!isCreator && !isHeadCoachPlus && !isOrgAdmin) {
    return errorResponse('Not authorized to edit this exercise', 403)
  }

  const body = await request.json()
  const parsed = updateExerciseSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('Validation failed', 400)
  }

  const { domainIds, ...data } = parsed.data

  const exercise = await prisma.$transaction(async (tx) => {
    // Update domains if provided
    if (domainIds !== undefined) {
      await tx.exerciseDomain.deleteMany({ where: { exerciseId: id } })
      if (domainIds.length > 0) {
        await tx.exerciseDomain.createMany({
          data: domainIds.map((domainId) => ({ exerciseId: id, domainId })),
        })
      }
    }

    return tx.exercise.update({
      where: { id },
      data,
      include: {
        domains: { include: { domain: true } },
        difficultyLevel: true,
        creator: { select: { id: true, fullName: true, avatarUrl: true } },
        media: { orderBy: { position: 'asc' } },
      },
    })
  })

  return successResponse(exercise)
}

/**
 * DELETE /api/v1/exercises/:id — Soft delete exercise
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const existing = await prisma.exercise.findFirst({
    where: { id, deletedAt: null },
    include: { _count: { select: { sessionExercises: true } } },
  })

  if (!existing) {
    return errorResponse('Exercise not found', 404)
  }

  // Only creator or Head Coach+ can delete
  const isCreator = existing.createdBy === auth.user.id
  const isHeadCoachPlus = auth.user.role === 'head_coach'
  const isOrgAdmin = auth.user.memberships.some(
    (m) => m.organizationId === existing.organizationId && (m.isOwner || m.isAdmin)
  )

  if (!isCreator && !isHeadCoachPlus && !isOrgAdmin) {
    return errorResponse('Not authorized to delete this exercise', 403)
  }

  // Deletion guard: block if used in any session
  if (existing._count.sessionExercises > 0) {
    return errorResponse(
      `Cannot delete: exercise is used in ${existing._count.sessionExercises} session(s). Archive it instead.`,
      409
    )
  }

  // Junior coaches can only delete drafts
  if (auth.user.role === 'junior_coach' && existing.status !== 'draft') {
    return errorResponse('Junior coaches can only delete draft content', 403)
  }

  await prisma.exercise.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return successResponse({ message: 'Exercise deleted' })
}
