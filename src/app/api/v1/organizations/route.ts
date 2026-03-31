import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

/**
 * GET /api/v1/organizations — List organizations the current user belongs to
 */
export async function GET() {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId: auth.user.id,
      status: 'active',
    },
    include: {
      organization: {
        include: {
          _count: {
            select: {
              members: true,
              exercises: true,
              sessions: true,
              programs: true,
            },
          },
        },
      },
    },
  })

  const orgs = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    logoUrl: m.organization.logoUrl,
    plan: m.organization.plan,
    status: m.organization.status,
    defaultVisibility: m.organization.defaultVisibility,
    isOwner: m.isOwner,
    isAdmin: m.isAdmin,
    _count: m.organization._count,
  }))

  return successResponse({ data: orgs })
}
