'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Heart,
  GitFork,
  Clock,
  Loader2,
  Pencil,
  Dumbbell,
  Star,
  Film,
  Image as ImageIcon,
} from 'lucide-react'
import { exerciseApi } from '@/hooks/use-api'

export default function ExerciseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()

  const { data: exercise, isLoading, error } = useQuery({
    queryKey: ['exercise', id],
    queryFn: () => exerciseApi.get(id),
    enabled: !!id,
  })

  const likeMutation = useMutation({
    mutationFn: () => exerciseApi.like(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise', id] })
    },
  })

  const forkMutation = useMutation({
    mutationFn: () => exerciseApi.fork(id),
    onSuccess: (forked) => {
      router.push(`/library/exercises/${forked.id}`)
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-app)' }}>
        <Loader2 size={32} className="animate-spin text-neutral-600" />
      </div>
    )
  }

  if (error || !exercise) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--surface-app)' }}>
        <p className="text-sm text-neutral-400">Exercise not found</p>
        <button onClick={() => router.back()} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-app)' }}>
      {/* Hero */}
      <div
        className="relative h-[280px] flex flex-col justify-end"
        style={{
          background: 'linear-gradient(135deg, var(--phase-warmup-bg) 0%, var(--phase-main-bg) 50%, var(--phase-cooldown-bg) 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg transition-colors z-10"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {/* Badges */}
        {exercise.difficultyLevel && (
          <span
            className="absolute top-4 right-4 px-2.5 py-1 text-xs font-semibold rounded-full text-white z-10"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          >
            {exercise.difficultyLevel.label}
          </span>
        )}
        <span
          className="absolute top-4 right-4 mt-8 flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full text-white z-10"
          style={{
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            ...(exercise.difficultyLevel ? {} : { marginTop: 0 }),
          }}
        >
          <Clock size={12} />
          {formatDuration(exercise.durationSeconds)}
        </span>

        <Dumbbell size={80} className="absolute bottom-6 right-6 text-white/5 z-0" />
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 relative z-10 pb-12">
        {/* Title */}
        <h1 className="text-2xl font-bold text-neutral-100 mb-4">{exercise.name}</h1>

        {/* Creator meta */}
        <div className="flex items-center gap-3 mb-6">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            {exercise.creator.fullName.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-sm text-neutral-200">{exercise.creator.fullName}</p>
            <p className="text-xs text-neutral-500">Creator</p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {exercise.difficultyLevel && (
            <span
              className="px-2.5 py-1 text-xs font-medium rounded-full"
              style={{
                background: 'var(--accent-subtle)',
                color: 'var(--accent-light)',
                border: '1px solid var(--accent)',
              }}
            >
              {exercise.difficultyLevel.label}
            </span>
          )}
          {exercise.domains.map((d) => (
            <span
              key={d.domain.id}
              className="px-2.5 py-1 text-xs font-medium rounded-full"
              style={{
                background: 'var(--surface-elevated)',
                color: 'var(--accent-light)',
                border: '1px solid #333',
              }}
            >
              {d.domain.name}
            </span>
          ))}
        </div>

        {/* Description */}
        {exercise.description && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-neutral-300 mb-2">Description</h2>
            <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap">
              {exercise.description}
            </p>
          </div>
        )}

        {/* Media */}
        {exercise.media && exercise.media.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">Media</h2>
            <div className="flex flex-col gap-3">
              {exercise.media.map((m) => (
                <div key={m.id}>
                  {m.mediaType === 'youtube' ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden" style={{ background: '#000' }}>
                      <iframe
                        src={toYouTubeEmbedUrl(m.url)}
                        title={m.title || 'YouTube video'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                  ) : m.mediaType === 'image' ? (
                    <img
                      src={m.url}
                      alt={m.title || 'Exercise image'}
                      className="w-full rounded-lg object-cover"
                      style={{ maxHeight: '400px' }}
                    />
                  ) : (
                    <div
                      className="flex items-center gap-2 p-3 rounded-lg"
                      style={{ background: 'var(--surface-card)', border: '1px solid #222' }}
                    >
                      <Film size={16} className="text-neutral-400" />
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline truncate">
                        {m.url}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div
          className="flex items-center gap-6 p-4 rounded-lg mb-8"
          style={{ background: 'var(--surface-card)', border: '1px solid #222' }}
        >
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-rose-400" />
            <div>
              <p className="text-sm font-medium text-neutral-200">{exercise._count.likes}</p>
              <p className="text-[10px] text-neutral-500">Likes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GitFork size={16} className="text-purple-400" />
            <div>
              <p className="text-sm font-medium text-neutral-200">{exercise._count.forks}</p>
              <p className="text-[10px] text-neutral-500">Forks</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Star size={16} className="text-amber-400" />
            <div>
              <p className="text-sm font-medium text-neutral-200">--</p>
              <p className="text-[10px] text-neutral-500">Rating</p>
            </div>
          </div>
        </div>

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
            style={{
              background: 'var(--phase-custom-bg)',
              color: '#c084fc',
              border: '1px solid #7c3aed',
            }}
          >
            {forkMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <GitFork size={14} />}
            Fork
          </button>
          <button
            onClick={() => router.push(`/library/exercises/${id}/edit`)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors"
            style={{
              background: 'transparent',
              color: '#a3a3a3',
              border: '1px solid #333',
            }}
          >
            <Pencil size={14} />
            Edit
          </button>
        </div>
      </div>
    </div>
  )
}

function toYouTubeEmbedUrl(url: string): string {
  try {
    const u = new URL(url)
    // Handle youtu.be/ID
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`
    }
    // Handle youtube.com/watch?v=ID
    const v = u.searchParams.get('v')
    if (v) {
      return `https://www.youtube.com/embed/${v}`
    }
    // Already an embed URL or unknown format
    if (u.pathname.startsWith('/embed/')) {
      return url
    }
  } catch {
    // not a valid URL
  }
  return url
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
}
