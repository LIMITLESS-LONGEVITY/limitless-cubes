'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Heart,
  GitFork,
  Clock,
  Loader2,
  Layers,
  Dumbbell,
} from 'lucide-react'
import { sessionApi } from '@/hooks/use-api'

/* Phase-color map for Tetris blocks */
const PHASE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  warmup: { bg: 'var(--phase-warmup-bg)', border: 'var(--phase-warmup)', text: 'var(--phase-warmup)' },
  main: { bg: 'var(--phase-main-bg)', border: 'var(--phase-main)', text: 'var(--phase-main)' },
  cooldown: { bg: 'var(--phase-cooldown-bg)', border: 'var(--phase-cooldown)', text: 'var(--phase-cooldown)' },
}

function getPhaseColor(phaseName: string | null | undefined) {
  if (!phaseName) return { bg: 'var(--phase-custom-bg)', border: 'var(--phase-custom)', text: 'var(--phase-custom)' }
  const key = phaseName.toLowerCase()
  return PHASE_COLORS[key] ?? { bg: 'var(--phase-custom-bg)', border: 'var(--phase-custom)', text: 'var(--phase-custom)' }
}

/* Scale: 1 second = 0.5px height, min 40px, max 200px */
function blockHeight(seconds: number): number {
  return Math.max(40, Math.min(200, seconds * 0.5))
}

export default function SessionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()

  const { data: session, isLoading, error } = useQuery({
    queryKey: ['session', id],
    queryFn: () => sessionApi.get(id),
    enabled: !!id,
  })

  const likeMutation = useMutation({
    mutationFn: () => sessionApi.like(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session', id] }),
  })

  const forkMutation = useMutation({
    mutationFn: () => sessionApi.fork(id),
    onSuccess: (forked) => router.push(`/library/sessions/${forked.id}`),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-app)' }}>
        <Loader2 size={32} className="animate-spin text-neutral-600" />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--surface-app)' }}>
        <p className="text-sm text-neutral-400">Session not found</p>
        <button onClick={() => router.back()} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
          Go back
        </button>
      </div>
    )
  }

  const exerciseCount = session.sessionExercises?.length ?? 0
  const sortedExercises = [...(session.sessionExercises ?? [])].sort((a, b) => a.position - b.position)

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-app)' }}>
      {/* Hero */}
      <div
        className="relative h-[280px] flex flex-col justify-end"
        style={{
          background: 'linear-gradient(135deg, var(--phase-cooldown-bg) 0%, var(--phase-main-bg) 50%, var(--phase-warmup-bg) 100%)',
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

        {session.difficultyLevel && (
          <span
            className="absolute top-4 right-4 px-2.5 py-1 text-xs font-semibold rounded-full text-white z-10"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          >
            {session.difficultyLevel.label}
          </span>
        )}

        <span
          className="absolute top-14 right-4 flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full text-white z-10"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        >
          <Clock size={12} />
          {formatDuration(session.durationSeconds)}
        </span>

        <Layers size={80} className="absolute bottom-6 right-6 text-white/5 z-0" />
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 relative z-10 pb-12">
        <h1 className="text-2xl font-bold text-neutral-100 mb-4">{session.name}</h1>

        {/* Creator meta */}
        <div className="flex items-center gap-3 mb-6">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            {session.creator.fullName.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-sm text-neutral-200">{session.creator.fullName}</p>
            <p className="text-xs text-neutral-500">Creator</p>
          </div>
        </div>

        {/* Stats summary */}
        <div
          className="flex items-center gap-6 p-4 rounded-lg mb-8"
          style={{ background: 'var(--surface-card)', border: '1px solid #222' }}
        >
          <div className="flex items-center gap-2">
            <Dumbbell size={16} className="text-neutral-400" />
            <div>
              <p className="text-sm font-medium text-neutral-200">{exerciseCount}</p>
              <p className="text-[10px] text-neutral-500">Exercises</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-neutral-400" />
            <div>
              <p className="text-sm font-medium text-neutral-200">{formatDuration(session.durationSeconds)}</p>
              <p className="text-[10px] text-neutral-500">Total Duration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-rose-400" />
            <div>
              <p className="text-sm font-medium text-neutral-200">{session._count.likes}</p>
              <p className="text-[10px] text-neutral-500">Likes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GitFork size={16} className="text-purple-400" />
            <div>
              <p className="text-sm font-medium text-neutral-200">{session._count.forks}</p>
              <p className="text-[10px] text-neutral-500">Forks</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {session.description && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-neutral-300 mb-2">Description</h2>
            <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap">{session.description}</p>
          </div>
        )}

        {/* Tetris-style exercise composition */}
        {sortedExercises.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-neutral-300 mb-4">Exercise Composition</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sortedExercises.map((se) => {
                const dur = se.overrideDurationSeconds ?? se.exercise.durationSeconds
                const color = getPhaseColor(se.phase?.name)
                return (
                  <div
                    key={se.id}
                    className="flex-shrink-0 w-24 rounded-lg flex flex-col justify-end p-2 transition-colors"
                    style={{
                      height: `${blockHeight(dur)}px`,
                      background: color.bg,
                      border: `1px solid ${color.border}`,
                    }}
                  >
                    <p className="text-[10px] font-medium truncate" style={{ color: color.text }}>
                      {se.exercise.name}
                    </p>
                    <p className="text-[9px] opacity-70" style={{ color: color.text }}>
                      {formatDuration(dur)}
                    </p>
                    {se.phase && (
                      <p className="text-[8px] opacity-50 mt-0.5" style={{ color: color.text }}>
                        {se.phase.name}
                      </p>
                    )}
                  </div>
                )
              })}
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
