import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { getOrgContext } from '@/lib/org-context'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/exercises/:id/fork — Fork an exercise (deep copy with attribution)
 *
 * Creates a new exercise owned by the current user, linked to the original
 * via forkedFromId. All fields are copied except: id, createdBy, organizationId,
 * status (set to draft), visibility (set to private), version (set to 1).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  // Senior Coach+ can create exercises (fork creates a new exercise)
  if (auth.user.role === 'junior_coach') {
    return errorResponse('Junior coaches cannot fork exercises (requires exercise creation permission)', 403)
  }

  const original = await prisma.exercise.findFirst({
    where: { id, deletedAt: null },
    include: {
      domains: true,
      media: { orderBy: { position: 'asc' } },
    },
  })

  if (!original) return errorResponse('Exercise not found', 404)

  // Must be community or marketplace visibility to fork (or same org)
  const orgContext = await getOrgContext(auth.user)
  const isSameOrg = orgContext && original.organizationId === orgContext.organizationId
  const isPublic = original.visibility === 'community' || original.visibility === 'marketplace'

  if (!isSameOrg && !isPublic) {
    return errorResponse('Cannot fork private content from another organization', 403)
  }

  const forked = await prisma.exercise.create({
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
      media: {
        create: original.media.map((m) => ({
          mediaType: m.mediaType,
          url: m.url,
          publicId: m.publicId,
          title: m.title,
          position: m.position,
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

  // Increment fork count notification to original creator
  if (original.createdBy !== auth.user.id) {
    await prisma.notification.create({
      data: {
        userId: original.createdBy,
        type: 'fork_received',
        message: `${auth.user.fullName} forked your exercise "${original.name}"`,
        exerciseId: original.id,
        actorId: auth.user.id,
      },
    })
  }

  return successResponse(forked, 201)
}
