import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { z } from 'zod/v4'

const createClientSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(255),
  digitalTwinId: z.string().optional(),
})

/**
 * GET /api/v1/clients — List clients for coach's organization
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const search = request.nextUrl.searchParams.get('search') || ''
  const membership = auth.user.memberships[0]

  if (!membership) {
    return successResponse({ data: [], total: 0 })
  }

  const clients = await prisma.client.findMany({
    where: {
      organizationId: membership.organizationId,
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    },
    orderBy: { fullName: 'asc' },
    include: {
      programAssignments: {
        where: { status: { in: ['assigned', 'active'] } },
        include: { program: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
      _count: { select: { programAssignments: true } },
    },
  })

  return successResponse({ data: clients, total: clients.length })
}

/**
 * POST /api/v1/clients — Create a client entry (coach invites client)
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const parsed = createClientSchema.safeParse(body)
  if (!parsed.success) return errorResponse('Validation failed', 400)

  const membership = auth.user.memberships[0]

  // Check for existing client with same email in org
  const existing = await prisma.client.findFirst({
    where: {
      email: parsed.data.email,
      organizationId: membership?.organizationId,
    },
  })

  if (existing) {
    return errorResponse('A client with this email already exists in your organization', 409)
  }

  const client = await prisma.client.create({
    data: {
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      externalUserId: `pending-${Date.now()}`, // Placeholder until client registers via SSO
      organizationId: membership?.organizationId ?? null,
      digitalTwinId: parsed.data.digitalTwinId ?? null,
    },
  })

  return successResponse(client, 201)
}
