'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Heart,
  GitFork,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Dumbbell,
  Layers,
  CalendarDays,
  User,
} from 'lucide-react'
import {
  exerciseApi,
  sessionApi,
  programApi,
  taxonomyApi,
  type Exercise,
  type Session,
  type Program,
  type PaginatedResponse,
} from '@/hooks/use-api'

type CommunityTab = 'exercises' | 'sessions' | 'programs'

export default function CommunityLibraryPage() {
  const [tab, setTab] = useState<CommunityTab>('exercises')
  const [search, setSearch] = useState('')
  const [domainId, setDomainId] = useState('')
  const [difficultyLevelId, setDifficultyLevelId] = useState('')
  const [page, setPage] = useState(1)

  const { data: domains } = useQuery({
    queryKey: ['domains'],
    queryFn: taxonomyApi.domains,
  })

  const { data: difficultyLevels } = useQuery({
    queryKey: ['difficultyLevels'],
    queryFn: taxonomyApi.difficultyLevels,
  })

  function handleTabChange(newTab: CommunityTab) {
    setTab(newTab)
    setPage(1)
  }

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleDomainChange(value: string) {
    setDomainId(value)
    setPage(1)
  }

  function handleDifficultyChange(value: string) {
    setDifficultyLevelId(value)
    setPage(1)
  }

  const queryParams: Record<string, string> = {
    visibility: 'community',
    status: 'published',
    limit: '12',
    page: String(page),
    ...(search && { search }),
    ...(domainId && { domainId }),
    ...(difficultyLevelId && { difficultyLevelId }),
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-100">Community Library</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Discover and fork exercises, sessions, and programs shared by the community
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-neutral-800">
          {(['exercises', 'sessions', 'programs'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 ${
                tab === t
                  ? 'text-white border-blue-500'
                  : 'text-neutral-400 border-transparent hover:text-neutral-200'
              }`}
            >
              {t === 'exercises' && <Dumbbell size={16} />}
              {t === 'sessions' && <Layers size={16} />}
              {t === 'programs' && <CalendarDays size={16} />}
              {t}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={`Search community ${tab}...`}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex gap-3">
            {domains && domains.length > 0 && (
              <select
                value={domainId}
                onChange={(e) => handleDomainChange(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">All Domains</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
            {difficultyLevels && difficultyLevels.length > 0 && (
              <select
                value={difficultyLevelId}
                onChange={(e) => handleDifficultyChange(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">All Levels</option>
                {difficultyLevels.map((dl) => (
                  <option key={dl.id} value={dl.id}>
                    {dl.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content */}
        {tab === 'exercises' && <ExerciseGrid params={queryParams} page={page} setPage={setPage} />}
        {tab === 'sessions' && <SessionGrid params={queryParams} page={page} setPage={setPage} />}
        {tab === 'programs' && <ProgramGrid params={queryParams} page={page} setPage={setPage} />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Exercise Grid
// ═══════════════════════════════════════════════════════════════

function ExerciseGrid({
  params,
  page,
  setPage,
}: {
  params: Record<string, string>
  page: number
  setPage: (p: number) => void
}) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['community-exercises', params],
    queryFn: () => exerciseApi.list(params),
  })

  const likeMutation = useMutation({
    mutationFn: (id: string) => exerciseApi.like(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-exercises'] })
    },
  })

  const forkMutation = useMutation({
    mutationFn: (id: string) => exerciseApi.fork(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-exercises'] })
    },
  })

  if (isLoading) return <GridSkeleton />
  if (!data?.data.length) return <EmptyState entity="exercises" />

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.data.map((exercise) => (
          <div
            key={exercise.id}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col gap-3 hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-neutral-200 truncate">{exercise.name}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500">
                  <User size={12} />
                  <span className="truncate">{exercise.creator.fullName}</span>
                </div>
              </div>
              <Dumbbell size={16} className="text-neutral-600 flex-shrink-0 ml-2" />
            </div>

            {exercise.description && (
              <p className="text-xs text-neutral-400 line-clamp-2">{exercise.description}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDuration(exercise.durationSeconds)}
              </span>
              {exercise.difficultyLevel && (
                <DifficultyBadge label={exercise.difficultyLevel.label} />
              )}
            </div>

            {exercise.domains.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {exercise.domains.map((d) => (
                  <span
                    key={d.domain.id}
                    className="px-2 py-0.5 text-[10px] rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700"
                  >
                    {d.domain.name}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-neutral-800">
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <Heart size={12} /> {exercise._count.likes}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork size={12} /> {exercise._count.forks}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => likeMutation.mutate(exercise.id)}
                  disabled={likeMutation.isPending}
                  className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors disabled:opacity-50 rounded hover:bg-neutral-800"
                  title="Toggle like"
                >
                  <Heart size={14} />
                </button>
                <button
                  onClick={() => forkMutation.mutate(exercise.id)}
                  disabled={forkMutation.isPending}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded transition-colors disabled:opacity-50"
                  title="Fork to your library"
                >
                  {forkMutation.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <GitFork size={12} />
                  )}
                  Fork
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Pagination pagination={data.pagination} page={page} setPage={setPage} />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// Session Grid
// ═══════════════════════════════════════════════════════════════

function SessionGrid({
  params,
  page,
  setPage,
}: {
  params: Record<string, string>
  page: number
  setPage: (p: number) => void
}) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['community-sessions', params],
    queryFn: () => sessionApi.list(params),
  })

  const likeMutation = useMutation({
    mutationFn: (id: string) => sessionApi.like(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-sessions'] })
    },
  })

  const forkMutation = useMutation({
    mutationFn: (id: string) => sessionApi.fork(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-sessions'] })
    },
  })

  if (isLoading) return <GridSkeleton />
  if (!data?.data.length) return <EmptyState entity="sessions" />

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.data.map((session) => (
          <div
            key={session.id}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col gap-3 hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-neutral-200 truncate">{session.name}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500">
                  <User size={12} />
                  <span className="truncate">{session.creator.fullName}</span>
                </div>
              </div>
              <Layers size={16} className="text-neutral-600 flex-shrink-0 ml-2" />
            </div>

            {session.description && (
              <p className="text-xs text-neutral-400 line-clamp-2">{session.description}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDuration(session.durationSeconds)}
              </span>
              <span>{session.sessionExercises?.length ?? 0} exercises</span>
              {session.difficultyLevel && (
                <DifficultyBadge label={session.difficultyLevel.label} />
              )}
            </div>

            {session.domains.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {session.domains.map((d) => (
                  <span
                    key={d.domain.id}
                    className="px-2 py-0.5 text-[10px] rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700"
                  >
                    {d.domain.name}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-neutral-800">
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <Heart size={12} /> {session._count.likes}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork size={12} /> {session._count.forks}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => likeMutation.mutate(session.id)}
                  disabled={likeMutation.isPending}
                  className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors disabled:opacity-50 rounded hover:bg-neutral-800"
                  title="Toggle like"
                >
                  <Heart size={14} />
                </button>
                <button
                  onClick={() => forkMutation.mutate(session.id)}
                  disabled={forkMutation.isPending}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded transition-colors disabled:opacity-50"
                  title="Fork to your library"
                >
                  {forkMutation.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <GitFork size={12} />
                  )}
                  Fork
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Pagination pagination={data.pagination} page={page} setPage={setPage} />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// Program Grid
// ═══════════════════════════════════════════════════════════════

function ProgramGrid({
  params,
  page,
  setPage,
}: {
  params: Record<string, string>
  page: number
  setPage: (p: number) => void
}) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['community-programs', params],
    queryFn: () => programApi.list(params),
  })

  const likeMutation = useMutation({
    mutationFn: (id: string) => programApi.like(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-programs'] })
    },
  })

  const forkMutation = useMutation({
    mutationFn: (id: string) => programApi.fork(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-programs'] })
    },
  })

  if (isLoading) return <GridSkeleton />
  if (!data?.data.length) return <EmptyState entity="programs" />

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.data.map((program) => {
          const sessionCount = program.programSessions?.length ?? 0
          return (
            <div
              key={program.id}
              className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col gap-3 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-neutral-200 truncate">{program.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500">
                    <User size={12} />
                    <span className="truncate">{program.creator.fullName}</span>
                  </div>
                </div>
                <CalendarDays size={16} className="text-neutral-600 flex-shrink-0 ml-2" />
              </div>

              {program.description && (
                <p className="text-xs text-neutral-400 line-clamp-2">{program.description}</p>
              )}

              <div className="flex items-center gap-3 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {formatDuration(program.durationSeconds)}
                </span>
                <span>{sessionCount} sessions</span>
                {program.difficultyLevel && (
                  <DifficultyBadge label={program.difficultyLevel.label} />
                )}
              </div>

              {program.domains.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {program.domains.map((d) => (
                    <span
                      key={d.domain.id}
                      className="px-2 py-0.5 text-[10px] rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700"
                    >
                      {d.domain.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-neutral-800">
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Heart size={12} /> {program._count.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork size={12} /> {program._count.forks}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => likeMutation.mutate(program.id)}
                    disabled={likeMutation.isPending}
                    className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors disabled:opacity-50 rounded hover:bg-neutral-800"
                    title="Toggle like"
                  >
                    <Heart size={14} />
                  </button>
                  <button
                    onClick={() => forkMutation.mutate(program.id)}
                    disabled={forkMutation.isPending}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded transition-colors disabled:opacity-50"
                    title="Fork to your library"
                  >
                    {forkMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <GitFork size={12} />
                    )}
                    Fork
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <Pagination pagination={data.pagination} page={page} setPage={setPage} />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════════════════════

function DifficultyBadge({ label }: { label: string }) {
  return (
    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
      {label}
    </span>
  )
}

function Pagination({
  pagination,
  page,
  setPage,
}: {
  pagination: { page: number; totalPages: number; total: number }
  page: number
  setPage: (p: number) => void
}) {
  if (pagination.totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800">
      <p className="text-xs text-neutral-500">
        Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-md hover:border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
          Previous
        </button>
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= pagination.totalPages}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-md hover:border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 h-48 animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState({ entity }: { entity: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Filter size={32} className="text-neutral-700 mb-3" />
      <p className="text-sm text-neutral-400">No community {entity} found</p>
      <p className="text-xs text-neutral-600 mt-1">
        Try adjusting your filters or check back later
      </p>
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
}
