'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  CreditCard,
  ArrowLeft,
  Dumbbell,
  LayoutGrid,
  Users,
  Check,
  Zap,
  ExternalLink,
  Loader2,
} from 'lucide-react'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface UsageItem {
  current: number
  limit: number
}

interface BillingStatus {
  currentPlan: string
  limits: Record<string, number>
  usage: {
    exercises: UsageItem
    programs: UsageItem
    coaches: UsageItem
  }
  subscription: {
    planName: string
    status: string
    currentPeriodEnd: string
  } | null
  hasStripeCustomer: boolean
  availablePlans: Array<{
    id: string
    tier: string
    name: string
    monthlyPrice: number
    yearlyPrice: number
    maxCoaches: number
    maxClients: number
    features: string[]
  }>
}

async function fetchBillingStatus(orgId: string): Promise<BillingStatus> {
  const res = await fetch(`${basePath}/api/v1/billing/status?organizationId=${orgId}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to fetch billing status')
  const json = await res.json()
  return json.data ?? json
}

function UsageBar({ label, icon: Icon, usage }: { label: string; icon: typeof Dumbbell; usage: UsageItem }) {
  const isUnlimited = usage.limit === -1
  const pct = isUnlimited ? 0 : Math.min((usage.current / usage.limit) * 100, 100)
  const isNearLimit = !isUnlimited && pct >= 80

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-neutral-400" />
          <span className="text-sm text-neutral-300">{label}</span>
        </div>
        <span className={`text-sm font-medium ${isNearLimit ? 'text-amber-400' : 'text-neutral-200'}`}>
          {usage.current}{isUnlimited ? '' : ` / ${usage.limit}`}
          {isUnlimited && <span className="text-neutral-500 ml-1">unlimited</span>}
        </span>
      </div>
      {!isUnlimited && (
        <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isNearLimit ? 'bg-amber-500' : 'bg-rose-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

const planColors: Record<string, string> = {
  free: 'border-neutral-700',
  pro: 'border-rose-800',
  team: 'border-purple-800',
  business: 'border-amber-800',
  enterprise: 'border-emerald-800',
}

const planBadgeColors: Record<string, string> = {
  free: 'bg-neutral-700 text-neutral-300',
  pro: 'bg-rose-900/50 text-rose-400',
  team: 'bg-purple-900/50 text-purple-400',
  business: 'bg-amber-900/50 text-amber-400',
  enterprise: 'bg-emerald-900/50 text-emerald-400',
}

export default function BillingPage() {
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [managingBilling, setManagingBilling] = useState(false)

  // Get user's org from /me
  const { data: meData } = useQuery<{ id: string; memberships: Array<{ organizationId: string; isOwner: boolean; isAdmin: boolean }> }>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/v1/me`, { credentials: 'include' })
      if (!res.ok) throw new Error('Not authenticated')
      return res.json()
    },
  })

  const adminMembership = meData?.memberships.find((m) => m.isOwner || m.isAdmin)
  const orgId = adminMembership?.organizationId

  const { data: billing, isLoading } = useQuery<BillingStatus>({
    queryKey: ['billing-status', orgId],
    queryFn: () => fetchBillingStatus(orgId!),
    enabled: !!orgId,
  })

  const handleUpgrade = async (planTier: string) => {
    if (!orgId) return
    setUpgrading(planTier)
    try {
      const res = await fetch(`${basePath}/api/v1/billing/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId, planTier, interval: 'monthly' }),
      })
      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch {
      // Handle error silently
    } finally {
      setUpgrading(null)
    }
  }

  const handleManageBilling = async () => {
    if (!orgId) return
    setManagingBilling(true)
    try {
      const res = await fetch(`${basePath}/api/v1/billing/portal`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId }),
      })
      const data = await res.json()
      if (data.portalUrl) {
        window.location.href = data.portalUrl
      }
    } catch {
      // Handle error silently
    } finally {
      setManagingBilling(false)
    }
  }

  if (!adminMembership) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <p className="text-neutral-400">Admin access required</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin"
            className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center hover:border-neutral-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-neutral-100">Billing & Plan</h1>
            <p className="text-sm text-neutral-400 mt-1">Manage your subscription and usage limits</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
          </div>
        ) : billing ? (
          <>
            {/* Current Plan */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-neutral-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-medium text-neutral-100">Current Plan</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${planBadgeColors[billing.currentPlan] ?? planBadgeColors.free}`}>
                        {billing.currentPlan}
                      </span>
                    </div>
                    {billing.subscription && (
                      <p className="text-sm text-neutral-400 mt-1">
                        {billing.subscription.status === 'active' ? 'Active' : billing.subscription.status} &middot;
                        Renews {new Date(billing.subscription.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    )}
                    {billing.currentPlan === 'free' && (
                      <p className="text-sm text-neutral-500 mt-1">You&apos;re on the Free plan</p>
                    )}
                  </div>
                </div>
                {billing.hasStripeCustomer && billing.currentPlan !== 'free' && (
                  <button
                    onClick={handleManageBilling}
                    disabled={managingBilling}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-300 hover:border-neutral-600 transition-colors disabled:opacity-50"
                  >
                    {managingBilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    Manage Billing
                  </button>
                )}
              </div>
            </div>

            {/* Usage */}
            <h2 className="text-lg font-medium text-neutral-200 mb-3">Usage</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
              <UsageBar label="Exercises" icon={Dumbbell} usage={billing.usage.exercises} />
              <UsageBar label="Programs" icon={LayoutGrid} usage={billing.usage.programs} />
              <UsageBar label="Coaches" icon={Users} usage={billing.usage.coaches} />
            </div>

            {/* Available Plans */}
            <h2 className="text-lg font-medium text-neutral-200 mb-3">Available Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {billing.availablePlans.map((plan) => {
                const isCurrent = plan.tier === billing.currentPlan
                const isUpgrade = billing.availablePlans.indexOf(plan) > billing.availablePlans.findIndex((p) => p.tier === billing.currentPlan)

                return (
                  <div
                    key={plan.id}
                    className={`bg-neutral-900 border rounded-lg p-5 ${isCurrent ? 'border-rose-600 ring-1 ring-rose-600/30' : planColors[plan.tier] ?? 'border-neutral-800'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-neutral-100">{plan.name}</h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-rose-600/20 text-rose-400 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-neutral-100 mb-1">
                      ${(plan.monthlyPrice / 100).toFixed(0)}
                      <span className="text-sm font-normal text-neutral-500">/mo</span>
                    </p>
                    <p className="text-xs text-neutral-500 mb-4">
                      or ${(plan.yearlyPrice / 100).toFixed(0)}/yr
                    </p>
                    <ul className="space-y-1.5 mb-5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-neutral-400">
                          <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {isUpgrade && !isCurrent && (
                      <button
                        onClick={() => handleUpgrade(plan.tier)}
                        disabled={!!upgrading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {upgrading === plan.tier ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                        Upgrade
                      </button>
                    )}
                    {isCurrent && (
                      <div className="w-full text-center py-2 text-sm text-neutral-500">
                        Your current plan
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <p className="text-neutral-400 text-center py-20">Unable to load billing information</p>
        )}
      </div>
    </div>
  )
}
