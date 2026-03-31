import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { PLAN_LIMITS, type PlanTier } from '@/lib/stripe'

/**
 * GET /api/v1/billing/status?organizationId=xxx — Get billing status + plan limits
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const organizationId = request.nextUrl.searchParams.get('organizationId')
  if (!organizationId) return errorResponse('organizationId is required', 400)

  const membership = auth.user.memberships.find((m) => m.organizationId === organizationId)
  if (!membership) return errorResponse('Not a member of this organization', 403)

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true, stripeCustomerId: true },
  })
  if (!org) return errorResponse('Organization not found', 404)

  const planTier = org.plan as PlanTier
  const limits = PLAN_LIMITS[planTier]

  // Get current subscription
  const subscription = await prisma.organizationSubscription.findFirst({
    where: { organizationId, status: { in: ['active', 'trialing'] } },
    include: { plan: { select: { name: true, tier: true, priceMonthly: true, priceAnnual: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // Get current usage counts
  const [exerciseCount, programCount, memberCount] = await Promise.all([
    prisma.exercise.count({ where: { organizationId, deletedAt: null } }),
    prisma.program.count({ where: { organizationId, deletedAt: null } }),
    prisma.organizationMember.count({ where: { organizationId, status: 'active' } }),
  ])

  // Get available plans
  const plans = await prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { priceMonthly: 'asc' },
  })

  return successResponse({
    currentPlan: planTier,
    limits,
    usage: {
      exercises: { current: exerciseCount, limit: limits.maxExercises },
      programs: { current: programCount, limit: limits.maxPrograms },
      coaches: { current: memberCount, limit: limits.maxCoaches },
    },
    subscription: subscription
      ? {
          planName: subscription.plan.name,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
        }
      : null,
    hasStripeCustomer: !!org.stripeCustomerId,
    availablePlans: plans,
  })
}
