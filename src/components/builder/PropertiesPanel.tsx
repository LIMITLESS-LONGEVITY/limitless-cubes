'use client'

import { Clock, Dumbbell, Layers, Hash } from 'lucide-react'
import {
  useBuilderStore,
  selectSelectedItem,
  type BuilderExercise,
  type BuilderSession,
} from '@/stores/builder-store'

export function PropertiesPanel() {
  const selectedItem = useBuilderStore(selectSelectedItem)
  const updateItem = useBuilderStore((s) => s.updateItem)
  const mode = useBuilderStore((s) => s.mode)

  if (!selectedItem) {
    return (
      <div className="w-80 border-l border-neutral-800 flex items-center justify-center">
        <p className="text-xs text-neutral-500 text-center px-6">
          Select an item on the canvas to view and edit its properties
        </p>
      </div>
    )
  }

  const isExercise = 'exerciseId' in selectedItem

  return (
    <div className="w-80 border-l border-neutral-800 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center gap-2 mb-1">
          {isExercise ? (
            <Dumbbell size={14} className="text-rose-500" />
          ) : (
            <Layers size={14} className="text-purple-400" />
          )}
          <h3 className="text-sm font-medium text-neutral-200">{selectedItem.name}</h3>
        </div>
        <p className="text-xs text-neutral-500">
          {isExercise ? 'Exercise properties' : 'Session properties'}
        </p>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {isExercise && (
          <ExerciseProperties
            exercise={selectedItem as BuilderExercise}
            onUpdate={(updates) => updateItem(selectedItem.slotId, updates)}
          />
        )}
        {!isExercise && (
          <SessionProperties
            session={selectedItem as BuilderSession}
            onUpdate={(updates) => updateItem(selectedItem.slotId, updates)}
          />
        )}
      </div>
    </div>
  )
}

function ExerciseProperties({
  exercise,
  onUpdate,
}: {
  exercise: BuilderExercise
  onUpdate: (updates: Partial<BuilderExercise>) => void
}) {
  return (
    <>
      <Field label="Override Duration (seconds)" icon={<Clock size={12} />}>
        <input
          type="number"
          value={exercise.overrideDurationSeconds ?? ''}
          onChange={(e) =>
            onUpdate({
              overrideDurationSeconds: e.target.value ? Number(e.target.value) : null,
            })
          }
          placeholder={String(exercise.durationSeconds)}
          className="input-field"
        />
      </Field>

      <Field label="Sets" icon={<Hash size={12} />}>
        <input
          type="number"
          value={exercise.sets ?? ''}
          onChange={(e) => onUpdate({ sets: e.target.value ? Number(e.target.value) : null })}
          placeholder="1"
          min={1}
          className="input-field"
        />
      </Field>

      <Field label="Reps" icon={<Hash size={12} />}>
        <input
          type="text"
          value={exercise.reps ?? ''}
          onChange={(e) => onUpdate({ reps: e.target.value || null })}
          placeholder="e.g. 8-12, AMRAP, 30s"
          className="input-field"
        />
      </Field>

      <Field label="Rest After (seconds)" icon={<Clock size={12} />}>
        <input
          type="number"
          value={exercise.restAfterSeconds ?? ''}
          onChange={(e) =>
            onUpdate({
              restAfterSeconds: e.target.value ? Number(e.target.value) : null,
            })
          }
          placeholder="0"
          min={0}
          className="input-field"
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={exercise.notes ?? ''}
          onChange={(e) => onUpdate({ notes: e.target.value || null })}
          placeholder="Coach notes for this exercise slot..."
          rows={3}
          className="input-field resize-none"
        />
      </Field>
    </>
  )
}

function SessionProperties({
  session,
  onUpdate,
}: {
  session: BuilderSession
  onUpdate: (updates: Partial<BuilderSession>) => void
}) {
  return (
    <>
      <Field label="Day Label">
        <input
          type="text"
          value={session.dayLabel ?? ''}
          onChange={(e) => onUpdate({ dayLabel: e.target.value || null })}
          placeholder="e.g. Day 1, Monday AM"
          className="input-field"
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={session.notes ?? ''}
          onChange={(e) => onUpdate({ notes: e.target.value || null })}
          placeholder="Notes for this session in the program..."
          rows={3}
          className="input-field resize-none"
        />
      </Field>

      <div className="text-xs text-neutral-500 flex items-center gap-2">
        <Clock size={10} />
        {formatDuration(session.durationSeconds)} • {session.exerciseCount} exercises
      </div>
    </>
  )
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 mb-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m`
}
