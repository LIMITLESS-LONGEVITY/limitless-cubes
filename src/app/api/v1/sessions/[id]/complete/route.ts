import { NextRequest } from 'next/server'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { logActivity } from '@/lib/digital-twin'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

interface RouteParams {
  params: Promise<{ id: string }>
}

const completeSchema = z.object({
  durationSeconds: z.number().int().min(0).optional(),
  subjectiveRPE: z.number().int().min(1).max(10).optional(),
  feedback: z.string().optional(),
  clientId: z.string().uuid().optional(),
  programAssignmentId: z.string().uuid().optional(),
})

/**
 * POST /api/v1/sessions/:id/complete — Log session completion
 *
 * Records completion and logs the event to Digital Twin for the
 * longevity score exercise pillar and wearable data correlation.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const parsed = completeSchema.safeParse(body)
  if (!parsed.success) return errorResponse('Validation failed', 400)

  const session = await prisma.session.findFirst({
    where: { id: sessionId, deletedAt: null },
    select: { id: true, name: true, durationSeconds: true },
  })

  if (!session) return errorResponse('Session not found', 404)

  // Log to Digital Twin (fire-and-forget — don't block response on DT availability)
  const dtUserId = auth.user.externalUserId
  logActivity(dtUserId, {
    type: 'session_completed',
    entityId: sessionId,
    entityType: 'session',
    metadata: {
      sessionName: session.name,
      plannedDurationSeconds: session.durationSeconds,
      actualDurationSeconds: parsed.data.durationSeconds,
      subjectiveRPE: parsed.data.subjectiveRPE,
      completedBy: auth.user.id,
      completedAt: new Date().toISOString(),
    },
  }).catch((err) => {
    console.error('Failed to log session completion to DT:', err.message)
  })

  return successResponse({
    message: 'Session completion logged',
    sessionId,
    completedAt: new Date().toISOString(),
  })
}
