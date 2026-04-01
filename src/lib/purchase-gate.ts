import { prisma } from './prisma'

export type ContentAccess = 'full' | 'preview' | 'denied'

/**
 * Check if a user has access to marketplace content.
 * Returns 'full' (purchased/creator/free), 'preview' (marketplace, not purchased), or 'denied' (private/org).
 */
export async function checkContentAccess(
  userId: string,
  entityType: 'session' | 'program',
  entityId: string,
  visibility: string,
  createdById: string,
  userOrgIds: string[]
): Promise<ContentAccess> {
  // Creator always has full access
  if (createdById === userId) return 'full'

  switch (visibility) {
    case 'private':
      return 'denied'

    case 'organization': {
      // Check if user shares an org with the content
      const entity = entityType === 'session'
        ? await prisma.session.findUnique({ where: { id: entityId }, select: { organizationId: true } })
        : await prisma.program.findUnique({ where: { id: entityId }, select: { organizationId: true } })
      if (entity?.organizationId && userOrgIds.includes(entity.organizationId)) return 'full'
      return 'denied'
    }

    case 'community':
      return 'full'

    case 'marketplace': {
      // Check if user has purchased this content
      const purchase = await prisma.marketplacePurchase.findFirst({
        where: { buyerId: userId, entityType, entityId, status: 'completed' },
      })
      return purchase ? 'full' : 'preview'
    }

    default:
      return 'denied'
  }
}
