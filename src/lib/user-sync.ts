import { prisma } from './prisma'
import type { JWTPayload } from './auth'

/**
 * Find or create a local Cubes+ user from the LIMITLESS SSO JWT payload.
 * Called on every authenticated request (uses upsert for idempotency).
 */
export async function syncUser(payload: JWTPayload) {
  const user = await prisma.user.upsert({
    where: { externalUserId: String(payload.id) },
    update: {
      lastLoginAt: new Date(),
    },
    create: {
      externalUserId: String(payload.id),
      email: payload.email,
      fullName: payload.email.split('@')[0], // Placeholder — updated on profile sync
      role: 'junior_coach',
      lastLoginAt: new Date(),
    },
    include: {
      memberships: {
        where: { status: 'active' },
        include: { organization: true },
      },
    },
  })

  return user
}
