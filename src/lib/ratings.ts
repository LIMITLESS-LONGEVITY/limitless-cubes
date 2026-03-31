import { prisma } from './prisma'
import { z } from 'zod/v4'

export const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(1000).optional(),
})

export const respondSchema = z.object({
  creatorResponse: z.string().max(1000),
})

type EntityType = 'exercise' | 'session' | 'program'

/**
 * Create or update a rating for an entity.
 * One rating per user per entity — upsert by checking existing.
 */
export async function upsertRating(
  entityType: EntityType,
  entityId: string,
  userId: string,
  data: { rating: number; reviewText?: string }
) {
  const fkField = `${entityType}Id`

  // Check for existing rating
  const existing = await prisma.contentRating.findFirst({
    where: {
      [fkField]: entityId,
      userId,
    },
  })

  if (existing) {
    return prisma.contentRating.update({
      where: { id: existing.id },
      data: {
        rating: data.rating,
        reviewText: data.reviewText ?? existing.reviewText,
      },
      include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
    })
  }

  return prisma.contentRating.create({
    data: {
      [fkField]: entityId,
      userId,
      rating: data.rating,
      reviewText: data.reviewText ?? null,
    },
    include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
  })
}

/**
 * Get ratings for an entity with average and count.
 */
export async function getRatings(
  entityType: EntityType,
  entityId: string,
  limit = 20,
  offset = 0
) {
  const fkField = `${entityType}Id`
  const where = { [fkField]: entityId }

  const [ratings, count, aggregate] = await Promise.all([
    prisma.contentRating.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.contentRating.count({ where }),
    prisma.contentRating.aggregate({
      where,
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ])

  return {
    ratings,
    total: count,
    averageRating: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : null,
    ratingCount: aggregate._count.rating,
  }
}

/**
 * Add creator response to a rating.
 */
export async function addCreatorResponse(
  ratingId: string,
  creatorId: string,
  entityType: EntityType,
  response: string
) {
  const rating = await prisma.contentRating.findUnique({
    where: { id: ratingId },
    include: {
      exercise: entityType === 'exercise' ? { select: { createdBy: true } } : false,
      session: entityType === 'session' ? { select: { createdBy: true } } : false,
      program: entityType === 'program' ? { select: { createdBy: true } } : false,
    },
  })

  if (!rating) return null

  // Verify the responder is the content creator
  const entity = rating.exercise || rating.session || rating.program
  if (!entity || (entity as { createdBy: string }).createdBy !== creatorId) {
    return 'not_creator'
  }

  return prisma.contentRating.update({
    where: { id: ratingId },
    data: { creatorResponse: response },
    include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
  })
}
