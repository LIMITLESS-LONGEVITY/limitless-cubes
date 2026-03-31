'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { useBuilderStore } from '@/stores/builder-store'
import { LibraryPanel } from '@/components/builder/LibraryPanel'
import { BuilderCanvas } from '@/components/builder/BuilderCanvas'
import { PropertiesPanel } from '@/components/builder/PropertiesPanel'
import { SaveDialog } from '@/components/builder/SaveDialog'

export default function BuilderPage() {
  const [libraryCollapsed, setLibraryCollapsed] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saveOpen, setSaveOpen] = useState(false)

  const mode = useBuilderStore((s) => s.mode)
  const items = useBuilderStore((s) => s.items)
  const addExercise = useBuilderStore((s) => s.addExercise)
  const addSession = useBuilderStore((s) => s.addSession)
  const reorderItems = useBuilderStore((s) => s.reorderItems)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event

      if (!over) return

      const activeData = active.data.current
      const activeIdStr = String(active.id)
      const overIdStr = String(over.id)

      // Drag from library → canvas
      if (activeIdStr.startsWith('exercise-') && activeData?.type === 'exercise') {
        addExercise({
          exerciseId: activeData.exerciseId,
          name: activeData.name,
          durationSeconds: activeData.durationSeconds,
          phaseId: null,
          phaseName: null,
          restAfterSeconds: null,
          overrideDurationSeconds: null,
          sets: null,
          reps: null,
          notes: null,
        })
        return
      }

      if (activeIdStr.startsWith('session-') && activeData?.type === 'session') {
        addSession({
          sessionId: activeData.sessionId,
          name: activeData.name,
          durationSeconds: activeData.durationSeconds,
          dayLabel: null,
          notes: null,
          exerciseCount: activeData.exerciseCount ?? 0,
        })
        return
      }

      // Reorder within canvas
      if (activeIdStr.startsWith('slot_') && overIdStr.startsWith('slot_')) {
        const fromIndex = items.findIndex((i) => i.slotId === activeIdStr)
        const toIndex = items.findIndex((i) => i.slotId === overIdStr)
        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
          reorderItems(fromIndex, toIndex)
        }
      }
    },
    [items, addExercise, addSession, reorderItems]
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen">
        <LibraryPanel
          mode={mode}
          collapsed={libraryCollapsed}
          onToggle={() => setLibraryCollapsed(!libraryCollapsed)}
        />
        <BuilderCanvas onSave={() => setSaveOpen(true)} />
        <PropertiesPanel />
      </div>

      <SaveDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onSaved={(id, type) => {
          setSaveOpen(false)
          // TODO: show success toast, optionally navigate to detail view
        }}
      />

      <DragOverlay>
        {activeId && (
          <div className="bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 shadow-xl text-sm text-neutral-200 opacity-90">
            Dragging...
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
