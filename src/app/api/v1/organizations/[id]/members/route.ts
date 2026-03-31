import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { z } from 'zod/v4'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/organizations/:id/members — List org members
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const membership = auth.user.memberships.find((m) => m.organizationId === id)
  if (!membership) return errorResponse('Not a member of this organization', 403)

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: id, status: 'active' },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
          role: true,
          lastLoginAt: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  return successResponse(members)
}

const updateMemberSchema = z.object({
  isAdmin: z.boolean().optional(),
  status: z.enum(['active', 'suspended', 'departed']).optional(),
})

/**
 * PATCH /api/v1/organizations/:id/members — Update a member's org permissions
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const membership = auth.user.memberships.find(
    (m) => m.organizationId === id && (m.isOwner || m.isAdmin)
  )
  if (!membership) return errorResponse('Owner or Admin required', 403)

  const body = await request.json()
  const { memberId, ...updates } = body
  if (!memberId) return errorResponse('memberId is required', 400)

  const parsed = updateMemberSchema.safeParse(updates)
  if (!parsed.success) return errorResponse('Validation failed', 400)

  // Can't modify the owner
  const target = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: id },
  })
  if (!target) return errorResponse('Member not found', 404)
  if (target.isOwner) return errorResponse('Cannot modify the organization owner', 403)

  // Only owners can grant/revoke admin
  if (parsed.data.isAdmin !== undefined && !membership.isOwner) {
    return errorResponse('Only the owner can grant or revoke admin permissions', 403)
  }

  const updated = await prisma.organizationMember.update({
    where: { id: memberId },
    data: parsed.data,
    include: {
      user: { select: { id: true, fullName: true, email: true, role: true } },
    },
  })

  return successResponse(updated)
}
