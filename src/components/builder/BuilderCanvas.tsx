'use client'

import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, Clock, Dumbbell, Layers } from 'lucide-react'
import {
  useBuilderStore,
  selectTotalDuration,
  selectItemCount,
  type BuilderExercise,
  type BuilderSession,
  type BuilderItem,
} from '@/stores/builder-store'

// ═══════════════════════════════════════════════════════════════
// Phase color helpers
// ═══════════════════════════════════════════════════════════════

type PhaseKey = 'warm-up' | 'warmup' | 'main' | 'cooldown' | 'cool-down' | 'custom'

function getPhaseKey(phaseName: string | null): PhaseKey {
  if (!phaseName) return 'custom'
  const lower = phaseName.toLowerCase().replace(/[\s_-]+/g, '')
  if (lower === 'warmup' || lower === 'warmup') return 'warmup'
  if (lower === 'main' || lower === 'work' || lower === 'working') return 'main'
  if (lower === 'cooldown' || lower === 'cooldown') return 'cooldown'
  return 'custom'
}

function getPhaseColor(phaseName: string | null): string {
  const key = getPhaseKey(phaseName)
  switch (key) {
    case 'warmup':
    case 'warm-up':
      return 'var(--phase-warmup)'
    case 'main':
      return 'var(--phase-main)'
    case 'cooldown':
    case 'cool-down':
      return 'var(--phase-cooldown)'
    default:
      return 'var(--phase-custom)'
  }
}

function getPhaseBg(phaseName: string | null): string {
  const key = getPhaseKey(phaseName)
  switch (key) {
    case 'warmup':
    case 'warm-up':
      return 'var(--phase-warmup-bg)'
    case 'main':
      return 'var(--phase-main-bg)'
    case 'cooldown':
    case 'cool-down':
      return 'var(--phase-cooldown-bg)'
    default:
      return 'var(--phase-custom-bg)'
  }
}

// ═══════════════════════════════════════════════════════════════
// Duration → height calculation (Tetris scale)
// ═══════════════════════════════════════════════════════════════

const PX_PER_SECOND = 0.5
const MIN_HEIGHT = 32
const MAX_HEIGHT = 120

function durationToHeight(seconds: number): number {
  const raw = seconds * PX_PER_SECOND
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, raw))
}

function getExerciseTotalDuration(exercise: BuilderExercise): number {
  const base = exercise.overrideDurationSeconds ?? exercise.durationSeconds
  const sets = exercise.sets ?? 1
  const rest = exercise.restAfterSeconds ?? 0
  return base * sets + rest
}

// ═══════════════════════════════════════════════════════════════
// Phase zone grouping
// ═══════════════════════════════════════════════════════════════

interface PhaseGroup {
  phaseId: string | null
  phaseName: string | null
  items: BuilderItem[]
  totalDurationSeconds: number
}

function groupByPhase(items: BuilderItem[]): PhaseGroup[] {
  const groups: PhaseGroup[] = []
  let current: PhaseGroup | null = null

  for (const item of items) {
    const isExercise = 'exerciseId' in item
    const phaseId = isExercise ? (item as BuilderExercise).phaseId : null
    const phaseName = isExercise ? (item as BuilderExercise).phaseName : null

    if (!current || current.phaseId !== phaseId) {
      current = { phaseId, phaseName, items: [], totalDurationSeconds: 0 }
      groups.push(current)
    }

    current.items.push(item)
    if (isExercise) {
      current.totalDurationSeconds += getExerciseTotalDuration(item as BuilderExercise)
    } else {
      current.totalDurationSeconds += (item as BuilderSession).durationSeconds
    }
  }

  return groups
}

// ═══════════════════════════════════════════════════════════════
// Main Canvas
// ═══════════════════════════════════════════════════════════════

export function BuilderCanvas({ onSave }: { onSave?: () => void }) {
  const items = useBuilderStore((s) => s.items)
  const mode = useBuilderStore((s) => s.mode)
  const totalDuration = useBuilderStore(selectTotalDuration)
  const itemCount = useBuilderStore(selectItemCount)

  const { setNodeRef, isOver } = useDroppable({ id: 'builder-canvas' })

  const phaseGroups = mode === 'session' ? groupByPhase(items) : null

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
            {mode === 'empty' ? 'Builder' : mode === 'session' ? 'Session Builder' : 'Program Builder'}
          </span>
          {itemCount > 0 && (
            <span className="text-xs text-neutral-500">
              {itemCount} {mode === 'session' ? 'exercises' : 'sessions'} &bull; {formatDuration(totalDuration)}
            </span>
          )}
        </div>
        <CanvasActions onSave={onSave} />
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-4 transition-colors`}
        style={{ background: isOver ? 'rgba(225, 29, 72, 0.03)' : 'var(--surface-canvas)' }}
      >
        {items.length === 0 ? (
          <EmptyCanvas />
        ) : (
          <SortableContext items={items.map((i) => i.slotId)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col max-w-2xl mx-auto">
              {phaseGroups
                ? phaseGroups.map((group, gi) => (
                    <div key={`phase-${gi}`}>
                      {/* Phase zone label */}
                      {group.phaseName && (
                        <div
                          className="flex items-center gap-2 py-1.5 px-2 mb-1 mt-3 first:mt-0"
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: getPhaseColor(group.phaseName) }}
                          />
                          <span
                            className="text-[10px] font-semibold uppercase tracking-widest"
                            style={{ color: getPhaseColor(group.phaseName) }}
                          >
                            {group.phaseName} &mdash; {formatDuration(group.totalDurationSeconds)}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        {group.items.map((item, index) => (
                          <TetrisSortableItem key={item.slotId} item={item} />
                        ))}
                      </div>
                    </div>
                  ))
                : (
                  <div className="flex flex-col gap-1">
                    {items.map((item) => (
                      <TetrisSortableItem key={item.slotId} item={item} />
                    ))}
                  </div>
                )
              }
            </div>
          </SortableContext>
        )}
      </div>

      {/* Total duration bar */}
      {items.length > 0 && (
        <div
          className="flex items-center justify-between px-4 py-2 border-t border-neutral-800"
          style={{ background: 'var(--surface-card)' }}
        >
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-neutral-500" />
            <span className="text-xs font-medium text-neutral-300">
              Total: {formatDuration(totalDuration)}
            </span>
          </div>
          <span className="text-[10px] text-neutral-500">
            {itemCount} {mode === 'session' ? 'exercises' : 'sessions'}
          </span>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Tetris Sortable Item
// ═══════════════════════════════════════════════════════════════

function TetrisSortableItem({ item }: { item: BuilderItem }) {
  const selectItem = useBuilderStore((s) => s.selectItem)
  const selectedSlotId = useBuilderStore((s) => s.selectedSlotId)
  const removeItem = useBuilderStore((s) => s.removeItem)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.slotId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isExercise = 'exerciseId' in item
  const isSelected = selectedSlotId === item.slotId

  const phaseName = isExercise ? (item as BuilderExercise).phaseName : null
  const phaseColor = getPhaseColor(phaseName)
  const phaseBg = getPhaseBg(phaseName)

  const durationSeconds = isExercise
    ? getExerciseTotalDuration(item as BuilderExercise)
    : (item as BuilderSession).durationSeconds
  const blockHeight = durationToHeight(durationSeconds)

  const showSetsReps = blockHeight > 50

  const ex = isExercise ? (item as BuilderExercise) : null
  const sess = !isExercise ? (item as BuilderSession) : null

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        minHeight: `${blockHeight}px`,
        background: phaseBg,
        borderLeft: `3px solid ${phaseColor}`,
        outline: isSelected ? `2px solid ${phaseColor}` : 'none',
        outlineOffset: isSelected ? '-1px' : undefined,
      }}
      className={`relative flex items-center gap-2 px-2 rounded-md transition-all cursor-pointer ${
        isDragging
          ? 'opacity-50 scale-[1.02] shadow-lg z-10'
          : 'hover:translate-x-0.5 hover:shadow-md hover:shadow-black/20'
      }`}
      onClick={() => selectItem(item.slotId)}
    >
      {/* Grip handle */}
      <div
        className="cursor-grab active:cursor-grabbing text-neutral-600 hover:text-neutral-400 flex-shrink-0 select-none"
        {...attributes}
        {...listeners}
      >
        <span className="text-sm leading-none">&#10303;</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-1.5">
        <div className="flex items-center gap-2">
          {isExercise ? (
            <Dumbbell size={12} style={{ color: phaseColor }} className="flex-shrink-0" />
          ) : (
            <Layers size={12} className="text-purple-400 flex-shrink-0" />
          )}
          <p className="text-sm font-medium text-neutral-200 truncate">
            {item.name}
          </p>
        </div>

        {/* Sets x reps — only on medium+ blocks */}
        {showSetsReps && isExercise && (ex?.sets || ex?.reps) && (
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-neutral-400">
            {ex?.sets && <span>{ex.sets} sets</span>}
            {ex?.sets && ex?.reps && <span>&times;</span>}
            {ex?.reps && <span>{ex.reps}</span>}
          </div>
        )}

        {/* Session info */}
        {!isExercise && showSetsReps && (
          <div className="text-[11px] text-neutral-400 mt-0.5">
            {sess?.exerciseCount} exercises
          </div>
        )}
      </div>

      {/* Right side: duration badge + phase pill */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Phase tag pill */}
        {isExercise && phaseName && blockHeight > 40 && (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide"
            style={{ color: phaseColor, background: `color-mix(in srgb, ${phaseColor} 15%, transparent)` }}
          >
            {phaseName}
          </span>
        )}

        {/* Duration badge */}
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums"
          style={{ color: phaseColor, background: `color-mix(in srgb, ${phaseColor} 10%, transparent)` }}
        >
          {formatDuration(durationSeconds)}
        </span>

        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            removeItem(item.slotId)
          }}
          className="p-0.5 text-neutral-600 hover:text-red-400 transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Canvas Actions (undo/redo/clear/save)
// ═══════════════════════════════════════════════════════════════

function CanvasActions({ onSave }: { onSave?: () => void }) {
  const clear = useBuilderStore((s) => s.clear)
  const isDirty = useBuilderStore((s) => s.isDirty)
  const items = useBuilderStore((s) => s.items)
  const { undo, redo, pastStates, futureStates } = useBuilderStore.temporal.getState()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => undo()}
        disabled={pastStates.length === 0}
        className="px-2 py-1 text-xs text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
      >
        Undo
      </button>
      <button
        onClick={() => redo()}
        disabled={futureStates.length === 0}
        className="px-2 py-1 text-xs text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Shift+Z)"
      >
        Redo
      </button>
      {items.length > 0 && (
        <button
          onClick={clear}
          className="px-2 py-1 text-xs text-neutral-500 hover:text-red-400"
        >
          Clear
        </button>
      )}
      {items.length > 0 && onSave && (
        <button
          onClick={onSave}
          className="px-3 py-1 text-xs font-medium text-white rounded-md transition-colors"
          style={{ background: 'var(--accent)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
        >
          Save
        </button>
      )}
      {isDirty && (
        <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Empty State
// ═══════════════════════════════════════════════════════════════

function EmptyCanvas() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div
          className="w-16 h-16 rounded-2xl border border-neutral-800 flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--surface-card)' }}
        >
          <Layers size={24} className="text-neutral-600" />
        </div>
        <h3 className="text-sm font-medium text-neutral-300 mb-1">Start building</h3>
        <p className="text-xs text-neutral-500">
          Drag exercises from the library to build a session, or drag sessions to build a program.
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  if (remaining === 0) return `${minutes}m`
  return `${minutes}m ${remaining}s`
}
