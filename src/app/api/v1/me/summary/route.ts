import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'

/**
 * GET /api/v1/me/summary — Summary for OS Dashboard app launcher card
 *
 * Returns counts and quick stats for the Cubes+ "Train" card.
 */
export async function GET() {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const userId = auth.user.id

  const [exerciseCount, sessionCount, programCount, pendingAssignments] = await Promise.all([
    prisma.exercise.count({ where: { createdBy: userId, deletedAt: null } }),
    prisma.session.count({ where: { createdBy: userId, deletedAt: null } }),
    prisma.program.count({ where: { createdBy: userId, deletedAt: null } }),
    prisma.sessionAssignment.count({ where: { assignedTo: userId, status: 'pending' } }),
  ])

  return successResponse({
    exercises: exerciseCount,
    sessions: sessionCount,
    programs: programCount,
    pendingAssignments,
    label: pendingAssignments > 0
      ? `${pendingAssignments} pending assignment${pendingAssignments > 1 ? 's' : ''}`
      : `${sessionCount} sessions created`,
  })
}
