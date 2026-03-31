'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { exerciseApi, taxonomyApi } from '@/hooks/use-api'

export default function NewExercisePage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(0)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [difficultyLevelId, setDifficultyLevelId] = useState('')
  const [selectedDomains, setSelectedDomains] = useState<string[]>([])
  const [creatorNotes, setCreatorNotes] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [error, setError] = useState('')

  const { data: domains } = useQuery({
    queryKey: ['domains'],
    queryFn: taxonomyApi.domains,
  })

  const { data: difficultyLevels } = useQuery({
    queryKey: ['difficultyLevels'],
    queryFn: taxonomyApi.difficultyLevels,
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => exerciseApi.create(data),
    onSuccess: (created) => {
      router.push(`/library/exercises/${created.id}`)
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    const totalSeconds = durationMinutes * 60 + durationSeconds

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      durationSeconds: totalSeconds,
      ...(difficultyLevelId && { difficultyLevelId }),
      domainIds: selectedDomains,
      creatorNotes: creatorNotes.trim() || null,
      visibility,
    })
  }

  function toggleDomain(id: string) {
    setSelectedDomains((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const inputStyle: React.CSSProperties = {
    background: '#171717',
    border: '1px solid #333',
    borderRadius: '0.375rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    color: '#e5e5e5',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s',
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-app)' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <h1 className="text-2xl font-semibold text-neutral-100 mb-8">Create Exercise</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-300">
              Name <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Barbell Back Squat"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#333')}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the exercise, cues, and technique..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' as const }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#333')}
            />
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-300">Duration</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ ...inputStyle, width: '80px', textAlign: 'center' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#333')}
                />
                <span className="text-xs text-neutral-500">min</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  style={{ ...inputStyle, width: '80px', textAlign: 'center' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#333')}
                />
                <span className="text-xs text-neutral-500">sec</span>
              </div>
            </div>
          </div>

          {/* Difficulty */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-300">Difficulty</label>
            <select
              value={difficultyLevelId}
              onChange={(e) => setDifficultyLevelId(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#333')}
            >
              <option value="">Select difficulty...</option>
              {difficultyLevels?.map((dl) => (
                <option key={dl.id} value={dl.id}>{dl.label}</option>
              ))}
            </select>
          </div>

          {/* Domain pills */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-300">Domains</label>
            <div className="flex flex-wrap gap-2">
              {domains?.map((d) => {
                const selected = selectedDomains.includes(d.id)
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDomain(d.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
                    style={{
                      background: selected ? 'var(--accent-subtle)' : '#171717',
                      color: selected ? 'var(--accent-light)' : '#a3a3a3',
                      border: `1px solid ${selected ? 'var(--accent)' : '#333'}`,
                    }}
                  >
                    {d.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Creator Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-300">Creator Notes</label>
            <textarea
              value={creatorNotes}
              onChange={(e) => setCreatorNotes(e.target.value)}
              placeholder="Internal notes (not visible to others)..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' as const }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#333')}
            />
          </div>

          {/* Visibility */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-300">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#333')}
            >
              <option value="private">Private</option>
              <option value="organization">Organization</option>
              <option value="community">Community</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 px-3 py-2 rounded-lg" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={createMutation.isPending || !name.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={(e) => !createMutation.isPending && (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
            Create Exercise
          </button>
        </form>
      </div>
    </div>
  )
}
