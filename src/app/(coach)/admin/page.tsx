'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Building2,
  Users,
  Mail,
  Settings,
  Dumbbell,
  CalendarDays,
  LayoutGrid,
  CreditCard,
  BarChart3,
  Crown,
  Shield,
  ArrowRight,
} from 'lucide-react'
import { organizationApi, type OrgSummary } from '@/hooks/use-api'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface MeResponse {
  id: string
  email: string
  fullName: string
  role: string
  memberships: Array<{
    organizationId: string
    organizationName: string
    isOwner: boolean
    isAdmin: boolean
  }>
}

export default function AdminPage() {
  const { data: me, isLoading: meLoading } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/v1/me`, { credentials: 'include' })
      if (!res.ok) throw new Error('Not authenticated')
      return res.json()
    },
  })

  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationApi.list(),
    enabled: !!me,
  })

  const isLoading = meLoading || orgsLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    )
  }

  // Gate: check admin access
  const adminMembership = me?.memberships.find((m) => m.isOwner || m.isAdmin)
  if (!adminMembership) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 max-w-md text-center">
          <Shield className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-neutral-100 mb-2">Admin access required</h1>
          <p className="text-neutral-400 text-sm">
            You need to be an organization owner or admin to access this dashboard.
            Contact your organization owner to request access.
          </p>
          <Link
            href="/builder"
            className="inline-block mt-6 px-4 py-2 text-sm font-medium text-rose-400 hover:text-rose-300 transition-colors"
          >
            Back to Builder
          </Link>
        </div>
      </div>
    )
  }

  const org: OrgSummary | undefined = orgsData?.data.find(
    (o) => o.id === adminMembership.organizationId
  )

  const planColors: Record<string, string> = {
    free: 'bg-neutral-700 text-neutral-300',
    pro: 'bg-rose-900/50 text-rose-400',
    team: 'bg-purple-900/50 text-purple-400',
    business: 'bg-amber-900/50 text-amber-400',
    enterprise: 'bg-emerald-900/50 text-emerald-400',
  }

  const stats = [
    {
      label: 'Members',
      value: org?._count.members ?? 0,
      icon: Users,
      color: 'text-rose-400',
    },
    {
      label: 'Exercises',
      value: org?._count.exercises ?? 0,
      icon: Dumbbell,
      color: 'text-emerald-400',
    },
    {
      label: 'Sessions',
      value: org?._count.sessions ?? 0,
      icon: CalendarDays,
      color: 'text-purple-400',
    },
    {
      label: 'Programs',
      value: org?._count.programs ?? 0,
      icon: LayoutGrid,
      color: 'text-amber-400',
    },
  ]

  const navCards = [
    {
      href: '/admin/members',
      label: 'Members',
      description: 'Manage team members, roles, and permissions',
      icon: Users,
    },
    {
      href: '/admin/invitations',
      label: 'Invitations',
      description: 'Invite new members and track pending invitations',
      icon: Mail,
    },
    {
      href: '/admin/billing',
      label: 'Billing',
      description: 'Subscription plan, usage limits, and upgrades',
      icon: CreditCard,
    },
    {
      href: '/admin/settings',
      label: 'Settings',
      description: 'Organization name, branding, and defaults',
      icon: Settings,
    },
    {
      href: '/admin/analytics',
      label: 'Analytics',
      description: 'Content performance, client engagement, and revenue',
      icon: BarChart3,
    },
  ]

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-neutral-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-neutral-100">
                {org?.name ?? 'Organization'}
              </h1>
              {org?.plan && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${planColors[org.plan] ?? planColors.free}`}>
                  {org.plan}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {adminMembership.isOwner && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <Crown className="w-3 h-3" /> Owner
                </span>
              )}
              {adminMembership.isAdmin && !adminMembership.isOwner && (
                <span className="flex items-center gap-1 text-xs text-rose-400">
                  <Shield className="w-3 h-3" /> Admin
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-neutral-900 border border-neutral-800 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-neutral-500 uppercase tracking-wide">
                  {stat.label}
                </span>
              </div>
              <p className="text-2xl font-semibold text-neutral-100">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Navigation Cards */}
        <h2 className="text-lg font-medium text-neutral-300 mb-4">Manage</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {navCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <card.icon className="w-5 h-5 text-neutral-400 group-hover:text-rose-400 transition-colors" />
                <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
              </div>
              <h3 className="text-base font-medium text-neutral-100 mb-1">{card.label}</h3>
              <p className="text-sm text-neutral-500">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
