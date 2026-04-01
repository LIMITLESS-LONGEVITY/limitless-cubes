import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

/**
 * GET /api/v1/marketplace/listings — Browse marketplace content
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const url = new URL(request.url)
  const type = url.searchParams.get('type') || 'session'
  const domain = url.searchParams.get('domain')
  const difficulty = url.searchParams.get('difficulty')
  const minPrice = url.searchParams.get('minPrice')
  const maxPrice = url.searchParams.get('maxPrice')
  const sort = url.searchParams.get('sort') || 'newest'
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {
    visibility: 'marketplace',
    deletedAt: null,
    marketplacePrice: { gte: 2.99, ...(minPrice ? { gte: parseFloat(minPrice) } : {}), ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}) },
  }

  if (domain) {
    where.domains = { some: { domain: { name: domain } } }
  }
  if (difficulty) {
    where.difficultyLevel = { label: difficulty }
  }

  const orderBy: Record<string, string> = sort === 'popular'
    ? { downloadCount: 'desc' }
    : sort === 'rating'
      ? { downloadCount: 'desc' } // ratings are computed, fall back to popularity
      : { createdAt: 'desc' }

  const include = {
    creator: { select: { id: true, fullName: true, avatarUrl: true } },
    domains: { include: { domain: true } },
    difficultyLevel: true,
    _count: { select: { likes: true, forks: true } },
  }

  if (type === 'program') {
    const [data, total] = await Promise.all([
      prisma.program.findMany({ where, include, orderBy, skip, take: limit }),
      prisma.program.count({ where }),
    ])
    return successResponse({ data, total, page, limit })
  }

  // Default: sessions
  const [data, total] = await Promise.all([
    prisma.session.findMany({ where, include, orderBy, skip, take: limit }),
    prisma.session.count({ where }),
  ])
  return successResponse({ data, total, page, limit })
}
