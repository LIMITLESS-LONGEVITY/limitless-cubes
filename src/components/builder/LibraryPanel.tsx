'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDraggable } from '@dnd-kit/core'
import { Search, GripVertical, Clock, Dumbbell, Layers } from 'lucide-react'
import { exerciseApi, sessionApi, type Exercise, type Session } from '@/hooks/use-api'

type LibraryTab = 'exercises' | 'sessions' | 'templates'

interface LibraryPanelProps {
  mode: 'empty' | 'session' | 'program'
  collapsed?: boolean
  onToggle?: () => void
}

export function LibraryPanel({ mode, collapsed, onToggle }: LibraryPanelProps) {
  const [tab, setTab] = useState<LibraryTab>(mode === 'program' ? 'sessions' : 'exercises')
  const [search, setSearch] = useState('')

  // Switch tab based on builder mode
  const availableTabs: LibraryTab[] = useMemo(() => {
    if (mode === 'program') return ['sessions', 'templates']
    return ['exercises', 'sessions', 'templates']
  }, [mode])

  if (collapsed) {
    return (
      <div className="w-10 border-r border-neutral-800 flex flex-col items-center py-4 gap-2">
        <button onClick={onToggle} className="p-2 hover:bg-neutral-800 rounded" title="Expand library">
          <Layers size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="w-72 border-r border-neutral-800 flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-neutral-800">
        {availableTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 text-xs font-medium capitalize transition-colors ${
              tab === t
                ? 'text-white border-b-2 border-blue-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t}
          </button>
        ))}
        <button onClick={onToggle} className="px-2 text-neutral-500 hover:text-neutral-300">
          ‹
        </button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${tab}...`}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-md pl-8 pr-3 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {tab === 'exercises' && <ExerciseList search={search} />}
        {tab === 'sessions' && <SessionList search={search} />}
        {tab === 'templates' && <TemplateList search={search} />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Exercise List
// ═══════════════════════════════════════════════════════════════

function ExerciseList({ search }: { search: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['exercises', search],
    queryFn: () => exerciseApi.list({ search, status: 'published', limit: '50' }),
  })

  if (isLoading) return <LoadingSkeleton />
  if (!data?.data.length) return <EmptyState label="exercises" />

  return (
    <div className="flex flex-col gap-1.5">
      {data.data.map((exercise) => (
        <DraggableExerciseCard key={exercise.id} exercise={exercise} />
      ))}
    </div>
  )
}

function DraggableExerciseCard({ exercise }: { exercise: Exercise }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `exercise-${exercise.id}`,
    data: {
      type: 'exercise',
      exerciseId: exercise.id,
      name: exercise.name,
      durationSeconds: exercise.durationSeconds,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 p-2 bg-neutral-900 border border-neutral-800 rounded-md cursor-grab active:cursor-grabbing hover:border-neutral-600 transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
      {...listeners}
      {...attributes}
    >
      <GripVertical size={14} className="text-neutral-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-200 truncate">{exercise.name}</p>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formatDuration(exercise.durationSeconds)}
          </span>
          {exercise.difficultyLevel && (
            <span className="text-neutral-600">• {exercise.difficultyLevel.label}</span>
          )}
        </div>
      </div>
      <Dumbbell size={14} className="text-neutral-600 flex-shrink-0" />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Session List
// ═══════════════════════════════════════════════════════════════

function SessionList({ search }: { search: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['sessions', search],
    queryFn: () => sessionApi.list({ search, status: 'published', limit: '50' }),
  })

  if (isLoading) return <LoadingSkeleton />
  if (!data?.data.length) return <EmptyState label="sessions" />

  return (
    <div className="flex flex-col gap-1.5">
      {data.data.map((session) => (
        <DraggableSessionCard key={session.id} session={session} />
      ))}
    </div>
  )
}

function DraggableSessionCard({ session }: { session: Session }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `session-${session.id}`,
    data: {
      type: 'session',
      sessionId: session.id,
      name: session.name,
      durationSeconds: session.durationSeconds,
      exerciseCount: session.sessionExercises?.length ?? 0,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 p-2 bg-neutral-900 border border-neutral-800 rounded-md cursor-grab active:cursor-grabbing hover:border-neutral-600 transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
      {...listeners}
      {...attributes}
    >
      <GripVertical size={14} className="text-neutral-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-200 truncate">{session.name}</p>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formatDuration(session.durationSeconds)}
          </span>
          <span>• {session.sessionExercises?.length ?? 0} exercises</span>
        </div>
      </div>
      <Layers size={14} className="text-neutral-600 flex-shrink-0" />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Template List (placeholder — uses sessions with isTemplate)
// ═══════════════════════════════════════════════════════════════

function TemplateList({ search }: { search: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['templates', search],
    queryFn: () => sessionApi.list({ search, status: 'published', limit: '50' }),
  })

  if (isLoading) return <LoadingSkeleton />
  if (!data?.data.length) return <EmptyState label="templates" />

  return (
    <div className="text-xs text-neutral-500 p-4 text-center">
      Templates coming soon — use sessions for now
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 bg-neutral-900 rounded-md animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-xs text-neutral-500 p-4 text-center">
      No {label} found
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  if (remaining === 0) return `${minutes}m`
  return `${minutes}m ${remaining}s`
}
