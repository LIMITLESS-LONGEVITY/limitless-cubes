import { NextRequest } from 'next/server'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { getHealthContext, getWearableLatest, deriveTrainingImplications } from '@/lib/digital-twin'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/clients/:id/health-context
 *
 * Proxies health data from Digital Twin and enriches with training implications.
 * Used by coaches when building routines for a specific client.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: clientId } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  // Verify client exists and belongs to coach's org
  const client = await prisma.client.findFirst({
    where: { id: clientId },
  })

  if (!client) {
    return errorResponse('Client not found', 404)
  }

  // Check coach has access (same org)
  if (client.organizationId) {
    const hasAccess = auth.user.memberships.some(
      (m) => m.organizationId === client.organizationId
    )
    if (!hasAccess) {
      return errorResponse('Not authorized to view this client', 403)
    }
  }

  // Fetch health data from Digital Twin
  const dtUserId = client.digitalTwinId || client.externalUserId

  try {
    const [healthContext, wearableLatest] = await Promise.allSettled([
      getHealthContext(dtUserId),
      getWearableLatest(dtUserId),
    ])

    const health = healthContext.status === 'fulfilled' ? healthContext.value : null
    const wearable = wearableLatest.status === 'fulfilled' ? wearableLatest.value : null

    // Combine and derive training implications
    const combined = {
      ...(health || {}),
      wearableLatest: wearable,
    }

    const implications = deriveTrainingImplications(combined)

    return successResponse({
      client: {
        id: client.id,
        fullName: client.fullName,
        email: client.email,
      },
      healthProfile: health ? (health as Record<string, unknown>).healthProfile : null,
      biomarkers: health ? (health as Record<string, unknown>).biomarkers : null,
      wearable: wearable,
      trainingImplications: implications,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err) {
    // DT may be unavailable — return partial data
    return successResponse({
      client: {
        id: client.id,
        fullName: client.fullName,
        email: client.email,
      },
      healthProfile: null,
      biomarkers: null,
      wearable: null,
      trainingImplications: ['Health data unavailable — Digital Twin service may be down'],
      fetchedAt: new Date().toISOString(),
      error: 'Digital Twin unreachable',
    })
  }
}
