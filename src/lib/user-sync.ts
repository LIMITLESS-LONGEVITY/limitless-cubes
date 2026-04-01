import { prisma } from './prisma'
import type { JWTPayload } from './auth'

/**
 * Find or create a local Cubes+ user from the LIMITLESS SSO JWT payload.
 * New users default to 'athlete' role. Coach roles assigned via org invitation.
 * If a Client record exists with this email, link it (Client→User bridge).
 */
export async function syncUser(payload: JWTPayload) {
  const externalId = String(payload.id)

  const user = await prisma.user.upsert({
    where: { externalUserId: externalId },
    update: {
      lastLoginAt: new Date(),
    },
    create: {
      externalUserId: externalId,
      email: payload.email,
      fullName: payload.email.split('@')[0],
      role: 'athlete',
      lastLoginAt: new Date(),
    },
    include: {
      memberships: {
        where: { status: 'active' },
        include: { organization: true },
      },
    },
  })

  // If user has active org memberships and role is athlete, upgrade to junior_coach.
  // This handles the case where a coach was invited to an org before they first logged in.
  if (user.role === 'athlete' && user.memberships.length > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'junior_coach' },
    })
    user.role = 'junior_coach'
  }

  // Bridge: link Client record if one exists with matching email but no userId
  await prisma.client.updateMany({
    where: {
      email: payload.email,
      userId: null,
    },
    data: {
      userId: user.id,
    },
  })

  return user
}
