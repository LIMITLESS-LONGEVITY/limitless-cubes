import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/sessions/:id/like — Toggle like on session
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const existing = await prisma.sessionLike.findUnique({
    where: { sessionId_userId: { sessionId: id, userId: auth.user.id } },
  })

  if (existing) {
    await prisma.sessionLike.delete({ where: { id: existing.id } })
    return successResponse({ liked: false })
  }

  await prisma.sessionLike.create({
    data: { sessionId: id, userId: auth.user.id },
  })

  return successResponse({ liked: true }, 201)
}
