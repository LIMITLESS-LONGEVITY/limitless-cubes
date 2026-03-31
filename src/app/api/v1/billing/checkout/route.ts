import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { z } from 'zod/v4'

const checkoutSchema = z.object({
  planId: z.string().uuid(),
  organizationId: z.string().uuid(),
  annual: z.boolean().optional(),
})

/**
 * POST /api/v1/billing/checkout — Create a Stripe Checkout session
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  if (!stripe) return errorResponse('Billing is not configured', 503)

  const body = await request.json()
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) return errorResponse('Validation failed', 400)

  // Verify org ownership/admin
  const membership = auth.user.memberships.find(
    (m) => m.organizationId === parsed.data.organizationId && (m.isOwner || m.isAdmin)
  )
  if (!membership) return errorResponse('Only org owners/admins can manage billing', 403)

  // Get subscription plan
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { id: parsed.data.planId, active: true },
  })
  if (!plan) return errorResponse('Plan not found', 404)

  const stripePriceId = plan.stripePriceId
  if (!stripePriceId) return errorResponse('Plan has no Stripe price configured', 400)

  // Get or create Stripe customer
  const org = await prisma.organization.findUnique({
    where: { id: parsed.data.organizationId },
  })
  if (!org) return errorResponse('Organization not found', 404)

  let customerId = org.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: auth.user.email,
      name: org.name,
      metadata: {
        organizationId: org.id,
        organizationSlug: org.slug,
      },
    })
    customerId = customer.id
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    })
  }

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.limitless-longevity.health'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: stripePriceId, quantity: 1 }],
    success_url: `${appUrl}${basePath}/admin?billing=success`,
    cancel_url: `${appUrl}${basePath}/admin?billing=cancelled`,
    metadata: {
      organizationId: org.id,
      planId: plan.id,
    },
  })

  return successResponse({ checkoutUrl: session.url })
}
