import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { z } from 'zod/v4'

interface RouteParams {
  params: Promise<{ id: string }>
}

const inviteSchema = z.object({
  email: z.string().email(),
  grantAdmin: z.boolean().optional(),
})

/**
 * GET /api/v1/organizations/:id/invitations — List pending invitations
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const membership = auth.user.memberships.find(
    (m) => m.organizationId === id && (m.isOwner || m.isAdmin)
  )
  if (!membership) return errorResponse('Owner or Admin required', 403)

  const invitations = await prisma.organizationInvitation.findMany({
    where: { organizationId: id, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    include: { inviter: { select: { fullName: true } } },
  })

  return successResponse(invitations)
}

/**
 * POST /api/v1/organizations/:id/invitations — Invite a coach to the org
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const membership = auth.user.memberships.find(
    (m) => m.organizationId === id && (m.isOwner || m.isAdmin)
  )
  if (!membership) return errorResponse('Owner or Admin required', 403)

  const body = await request.json()
  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) return errorResponse('Validation failed', 400)

  // Check if already a member
  const existingMember = await prisma.organizationMember.findFirst({
    where: {
      organizationId: id,
      user: { email: parsed.data.email },
      status: 'active',
    },
  })
  if (existingMember) return errorResponse('User is already a member', 409)

  // Check for existing pending invitation
  const existingInvite = await prisma.organizationInvitation.findFirst({
    where: {
      organizationId: id,
      email: parsed.data.email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  })
  if (existingInvite) return errorResponse('Invitation already pending for this email', 409)

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const invitation = await prisma.organizationInvitation.create({
    data: {
      organizationId: id,
      email: parsed.data.email,
      grantAdmin: parsed.data.grantAdmin ?? false,
      invitedBy: auth.user.id,
      token,
      expiresAt,
    },
    include: { organization: { select: { name: true } } },
  })

  // TODO: Send invitation email with link containing token

  return successResponse({
    id: invitation.id,
    email: invitation.email,
    token: invitation.token,
    expiresAt: invitation.expiresAt,
    organizationName: invitation.organization.name,
    inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/train/invite/${token}`,
  }, 201)
}
