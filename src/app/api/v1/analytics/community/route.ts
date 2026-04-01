import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { Prisma } from '@prisma/client'

/**
 * GET /api/v1/analytics/community — Community impact metrics (fork tree, ratings)
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  if (auth.user.role === 'athlete') return errorResponse('Coach role required', 403)

  const userId = auth.user.id

  // Direct forks
  const [exerciseForks, sessionForks, programForks] = await Promise.all([
    prisma.exercise.count({ where: { forkedFrom: { createdBy: userId }, deletedAt: null } }),
    prisma.session.count({ where: { forkedFrom: { createdBy: userId }, deletedAt: null } }),
    prisma.program.count({ where: { forkedFrom: { createdBy: userId }, deletedAt: null } }),
  ])
  const totalForks = exerciseForks + sessionForks + programForks

  // Downstream forks (recursive CTE) per entity type
  async function getForkTree(table: string): Promise<{ downstream: number; depth: number }> {
    const result = await prisma.$queryRaw<{ total_downstream: bigint; max_depth: number | null }[]>(
      Prisma.sql`
        WITH RECURSIVE fork_tree AS (
          SELECT id, forked_from_id, 1 as depth
          FROM ${Prisma.raw(table)}
          WHERE forked_from_id IN (
            SELECT id FROM ${Prisma.raw(table)} WHERE created_by = ${userId} AND deleted_at IS NULL
          ) AND deleted_at IS NULL
          UNION ALL
          SELECT e.id, e.forked_from_id, ft.depth + 1
          FROM ${Prisma.raw(table)} e
          JOIN fork_tree ft ON e.forked_from_id = ft.id
          WHERE ft.depth < 10 AND e.deleted_at IS NULL
        )
        SELECT COUNT(*) as total_downstream, MAX(depth) as max_depth FROM fork_tree
      `
    )
    return {
      downstream: Number(result[0]?.total_downstream ?? 0),
      depth: result[0]?.max_depth ?? 0,
    }
  }

  const [exTree, seTree, prTree] = await Promise.all([
    getForkTree('exercises'),
    getForkTree('sessions'),
    getForkTree('programs'),
  ])

  const downstreamForks = exTree.downstream + seTree.downstream + prTree.downstream
  const forkDepth = Math.max(exTree.depth, seTree.depth, prTree.depth)

  // Rating distribution
  const ratingDist = await prisma.$queryRaw<{ rating: number; count: bigint }[]>(Prisma.sql`
    SELECT rating, COUNT(*) as count
    FROM content_ratings
    WHERE exercise_id IN (SELECT id FROM exercises WHERE created_by = ${userId})
       OR session_id IN (SELECT id FROM sessions WHERE created_by = ${userId})
       OR program_id IN (SELECT id FROM programs WHERE created_by = ${userId})
    GROUP BY rating
    ORDER BY rating
  `)

  const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  let totalRatings = 0
  let ratingSum = 0
  for (const row of ratingDist) {
    distribution[String(row.rating)] = Number(row.count)
    totalRatings += Number(row.count)
    ratingSum += row.rating * Number(row.count)
  }
  const avgRating = totalRatings > 0 ? ratingSum / totalRatings : 0

  // Review response rate
  const reviewResult = await prisma.$queryRaw<{ total_reviews: bigint; responded: bigint }[]>(Prisma.sql`
    SELECT
      COUNT(*) FILTER (WHERE review_text IS NOT NULL) as total_reviews,
      COUNT(*) FILTER (WHERE creator_response IS NOT NULL) as responded
    FROM content_ratings
    WHERE exercise_id IN (SELECT id FROM exercises WHERE created_by = ${userId})
       OR session_id IN (SELECT id FROM sessions WHERE created_by = ${userId})
       OR program_id IN (SELECT id FROM programs WHERE created_by = ${userId})
  `)
  const totalReviews = Number(reviewResult[0]?.total_reviews ?? 0)
  const responded = Number(reviewResult[0]?.responded ?? 0)
  const reviewResponseRate = totalReviews > 0 ? responded / totalReviews : 0

  return successResponse({
    totalForks,
    downstreamForks,
    forkDepth,
    ratingDistribution: distribution,
    avgRating,
    totalRatings,
    reviewResponseRate,
  })
}
