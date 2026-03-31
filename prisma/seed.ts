// Seed default data for development and initial deployment
// Run: npx tsx prisma/seed.ts

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // ── 1. LIMITLESS Organization ──────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'limitless' },
    update: {},
    create: {
      name: 'LIMITLESS Longevity',
      slug: 'limitless',
      plan: 'enterprise',
      status: 'active',
    },
  })
  console.log(`Organization: ${org.name} (${org.id})`)

  // ── 2. Test Admin User ─────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@limitless-longevity.health' },
    update: {},
    create: {
      externalUserId: '1',
      email: 'admin@limitless-longevity.health',
      fullName: 'LIMITLESS Admin',
      role: 'head_coach',
    },
  })
  console.log(`Admin user: ${adminUser.email} (${adminUser.id})`)

  // ── 3. Second Test User (Coach) ────────────────────────────────
  const coachUser = await prisma.user.upsert({
    where: { email: 'coach@limitless-longevity.health' },
    update: {},
    create: {
      externalUserId: '2',
      email: 'coach@limitless-longevity.health',
      fullName: 'LIMITLESS Coach',
      role: 'senior_coach',
    },
  })
  console.log(`Coach user: ${coachUser.email} (${coachUser.id})`)

  // ── 4. Org Memberships ─────────────────────────────────────────
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: adminUser.id,
      isOwner: true,
      isAdmin: true,
      status: 'active',
    },
  })
  console.log(`Admin added as org owner`)

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: coachUser.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: coachUser.id,
      isOwner: false,
      isAdmin: false,
      status: 'active',
    },
  })
  console.log(`Coach added as org member`)

  // ── 5. Default Phases ──────────────────────────────────────────
  const phases = [
    { name: 'Warm-Up', sortOrder: 1, isDefault: true },
    { name: 'Main', sortOrder: 2, isDefault: true },
    { name: 'Cooldown', sortOrder: 3, isDefault: true },
  ] as const

  for (const phase of phases) {
    await prisma.phase.upsert({
      where: {
        name_organizationId: {
          name: phase.name,
          organizationId: org.id,
        },
      },
      update: {},
      create: {
        name: phase.name,
        sortOrder: phase.sortOrder,
        isDefault: phase.isDefault,
        organizationId: org.id,
        createdBy: adminUser.id,
      },
    })
  }
  console.log(`Phases seeded: ${phases.map((p) => p.name).join(', ')}`)

  // ── 6. Default Difficulty Levels ───────────────────────────────
  const levels = [
    { label: 'Beginner', sortOrder: 1 },
    { label: 'Intermediate', sortOrder: 2 },
    { label: 'Advanced', sortOrder: 3 },
    { label: 'Elite', sortOrder: 4 },
  ] as const

  for (const level of levels) {
    await prisma.difficultyLevel.upsert({
      where: {
        label_organizationId: {
          label: level.label,
          organizationId: org.id,
        },
      },
      update: {},
      create: {
        label: level.label,
        sortOrder: level.sortOrder,
        organizationId: org.id,
        createdBy: adminUser.id,
      },
    })
  }
  console.log(`Difficulty levels seeded: ${levels.map((l) => l.label).join(', ')}`)

  // ── 7. Default Domains ─────────────────────────────────────────
  const domainNames = [
    'Movement',
    'Strength',
    'Cardio',
    'Mobility',
    'Recovery',
    'Mental Wellness',
    'Parkour',
    'Dance',
  ]

  for (const name of domainNames) {
    await prisma.domain.upsert({
      where: {
        name_organizationId: {
          name,
          organizationId: org.id,
        },
      },
      update: {},
      create: {
        name,
        status: 'published',
        organizationId: org.id,
        createdBy: adminUser.id,
      },
    })
  }
  console.log(`Domains seeded: ${domainNames.join(', ')}`)

  // ── 7. Subscription Plans ──────────────────────────────────
  const plans: Array<{
    tier: 'free' | 'pro' | 'team' | 'business' | 'enterprise'
    name: string
    priceMonthly: number
    priceAnnual: number
    maxCoaches: number
    maxClients: number
    features: string[]
  }> = [
    {
      tier: 'free',
      name: 'Free',
      priceMonthly: 0,
      priceAnnual: 0,
      maxCoaches: 1,
      maxClients: 3,
      features: ['Full builder', 'Community library', '50 exercises', '10 programs'],
    },
    {
      tier: 'pro',
      name: 'Pro',
      priceMonthly: 19,
      priceAnnual: 190,
      maxCoaches: 1,
      maxClients: 25,
      features: ['Unlimited content', 'Publish to community', 'Templates', 'Basic analytics', 'DT health context'],
    },
    {
      tier: 'team',
      name: 'Team',
      priceMonthly: 79,
      priceAnnual: 790,
      maxCoaches: 10,
      maxClients: 100,
      features: ['Org library', 'Assignment workflows', 'Team analytics', 'Custom domains'],
    },
    {
      tier: 'business',
      name: 'Business',
      priceMonthly: 199,
      priceAnnual: 1990,
      maxCoaches: 50,
      maxClients: 500,
      features: ['Advanced analytics', 'Custom branding', 'Priority support', 'API access', 'Marketplace'],
    },
    {
      tier: 'enterprise',
      name: 'Enterprise',
      priceMonthly: 499,
      priceAnnual: 4990,
      maxCoaches: 999,
      maxClients: 999,
      features: ['Franchise hierarchy', 'SSO', 'SLA', 'Dedicated account manager', 'White-label'],
    },
  ]

  for (const plan of plans) {
    const existing = await prisma.subscriptionPlan.findFirst({ where: { tier: plan.tier } })
    if (existing) {
      await prisma.subscriptionPlan.update({
        where: { id: existing.id },
        data: {
          name: plan.name,
          priceMonthly: plan.priceMonthly,
          priceAnnual: plan.priceAnnual,
          maxCoaches: plan.maxCoaches,
          maxClients: plan.maxClients,
          features: plan.features,
          active: true,
        },
      })
    } else {
      await prisma.subscriptionPlan.create({
        data: {
          tier: plan.tier,
          name: plan.name,
          priceMonthly: plan.priceMonthly,
          priceAnnual: plan.priceAnnual,
          maxCoaches: plan.maxCoaches,
          maxClients: plan.maxClients,
          features: plan.features,
          active: true,
        },
      })
    }
  }
  console.log(`Plans seeded: ${plans.map((p) => p.name).join(', ')}`)

  console.log('\nSeed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
