import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

/**
 * GET /api/v1/domains — List all domains
 */
export async function GET() {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const domains = await prisma.domain.findMany({
    where: { deletedAt: null, status: 'published' },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { exerciseDomains: true, sessionDomains: true, programDomains: true },
      },
    },
  })

  return successResponse(domains)
}

/**
 * POST /api/v1/domains — Create domain (Head Coach+ only)
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  if (auth.user.role !== 'head_coach') {
    const isOrgAdmin = auth.user.memberships.some((m) => m.isOwner || m.isAdmin)
    if (!isOrgAdmin) return errorResponse('Head Coach or Org Admin required', 403)
  }

  const { name, description } = await request.json()
  if (!name || typeof name !== 'string') return errorResponse('Name is required', 400)

  const membership = auth.user.memberships[0]

  const domain = await prisma.domain.create({
    data: {
      name: name.trim(),
      description: description ?? null,
      status: 'published',
      createdBy: auth.user.id,
      organizationId: membership?.organizationId ?? null,
    },
  })

  return successResponse(domain, 201)
}
