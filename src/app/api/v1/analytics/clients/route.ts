import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { Prisma } from '@prisma/client'

/**
 * GET /api/v1/analytics/clients — Client engagement metrics for the coach's organization
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  if (auth.user.role === 'athlete') return errorResponse('Coach role required', 403)

  const orgMember = auth.user.memberships[0]
  if (!orgMember) {
    return successResponse({
      activeClients: 0,
      totalClients: 0,
      completionRate: 0,
      avgRPE: null,
      adherenceTrend: [],
    })
  }

  const orgId = orgMember.organizationId

  // Total clients
  const totalClients = await prisma.client.count({ where: { organizationId: orgId } })

  // Active clients (completed a session in last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const activeResult = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
    SELECT COUNT(DISTINCT c.id) as count
    FROM clients c
    JOIN client_program_assignments cpa ON cpa.client_id = c.id
    JOIN client_session_progress csp ON csp.client_program_assignment_id = cpa.id
    WHERE c.organization_id = ${orgId}
      AND csp.status = 'completed'
      AND csp.completed_at >= ${sevenDaysAgo}
  `)
  const activeClients = Number(activeResult[0]?.count ?? 0)

  // Completion rate
  const completionResult = await prisma.$queryRaw<{ completed: bigint; total: bigint }[]>(Prisma.sql`
    SELECT
      COUNT(*) FILTER (WHERE csp.status = 'completed') as completed,
      COUNT(*) as total
    FROM client_session_progress csp
    JOIN client_program_assignments cpa ON cpa.id = csp.client_program_assignment_id
    JOIN clients c ON c.id = cpa.client_id
    WHERE c.organization_id = ${orgId}
  `)
  const completed = Number(completionResult[0]?.completed ?? 0)
  const total = Number(completionResult[0]?.total ?? 0)
  const completionRate = total > 0 ? completed / total : 0

  // Average RPE
  const rpeResult = await prisma.$queryRaw<{ avg_rpe: number | null }[]>(Prisma.sql`
    SELECT AVG(csp.subjective_rpe)::float as avg_rpe
    FROM client_session_progress csp
    JOIN client_program_assignments cpa ON cpa.id = csp.client_program_assignment_id
    JOIN clients c ON c.id = cpa.client_id
    WHERE c.organization_id = ${orgId}
      AND csp.subjective_rpe IS NOT NULL
  `)
  const avgRPE = rpeResult[0]?.avg_rpe ?? null

  // Adherence trend (last 12 weeks)
  const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000)
  const adherenceTrend = await prisma.$queryRaw<
    { week: string; completed: bigint; total: bigint }[]
  >(Prisma.sql`
    SELECT
      to_char(date_trunc('week', csp.created_at), 'IYYY-"W"IW') as week,
      COUNT(*) FILTER (WHERE csp.status = 'completed') as completed,
      COUNT(*) as total
    FROM client_session_progress csp
    JOIN client_program_assignments cpa ON cpa.id = csp.client_program_assignment_id
    JOIN clients c ON c.id = cpa.client_id
    WHERE c.organization_id = ${orgId}
      AND csp.created_at >= ${twelveWeeksAgo}
    GROUP BY date_trunc('week', csp.created_at)
    ORDER BY date_trunc('week', csp.created_at) ASC
  `)

  return successResponse({
    activeClients,
    totalClients,
    completionRate,
    avgRPE,
    adherenceTrend: adherenceTrend.map((row) => ({
      week: row.week,
      completed: Number(row.completed),
      total: Number(row.total),
      rate: Number(row.total) > 0 ? Number(row.completed) / Number(row.total) : 0,
    })),
  })
}
