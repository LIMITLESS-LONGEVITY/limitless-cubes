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

export function BuilderCanvas({ onSave }: { onSave?: () => void }) {
  const items = useBuilderStore((s) => s.items)
  const mode = useBuilderStore((s) => s.mode)
  const totalDuration = useBuilderStore(selectTotalDuration)
  const itemCount = useBuilderStore(selectItemCount)

  const { setNodeRef, isOver } = useDroppable({ id: 'builder-canvas' })

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
              {itemCount} {mode === 'session' ? 'exercises' : 'sessions'} • {formatDuration(totalDuration)}
            </span>
          )}
        </div>
        <CanvasActions onSave={onSave} />
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-4 transition-colors ${
          isOver ? 'bg-blue-500/5' : ''
        }`}
      >
        {items.length === 0 ? (
          <EmptyCanvas />
        ) : (
          <SortableContext items={items.map((i) => i.slotId)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2 max-w-2xl mx-auto">
              {items.map((item, index) => (
                <SortableItem key={item.slotId} item={item} index={index} />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Sortable Item
// ═══════════════════════════════════════════════════════════════

function SortableItem({ item, index }: { item: BuilderItem; index: number }) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        isDragging
          ? 'opacity-50 scale-[1.02] shadow-lg'
          : isSelected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
      }`}
      onClick={() => selectItem(item.slotId)}
    >
      {/* Drag handle */}
      <div className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical size={16} className="text-neutral-600" />
      </div>

      {/* Index */}
      <span className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs text-neutral-400 flex-shrink-0">
        {index + 1}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isExercise ? (
            <Dumbbell size={14} className="text-blue-400 flex-shrink-0" />
          ) : (
            <Layers size={14} className="text-purple-400 flex-shrink-0" />
          )}
          <p className="text-sm font-medium text-neutral-200 truncate">
            {item.name}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {isExercise
              ? formatExerciseDuration(item as BuilderExercise)
              : formatDuration((item as BuilderSession).durationSeconds)}
          </span>
          {isExercise && (item as BuilderExercise).phaseName && (
            <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
              {(item as BuilderExercise).phaseName}
            </span>
          )}
          {isExercise && (item as BuilderExercise).sets && (
            <span>{(item as BuilderExercise).sets} sets</span>
          )}
          {isExercise && (item as BuilderExercise).reps && (
            <span>× {(item as BuilderExercise).reps}</span>
          )}
          {!isExercise && (
            <span>{(item as BuilderSession).exerciseCount} exercises</span>
          )}
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          removeItem(item.slotId)
        }}
        className="p-1 text-neutral-600 hover:text-red-400 transition-colors"
      >
        <X size={14} />
      </button>
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
          className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
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
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-4">
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

function formatExerciseDuration(exercise: BuilderExercise): string {
  const base = exercise.overrideDurationSeconds ?? exercise.durationSeconds
  const sets = exercise.sets ?? 1
  const rest = exercise.restAfterSeconds ?? 0
  const total = base * sets + rest
  return formatDuration(total)
}
