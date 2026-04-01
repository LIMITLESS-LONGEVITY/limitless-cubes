import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { createProgramSchema } from '@/lib/validation'
import { checkContentAccess } from '@/lib/purchase-gate'

interface RouteParams {
  params: Promise<{ id: string }>
}

const programDetailInclude = {
  domains: { include: { domain: true } },
  difficultyLevel: true,
  creator: { select: { id: true, fullName: true, avatarUrl: true } },
  programSessions: {
    orderBy: { position: 'asc' as const },
    include: {
      session: {
        include: {
          sessionExercises: {
            orderBy: { position: 'asc' as const },
            include: {
              exercise: { select: { id: true, name: true, durationSeconds: true } },
              phase: true,
            },
          },
          difficultyLevel: true,
        },
      },
    },
  },
  forkedFrom: {
    select: { id: true, name: true, creator: { select: { id: true, fullName: true } } },
  },
  _count: { select: { likes: true, forks: true, programVersions: true } },
}

/**
 * GET /api/v1/programs/:id
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const program = await prisma.program.findFirst({
    where: { id, deletedAt: null },
    include: programDetailInclude,
  })

  if (!program) return errorResponse('Program not found', 404)

  // Purchase gate: marketplace content returns preview for non-purchasers
  const userOrgIds = auth.user.memberships.map((m) => m.organizationId)
  const access = await checkContentAccess(auth.user.id, 'program', id, program.visibility, program.createdBy, userOrgIds)

  if (access === 'denied') return errorResponse('Access denied', 403)
  if (access === 'preview') {
    return successResponse({
      id: program.id,
      name: program.name,
      description: program.description,
      durationSeconds: program.durationSeconds,
      visibility: program.visibility,
      marketplacePrice: program.marketplacePrice,
      downloadCount: program.downloadCount,
      creator: program.creator,
      difficultyLevel: program.difficultyLevel,
      domains: program.domains,
      _count: program._count,
      _preview: true,
    })
  }

  return successResponse(program)
}

/**
 * PATCH /api/v1/programs/:id
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const existing = await prisma.program.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return errorResponse('Program not found', 404)

  const isCreator = existing.createdBy === auth.user.id
  const isHeadCoachPlus = auth.user.role === 'head_coach'
  const isOrgAdmin = auth.user.memberships.some(
    (m) => m.organizationId === existing.organizationId && (m.isOwner || m.isAdmin)
  )
  if (!isCreator && !isHeadCoachPlus && !isOrgAdmin) {
    return errorResponse('Not authorized to edit this program', 403)
  }

  const body = await request.json()
  const parsed = createProgramSchema.partial().safeParse(body)
  if (!parsed.success) return errorResponse('Validation failed', 400)

  const { domainIds, sessions, ...data } = parsed.data
  const updateData: Record<string, unknown> = { ...data }

  const program = await prisma.$transaction(async (tx) => {
    if (domainIds !== undefined) {
      await tx.programDomain.deleteMany({ where: { programId: id } })
      if (domainIds.length > 0) {
        await tx.programDomain.createMany({
          data: domainIds.map((domainId) => ({ programId: id, domainId })),
        })
      }
    }

    if (sessions !== undefined) {
      await tx.programSession.deleteMany({ where: { programId: id } })
      if (sessions.length > 0) {
        await tx.programSession.createMany({
          data: sessions.map((s) => ({
            programId: id,
            sessionId: s.sessionId,
            position: s.position,
            dayLabel: s.dayLabel ?? null,
            notes: s.notes ?? null,
          })),
        })

        const sessionIds = [...new Set(sessions.map((s) => s.sessionId))]
        const sessionRecords = await tx.session.findMany({
          where: { id: { in: sessionIds } },
          select: { id: true, durationSeconds: true },
        })
        const durationMap = new Map(sessionRecords.map((s) => [s.id, s.durationSeconds]))
        updateData.durationSeconds = sessions.reduce(
          (total, ps) => total + (durationMap.get(ps.sessionId) ?? 0), 0
        )
      } else {
        updateData.durationSeconds = 0
      }
    }

    return tx.program.update({
      where: { id },
      data: updateData,
      include: programDetailInclude,
    })
  })

  return successResponse(program)
}

/**
 * DELETE /api/v1/programs/:id — Soft delete (programs are top-level, no guard needed)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const existing = await prisma.program.findFirst({ where: { id, deletedAt: null } })
  if (!existing) return errorResponse('Program not found', 404)

  const isCreator = existing.createdBy === auth.user.id
  const isHeadCoachPlus = auth.user.role === 'head_coach'
  const isOrgAdmin = auth.user.memberships.some(
    (m) => m.organizationId === existing.organizationId && (m.isOwner || m.isAdmin)
  )
  if (!isCreator && !isHeadCoachPlus && !isOrgAdmin) {
    return errorResponse('Not authorized to delete this program', 403)
  }

  if (auth.user.role === 'junior_coach' && existing.status !== 'draft') {
    return errorResponse('Junior coaches can only delete draft content', 403)
  }

  await prisma.program.update({ where: { id }, data: { deletedAt: new Date() } })
  return successResponse({ message: 'Program deleted' })
}
