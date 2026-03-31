'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  Settings,
  Save,
  CheckCircle2,
} from 'lucide-react'
import { organizationApi, type OrgDetail } from '@/hooks/use-api'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface MeResponse {
  id: string
  memberships: Array<{
    organizationId: string
    isOwner: boolean
    isAdmin: boolean
  }>
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [defaultVisibility, setDefaultVisibility] = useState('organization')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const { data: me } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/v1/me`, { credentials: 'include' })
      if (!res.ok) throw new Error('Not authenticated')
      return res.json()
    },
  })

  const adminMembership = me?.memberships.find((m) => m.isOwner || m.isAdmin)
  const orgId = adminMembership?.organizationId

  const { data: org, isLoading } = useQuery({
    queryKey: ['org-detail', orgId],
    queryFn: () => organizationApi.get(orgId!),
    enabled: !!orgId,
  })

  // Populate form when org data loads
  useEffect(() => {
    if (org && !initialized) {
      setName(org.name ?? '')
      setLogoUrl(org.logoUrl ?? '')
      setDefaultVisibility(org.defaultVisibility ?? 'organization')
      setInitialized(true)
    }
  }, [org, initialized])

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      organizationApi.update(orgId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-detail', orgId] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      setFormError(null)
      setFormSuccess(true)
      setTimeout(() => setFormSuccess(false), 3000)
    },
    onError: (err: Error) => {
      setFormError(err.message)
      setFormSuccess(false)
    },
  })

  if (!orgId) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-500">Admin access required</div>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Organization name is required')
      return
    }
    setFormError(null)
    updateMutation.mutate({
      name: name.trim(),
      logoUrl: logoUrl.trim() || null,
      defaultVisibility,
    })
  }

  const visibilityOptions = [
    { value: 'private', label: 'Private', description: 'Only the creator can see content' },
    { value: 'organization', label: 'Organization', description: 'All organization members can see content' },
    { value: 'community', label: 'Community', description: 'All platform users can see content' },
  ]

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/admin"
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-neutral-400" />
            <h1 className="text-xl font-semibold text-neutral-100">Organization Settings</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 animate-pulse">
            <div className="space-y-4">
              <div className="h-10 bg-neutral-800 rounded w-full" />
              <div className="h-10 bg-neutral-800 rounded w-full" />
              <div className="h-10 bg-neutral-800 rounded w-1/2" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="org-name" className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Organization name
                </label>
                <input
                  id="org-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field w-full"
                  placeholder="My Organization"
                  disabled={updateMutation.isPending}
                />
              </div>

              {/* Logo URL */}
              <div>
                <label htmlFor="logo-url" className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Logo URL
                </label>
                <input
                  id="logo-url"
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="input-field w-full"
                  placeholder="https://example.com/logo.png"
                  disabled={updateMutation.isPending}
                />
                {logoUrl && (
                  <div className="mt-3 p-3 bg-neutral-800 rounded-lg inline-block">
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="max-h-12 max-w-48 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Default Visibility */}
              <div>
                <label htmlFor="visibility" className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Default content visibility
                </label>
                <select
                  id="visibility"
                  value={defaultVisibility}
                  onChange={(e) => setDefaultVisibility(e.target.value)}
                  className="input-field w-full"
                  disabled={updateMutation.isPending}
                >
                  {visibilityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-neutral-500">
                  {visibilityOptions.find((o) => o.value === defaultVisibility)?.description}
                </p>
              </div>

              {/* Error / Success */}
              {formError && (
                <p className="text-sm text-red-400">{formError}</p>
              )}
              {formSuccess && (
                <p className="flex items-center gap-1.5 text-sm text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Settings saved successfully
                </p>
              )}

              {/* Submit */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
