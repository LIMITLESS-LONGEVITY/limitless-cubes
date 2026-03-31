'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  UserPlus,
  Users,
  Mail,
  Calendar,
  Loader2,
  X,
  Dumbbell,
} from 'lucide-react'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface Client {
  id: string
  fullName: string
  email: string
  createdAt: string
  programAssignments: Array<{
    program: { id: string; name: string }
  }>
  _count: { programAssignments: number }
}

interface ClientsResponse {
  data: Client[]
  total: number
}

export default function ClientsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading } = useQuery<ClientsResponse>({
    queryKey: ['clients', search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`${basePath}/api/v1/clients?${params}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch clients')
      const json = await res.json()
      return json.data ?? json
    },
  })

  const createMutation = useMutation({
    mutationFn: async (body: { email: string; fullName: string }) => {
      const res = await fetch(`${basePath}/api/v1/clients`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create client' }))
        throw new Error(err.error || 'Failed to create client')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setNewEmail('')
      setNewName('')
      setShowAddForm(false)
      setFormError(null)
    },
    onError: (err: Error) => {
      setFormError(err.message)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail.trim() || !newName.trim()) {
      setFormError('Both email and name are required')
      return
    }
    setFormError(null)
    createMutation.mutate({ email: newEmail.trim(), fullName: newName.trim() })
  }

  const clients: Client[] = data?.data ?? []

  function formatRelativeDate(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-neutral-400" />
            <h1 className="text-2xl font-semibold text-neutral-100">Clients</h1>
          </div>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm)
              setFormError(null)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Client
          </button>
        </div>

        {/* Add Client Form */}
        {showAddForm && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-neutral-200">Add a new client</h2>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setFormError(null)
                }}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="client-name" className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Full name *
                  </label>
                  <input
                    id="client-name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Jane Smith"
                    className="input-field w-full"
                    disabled={createMutation.isPending}
                  />
                </div>
                <div>
                  <label htmlFor="client-email" className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Email *
                  </label>
                  <input
                    id="client-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="input-field w-full"
                    disabled={createMutation.isPending}
                  />
                </div>
              </div>
              {formError && <p className="text-sm text-red-400">{formError}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={createMutation.isPending || !newEmail.trim() || !newName.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {createMutation.isPending ? 'Adding...' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name or email..."
            className="input-field w-full pl-10"
          />
        </div>

        {/* Client List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-12 text-center">
            <Users className="w-10 h-10 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-400 mb-1">
              {search
                ? 'No clients match your search'
                : 'No clients yet \u2014 invite your first client to get started'}
            </p>
            {!search && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 text-sm text-rose-400 hover:text-rose-300 transition-colors"
              >
                Add your first client
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
              <div
                key={client.id}
                className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-center gap-4 hover:border-neutral-700 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-rose-900/30 border border-rose-800/40 flex items-center justify-center text-sm font-medium text-rose-300 shrink-0">
                  {client.fullName?.[0]?.toUpperCase() || client.email[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-100 truncate">
                    {client.fullName}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-neutral-500 truncate">
                      <Mail className="w-3 h-3 shrink-0" />
                      {client.email}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <Dumbbell className="w-3.5 h-3.5" />
                    <span>{client._count.programAssignments} program{client._count.programAssignments !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatRelativeDate(client.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
