import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { Prisma } from '@prisma/client'

/**
 * GET /api/v1/analytics/content — Content performance metrics for the authenticated coach
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  if (auth.user.role === 'athlete') return errorResponse('Coach role required', 403)

  const userId = auth.user.id

  // Totals
  const [exercises, sessions, programs] = await Promise.all([
    prisma.exercise.count({ where: { createdBy: userId, deletedAt: null } }),
    prisma.session.count({ where: { createdBy: userId, deletedAt: null } }),
    prisma.program.count({ where: { createdBy: userId, deletedAt: null } }),
  ])

  // Engagement: likes
  const [exerciseLikes, sessionLikes, programLikes] = await Promise.all([
    prisma.exerciseLike.count({ where: { exercise: { createdBy: userId } } }),
    prisma.sessionLike.count({ where: { session: { createdBy: userId } } }),
    prisma.programLike.count({ where: { program: { createdBy: userId } } }),
  ])
  const totalLikes = exerciseLikes + sessionLikes + programLikes

  // Engagement: forks
  const [exerciseForks, sessionForks, programForks] = await Promise.all([
    prisma.exercise.count({ where: { forkedFrom: { createdBy: userId }, deletedAt: null } }),
    prisma.session.count({ where: { forkedFrom: { createdBy: userId }, deletedAt: null } }),
    prisma.program.count({ where: { forkedFrom: { createdBy: userId }, deletedAt: null } }),
  ])
  const totalForks = exerciseForks + sessionForks + programForks

  // Ratings
  const ratings = await prisma.contentRating.aggregate({
    where: {
      OR: [
        { exercise: { createdBy: userId } },
        { session: { createdBy: userId } },
        { program: { createdBy: userId } },
      ],
    },
    _count: true,
    _avg: { rating: true },
  })

  // Top content (union via raw SQL)
  const topContent = await prisma.$queryRaw<
    { id: string; name: string; type: string; likes: bigint; forks: bigint; rating_avg: number | null; rating_count: bigint }[]
  >(Prisma.sql`
    SELECT * FROM (
      SELECT e.id, e.name, 'exercise' as type,
        (SELECT COUNT(*) FROM exercise_likes el WHERE el.exercise_id = e.id) as likes,
        (SELECT COUNT(*) FROM exercises f WHERE f.forked_from_id = e.id AND f.deleted_at IS NULL) as forks,
        (SELECT AVG(cr.rating)::float FROM content_ratings cr WHERE cr.exercise_id = e.id) as rating_avg,
        (SELECT COUNT(*) FROM content_ratings cr WHERE cr.exercise_id = e.id) as rating_count
      FROM exercises e WHERE e.created_by = ${userId} AND e.deleted_at IS NULL
      UNION ALL
      SELECT s.id, s.name, 'session' as type,
        (SELECT COUNT(*) FROM session_likes sl WHERE sl.session_id = s.id) as likes,
        (SELECT COUNT(*) FROM sessions f WHERE f.forked_from_id = s.id AND f.deleted_at IS NULL) as forks,
        (SELECT AVG(cr.rating)::float FROM content_ratings cr WHERE cr.session_id = s.id) as rating_avg,
        (SELECT COUNT(*) FROM content_ratings cr WHERE cr.session_id = s.id) as rating_count
      FROM sessions s WHERE s.created_by = ${userId} AND s.deleted_at IS NULL
      UNION ALL
      SELECT p.id, p.name, 'program' as type,
        (SELECT COUNT(*) FROM program_likes pl WHERE pl.program_id = p.id) as likes,
        (SELECT COUNT(*) FROM programs f WHERE f.forked_from_id = p.id AND f.deleted_at IS NULL) as forks,
        (SELECT AVG(cr.rating)::float FROM content_ratings cr WHERE cr.program_id = p.id) as rating_avg,
        (SELECT COUNT(*) FROM content_ratings cr WHERE cr.program_id = p.id) as rating_count
      FROM programs p WHERE p.created_by = ${userId} AND p.deleted_at IS NULL
    ) combined
    ORDER BY (likes + forks + rating_count) DESC
    LIMIT 5
  `)

  // Trend: this month vs last month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [thisMonthCreated, lastMonthCreated] = await Promise.all([
    prisma.exercise.count({ where: { createdBy: userId, deletedAt: null, createdAt: { gte: startOfMonth } } })
      .then(async (e) => e
        + await prisma.session.count({ where: { createdBy: userId, deletedAt: null, createdAt: { gte: startOfMonth } } })
        + await prisma.program.count({ where: { createdBy: userId, deletedAt: null, createdAt: { gte: startOfMonth } } })
      ),
    prisma.exercise.count({ where: { createdBy: userId, deletedAt: null, createdAt: { gte: startOfLastMonth, lt: startOfMonth } } })
      .then(async (e) => e
        + await prisma.session.count({ where: { createdBy: userId, deletedAt: null, createdAt: { gte: startOfLastMonth, lt: startOfMonth } } })
        + await prisma.program.count({ where: { createdBy: userId, deletedAt: null, createdAt: { gte: startOfLastMonth, lt: startOfMonth } } })
      ),
  ])

  const [thisMonthLikes, lastMonthLikes] = await Promise.all([
    prisma.exerciseLike.count({ where: { exercise: { createdBy: userId }, createdAt: { gte: startOfMonth } } })
      .then(async (e) => e
        + await prisma.sessionLike.count({ where: { session: { createdBy: userId }, createdAt: { gte: startOfMonth } } })
        + await prisma.programLike.count({ where: { program: { createdBy: userId }, createdAt: { gte: startOfMonth } } })
      ),
    prisma.exerciseLike.count({ where: { exercise: { createdBy: userId }, createdAt: { gte: startOfLastMonth, lt: startOfMonth } } })
      .then(async (e) => e
        + await prisma.sessionLike.count({ where: { session: { createdBy: userId }, createdAt: { gte: startOfLastMonth, lt: startOfMonth } } })
        + await prisma.programLike.count({ where: { program: { createdBy: userId }, createdAt: { gte: startOfLastMonth, lt: startOfMonth } } })
      ),
  ])

  return successResponse({
    totals: { exercises, sessions, programs },
    engagement: {
      likes: totalLikes,
      forks: totalForks,
      ratings: ratings._count,
      avgRating: ratings._avg.rating ?? 0,
    },
    topContent: topContent.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      likes: Number(c.likes),
      forks: Number(c.forks),
      ratingAvg: c.rating_avg ?? 0,
      ratingCount: Number(c.rating_count),
    })),
    trend: {
      thisMonth: { created: thisMonthCreated, likes: thisMonthLikes, forks: 0 },
      lastMonth: { created: lastMonthCreated, likes: lastMonthLikes, forks: 0 },
    },
  })
}
