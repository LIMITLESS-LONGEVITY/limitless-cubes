import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

/**
 * GET /api/v1/difficulty-levels — List all difficulty levels
 */
export async function GET() {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const levels = await prisma.difficultyLevel.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  return successResponse(levels)
}

/**
 * POST /api/v1/difficulty-levels — Create (Head Coach+ only)
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  if (auth.user.role !== 'head_coach') {
    const isOrgAdmin = auth.user.memberships.some((m) => m.isOwner || m.isAdmin)
    if (!isOrgAdmin) return errorResponse('Head Coach or Org Admin required', 403)
  }

  const { label, sortOrder } = await request.json()
  if (!label || typeof label !== 'string') return errorResponse('Label is required', 400)

  const membership = auth.user.memberships[0]

  const level = await prisma.difficultyLevel.create({
    data: {
      label: label.trim(),
      sortOrder: sortOrder ?? 0,
      createdBy: auth.user.id,
      organizationId: membership?.organizationId ?? null,
    },
  })

  return successResponse(level, 201)
}
