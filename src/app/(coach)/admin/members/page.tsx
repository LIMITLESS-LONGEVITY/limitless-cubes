'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  Crown,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  Users,
} from 'lucide-react'
import { organizationApi, type OrgMember } from '@/hooks/use-api'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface MeResponse {
  id: string
  memberships: Array<{
    organizationId: string
    isOwner: boolean
    isAdmin: boolean
  }>
}

const roleColors: Record<string, string> = {
  head_coach: 'bg-amber-900/50 text-amber-400 border-amber-800/50',
  senior_coach: 'bg-rose-900/50 text-rose-400 border-rose-800/50',
  junior_coach: 'bg-neutral-800 text-neutral-400 border-neutral-700',
}

const roleLabels: Record<string, string> = {
  head_coach: 'Head Coach',
  senior_coach: 'Senior Coach',
  junior_coach: 'Junior Coach',
}

export default function MembersPage() {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)

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

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['org-members', orgId],
    queryFn: () => organizationApi.members(orgId!),
    enabled: !!orgId,
  })

  const updateMemberMutation = useMutation({
    mutationFn: (data: { memberId: string; isAdmin?: boolean; status?: string }) =>
      organizationApi.updateMember(orgId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', orgId] })
      setActionError(null)
    },
    onError: (err: Error) => {
      setActionError(err.message)
    },
  })

  const members: OrgMember[] = membersData?.data ?? []

  if (!orgId) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-500">Admin access required</div>
      </div>
    )
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
            <Users className="w-5 h-5 text-neutral-400" />
            <h1 className="text-xl font-semibold text-neutral-100">Members</h1>
          </div>
          <span className="text-sm text-neutral-500">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </span>
        </div>

        {actionError && (
          <div className="mb-4 px-4 py-3 bg-red-900/20 border border-red-800/50 rounded-lg text-sm text-red-400">
            {actionError}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 animate-pulse">
                <div className="h-5 bg-neutral-800 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                currentUserId={me?.id ?? ''}
                isCurrentUserOwner={adminMembership?.isOwner ?? false}
                isCurrentUserAdmin={adminMembership?.isAdmin ?? false}
                onToggleAdmin={(memberId, newValue) =>
                  updateMemberMutation.mutate({ memberId, isAdmin: newValue })
                }
                onToggleSuspend={(memberId, currentStatus) =>
                  updateMemberMutation.mutate({
                    memberId,
                    status: currentStatus === 'suspended' ? 'active' : 'suspended',
                  })
                }
                isPending={updateMemberMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MemberCard({
  member,
  currentUserId,
  isCurrentUserOwner,
  isCurrentUserAdmin,
  onToggleAdmin,
  onToggleSuspend,
  isPending,
}: {
  member: OrgMember
  currentUserId: string
  isCurrentUserOwner: boolean
  isCurrentUserAdmin: boolean
  onToggleAdmin: (memberId: string, newValue: boolean) => void
  onToggleSuspend: (memberId: string, currentStatus: string) => void
  isPending: boolean
}) {
  const isSelf = member.userId === currentUserId
  const canManage = (isCurrentUserOwner || isCurrentUserAdmin) && !isSelf && !member.isOwner

  return (
    <div className={`bg-neutral-900 border rounded-lg p-4 flex items-center gap-4 ${
      member.status === 'suspended' ? 'border-red-800/50 opacity-60' : 'border-neutral-800'
    }`}>
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-sm font-medium text-neutral-300 shrink-0">
        {member.user.avatarUrl ? (
          <img src={member.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          member.user.fullName?.[0]?.toUpperCase() || member.user.email[0].toUpperCase()
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-neutral-100 truncate">
            {member.user.fullName}
          </span>
          {member.isOwner && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400">
              <Crown className="w-3 h-3" /> Owner
            </span>
          )}
          {member.isAdmin && !member.isOwner && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-rose-400">
              <Shield className="w-3 h-3" /> Admin
            </span>
          )}
          {member.status === 'suspended' && (
            <span className="text-[10px] font-medium text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded">
              Suspended
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-neutral-500 truncate">{member.user.email}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${roleColors[member.user.role] ?? roleColors.junior_coach}`}>
            {roleLabels[member.user.role] ?? member.user.role}
          </span>
        </div>
      </div>

      {/* Actions */}
      {canManage && (
        <div className="flex items-center gap-2 shrink-0">
          {isCurrentUserOwner && (
            <button
              onClick={() => onToggleAdmin(member.id, !member.isAdmin)}
              disabled={isPending}
              className={`p-2 rounded-lg text-xs transition-colors ${
                member.isAdmin
                  ? 'text-rose-400 hover:bg-rose-900/30'
                  : 'text-neutral-500 hover:bg-neutral-800'
              } disabled:opacity-50`}
              title={member.isAdmin ? 'Revoke admin' : 'Grant admin'}
            >
              {member.isAdmin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => onToggleSuspend(member.id, member.status)}
            disabled={isPending}
            className={`p-2 rounded-lg text-xs transition-colors ${
              member.status === 'suspended'
                ? 'text-emerald-400 hover:bg-emerald-900/30'
                : 'text-red-400 hover:bg-red-900/30'
            } disabled:opacity-50`}
            title={member.status === 'suspended' ? 'Reactivate member' : 'Suspend member'}
          >
            {member.status === 'suspended' ? (
              <UserCheck className="w-4 h-4" />
            ) : (
              <UserX className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}
