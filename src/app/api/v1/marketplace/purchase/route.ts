import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { stripe } from '@/lib/stripe'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.limitless-longevity.health/train'

/**
 * POST /api/v1/marketplace/purchase — Create Stripe Checkout for marketplace content
 */
export async function POST(request: NextRequest) {
  if (!stripe) return errorResponse('Billing not configured', 503)

  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { entityType, entityId } = body

  if (!entityType || !entityId || !['session', 'program'].includes(entityType)) {
    return errorResponse('entityType must be "session" or "program" and entityId is required', 400)
  }

  // Fetch entity
  const entity = entityType === 'session'
    ? await prisma.session.findFirst({
        where: { id: entityId, deletedAt: null },
        select: { id: true, name: true, description: true, visibility: true, marketplacePrice: true, createdBy: true },
      })
    : await prisma.program.findFirst({
        where: { id: entityId, deletedAt: null },
        select: { id: true, name: true, description: true, visibility: true, marketplacePrice: true, createdBy: true },
      })

  if (!entity) return errorResponse(`${entityType} not found`, 404)
  if (entity.visibility !== 'marketplace') return errorResponse('Content is not listed on the marketplace', 400)
  if (!entity.marketplacePrice || Number(entity.marketplacePrice) < 2.99) {
    return errorResponse('Content does not have a valid marketplace price', 400)
  }
  if (entity.createdBy === auth.user.id) {
    return errorResponse('Cannot purchase your own content', 400)
  }

  // Check not already purchased
  const existingPurchase = await prisma.marketplacePurchase.findFirst({
    where: { buyerId: auth.user.id, entityType, entityId, status: 'completed' },
  })
  if (existingPurchase) return errorResponse('You have already purchased this content', 400)

  // Check seller is onboarded
  const seller = await prisma.user.findUnique({
    where: { id: entity.createdBy },
    select: { stripeConnectAccountId: true, stripeConnectOnboarded: true },
  })
  if (!seller?.stripeConnectOnboarded || !seller.stripeConnectAccountId) {
    return errorResponse('Seller has not completed payment setup', 400)
  }

  const price = Number(entity.marketplacePrice)
  const platformFee = Math.round(price * 0.20 * 100) // 20% in cents

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(price * 100),
        product_data: {
          name: entity.name,
          description: entity.description?.slice(0, 500) || `${entityType} on CUBES+`,
        },
      },
      quantity: 1,
    }],
    payment_intent_data: {
      application_fee_amount: platformFee,
      transfer_data: { destination: seller.stripeConnectAccountId },
    },
    metadata: {
      entityType,
      entityId,
      buyerId: auth.user.id,
      sellerId: entity.createdBy,
    },
    success_url: `${APP_URL}/marketplace/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/marketplace`,
  })

  return successResponse({ checkoutUrl: session.url })
}
