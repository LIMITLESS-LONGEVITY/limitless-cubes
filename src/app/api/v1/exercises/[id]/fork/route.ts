import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/exercises/:id/fork — Fork (copy) an exercise to current user's library
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  // Junior coaches cannot create content
  if (auth.user.role === 'junior_coach') {
    return errorResponse('Junior coaches cannot fork exercises', 403)
  }

  const original = await prisma.exercise.findFirst({
    where: { id, deletedAt: null },
    include: {
      domains: true,
      media: { orderBy: { position: 'asc' } },
    },
  })

  if (!original) {
    return errorResponse('Exercise not found', 404)
  }

  const membership = auth.user.memberships[0]

  const forked = await prisma.exercise.create({
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
      ...(original.media.length > 0 && {
        media: {
          create: original.media.map((m) => ({
            mediaType: m.mediaType,
            url: m.url,
            publicId: m.publicId,
            title: m.title,
            position: m.position,
          })),
        },
      }),
    },
    include: {
      domains: { include: { domain: true } },
      difficultyLevel: true,
      creator: { select: { id: true, fullName: true, avatarUrl: true } },
      media: { orderBy: { position: 'asc' } },
    },
  })

  return successResponse(forked, 201)
}
