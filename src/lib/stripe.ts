import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not set — billing features disabled')
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

/**
 * Plan limits by tier. Enforced on content creation.
 */
export const PLAN_LIMITS = {
  free: { maxExercises: 50, maxPrograms: 10, maxCoaches: 1, maxOrgMemberships: 1 },
  pro: { maxExercises: -1, maxPrograms: -1, maxCoaches: 1, maxOrgMemberships: 3 },
  team: { maxExercises: -1, maxPrograms: -1, maxCoaches: 10, maxOrgMemberships: -1 },
  business: { maxExercises: -1, maxPrograms: -1, maxCoaches: 50, maxOrgMemberships: -1 },
  enterprise: { maxExercises: -1, maxPrograms: -1, maxCoaches: -1, maxOrgMemberships: -1 },
} as const

// -1 means unlimited

export type PlanTier = keyof typeof PLAN_LIMITS

/**
 * Check if an org plan allows selling on the marketplace.
 * Free tier cannot sell — all paid tiers can.
 */
export function canSellOnMarketplace(orgPlan: string): boolean {
  return orgPlan !== 'free'
}
