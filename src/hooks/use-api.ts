'use client'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_PATH || ''

/**
 * Fetch wrapper that includes credentials and base path.
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `API error: ${res.status}`)
  }

  return res.json()
}

// ═══════════════════════════════════════════════════════════════
// Exercise API
// ═══════════════════════════════════════════════════════════════

export interface Exercise {
  id: string
  name: string
  description: string | null
  durationSeconds: number
  status: string
  visibility: string
  creatorNotes: string | null
  allDomains: boolean
  createdBy: string
  organizationId: string | null
  difficultyLevel: { id: string; label: string } | null
  creator: { id: string; fullName: string; avatarUrl: string | null }
  domains: Array<{ domain: { id: string; name: string } }>
  media: Array<{ id: string; mediaType: string; url: string; title: string | null; position: number }>
  _count: { sessionExercises: number; likes: number; forks: number }
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export const exerciseApi = {
  list: (params?: Record<string, string>) =>
    apiFetch<PaginatedResponse<Exercise>>(
      `/api/v1/exercises${params ? '?' + new URLSearchParams(params) : ''}`
    ),
  get: (id: string) => apiFetch<Exercise>(`/api/v1/exercises/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<Exercise>('/api/v1/exercises', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<Exercise>(`/api/v1/exercises/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/v1/exercises/${id}`, { method: 'DELETE' }),
}

// ═══════════════════════════════════════════════════════════════
// Session API
// ═══════════════════════════════════════════════════════════════

export interface Session {
  id: string
  name: string
  description: string | null
  durationSeconds: number
  status: string
  visibility: string
  createdBy: string
  difficultyLevel: { id: string; label: string } | null
  creator: { id: string; fullName: string; avatarUrl: string | null }
  domains: Array<{ domain: { id: string; name: string } }>
  sessionExercises: Array<{
    id: string
    position: number
    phaseId: string | null
    restAfterSeconds: number | null
    overrideDurationSeconds: number | null
    sets: number | null
    reps: string | null
    notes: string | null
    exercise: Exercise
    phase: { id: string; name: string } | null
  }>
  _count: { programSessions: number; likes: number; forks: number }
}

export const sessionApi = {
  list: (params?: Record<string, string>) =>
    apiFetch<PaginatedResponse<Session>>(
      `/api/v1/sessions${params ? '?' + new URLSearchParams(params) : ''}`
    ),
  get: (id: string) => apiFetch<Session>(`/api/v1/sessions/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<Session>('/api/v1/sessions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<Session>(`/api/v1/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/v1/sessions/${id}`, { method: 'DELETE' }),
}

// ═══════════════════════════════════════════════════════════════
// Program API
// ═══════════════════════════════════════════════════════════════

export interface Program {
  id: string
  name: string
  description: string | null
  durationSeconds: number
  status: string
  visibility: string
  createdBy: string
  difficultyLevel: { id: string; label: string } | null
  creator: { id: string; fullName: string; avatarUrl: string | null }
  domains: Array<{ domain: { id: string; name: string } }>
  programSessions: Array<{
    id: string
    position: number
    dayLabel: string | null
    notes: string | null
    session: { id: string; name: string; durationSeconds: number; status: string; _count: { sessionExercises: number } }
  }>
  _count: { likes: number; forks: number }
}

export const programApi = {
  list: (params?: Record<string, string>) =>
    apiFetch<PaginatedResponse<Program>>(
      `/api/v1/programs${params ? '?' + new URLSearchParams(params) : ''}`
    ),
  get: (id: string) => apiFetch<Program>(`/api/v1/programs/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<Program>('/api/v1/programs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<Program>(`/api/v1/programs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/v1/programs/${id}`, { method: 'DELETE' }),
}

// ═══════════════════════════════════════════════════════════════
// Taxonomy API
// ═══════════════════════════════════════════════════════════════

export interface Domain {
  id: string
  name: string
  description: string | null
}

export interface Phase {
  id: string
  name: string
  sortOrder: number
  isDefault: boolean
}

export interface DifficultyLevel {
  id: string
  label: string
  sortOrder: number
}

export const taxonomyApi = {
  domains: () => apiFetch<Domain[]>('/api/v1/domains'),
  phases: () => apiFetch<Phase[]>('/api/v1/phases'),
  difficultyLevels: () => apiFetch<DifficultyLevel[]>('/api/v1/difficulty-levels'),
}
