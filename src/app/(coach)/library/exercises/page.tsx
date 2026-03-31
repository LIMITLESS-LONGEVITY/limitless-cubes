'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  Search,
  Heart,
  GitFork,
  Clock,
  Loader2,
  Filter,
  Plus,
  ArrowUpDown,
  Dumbbell,
} from 'lucide-react'
import {
  exerciseApi,
  taxonomyApi,
  type Exercise,
} from '@/hooks/use-api'

type SortOption = 'newest' | 'likes' | 'duration'

export default function LibraryExercisesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [domainId, setDomainId] = useState('')
  const [difficultyLevelId, setDifficultyLevelId] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')
  const [page, setPage] = useState(1)
  const limit = 12

  const { data: domains } = useQuery({
    queryKey: ['domains'],
    queryFn: taxonomyApi.domains,
  })

  const { data: difficultyLevels } = useQuery({
    queryKey: ['difficultyLevels'],
    queryFn: taxonomyApi.difficultyLevels,
  })

  const params: Record<string, string> = {
    limit: String(limit),
    page: String(page),
    ...(search && { search }),
    ...(domainId && { domainId }),
    ...(difficultyLevelId && { difficultyLevelId }),
    ...(sort === 'likes' && { sortBy: 'likes' }),
    ...(sort === 'duration' && { sortBy: 'duration' }),
    ...(sort === 'newest' && { sortBy: 'createdAt', sortOrder: 'desc' }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['library-exercises', params],
    queryFn: () => exerciseApi.list(params),
  })

  const likeMutation = useMutation({
    mutationFn: (id: string) => exerciseApi.like(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['library-exercises'] }),
  })

  const forkMutation = useMutation({
    mutationFn: (id: string) => exerciseApi.fork(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['library-exercises'] }),
  })

  function resetFilters(setter: (v: string) => void, value: string) {
    setter(value)
    setPage(1)
  }

  const hasMore = data ? page < data.pagination.totalPages : false

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-app)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-100">Exercise Library</h1>
            <p className="text-sm text-neutral-400 mt-1">
              Browse, search, and manage your exercises
            </p>
          </div>
          <button
            onClick={() => router.push('/library/exercises/new')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <Plus size={16} />
            New Exercise
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Search + Sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => resetFilters(setSearch, e.target.value)}
                placeholder="Search exercises..."
                className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 outline-none transition-colors"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid #333',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#333')}
              />
            </div>
            <div className="flex gap-3">
              {difficultyLevels && difficultyLevels.length > 0 && (
                <select
                  value={difficultyLevelId}
                  onChange={(e) => resetFilters(setDifficultyLevelId, e.target.value)}
                  className="rounded-lg px-3 py-2.5 text-sm text-neutral-200 outline-none transition-colors"
                  style={{ background: 'var(--surface-card)', border: '1px solid #333' }}
                >
                  <option value="">All Levels</option>
                  {difficultyLevels.map((dl) => (
                    <option key={dl.id} value={dl.id}>{dl.label}</option>
                  ))}
                </select>
              )}
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value as SortOption); setPage(1) }}
                  className="rounded-lg pl-3 pr-8 py-2.5 text-sm text-neutral-200 outline-none transition-colors appearance-none"
                  style={{ background: 'var(--surface-card)', border: '1px solid #333' }}
                >
                  <option value="newest">Newest</option>
                  <option value="likes">Most Liked</option>
                  <option value="duration">Duration</option>
                </select>
                <ArrowUpDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Domain pills */}
          {domains && domains.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => resetFilters(setDomainId, '')}
                className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
                style={{
                  background: !domainId ? 'var(--accent)' : 'var(--surface-card)',
                  color: !domainId ? 'white' : '#a3a3a3',
                  border: `1px solid ${!domainId ? 'var(--accent)' : '#333'}`,
                }}
              >
                All
              </button>
              {domains.map((d) => (
                <button
                  key={d.id}
                  onClick={() => resetFilters(setDomainId, d.id)}
                  className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
                  style={{
                    background: domainId === d.id ? 'var(--accent)' : 'var(--surface-card)',
                    color: domainId === d.id ? 'white' : '#a3a3a3',
                    border: `1px solid ${domainId === d.id ? 'var(--accent)' : '#333'}`,
                  }}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <GridSkeleton />
        ) : !data?.data.length ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.data.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onNavigate={() => router.push(`/library/exercises/${exercise.id}`)}
                  onLike={() => likeMutation.mutate(exercise.id)}
                  onFork={() => forkMutation.mutate(exercise.id)}
                  isLiking={likeMutation.isPending}
                  isForking={forkMutation.isPending}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="px-6 py-2.5 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    background: 'var(--surface-card)',
                    color: '#e5e5e5',
                    border: '1px solid #333',
                  }}
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ───── Phase gradient helper ───── */
const phaseGradients = [
  'linear-gradient(135deg, var(--phase-warmup-bg) 0%, var(--phase-main-bg) 100%)',
  'linear-gradient(135deg, var(--phase-main-bg) 0%, var(--phase-cooldown-bg) 100%)',
  'linear-gradient(135deg, var(--phase-cooldown-bg) 0%, var(--phase-custom-bg) 100%)',
  'linear-gradient(135deg, var(--phase-custom-bg) 0%, var(--phase-warmup-bg) 100%)',
]

function phaseGradient(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return phaseGradients[Math.abs(hash) % phaseGradients.length]
}

/* ───── Exercise Card ───── */
function ExerciseCard({
  exercise,
  onNavigate,
  onLike,
  onFork,
  isLiking,
  isForking,
}: {
  exercise: Exercise
  onNavigate: () => void
  onLike: () => void
  onFork: () => void
  isLiking: boolean
  isForking: boolean
}) {
  return (
    <div
      className="rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-1"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid #222',
        '--tw-ring-color': 'var(--accent)',
      } as React.CSSProperties}
      onClick={onNavigate}
    >
      {/* Hero */}
      <div
        className="relative h-[180px] flex items-end p-4"
        style={{ background: phaseGradient(exercise.id) }}
      >
        {exercise.difficultyLevel && (
          <span
            className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-semibold rounded-full text-white"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          >
            {exercise.difficultyLevel.label}
          </span>
        )}
        <span
          className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full text-white"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        >
          <Clock size={10} />
          {formatDuration(exercise.durationSeconds)}
        </span>
        <Dumbbell size={40} className="text-white/10 absolute bottom-3 right-3" />
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2.5" onClick={(e) => e.stopPropagation()}>
        <h3
          className="text-sm font-semibold text-neutral-100 cursor-pointer hover:underline"
          onClick={onNavigate}
        >
          {exercise.name}
        </h3>
        {exercise.description && (
          <p className="text-xs text-neutral-400 line-clamp-2">{exercise.description}</p>
        )}

        {/* Creator chip */}
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            {exercise.creator.fullName.charAt(0).toUpperCase()}
          </span>
          <span className="text-xs text-neutral-400 truncate">{exercise.creator.fullName}</span>
        </div>

        {/* Domain tags */}
        {exercise.domains.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {exercise.domains.map((d) => (
              <span
                key={d.domain.id}
                className="px-2 py-0.5 text-[10px] rounded-full"
                style={{
                  background: 'var(--surface-elevated)',
                  color: 'var(--accent-light)',
                  border: '1px solid var(--accent)',
                }}
              >
                {d.domain.name}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#222' }}>
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
              onClick={(e) => { e.stopPropagation(); onLike() }}
              disabled={isLiking}
              className="p-1.5 text-neutral-500 hover:text-rose-400 transition-colors disabled:opacity-50 rounded"
              style={{ ['--tw-ring-color' as string]: 'var(--accent)' }}
              title="Toggle like"
            >
              <Heart size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onFork() }}
              disabled={isForking}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50"
              style={{
                color: 'var(--accent-light)',
                background: 'var(--accent-subtle)',
              }}
              title="Fork to your library"
            >
              {isForking ? <Loader2 size={12} className="animate-spin" /> : <GitFork size={12} />}
              Fork
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg h-80 animate-pulse"
          style={{ background: 'var(--surface-card)', border: '1px solid #222' }}
        />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Filter size={32} className="text-neutral-700 mb-3" />
      <p className="text-sm text-neutral-400">No exercises found</p>
      <p className="text-xs text-neutral-600 mt-1">Try adjusting your filters or create a new exercise</p>
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
