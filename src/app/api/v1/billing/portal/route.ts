import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

/**
 * POST /api/v1/billing/portal — Create Stripe Customer Portal session
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  if (!stripe) return errorResponse('Billing is not configured', 503)

  const { organizationId } = await request.json()
  if (!organizationId) return errorResponse('organizationId is required', 400)

  const membership = auth.user.memberships.find(
    (m) => m.organizationId === organizationId && (m.isOwner || m.isAdmin)
  )
  if (!membership) return errorResponse('Only org owners/admins can manage billing', 403)

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  })
  if (!org?.stripeCustomerId) {
    return errorResponse('No billing account found — subscribe to a plan first', 400)
  }

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.limitless-longevity.health'

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${appUrl}${basePath}/admin`,
  })

  return successResponse({ portalUrl: session.url })
}
