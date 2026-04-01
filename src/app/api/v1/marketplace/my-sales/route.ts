import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

/**
 * GET /api/v1/marketplace/my-sales — Seller revenue dashboard
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  if (!auth.user.stripeConnectOnboarded) {
    return errorResponse('Not a marketplace seller', 403)
  }

  const sellerId = auth.user.id
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [allSales, monthlySales, recentSales] = await Promise.all([
    prisma.marketplacePurchase.aggregate({
      where: { sellerId, status: 'completed' },
      _sum: { sellerRevenue: true, platformFee: true },
      _count: true,
    }),
    prisma.marketplacePurchase.aggregate({
      where: { sellerId, status: 'completed', createdAt: { gte: startOfMonth } },
      _sum: { sellerRevenue: true },
    }),
    prisma.marketplacePurchase.findMany({
      where: { sellerId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        buyer: { select: { fullName: true } },
      },
    }),
  ])

  // Hydrate recent sales with entity names
  const recentWithNames = await Promise.all(
    recentSales.map(async (s) => {
      const entity = s.entityType === 'session'
        ? await prisma.session.findUnique({ where: { id: s.entityId }, select: { name: true } })
        : await prisma.program.findUnique({ where: { id: s.entityId }, select: { name: true } })
      return {
        entityType: s.entityType,
        entityName: entity?.name ?? 'Unknown',
        buyerName: s.buyer.fullName,
        price: s.price,
        sellerRevenue: s.sellerRevenue,
        createdAt: s.createdAt,
      }
    })
  )

  return successResponse({
    totalRevenue: Number(allSales._sum.sellerRevenue ?? 0),
    totalSales: allSales._count,
    platformFees: Number(allSales._sum.platformFee ?? 0),
    thisMonth: Number(monthlySales._sum.sellerRevenue ?? 0),
    recentSales: recentWithNames,
  })
}
