import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/programs/:id/like — Toggle like on program
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const existing = await prisma.programLike.findUnique({
    where: { programId_userId: { programId: id, userId: auth.user.id } },
  })

  if (existing) {
    await prisma.programLike.delete({ where: { id: existing.id } })
    return successResponse({ liked: false })
  }

  await prisma.programLike.create({
    data: { programId: id, userId: auth.user.id },
  })

  return successResponse({ liked: true }, 201)
}
