import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { Prisma } from '@prisma/client'

/**
 * GET /api/v1/analytics/revenue — Revenue analytics for marketplace sellers
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  if (!auth.user.stripeConnectOnboarded) {
    return errorResponse('Not a marketplace seller', 403)
  }

  const userId = auth.user.id
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  // Aggregates
  const [totalAgg, thisMonthAgg, lastMonthAgg] = await Promise.all([
    prisma.marketplacePurchase.aggregate({
      where: { sellerId: userId, status: 'completed' },
      _sum: { sellerRevenue: true },
      _count: true,
    }),
    prisma.marketplacePurchase.aggregate({
      where: { sellerId: userId, status: 'completed', createdAt: { gte: startOfMonth } },
      _sum: { sellerRevenue: true },
    }),
    prisma.marketplacePurchase.aggregate({
      where: { sellerId: userId, status: 'completed', createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
      _sum: { sellerRevenue: true },
    }),
  ])

  // Best selling (raw SQL for GROUP BY + join)
  const bestSelling = await prisma.$queryRaw<
    { entity_id: string; entity_type: string; name: string; sales: bigint; revenue: number }[]
  >(Prisma.sql`
    SELECT
      mp.entity_id,
      mp.entity_type,
      COALESCE(s.name, p.name, 'Unknown') as name,
      COUNT(*) as sales,
      SUM(mp.seller_revenue)::float as revenue
    FROM marketplace_purchases mp
    LEFT JOIN sessions s ON mp.entity_type = 'session' AND mp.entity_id = s.id
    LEFT JOIN programs p ON mp.entity_type = 'program' AND mp.entity_id = p.id
    WHERE mp.seller_id = ${userId} AND mp.status = 'completed'
    GROUP BY mp.entity_id, mp.entity_type, s.name, p.name
    ORDER BY revenue DESC
    LIMIT 5
  `)

  // Monthly trend (last 6 months)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const monthlyTrend = await prisma.$queryRaw<
    { month: string; revenue: number; sales: bigint }[]
  >(Prisma.sql`
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
      SUM(seller_revenue)::float as revenue,
      COUNT(*) as sales
    FROM marketplace_purchases
    WHERE seller_id = ${userId}
      AND status = 'completed'
      AND created_at >= ${sixMonthsAgo}
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at) ASC
  `)

  return successResponse({
    totalRevenue: Number(totalAgg._sum.sellerRevenue ?? 0),
    thisMonth: Number(thisMonthAgg._sum.sellerRevenue ?? 0),
    lastMonth: Number(lastMonthAgg._sum.sellerRevenue ?? 0),
    totalSales: totalAgg._count,
    bestSelling: bestSelling.map((b) => ({
      id: b.entity_id,
      name: b.name,
      type: b.entity_type,
      sales: Number(b.sales),
      revenue: b.revenue ?? 0,
    })),
    monthlyTrend: monthlyTrend.map((m) => ({
      month: m.month,
      revenue: m.revenue ?? 0,
      sales: Number(m.sales),
    })),
  })
}
