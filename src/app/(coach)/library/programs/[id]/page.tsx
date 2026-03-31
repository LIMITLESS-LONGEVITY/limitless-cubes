'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Heart,
  GitFork,
  Clock,
  Loader2,
  CalendarDays,
  Layers,
  Dumbbell,
} from 'lucide-react'
import { programApi } from '@/hooks/use-api'

export default function ProgramDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()

  const { data: program, isLoading, error } = useQuery({
    queryKey: ['program', id],
    queryFn: () => programApi.get(id),
    enabled: !!id,
  })

  const likeMutation = useMutation({
    mutationFn: () => programApi.like(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['program', id] }),
  })

  const forkMutation = useMutation({
    mutationFn: () => programApi.fork(id),
    onSuccess: (forked) => router.push(`/library/programs/${forked.id}`),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-app)' }}>
        <Loader2 size={32} className="animate-spin text-neutral-600" />
      </div>
    )
  }

  if (error || !program) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--surface-app)' }}>
        <p className="text-sm text-neutral-400">Program not found</p>
        <button onClick={() => router.back()} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
          Go back
        </button>
      </div>
    )
  }

  const sessionCount = program.programSessions?.length ?? 0
  const sortedSessions = [...(program.programSessions ?? [])].sort((a, b) => a.position - b.position)

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-app)' }}>
      {/* Hero */}
      <div
        className="relative h-[280px] flex flex-col justify-end"
        style={{
          background: 'linear-gradient(135deg, var(--phase-custom-bg) 0%, var(--phase-main-bg) 50%, var(--phase-warmup-bg) 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg transition-colors z-10"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {program.difficultyLevel && (
          <span
            className="absolute top-4 right-4 px-2.5 py-1 text-xs font-semibold rounded-full text-white z-10"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          >
            {program.difficultyLevel.label}
          </span>
        )}

        <span
          className="absolute top-14 right-4 flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full text-white z-10"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        >
          <Clock size={12} />
          {formatDuration(program.durationSeconds)}
        </span>

        <CalendarDays size={80} className="absolute bottom-6 right-6 text-white/5 z-0" />
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 relative z-10 pb-12">
        <h1 className="text-2xl font-bold text-neutral-100 mb-4">{program.name}</h1>

        {/* Creator meta */}
        <div className="flex items-center gap-3 mb-6">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            {program.creator.fullName.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-sm text-neutral-200">{program.creator.fullName}</p>
            <p className="text-xs text-neutral-500">Creator</p>
          </div>
        </div>

        {/* Stats summary */}
        <div
          className="flex items-center gap-6 p-4 rounded-lg mb-8"
          style={{ background: 'var(--surface-card)', border: '1px solid #222' }}
        >
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-neutral-400" />
            <div>
              <p className="text-sm font-medium text-neutral-200">{sessionCount}</p>
              <p className="text-[10px] text-neutral-500">Sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-neutral-400" />
            <div>
              <p className="text-sm font-medium text-neutral-200">{formatDuration(program.durationSeconds)}</p>
              <p className="text-[10px] text-neutral-500">Total Duration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-rose-400" />
            <div>
              <p className="text-sm font-medium text-neutral-200">{program._count.likes}</p>
              <p className="text-[10px] text-neutral-500">Likes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GitFork size={16} className="text-purple-400" />
            <div>
              <p className="text-sm font-medium text-neutral-200">{program._count.forks}</p>
              <p className="text-[10px] text-neutral-500">Forks</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {program.description && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-neutral-300 mb-2">Description</h2>
            <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap">{program.description}</p>
          </div>
        )}

        {/* Sessions list */}
        {sortedSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-neutral-300 mb-4">Sessions</h2>
            <div className="flex flex-col gap-3">
              {sortedSessions.map((ps) => (
                <div
                  key={ps.id}
                  className="rounded-lg p-4 transition-colors hover:ring-1"
                  style={{
                    background: 'var(--surface-card)',
                    border: '1px solid #222',
                    '--tw-ring-color': 'var(--accent)',
                  } as React.CSSProperties}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {ps.dayLabel && (
                        <span
                          className="px-2 py-0.5 text-[10px] font-semibold rounded"
                          style={{ background: 'var(--accent-subtle)', color: 'var(--accent-light)', border: '1px solid var(--accent)' }}
                        >
                          {ps.dayLabel}
                        </span>
                      )}
                      <h3 className="text-sm font-medium text-neutral-200">{ps.session.name}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Dumbbell size={12} />
                        {ps.session._count.sessionExercises}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDuration(ps.session.durationSeconds)}
                      </span>
                    </div>
                  </div>

                  {/* Mini exercise blocks (placeholder based on count) */}
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: Math.min(ps.session._count.sessionExercises, 12) }).map((_, i) => {
                      const colors = ['var(--phase-warmup)', 'var(--phase-main)', 'var(--phase-cooldown)', 'var(--phase-custom)']
                      const color = colors[i % colors.length]
                      return (
                        <div
                          key={i}
                          className="rounded-sm"
                          style={{
                            width: '16px',
                            height: '12px',
                            background: color,
                            opacity: 0.6,
                          }}
                        />
                      )
                    })}
                    {ps.session._count.sessionExercises > 12 && (
                      <span className="text-[9px] text-neutral-500 self-center ml-1">
                        +{ps.session._count.sessionExercises - 12}
                      </span>
                    )}
                  </div>

                  {ps.notes && (
                    <p className="text-[11px] text-neutral-500 mt-2">{ps.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            {likeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} />}
            Like
          </button>
          <button
            onClick={() => forkMutation.mutate()}
            disabled={forkMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'var(--phase-custom-bg)', color: '#c084fc', border: '1px solid #7c3aed' }}
          >
            {forkMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <GitFork size={14} />}
            Fork
          </button>
        </div>
      </div>
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
