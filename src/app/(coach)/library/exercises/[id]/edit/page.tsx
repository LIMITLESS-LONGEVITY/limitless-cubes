'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Trash2, Film, Image as ImageIcon } from 'lucide-react'
import { exerciseApi, taxonomyApi, type Exercise } from '@/hooks/use-api'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface MediaItem {
  id: string
  mediaType: string
  url: string
  title: string | null
  position: number
}

export default function EditExercisePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(0)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [difficultyLevelId, setDifficultyLevelId] = useState('')
  const [selectedDomains, setSelectedDomains] = useState<string[]>([])
  const [creatorNotes, setCreatorNotes] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [error, setError] = useState('')

  // Media state
  const [media, setMedia] = useState<MediaItem[]>([])
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [addingMedia, setAddingMedia] = useState(false)

  const { data: exercise, isLoading: exerciseLoading, error: fetchError } = useQuery({
    queryKey: ['exercise', id],
    queryFn: () => exerciseApi.get(id),
    enabled: !!id,
  })

  const { data: domains } = useQuery({
    queryKey: ['domains'],
    queryFn: taxonomyApi.domains,
  })

  const { data: difficultyLevels } = useQuery({
    queryKey: ['difficultyLevels'],
    queryFn: taxonomyApi.difficultyLevels,
  })

  // Populate form when exercise data loads
  useEffect(() => {
    if (exercise) {
      setName(exercise.name)
      setDescription(exercise.description || '')
      const totalSec = exercise.durationSeconds || 0
      setDurationMinutes(Math.floor(totalSec / 60))
      setDurationSeconds(totalSec % 60)
      setDifficultyLevelId(exercise.difficultyLevel?.id || '')
      setSelectedDomains(exercise.domains.map((d) => d.domain.id))
      setCreatorNotes(exercise.creatorNotes || '')
      setVisibility(exercise.visibility)
      setMedia(exercise.media || [])
    }
  }, [exercise])

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => exerciseApi.update(id, data),
    onSuccess: () => {
      router.push(`/library/exercises/${id}`)
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

    updateMutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      durationSeconds: totalSeconds,
      ...(difficultyLevelId && { difficultyLevelId }),
      domainIds: selectedDomains,
      creatorNotes: creatorNotes.trim() || null,
      visibility,
    })
  }

  function toggleDomain(domainId: string) {
    setSelectedDomains((prev) =>
      prev.includes(domainId) ? prev.filter((d) => d !== domainId) : [...prev, domainId]
    )
  }

  async function handleAddMedia(type: 'youtube' | 'image', url: string) {
    if (!url.trim()) return
    setAddingMedia(true)
    try {
      const res = await fetch(`${BASE_URL}/api/v1/exercises/${id}/media`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, url: url.trim(), position: media.length }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(body.error || `Failed to add media`)
      }
      const created = await res.json()
      setMedia((prev) => [...prev, created])
      if (type === 'youtube') setYoutubeUrl('')
      if (type === 'image') setImageUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add media')
    } finally {
      setAddingMedia(false)
    }
  }

  async function handleDeleteMedia(mediaId: string) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/exercises/${id}/media/${mediaId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(body.error || 'Failed to delete media')
      }
      setMedia((prev) => prev.filter((m) => m.id !== mediaId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete media')
    }
  }

  if (exerciseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-app)' }}>
        <Loader2 size={32} className="animate-spin text-neutral-600" />
      </div>
    )
  }

  if (fetchError || !exercise) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--surface-app)' }}>
        <p className="text-sm text-neutral-400">Exercise not found</p>
        <button onClick={() => router.back()} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
          Go back
        </button>
      </div>
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

        <h1 className="text-2xl font-semibold text-neutral-100 mb-8">Edit Exercise</h1>

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

          {/* Media Section */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-neutral-300">Media</label>

            {/* Existing media */}
            {media.length > 0 && (
              <div className="flex flex-col gap-2">
                {media.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ background: 'var(--surface-card)', border: '1px solid #222' }}
                  >
                    {m.mediaType === 'youtube' ? (
                      <Film size={16} className="text-red-400 flex-shrink-0" />
                    ) : (
                      <ImageIcon size={16} className="text-blue-400 flex-shrink-0" />
                    )}
                    <span className="text-sm text-neutral-300 truncate flex-1">{m.url}</span>
                    <span className="text-[10px] text-neutral-500 uppercase flex-shrink-0">{m.mediaType}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(m.id)}
                      className="p-1 text-neutral-500 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add YouTube */}
            <div className="flex items-center gap-2">
              <Film size={16} className="text-red-400 flex-shrink-0" />
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="YouTube URL..."
                style={{ ...inputStyle, flex: 1 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#333')}
              />
              <button
                type="button"
                disabled={!youtubeUrl.trim() || addingMedia}
                onClick={() => handleAddMedia('youtube', youtubeUrl)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white rounded-md transition-colors disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                {addingMedia ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Add
              </button>
            </div>

            {/* Add Image */}
            <div className="flex items-center gap-2">
              <ImageIcon size={16} className="text-blue-400 flex-shrink-0" />
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Image URL..."
                style={{ ...inputStyle, flex: 1 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#333')}
              />
              <button
                type="button"
                disabled={!imageUrl.trim() || addingMedia}
                onClick={() => handleAddMedia('image', imageUrl)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white rounded-md transition-colors disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                {addingMedia ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Add
              </button>
            </div>
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
            disabled={updateMutation.isPending || !name.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={(e) => !updateMutation.isPending && (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            {updateMutation.isPending && <Loader2 size={16} className="animate-spin" />}
            Save Changes
          </button>
        </form>
      </div>
    </div>
  )
}
