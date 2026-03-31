import { create } from 'zustand'
import { temporal } from 'zundo'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface BuilderExercise {
  /** Unique key for this slot (not the exercise ID — allows duplicates) */
  slotId: string
  exerciseId: string
  name: string
  durationSeconds: number
  phaseId: string | null
  phaseName: string | null
  restAfterSeconds: number | null
  overrideDurationSeconds: number | null
  sets: number | null
  reps: string | null
  notes: string | null
}

export interface BuilderSession {
  /** Unique key for this slot in program mode */
  slotId: string
  sessionId: string
  name: string
  durationSeconds: number
  dayLabel: string | null
  notes: string | null
  exerciseCount: number
}

export type BuilderMode = 'empty' | 'session' | 'program'

export type BuilderItem = BuilderExercise | BuilderSession

export interface EditingEntity {
  id: string
  name: string
  creatorId: string
  type: 'session' | 'program'
}

export interface Phase {
  id: string
  name: string
  sortOrder: number
}

// ═══════════════════════════════════════════════════════════════
// Store State & Actions
// ═══════════════════════════════════════════════════════════════

interface BuilderState {
  // Canvas state
  items: BuilderItem[]
  mode: BuilderMode
  phases: Phase[]
  editingEntity: EditingEntity | null
  isDirty: boolean
  draftId: string | null

  // Selected item (for properties panel)
  selectedSlotId: string | null

  // Actions — canvas manipulation
  addExercise: (exercise: Omit<BuilderExercise, 'slotId'>) => void
  addSession: (session: Omit<BuilderSession, 'slotId'>) => void
  removeItem: (slotId: string) => void
  reorderItems: (fromIndex: number, toIndex: number) => void
  updateItem: (slotId: string, updates: Partial<BuilderExercise | BuilderSession>) => void
  moveToPhase: (slotId: string, phaseId: string | null) => void

  // Actions — session metadata
  setPhases: (phases: Phase[]) => void
  selectItem: (slotId: string | null) => void

  // Actions — editing existing content
  loadSession: (entity: EditingEntity, items: BuilderExercise[], phases: Phase[]) => void
  loadProgram: (entity: EditingEntity, items: BuilderSession[]) => void
  loadFromTemplate: (items: BuilderExercise[], phases: Phase[]) => void

  // Actions — lifecycle
  clear: () => void
  markClean: () => void
}

function generateSlotId(): string {
  return `slot_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function detectMode(items: BuilderItem[]): BuilderMode {
  if (items.length === 0) return 'empty'
  if ('exerciseId' in items[0]) return 'session'
  return 'program'
}

function calculateTotalDuration(items: BuilderItem[]): number {
  return items.reduce((total, item) => {
    if ('exerciseId' in item) {
      const ex = item as BuilderExercise
      const duration = ex.overrideDurationSeconds ?? ex.durationSeconds
      const sets = ex.sets ?? 1
      const rest = ex.restAfterSeconds ?? 0
      return total + duration * sets + rest
    }
    return total + (item as BuilderSession).durationSeconds
  }, 0)
}

// ═══════════════════════════════════════════════════════════════
// Store with undo/redo via zundo temporal middleware
// ═══════════════════════════════════════════════════════════════

export const useBuilderStore = create<BuilderState>()(
  temporal(
    (set, get) => ({
      // Initial state
      items: [],
      mode: 'empty',
      phases: [],
      editingEntity: null,
      isDirty: false,
      draftId: null,
      selectedSlotId: null,

      // ── Canvas manipulation ──────────────────────────────

      addExercise: (exercise) => {
        const slotId = generateSlotId()
        set((state) => {
          const newItems = [...state.items, { ...exercise, slotId }]
          return {
            items: newItems,
            mode: 'session',
            isDirty: true,
            selectedSlotId: slotId,
          }
        })
      },

      addSession: (session) => {
        const slotId = generateSlotId()
        set((state) => {
          const newItems = [...state.items, { ...session, slotId }]
          return {
            items: newItems,
            mode: 'program',
            isDirty: true,
            selectedSlotId: slotId,
          }
        })
      },

      removeItem: (slotId) => {
        set((state) => {
          const newItems = state.items.filter((item) => item.slotId !== slotId)
          return {
            items: newItems,
            mode: detectMode(newItems),
            isDirty: true,
            selectedSlotId:
              state.selectedSlotId === slotId ? null : state.selectedSlotId,
          }
        })
      },

      reorderItems: (fromIndex, toIndex) => {
        set((state) => {
          const newItems = [...state.items]
          const [moved] = newItems.splice(fromIndex, 1)
          newItems.splice(toIndex, 0, moved)
          return { items: newItems, isDirty: true }
        })
      },

      updateItem: (slotId, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.slotId === slotId ? { ...item, ...updates } : item
          ),
          isDirty: true,
        }))
      },

      moveToPhase: (slotId, phaseId) => {
        const { phases } = get()
        const phase = phases.find((p) => p.id === phaseId)
        set((state) => ({
          items: state.items.map((item) =>
            item.slotId === slotId && 'exerciseId' in item
              ? { ...item, phaseId, phaseName: phase?.name ?? null }
              : item
          ),
          isDirty: true,
        }))
      },

      // ── Session metadata ─────────────────────────────────

      setPhases: (phases) => set({ phases }),

      selectItem: (slotId) => set({ selectedSlotId: slotId }),

      // ── Load existing content ────────────────────────────

      loadSession: (entity, items, phases) => {
        set({
          items,
          mode: 'session',
          phases,
          editingEntity: entity,
          isDirty: false,
          selectedSlotId: null,
        })
      },

      loadProgram: (entity, items) => {
        set({
          items,
          mode: 'program',
          phases: [],
          editingEntity: entity,
          isDirty: false,
          selectedSlotId: null,
        })
      },

      /** Load a template as a new session (deep copy, no editingEntity) */
      loadFromTemplate: (items: BuilderExercise[], phases: Phase[]) => {
        // Generate fresh slot IDs so the template items are independent
        const freshItems = items.map((item) => ({
          ...item,
          slotId: generateSlotId(),
        }))
        set({
          items: freshItems,
          mode: 'session',
          phases,
          editingEntity: null,
          isDirty: true,
          selectedSlotId: null,
        })
      },

      // ── Lifecycle ────────────────────────────────────────

      clear: () => {
        set({
          items: [],
          mode: 'empty',
          phases: [],
          editingEntity: null,
          isDirty: false,
          draftId: null,
          selectedSlotId: null,
        })
      },

      markClean: () => set({ isDirty: false }),
    }),
    {
      // Undo/redo config: track items and phases only, cap at 50 entries
      limit: 50,
      partialize: (state) => ({
        items: state.items,
        phases: state.phases,
      }),
    }
  )
)

// ═══════════════════════════════════════════════════════════════
// Selectors
// ═══════════════════════════════════════════════════════════════

export const selectTotalDuration = (state: BuilderState) =>
  calculateTotalDuration(state.items)

export const selectItemCount = (state: BuilderState) => state.items.length

export const selectSelectedItem = (state: BuilderState) =>
  state.items.find((item) => item.slotId === state.selectedSlotId) ?? null

export const selectExercisesByPhase = (state: BuilderState) => {
  if (state.mode !== 'session') return new Map<string | null, BuilderExercise[]>()

  const grouped = new Map<string | null, BuilderExercise[]>()
  for (const item of state.items) {
    if (!('exerciseId' in item)) continue
    const ex = item as BuilderExercise
    const key = ex.phaseId
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(ex)
  }
  return grouped
}

export const selectCanUndo = () => useBuilderStore.temporal.getState().pastStates.length > 0
export const selectCanRedo = () => useBuilderStore.temporal.getState().futureStates.length > 0
