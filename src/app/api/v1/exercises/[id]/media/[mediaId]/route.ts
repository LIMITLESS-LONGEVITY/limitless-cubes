import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string; mediaId: string }>
}

/**
 * DELETE /api/v1/exercises/:id/media/:mediaId — Delete exercise media
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id, mediaId } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const exercise = await prisma.exercise.findFirst({
    where: { id, deletedAt: null },
  })

  if (!exercise) {
    return errorResponse('Exercise not found', 404)
  }

  if (exercise.createdBy !== auth.user.id) {
    return errorResponse('Only the exercise creator can delete media', 403)
  }

  const media = await prisma.exerciseMedia.findFirst({
    where: { id: mediaId, exerciseId: id },
  })

  if (!media) {
    return errorResponse('Media not found', 404)
  }

  await prisma.exerciseMedia.delete({
    where: { id: mediaId },
  })

  return successResponse({ message: 'Media deleted' })
}
