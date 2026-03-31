'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
} from 'lucide-react'
import { organizationApi, type OrgInvitation } from '@/hooks/use-api'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface MeResponse {
  id: string
  memberships: Array<{
    organizationId: string
    isOwner: boolean
    isAdmin: boolean
  }>
}

export default function InvitationsPage() {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [grantAdmin, setGrantAdmin] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

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

  const { data: invitationsData, isLoading } = useQuery({
    queryKey: ['org-invitations', orgId],
    queryFn: () => organizationApi.invitations(orgId!),
    enabled: !!orgId,
  })

  const createMutation = useMutation({
    mutationFn: (data: { email: string; grantAdmin: boolean }) =>
      organizationApi.createInvitation(orgId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-invitations', orgId] })
      setEmail('')
      setGrantAdmin(false)
      setFormError(null)
      setFormSuccess('Invitation sent successfully')
      setTimeout(() => setFormSuccess(null), 3000)
    },
    onError: (err: Error) => {
      setFormError(err.message)
      setFormSuccess(null)
    },
  })

  const invitations: OrgInvitation[] = invitationsData?.data ?? []

  if (!orgId) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-500">Admin access required</div>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setFormError('Email is required')
      return
    }
    setFormError(null)
    createMutation.mutate({ email: email.trim(), grantAdmin })
  }

  const statusConfig = {
    pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-900/20', label: 'Pending' },
    accepted: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-900/20', label: 'Accepted' },
    expired: { icon: XCircle, color: 'text-neutral-500', bg: 'bg-neutral-800', label: 'Expired' },
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/admin"
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-neutral-400" />
            <h1 className="text-xl font-semibold text-neutral-100">Invitations</h1>
          </div>
        </div>

        {/* Invite Form */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-8">
          <h2 className="text-base font-medium text-neutral-200 mb-4">Invite a new member</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="input-field flex-1"
                disabled={createMutation.isPending}
              />
              <button
                type="submit"
                disabled={createMutation.isPending || !email.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {createMutation.isPending ? 'Sending...' : 'Send Invite'}
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={grantAdmin}
                onChange={(e) => setGrantAdmin(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-rose-600 focus:ring-rose-500 focus:ring-offset-0"
              />
              <span className="flex items-center gap-1.5 text-sm text-neutral-400">
                <Shield className="w-3.5 h-3.5" />
                Grant admin access
              </span>
            </label>

            {formError && (
              <p className="text-sm text-red-400">{formError}</p>
            )}
            {formSuccess && (
              <p className="text-sm text-emerald-400">{formSuccess}</p>
            )}
          </form>
        </div>

        {/* Invitations List */}
        <h2 className="text-base font-medium text-neutral-300 mb-4">
          All invitations ({invitations.length})
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 animate-pulse">
                <div className="h-5 bg-neutral-800 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center">
            <Mail className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-500">No invitations yet. Send one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => {
              const config = statusConfig[invitation.status] ?? statusConfig.pending
              const StatusIcon = config.icon
              return (
                <div
                  key={invitation.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-center gap-4"
                >
                  <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
                    <StatusIcon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-neutral-100">
                        {invitation.email}
                      </span>
                      {invitation.grantAdmin && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-rose-400">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500">
                      <span>Invited by {invitation.inviter.fullName}</span>
                      <span>
                        {new Date(invitation.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${config.bg} ${config.color}`}>
                    {config.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
