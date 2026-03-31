import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { z } from 'zod/v4'

interface RouteParams {
  params: Promise<{ id: string }>
}

const assignSchema = z.object({
  assignedTo: z.string().uuid(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
})

/**
 * POST /api/v1/sessions/:id/assign — Assign session to another coach
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  // Junior coaches cannot assign
  if (auth.user.role === 'junior_coach') {
    return errorResponse('Junior coaches cannot assign sessions', 403)
  }

  const body = await request.json()
  const parsed = assignSchema.safeParse(body)
  if (!parsed.success) return errorResponse('Validation failed', 400)

  const session = await prisma.session.findFirst({ where: { id, deletedAt: null } })
  if (!session) return errorResponse('Session not found', 404)

  const assignment = await prisma.sessionAssignment.create({
    data: {
      sessionId: id,
      assignedBy: auth.user.id,
      assignedTo: parsed.data.assignedTo,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      notes: parsed.data.notes ?? null,
    },
    include: {
      session: { select: { id: true, name: true } },
      assigner: { select: { id: true, fullName: true } },
      assignee: { select: { id: true, fullName: true } },
    },
  })

  // Create notification for assignee
  await prisma.notification.create({
    data: {
      userId: parsed.data.assignedTo,
      type: 'assignment_created',
      message: `${auth.user.fullName} assigned you "${session.name}"`,
      sessionId: id,
      sessionAssignmentId: assignment.id,
      actorId: auth.user.id,
    },
  })

  return successResponse(assignment, 201)
}
