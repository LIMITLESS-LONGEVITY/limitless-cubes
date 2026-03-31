import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/organizations/:id/invitations — List invitations
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  // Verify admin membership
  const membership = auth.user.memberships.find((m) => m.organizationId === id)
  if (!membership || (!membership.isOwner && !membership.isAdmin)) {
    return errorResponse('Admin access required', 403)
  }

  const invitations = await prisma.organizationInvitation.findMany({
    where: { organizationId: id },
    include: {
      inviter: {
        select: { id: true, fullName: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Add computed status
  const data = invitations.map((inv) => ({
    ...inv,
    status: inv.acceptedAt
      ? 'accepted'
      : inv.expiresAt < new Date()
        ? 'expired'
        : 'pending',
  }))

  return successResponse({ data })
}

/**
 * POST /api/v1/organizations/:id/invitations — Create a new invitation
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  // Verify admin membership
  const membership = auth.user.memberships.find((m) => m.organizationId === id)
  if (!membership || (!membership.isOwner && !membership.isAdmin)) {
    return errorResponse('Admin access required', 403)
  }

  const body = await request.json()
  const { email, grantAdmin } = body

  if (!email || typeof email !== 'string') {
    return errorResponse('Valid email is required', 400)
  }

  // Check if already a member
  const existingMember = await prisma.organizationMember.findFirst({
    where: {
      organizationId: id,
      user: { email },
      status: 'active',
    },
  })

  if (existingMember) {
    return errorResponse('User is already a member of this organization', 409)
  }

  // Check for existing pending invitation
  const existingInvite = await prisma.organizationInvitation.findFirst({
    where: {
      organizationId: id,
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  })

  if (existingInvite) {
    return errorResponse('A pending invitation already exists for this email', 409)
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiry

  const invitation = await prisma.organizationInvitation.create({
    data: {
      organizationId: id,
      email: email.toLowerCase().trim(),
      grantAdmin: grantAdmin === true,
      invitedBy: auth.user.id,
      token,
      expiresAt,
    },
    include: {
      inviter: {
        select: { id: true, fullName: true, email: true },
      },
    },
  })

  return successResponse(
    {
      ...invitation,
      status: 'pending',
    },
    201
  )
}
