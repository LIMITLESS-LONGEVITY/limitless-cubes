/**
 * Digital Twin API client for server-side use.
 * Uses service key auth (X-Service-Key header).
 */

const DT_BASE_URL = process.env.DT_API_URL || 'https://limitless-digital-twin.onrender.com'
const DT_SERVICE_KEY = process.env.CUBES_DT_SERVICE_KEY || ''

interface DTRequestOptions {
  method?: string
  body?: unknown
}

async function dtFetch<T>(path: string, options?: DTRequestOptions): Promise<T> {
  const init: RequestInit = {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Key': DT_SERVICE_KEY,
    },
  }
  if (options?.body) {
    init.body = JSON.stringify(options.body)
  }

  const res = await fetch(`${DT_BASE_URL}${path}`, init)

  if (!res.ok) {
    throw new Error(`DT API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

/**
 * Get full health context for a user (health profile, biomarkers, wearable data, recovery).
 */
export async function getHealthContext(userId: string) {
  return dtFetch<Record<string, unknown>>(`/api/twin/${userId}/ai-context`)
}

/**
 * Get latest wearable data (readiness, recovery, HRV, sleep).
 */
export async function getWearableLatest(userId: string) {
  return dtFetch<Record<string, unknown>>(`/api/twin/${userId}/wearables/latest`)
}

/**
 * Get wearable data stream for a time window (for session performance review).
 */
export async function getWearableStream(userId: string, start: string, end: string) {
  return dtFetch<Record<string, unknown>>(
    `/api/twin/${userId}/wearables/stream?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
  )
}

/**
 * Log an activity event to the Digital Twin (e.g., routine_completed).
 */
export async function logActivity(userId: string, activity: {
  type: string
  entityId?: string
  entityType?: string
  metadata?: Record<string, unknown>
}) {
  return dtFetch<Record<string, unknown>>(`/api/twin/${userId}/activity`, {
    method: 'POST',
    body: activity,
  })
}

/**
 * Training implications engine: maps health conditions to exercise constraints.
 * This is a simple rule engine — can be expanded with AI later.
 */
export function deriveTrainingImplications(healthContext: Record<string, unknown>): string[] {
  const implications: string[] = []
  const profile = healthContext.healthProfile as Record<string, unknown> | undefined

  if (!profile) return ['No health profile available — recommend completing health assessment']

  // Check for common conditions and derive training constraints
  const conditions = (profile.conditions as string[]) || []
  const medications = (profile.medications as string[]) || []

  for (const condition of conditions) {
    const lower = condition.toLowerCase()
    if (lower.includes('hypertension') || lower.includes('high blood pressure')) {
      implications.push('Avoid Valsalva maneuver and heavy isometric holds — monitor blood pressure')
    }
    if (lower.includes('diabetes')) {
      implications.push('Monitor blood glucose before and after training — have fast-acting carbs available')
    }
    if (lower.includes('asthma')) {
      implications.push('Extended warm-up recommended — have inhaler accessible during session')
    }
    if (lower.includes('osteoporosis') || lower.includes('osteopenia')) {
      implications.push('Avoid high-impact jumping — focus on weight-bearing and balance exercises')
    }
    if (lower.includes('back') || lower.includes('spinal')) {
      implications.push('Avoid loaded spinal flexion — prioritize core stability and neutral spine exercises')
    }
    if (lower.includes('knee')) {
      implications.push('Limit deep knee flexion — modify squats and lunges to comfortable range')
    }
    if (lower.includes('shoulder')) {
      implications.push('Avoid overhead pressing beyond pain-free range — focus on rotator cuff stability')
    }
  }

  // Wearable-based implications
  const wearable = healthContext.wearableLatest as Record<string, unknown> | undefined
  if (wearable) {
    const readiness = wearable.readinessScore as number | undefined
    if (readiness !== undefined) {
      if (readiness < 60) {
        implications.push(`Low readiness score (${readiness}) — recommend rest day or light mobility only`)
      } else if (readiness < 80) {
        implications.push(`Moderate readiness (${readiness}) — consider reducing intensity by 20-30%`)
      }
    }

    const hrv = wearable.hrvAverage as number | undefined
    const restingHr = wearable.restingHeartRate as number | undefined
    if (restingHr && restingHr > 80) {
      implications.push(`Elevated resting HR (${restingHr} bpm) — possible overtraining or illness, reduce load`)
    }
  }

  if (implications.length === 0) {
    implications.push('No specific constraints — proceed with planned training')
  }

  return implications
}
