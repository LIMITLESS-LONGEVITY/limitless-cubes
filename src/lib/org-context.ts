/**
 * Organization context management.
 *
 * Coaches can belong to multiple orgs. The "active org" is determined by:
 * 1. X-Organization-Id header (explicit switch)
 * 2. First active membership (default)
 *
 * All content queries are scoped to the active org unless querying
 * community/marketplace content.
 */

import { headers } from 'next/headers'

interface OrgMembership {
  organizationId: string
  organization: { id: string; name: string; slug: string; plan: string }
  isOwner: boolean
  isAdmin: boolean
  status: string
}

interface UserWithMemberships {
  id: string
  role: string
  memberships: OrgMembership[]
}

export interface OrgContext {
  organizationId: string
  organizationName: string
  organizationPlan: string
  isOwner: boolean
  isAdmin: boolean
}

/**
 * Resolve the active organization for the current request.
 * Returns null if user has no active memberships.
 */
export async function getOrgContext(user: UserWithMemberships): Promise<OrgContext | null> {
  const headerStore = await headers()
  const explicitOrgId = headerStore.get('x-organization-id')

  let membership: OrgMembership | undefined

  if (explicitOrgId) {
    membership = user.memberships.find(
      (m) => m.organizationId === explicitOrgId && m.status === 'active'
    )
  }

  if (!membership) {
    membership = user.memberships.find((m) => m.status === 'active')
  }

  if (!membership) return null

  return {
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    organizationPlan: membership.organization.plan,
    isOwner: membership.isOwner,
    isAdmin: membership.isAdmin,
  }
}

/**
 * Build a Prisma where clause that scopes content to the user's org
 * plus community/marketplace content.
 */
export function orgScopedWhere(orgContext: OrgContext | null) {
  if (!orgContext) {
    // No org — only see community and marketplace content
    return {
      OR: [
        { visibility: 'community' as const },
        { visibility: 'marketplace' as const },
      ],
    }
  }

  return {
    OR: [
      { organizationId: orgContext.organizationId },
      { visibility: 'community' as const },
      { visibility: 'marketplace' as const },
    ],
  }
}

/**
 * Check if user can manage (edit/delete) content based on org context.
 */
export function canManageContent(
  user: UserWithMemberships,
  orgContext: OrgContext | null,
  content: { createdBy: string; organizationId: string | null }
): boolean {
  // Creator can always manage their own content
  if (content.createdBy === user.id) return true

  // Head Coach can manage content within their org
  if (user.role === 'head_coach' && orgContext && content.organizationId === orgContext.organizationId) {
    return true
  }

  // Org Owner/Admin can manage content within their org
  if (orgContext && content.organizationId === orgContext.organizationId) {
    if (orgContext.isOwner || orgContext.isAdmin) return true
  }

  return false
}
