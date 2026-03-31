import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { createProgramSchema, listQuerySchema } from '@/lib/validation'
import { checkContentLimit, formatLimitError } from '@/lib/plan-limits'
import { Prisma } from '@prisma/client'

const programInclude = {
  domains: { include: { domain: true } },
  difficultyLevel: true,
  creator: { select: { id: true, fullName: true, avatarUrl: true } },
  programSessions: {
    orderBy: { position: 'asc' as const },
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
}

/**
 * GET /api/v1/programs — List programs
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
    search, status, visibility, domainId, difficultyLevelId, organizationId, createdBy,
    sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20,
  } = query.data

  const where: Prisma.ProgramWhereInput = {
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
    ...(domainId && { domains: { some: { domainId } } }),
  }

  const [programs, total] = await Promise.all([
    prisma.program.findMany({
      where,
      include: programInclude,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.program.count({ where }),
  ])

  return successResponse({
    data: programs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

/**
 * POST /api/v1/programs — Create a program with sessions
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const parsed = createProgramSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('Validation failed', 400)
  }

  const { domainIds, sessions, ...data } = parsed.data
  const membership = auth.user.memberships[0]

  // Check plan limits
  const limitCheck = await checkContentLimit(auth.user.id, membership?.organizationId ?? null, 'program')
  if (!limitCheck.allowed) {
    return errorResponse(formatLimitError(limitCheck, 'program'), 403)
  }

  // Calculate duration from sessions if provided
  let durationSeconds = 0
  if (sessions && sessions.length > 0) {
    const sessionIds = [...new Set(sessions.map((s) => s.sessionId))]
    const sessionRecords = await prisma.session.findMany({
      where: { id: { in: sessionIds } },
      select: { id: true, durationSeconds: true },
    })
    const durationMap = new Map(sessionRecords.map((s) => [s.id, s.durationSeconds]))
    durationSeconds = sessions.reduce((total, ps) => total + (durationMap.get(ps.sessionId) ?? 0), 0)
  }

  const program = await prisma.program.create({
    data: {
      ...data,
      durationSeconds,
      createdBy: auth.user.id,
      organizationId: membership?.organizationId ?? null,
      ...(domainIds && domainIds.length > 0 && {
        domains: { create: domainIds.map((domainId) => ({ domainId })) },
      }),
      ...(sessions && sessions.length > 0 && {
        programSessions: {
          create: sessions.map((s) => ({
            sessionId: s.sessionId,
            position: s.position,
            dayLabel: s.dayLabel ?? null,
            notes: s.notes ?? null,
          })),
        },
      }),
    },
    include: programInclude,
  })

  return successResponse(program, 201)
}
