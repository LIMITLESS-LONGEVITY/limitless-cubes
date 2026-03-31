import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

/**
 * GET /api/v1/me/coach/activity — Coach activity feed for OS Dashboard widget
 *
 * Returns recent coach activity: exercises/sessions/programs created,
 * assignments given/received, client completions.
 */
export async function GET() {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const userId = auth.user.id
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // last 7 days

  const [
    recentExercises,
    recentSessions,
    recentPrograms,
    assignmentsGiven,
    assignmentsReceived,
  ] = await Promise.all([
    prisma.exercise.count({
      where: { createdBy: userId, createdAt: { gte: since }, deletedAt: null },
    }),
    prisma.session.count({
      where: { createdBy: userId, createdAt: { gte: since }, deletedAt: null },
    }),
    prisma.program.count({
      where: { createdBy: userId, createdAt: { gte: since }, deletedAt: null },
    }),
    prisma.sessionAssignment.count({
      where: { assignedBy: userId, createdAt: { gte: since } },
    }),
    prisma.sessionAssignment.count({
      where: { assignedTo: userId, status: 'pending' },
    }),
  ])

  // Recent content (last 5 items created)
  const recentContent = await prisma.session.findMany({
    where: { createdBy: userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, status: true, durationSeconds: true, createdAt: true },
  })

  return successResponse({
    stats: {
      exercisesCreated: recentExercises,
      sessionsCreated: recentSessions,
      programsCreated: recentPrograms,
      assignmentsGiven,
      pendingAssignments: assignmentsReceived,
    },
    recentContent,
    period: '7d',
  })
}
