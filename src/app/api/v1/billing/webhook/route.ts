import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'

/**
 * POST /api/v1/billing/webhook — Stripe webhook handler
 *
 * Processes subscription lifecycle events:
 * - checkout.session.completed → create subscription record, update org plan
 * - customer.subscription.updated → sync plan changes
 * - customer.subscription.deleted → downgrade to free
 */
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break

      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer)
        break

      default:
        // Unhandled event type — log and acknowledge
        console.log(`Unhandled Stripe event: ${event.type}`)
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Check if this is a marketplace purchase (has entityType in metadata)
  if (session.metadata?.entityType) {
    await handleMarketplacePurchase(session)
    return
  }

  const organizationId = session.metadata?.organizationId
  const planId = session.metadata?.planId
  const subscriptionId = session.subscription as string

  if (!organizationId || !planId || !subscriptionId) {
    console.error('Checkout session missing metadata:', session.id)
    return
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
  if (!plan) {
    console.error('Plan not found:', planId)
    return
  }

  // Create subscription record — use current time as fallback for period dates
  const now = new Date()
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await prisma.organizationSubscription.create({
    data: {
      organizationId,
      planId,
      stripeSubscriptionId: subscriptionId,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: oneMonthLater,
    },
  })

  // Update org plan
  await prisma.organization.update({
    where: { id: organizationId },
    data: { plan: plan.tier },
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const dbSub = await prisma.organizationSubscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    include: { plan: true },
  })

  if (!dbSub) return

  await prisma.organizationSubscription.update({
    where: { id: dbSub.id },
    data: {
      status: String(subscription.status ?? 'active'),
    },
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const sub = await prisma.organizationSubscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!sub) return

  await prisma.organizationSubscription.update({
    where: { id: sub.id },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
    },
  })

  // Downgrade org to free
  await prisma.organization.update({
    where: { id: sub.organizationId },
    data: { plan: 'free' },
  })
}

async function handleMarketplacePurchase(session: Stripe.Checkout.Session) {
  const { entityType, entityId, buyerId, sellerId } = session.metadata!
  if (!entityType || !entityId || !buyerId || !sellerId) {
    console.error('Marketplace checkout missing metadata:', session.id)
    return
  }

  const price = (session.amount_total ?? 0) / 100
  const platformFee = price * 0.20
  const sellerRevenue = price - platformFee

  await prisma.marketplacePurchase.create({
    data: {
      buyerId,
      entityType,
      entityId,
      sellerId,
      price,
      currency: 'USD',
      platformFee,
      sellerRevenue,
      stripePaymentIntentId: session.payment_intent as string,
      status: 'completed',
    },
  })

  // Increment download count
  if (entityType === 'session') {
    await prisma.session.update({
      where: { id: entityId },
      data: { downloadCount: { increment: 1 } },
    })
  } else if (entityType === 'program') {
    await prisma.program.update({
      where: { id: entityId },
      data: { downloadCount: { increment: 1 } },
    })
  }

  // Notify seller
  const entity = entityType === 'session'
    ? await prisma.session.findUnique({ where: { id: entityId }, select: { name: true } })
    : await prisma.program.findUnique({ where: { id: entityId }, select: { name: true } })

  await prisma.notification.create({
    data: {
      userId: sellerId,
      actorId: buyerId,
      type: 'system',
      message: `Someone purchased your ${entityType} "${entity?.name ?? 'Unknown'}"`,
    },
  })
}

async function handleAccountUpdated(account: Stripe.Account) {
  const chargesEnabled = account.charges_enabled ?? false
  const payoutsEnabled = account.payouts_enabled ?? false
  const onboarded = chargesEnabled && payoutsEnabled

  await prisma.user.updateMany({
    where: { stripeConnectAccountId: account.id },
    data: { stripeConnectOnboarded: onboarded },
  })
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  const paymentIntentId = transfer.source_transaction as string | null
  if (!paymentIntentId) return

  await prisma.marketplacePurchase.updateMany({
    where: { stripePaymentIntentId: paymentIntentId },
    data: { stripeTransferId: transfer.id },
  })
}
