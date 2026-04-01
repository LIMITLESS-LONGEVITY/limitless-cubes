import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { stripe, canSellOnMarketplace } from '@/lib/stripe'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.limitless-longevity.health/train'

/**
 * POST /api/v1/marketplace/connect — Create Stripe Connect Express account or re-onboard
 */
export async function POST(request: NextRequest) {
  if (!stripe) return errorResponse('Billing not configured', 503)

  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  // Check Pro tier+ via org membership
  const orgMember = auth.user.memberships[0]
  if (!orgMember) return errorResponse('No organization membership', 403)

  const org = await prisma.organization.findUnique({ where: { id: orgMember.organizationId } })
  if (!org || !canSellOnMarketplace(org.plan)) {
    return errorResponse('Upgrade to Pro or higher to sell on the marketplace', 403)
  }

  let accountId = auth.user.stripeConnectAccountId

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: auth.user.email,
      metadata: { cubesUserId: auth.user.id },
    })
    accountId = account.id

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { stripeConnectAccountId: accountId },
    })
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${APP_URL}/marketplace/sell`,
    return_url: `${APP_URL}/marketplace/sell`,
  })

  return successResponse({ onboardingUrl: accountLink.url })
}

/**
 * GET /api/v1/marketplace/connect — Check Stripe Connect status
 */
export async function GET(request: NextRequest) {
  if (!stripe) return errorResponse('Billing not configured', 503)

  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  if (!auth.user.stripeConnectAccountId) {
    return successResponse({ connected: false })
  }

  const account = await stripe.accounts.retrieve(auth.user.stripeConnectAccountId)
  const chargesEnabled = account.charges_enabled ?? false
  const payoutsEnabled = account.payouts_enabled ?? false

  // Sync onboarded status
  if (chargesEnabled && payoutsEnabled && !auth.user.stripeConnectOnboarded) {
    await prisma.user.update({
      where: { id: auth.user.id },
      data: { stripeConnectOnboarded: true },
    })
  }

  return successResponse({
    connected: true,
    chargesEnabled,
    payoutsEnabled,
    accountId: auth.user.stripeConnectAccountId,
  })
}
