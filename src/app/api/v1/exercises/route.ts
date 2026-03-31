import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { createExerciseSchema, listQuerySchema } from '@/lib/validation'
import { checkContentLimit, formatLimitError } from '@/lib/plan-limits'
import { Prisma } from '@prisma/client'

/**
 * GET /api/v1/exercises — List exercises with search, filter, pagination
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const params = Object.fromEntries(request.nextUrl.searchParams)
  const query = listQuerySchema.safeParse(params)
  if (!query.success) {
    return errorResponse('Invalid query parameters', 400)
  }

  const {
    search,
    status,
    visibility,
    domainId,
    difficultyLevelId,
    organizationId,
    createdBy,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = query.data

  const where: Prisma.ExerciseWhereInput = {
    deletedAt: null,
    ...(status && { status }),
    ...(visibility && { visibility }),
    ...(difficultyLevelId && { difficultyLevelId }),
    ...(organizationId && { organizationId }),
    ...(createdBy && { createdBy }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(domainId && {
      domains: { some: { domainId } },
    }),
  }

  const [exercises, total] = await Promise.all([
    prisma.exercise.findMany({
      where,
      include: {
        domains: { include: { domain: true } },
        difficultyLevel: true,
        creator: { select: { id: true, fullName: true, avatarUrl: true } },
        media: { orderBy: { position: 'asc' } },
        _count: { select: { sessionExercises: true, likes: true, forks: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.exercise.count({ where }),
  ])

  return successResponse({
    data: exercises,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

/**
 * POST /api/v1/exercises — Create a new exercise
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  // Senior Coach+ can create exercises
  if (auth.user.role === 'junior_coach') {
    return errorResponse('Junior coaches cannot create exercises', 403)
  }

  const body = await request.json()
  const parsed = createExerciseSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('Validation failed', 400)
  }

  const { domainIds, ...data } = parsed.data

  // Get user's active org (use first active membership for now)
  const membership = auth.user.memberships[0]

  // Check plan limits
  const limitCheck = await checkContentLimit(auth.user.id, membership?.organizationId ?? null, 'exercise')
  if (!limitCheck.allowed) {
    return errorResponse(formatLimitError(limitCheck, 'exercise'), 403)
  }

  const exercise = await prisma.exercise.create({
    data: {
      ...data,
      createdBy: auth.user.id,
      organizationId: membership?.organizationId ?? null,
      ...(domainIds && domainIds.length > 0 && {
        domains: {
          create: domainIds.map((domainId) => ({ domainId })),
        },
      }),
    },
    include: {
      domains: { include: { domain: true } },
      difficultyLevel: true,
      creator: { select: { id: true, fullName: true, avatarUrl: true } },
      media: true,
    },
  })

  return successResponse(exercise, 201)
}
