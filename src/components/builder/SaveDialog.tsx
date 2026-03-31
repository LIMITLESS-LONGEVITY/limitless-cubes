'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Save, Loader2 } from 'lucide-react'
import { Eye } from 'lucide-react'
import { useBuilderStore, selectTotalDuration, type BuilderExercise, type BuilderSession } from '@/stores/builder-store'
import { sessionApi, programApi, taxonomyApi } from '@/hooks/use-api'

type ContentVisibility = 'private' | 'organization' | 'community'

const VISIBILITY_OPTIONS: Array<{ value: ContentVisibility; label: string; description: string }> = [
  { value: 'private', label: 'Private', description: 'Only visible to you' },
  { value: 'organization', label: 'Organization', description: 'Visible to your organization' },
  { value: 'community', label: 'Community', description: 'Visible to all coaches' },
]

interface SaveDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (id: string, type: 'session' | 'program') => void
}

export function SaveDialog({ open, onClose, onSaved }: SaveDialogProps) {
  const mode = useBuilderStore((s) => s.mode)
  const items = useBuilderStore((s) => s.items)
  const editingEntity = useBuilderStore((s) => s.editingEntity)
  const markClean = useBuilderStore((s) => s.markClean)
  const totalDuration = useBuilderStore(selectTotalDuration)

  const [name, setName] = useState(editingEntity?.name ?? '')
  const [description, setDescription] = useState('')
  const [difficultyLevelId, setDifficultyLevelId] = useState('')
  const [selectedDomainIds, setSelectedDomainIds] = useState<string[]>([])
  const [visibility, setVisibility] = useState<ContentVisibility>('organization')
  const [creatorNotes, setCreatorNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: domains } = useQuery({
    queryKey: ['domains'],
    queryFn: taxonomyApi.domains,
    enabled: open,
  })

  const { data: difficultyLevels } = useQuery({
    queryKey: ['difficultyLevels'],
    queryFn: taxonomyApi.difficultyLevels,
    enabled: open,
  })

  if (!open) return null

  const isEditing = !!editingEntity
  const entityType = mode === 'session' ? 'Session' : 'Program'

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const baseData = {
        name: name.trim(),
        description: description || undefined,
        difficultyLevelId: difficultyLevelId || undefined,
        domainIds: selectedDomainIds.length > 0 ? selectedDomainIds : undefined,
        visibility,
        creatorNotes: creatorNotes || undefined,
      }

      let savedId: string

      if (mode === 'session') {
        const exercises = items.map((item, index) => {
          const ex = item as BuilderExercise
          return {
            exerciseId: ex.exerciseId,
            position: index,
            phaseId: ex.phaseId || undefined,
            restAfterSeconds: ex.restAfterSeconds || undefined,
            overrideDurationSeconds: ex.overrideDurationSeconds || undefined,
            sets: ex.sets || undefined,
            reps: ex.reps || undefined,
            notes: ex.notes || undefined,
          }
        })

        if (isEditing) {
          const result = await sessionApi.update(editingEntity!.id, { ...baseData, exercises })
          savedId = result.id
        } else {
          const result = await sessionApi.create({ ...baseData, exercises })
          savedId = result.id
        }
      } else {
        const sessions = items.map((item, index) => {
          const s = item as BuilderSession
          return {
            sessionId: s.sessionId,
            position: index,
            dayLabel: s.dayLabel || undefined,
            notes: s.notes || undefined,
          }
        })

        if (isEditing) {
          const result = await programApi.update(editingEntity!.id, { ...baseData, sessions })
          savedId = result.id
        } else {
          const result = await programApi.create({ ...baseData, sessions })
          savedId = result.id
        }
      }

      markClean()
      onSaved(savedId, mode as 'session' | 'program')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function toggleDomain(domainId: string) {
    setSelectedDomainIds((prev) =>
      prev.includes(domainId) ? prev.filter((id) => id !== domainId) : [...prev, domainId]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div>
            <h2 className="text-base font-medium text-neutral-200">
              {isEditing ? `Update ${entityType}` : `Save ${entityType}`}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {items.length} {mode === 'session' ? 'exercises' : 'sessions'} •{' '}
              {formatDuration(totalDuration)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-500 hover:text-neutral-300">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1.5 block">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g. Morning HIIT ${entityType}`}
              className="input-field"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this session about?"
              rows={2}
              className="input-field resize-none"
            />
          </div>

          {/* Difficulty Level */}
          {difficultyLevels && difficultyLevels.length > 0 && (
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1.5 block">
                Difficulty Level
              </label>
              <select
                value={difficultyLevelId}
                onChange={(e) => setDifficultyLevelId(e.target.value)}
                className="input-field"
              >
                <option value="">Select level...</option>
                {difficultyLevels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Domains */}
          {domains && domains.length > 0 && (
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1.5 block">Domains</label>
              <div className="flex flex-wrap gap-1.5">
                {domains.map((domain) => (
                  <button
                    key={domain.id}
                    onClick={() => toggleDomain(domain.id)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      selectedDomainIds.includes(domain.id)
                        ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                        : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                    }`}
                  >
                    {domain.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Visibility */}
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1.5 block">
              Visibility
            </label>
            <div className="flex flex-col gap-1.5">
              {VISIBILITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setVisibility(option.value)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
                    visibility === option.value
                      ? 'border-rose-500 bg-rose-500/10'
                      : 'border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  <Eye size={14} className={visibility === option.value ? 'text-rose-400' : 'text-neutral-500'} />
                  <div>
                    <p className={`text-xs font-medium ${visibility === option.value ? 'text-rose-300' : 'text-neutral-300'}`}>
                      {option.label}
                    </p>
                    <p className="text-[10px] text-neutral-500">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Creator Notes */}
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1.5 block">
              Creator Notes <span className="text-neutral-600">(visible to you only)</span>
            </label>
            <textarea
              value={creatorNotes}
              onChange={(e) => setCreatorNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={2}
              className="input-field resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {isEditing ? 'Update' : 'Save'}
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
