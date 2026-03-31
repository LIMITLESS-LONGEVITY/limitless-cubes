import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/organizations/:id — Get organization detail
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

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          members: true,
          exercises: true,
          sessions: true,
          programs: true,
          invitations: true,
        },
      },
    },
  })

  if (!org) {
    return errorResponse('Organization not found', 404)
  }

  return successResponse({
    ...org,
    isOwner: membership.isOwner,
    isAdmin: membership.isAdmin,
  })
}

/**
 * PATCH /api/v1/organizations/:id — Update organization settings
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  // Only owner or admin can update
  const membership = auth.user.memberships.find((m) => m.organizationId === id)
  if (!membership || (!membership.isOwner && !membership.isAdmin)) {
    return errorResponse('Admin access required', 403)
  }

  const body = await request.json()
  const { name, logoUrl, defaultVisibility } = body

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (logoUrl !== undefined) updateData.logoUrl = logoUrl
  if (defaultVisibility !== undefined) updateData.defaultVisibility = defaultVisibility

  const org = await prisma.organization.update({
    where: { id },
    data: updateData,
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
  })

  return successResponse(org)
}
