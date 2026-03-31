import { prisma } from './prisma'
import { PLAN_LIMITS, type PlanTier } from './stripe'

type ContentType = 'exercise' | 'session' | 'program'

interface LimitCheckResult {
  allowed: boolean
  current: number
  limit: number
  planTier: PlanTier
}

/**
 * Check if a user can create more content based on their org's plan limits.
 * Returns { allowed: true } if within limits, or { allowed: false, current, limit }
 * if the limit has been reached.
 */
export async function checkContentLimit(
  userId: string,
  organizationId: string | null,
  contentType: ContentType
): Promise<LimitCheckResult> {
  // Determine the plan tier
  let planTier: PlanTier = 'free'

  if (organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    })
    if (org) planTier = org.plan as PlanTier
  }

  const limits = PLAN_LIMITS[planTier]

  // Map content type to limit field
  const limitMap: Record<ContentType, number> = {
    exercise: limits.maxExercises,
    session: -1, // Sessions are unlimited on all plans
    program: limits.maxPrograms,
  }

  const maxAllowed = limitMap[contentType]
  if (maxAllowed === -1) {
    return { allowed: true, current: 0, limit: -1, planTier }
  }

  // Count existing content by this user in this org
  const countWhere = {
    createdBy: userId,
    deletedAt: null,
    ...(organizationId && { organizationId }),
  }

  let current: number
  switch (contentType) {
    case 'exercise':
      current = await prisma.exercise.count({ where: countWhere })
      break
    case 'session':
      current = await prisma.session.count({ where: countWhere })
      break
    case 'program':
      current = await prisma.program.count({ where: countWhere })
      break
  }

  return {
    allowed: current < maxAllowed,
    current,
    limit: maxAllowed,
    planTier,
  }
}

/**
 * Check if an org can add more coaches based on plan limits.
 */
export async function checkCoachLimit(organizationId: string): Promise<LimitCheckResult> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true },
  })

  const planTier = (org?.plan ?? 'free') as PlanTier
  const maxCoaches = PLAN_LIMITS[planTier].maxCoaches

  if (maxCoaches === -1) {
    return { allowed: true, current: 0, limit: -1, planTier }
  }

  const current = await prisma.organizationMember.count({
    where: { organizationId, status: 'active' },
  })

  return { allowed: current < maxCoaches, current, limit: maxCoaches, planTier }
}

/**
 * Format a plan limit error message for the user.
 */
export function formatLimitError(result: LimitCheckResult, contentType: string): string {
  if (result.allowed) return ''
  return `You've reached the ${contentType} limit (${result.current}/${result.limit}) on the ${result.planTier} plan. Upgrade to create more.`
}
