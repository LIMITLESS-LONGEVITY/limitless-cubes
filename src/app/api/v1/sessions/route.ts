import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { createSessionSchema, listQuerySchema } from '@/lib/validation'
import { Prisma } from '@prisma/client'

const sessionInclude = {
  domains: { include: { domain: true } },
  difficultyLevel: true,
  creator: { select: { id: true, fullName: true, avatarUrl: true } },
  sessionExercises: {
    orderBy: { position: 'asc' as const },
    include: {
      exercise: {
        include: {
          media: { orderBy: { position: 'asc' as const }, take: 1 },
          difficultyLevel: true,
        },
      },
      phase: true,
    },
  },
  _count: { select: { programSessions: true, likes: true, forks: true } },
}

/**
 * Calculate session duration from its exercises.
 */
function calculateDuration(
  exercises: Array<{
    overrideDurationSeconds?: number | null
    sets?: number | null
    restAfterSeconds?: number | null
    exercise: { durationSeconds: number }
  }>
): number {
  return exercises.reduce((total, se) => {
    const duration = se.overrideDurationSeconds ?? se.exercise.durationSeconds
    const sets = se.sets ?? 1
    const rest = se.restAfterSeconds ?? 0
    return total + duration * sets + rest
  }, 0)
}

/**
 * GET /api/v1/sessions — List sessions with search, filter, pagination
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

  const where: Prisma.SessionWhereInput = {
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

  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where,
      include: sessionInclude,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.session.count({ where }),
  ])

  return successResponse({
    data: sessions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

/**
 * POST /api/v1/sessions — Create a new session with exercises
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const parsed = createSessionSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('Validation failed', 400)
  }

  const { domainIds, exercises, ...data } = parsed.data
  const membership = auth.user.memberships[0]

  // Calculate duration from exercises if provided
  let durationSeconds = 0
  if (exercises && exercises.length > 0) {
    // Fetch exercise durations for calculation
    const exerciseIds = [...new Set(exercises.map((e) => e.exerciseId))]
    const exerciseRecords = await prisma.exercise.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true, durationSeconds: true },
    })
    const durationMap = new Map(exerciseRecords.map((e) => [e.id, e.durationSeconds]))

    durationSeconds = exercises.reduce((total, se) => {
      const baseDuration = se.overrideDurationSeconds ?? durationMap.get(se.exerciseId) ?? 0
      const sets = se.sets ?? 1
      const rest = se.restAfterSeconds ?? 0
      return total + baseDuration * sets + rest
    }, 0)
  }

  const session = await prisma.session.create({
    data: {
      ...data,
      durationSeconds,
      createdBy: auth.user.id,
      organizationId: membership?.organizationId ?? null,
      ...(domainIds && domainIds.length > 0 && {
        domains: {
          create: domainIds.map((domainId) => ({ domainId })),
        },
      }),
      ...(exercises && exercises.length > 0 && {
        sessionExercises: {
          create: exercises.map((e) => ({
            exerciseId: e.exerciseId,
            position: e.position,
            phaseId: e.phaseId ?? null,
            restAfterSeconds: e.restAfterSeconds ?? null,
            overrideDurationSeconds: e.overrideDurationSeconds ?? null,
            sets: e.sets ?? null,
            reps: e.reps ?? null,
            notes: e.notes ?? null,
          })),
        },
      }),
    },
    include: sessionInclude,
  })

  return successResponse(session, 201)
}
