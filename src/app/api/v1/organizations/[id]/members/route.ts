import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/organizations/:id/members — List organization members
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  // Verify membership
  const membership = auth.user.memberships.find((m) => m.organizationId === id)
  if (!membership) {
    return errorResponse('Organization not found or not a member', 404)
  }

  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId: id,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
          role: true,
        },
      },
    },
    orderBy: [
      { isOwner: 'desc' },
      { isAdmin: 'desc' },
      { joinedAt: 'asc' },
    ],
  })

  return successResponse({ data: members })
}

/**
 * PATCH /api/v1/organizations/:id/members — Update a member (toggle admin, suspend)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  // Only owner or admin can manage members
  const membership = auth.user.memberships.find((m) => m.organizationId === id)
  if (!membership || (!membership.isOwner && !membership.isAdmin)) {
    return errorResponse('Admin access required', 403)
  }

  const body = await request.json()
  const { memberId, isAdmin, status } = body

  if (!memberId) {
    return errorResponse('memberId is required', 400)
  }

  const target = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: id },
  })

  if (!target) {
    return errorResponse('Member not found', 404)
  }

  // Cannot modify org owner
  if (target.isOwner) {
    return errorResponse('Cannot modify the organization owner', 403)
  }

  // Only owners can toggle admin
  if (isAdmin !== undefined && !membership.isOwner) {
    return errorResponse('Only the organization owner can grant or revoke admin', 403)
  }

  const updateData: Record<string, unknown> = {}
  if (isAdmin !== undefined) updateData.isAdmin = isAdmin
  if (status !== undefined) updateData.status = status

  const updated = await prisma.organizationMember.update({
    where: { id: memberId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
          role: true,
        },
      },
    },
  })

  return successResponse(updated)
}
