import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { canSellOnMarketplace } from '@/lib/stripe'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/v1/sessions/:id/marketplace — Set marketplace pricing and visibility
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const session = await prisma.session.findFirst({
    where: { id, deletedAt: null },
  })
  if (!session) return errorResponse('Session not found', 404)
  if (session.createdBy !== auth.user.id) return errorResponse('Only the creator can set marketplace pricing', 403)

  // Check Pro tier+
  const orgMember = auth.user.memberships[0]
  if (!orgMember) return errorResponse('No organization membership', 403)
  const org = await prisma.organization.findUnique({ where: { id: orgMember.organizationId } })
  if (!org || !canSellOnMarketplace(org.plan)) {
    return errorResponse('Upgrade to Pro or higher to sell on the marketplace', 403)
  }

  const body = await request.json()
  const { marketplacePrice, visibility } = body

  if (visibility === 'marketplace' && (!marketplacePrice || marketplacePrice < 2.99)) {
    return errorResponse('Marketplace price must be at least $2.99', 400)
  }

  const updated = await prisma.session.update({
    where: { id },
    data: {
      ...(marketplacePrice !== undefined ? { marketplacePrice } : {}),
      ...(visibility !== undefined ? { visibility } : {}),
    },
  })

  return successResponse(updated)
}
