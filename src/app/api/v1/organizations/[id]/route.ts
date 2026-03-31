import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/organizations/:id — Get organization details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  // Must be a member
  const membership = auth.user.memberships.find(
    (m) => m.organizationId === id
  )
  if (!membership) return errorResponse('Not a member of this organization', 403)

  const org = await prisma.organization.findFirst({
    where: { id, deletedAt: null },
    include: {
      members: {
        where: { status: 'active' },
        include: {
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true, role: true } },
        },
      },
      _count: {
        select: { exercises: true, sessions: true, programs: true, clients: true },
      },
    },
  })

  if (!org) return errorResponse('Organization not found', 404)

  return successResponse({
    ...org,
    currentUserIsOwner: membership.isOwner,
    currentUserIsAdmin: membership.isAdmin,
  })
}

/**
 * PATCH /api/v1/organizations/:id — Update org settings (Owner/Admin only)
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
  const allowedFields = ['name', 'logoUrl', 'brandColors', 'settings', 'defaultVisibility']
  const data: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field]
  }

  const org = await prisma.organization.update({
    where: { id },
    data,
  })

  return successResponse(org)
}
