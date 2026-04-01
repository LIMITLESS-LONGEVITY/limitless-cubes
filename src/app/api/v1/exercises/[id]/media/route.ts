import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/exercises/:id/media — Add media to an exercise
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const exercise = await prisma.exercise.findFirst({
    where: { id, deletedAt: null },
  })

  if (!exercise) {
    return errorResponse('Exercise not found', 404)
  }

  if (exercise.createdBy !== auth.user.id) {
    return errorResponse('Only the exercise creator can add media', 403)
  }

  const body = await request.json()
  const { type, url, position } = body as { type?: string; url?: string; position?: number }

  if (!type || !url) {
    return errorResponse('type and url are required', 400)
  }

  const validTypes = ['youtube', 'image', 'video']
  if (!validTypes.includes(type)) {
    return errorResponse(`type must be one of: ${validTypes.join(', ')}`, 400)
  }

  // Determine position — use provided or append at end
  let finalPosition = position
  if (finalPosition === undefined || finalPosition === null) {
    const maxPos = await prisma.exerciseMedia.aggregate({
      where: { exerciseId: id },
      _max: { position: true },
    })
    finalPosition = (maxPos._max.position ?? -1) + 1
  }

  const media = await prisma.exerciseMedia.create({
    data: {
      exerciseId: id,
      mediaType: type as 'youtube' | 'image' | 'video',
      url,
      position: finalPosition,
    },
  })

  return successResponse(media, 201)
}
