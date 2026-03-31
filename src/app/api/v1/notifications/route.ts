import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

/**
 * GET /api/v1/notifications — Get current user's notifications
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true'
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 20), 100)

  const notifications = await prisma.notification.findMany({
    where: {
      userId: auth.user.id,
      ...(unreadOnly && { isRead: false }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      actor: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  })

  const unreadCount = await prisma.notification.count({
    where: { userId: auth.user.id, isRead: false },
  })

  return successResponse({ data: notifications, unreadCount })
}

/**
 * PATCH /api/v1/notifications — Mark notifications as read
 */
export async function PATCH(request: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const { ids } = await request.json()

  if (ids === 'all') {
    await prisma.notification.updateMany({
      where: { userId: auth.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
  } else if (Array.isArray(ids)) {
    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId: auth.user.id },
      data: { isRead: true, readAt: new Date() },
    })
  }

  return successResponse({ message: 'Notifications updated' })
}
