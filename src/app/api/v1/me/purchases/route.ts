import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

/**
 * GET /api/v1/me/purchases — List user's marketplace purchases
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {
    buyerId: auth.user.id,
    status: 'completed',
  }
  if (type && ['session', 'program'].includes(type)) {
    where.entityType = type
  }

  const [purchases, total] = await Promise.all([
    prisma.marketplacePurchase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        seller: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    }),
    prisma.marketplacePurchase.count({ where }),
  ])

  // Hydrate with entity names
  const data = await Promise.all(
    purchases.map(async (p) => {
      const entity = p.entityType === 'session'
        ? await prisma.session.findUnique({ where: { id: p.entityId }, select: { name: true } })
        : await prisma.program.findUnique({ where: { id: p.entityId }, select: { name: true } })
      return { ...p, entityName: entity?.name ?? 'Unknown' }
    })
  )

  return successResponse({ data, total, page, limit })
}
