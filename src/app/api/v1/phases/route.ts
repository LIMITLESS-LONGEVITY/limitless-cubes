import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

/**
 * GET /api/v1/phases — List all phases (for builder phase zones)
 */
export async function GET() {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const phases = await prisma.phase.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  return successResponse(phases)
}

/**
 * POST /api/v1/phases — Create phase (Head Coach+ only)
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  if (auth.user.role !== 'head_coach') {
    const isOrgAdmin = auth.user.memberships.some((m) => m.isOwner || m.isAdmin)
    if (!isOrgAdmin) return errorResponse('Head Coach or Org Admin required', 403)
  }

  const { name, sortOrder, isDefault } = await request.json()
  if (!name || typeof name !== 'string') return errorResponse('Name is required', 400)

  const membership = auth.user.memberships[0]

  const phase = await prisma.phase.create({
    data: {
      name: name.trim(),
      sortOrder: sortOrder ?? 0,
      isDefault: isDefault ?? false,
      createdBy: auth.user.id,
      organizationId: membership?.organizationId ?? null,
    },
  })

  return successResponse(phase, 201)
}
