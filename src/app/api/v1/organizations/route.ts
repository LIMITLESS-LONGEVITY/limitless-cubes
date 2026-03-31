import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

/**
 * GET /api/v1/organizations — List organizations the user belongs to
 */
export async function GET() {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: auth.user.id, status: 'active' },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          plan: true,
          status: true,
          _count: { select: { members: true, exercises: true, sessions: true, programs: true } },
        },
      },
    },
  })

  return successResponse(
    memberships.map((m) => ({
      ...m.organization,
      isOwner: m.isOwner,
      isAdmin: m.isAdmin,
      joinedAt: m.joinedAt,
    }))
  )
}
