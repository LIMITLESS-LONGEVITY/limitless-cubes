import { NextRequest } from 'next/server'
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils'
import { rateSchema, respondSchema, upsertRating, getRatings, addCreatorResponse } from '@/lib/ratings'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/exercises/:id/rate — Get ratings for an exercise
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const limit = Number(request.nextUrl.searchParams.get('limit') || 20)
  const offset = Number(request.nextUrl.searchParams.get('offset') || 0)

  const result = await getRatings('exercise', id, limit, offset)
  return successResponse(result)
}

/**
 * POST /api/v1/exercises/:id/rate — Rate an exercise (1-5 stars + optional review)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const parsed = rateSchema.safeParse(body)
  if (!parsed.success) return errorResponse('Validation failed', 400)

  const rating = await upsertRating('exercise', id, auth.user.id, parsed.data)
  return successResponse(rating, 201)
}

/**
 * PATCH /api/v1/exercises/:id/rate — Creator responds to a rating
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { ratingId, ...rest } = body
  if (!ratingId) return errorResponse('ratingId is required', 400)

  const parsed = respondSchema.safeParse(rest)
  if (!parsed.success) return errorResponse('Validation failed', 400)

  const result = await addCreatorResponse(ratingId, auth.user.id, 'exercise', parsed.data.creatorResponse)
  if (!result) return errorResponse('Rating not found', 404)
  if (result === 'not_creator') return errorResponse('Only the content creator can respond', 403)

  return successResponse(result)
}
