import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

/**
 * GET /api/v1/me — Get current authenticated user profile
 */
export async function GET() {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  return successResponse({
    id: auth.user.id,
    email: auth.user.email,
    fullName: auth.user.fullName,
    avatarUrl: auth.user.avatarUrl,
    role: auth.user.role,
    reputationScore: auth.user.reputationScore,
    memberships: auth.user.memberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      isOwner: m.isOwner,
      isAdmin: m.isAdmin,
    })),
  })
}
