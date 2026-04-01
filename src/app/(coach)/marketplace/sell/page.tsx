'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DollarSign, ExternalLink, TrendingUp, Package } from 'lucide-react'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export default function SellerDashboardPage() {
  const queryClient = useQueryClient()

  const { data: connectStatus, isLoading: loadingConnect } = useQuery({
    queryKey: ['connect-status'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/v1/marketplace/connect`, { credentials: 'include' })
      if (!res.ok) return { connected: false }
      return res.json()
    },
  })

  const { data: sales } = useQuery({
    queryKey: ['my-sales'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/v1/marketplace/my-sales`, { credentials: 'include' })
      if (!res.ok) return null
      return res.json()
    },
    enabled: connectStatus?.connected && connectStatus?.chargesEnabled,
  })

  async function handleStartSelling() {
    const res = await fetch(`${basePath}/api/v1/marketplace/connect`, {
      method: 'POST',
      credentials: 'include',
    })
    const data = await res.json()
    if (data.onboardingUrl) {
      window.location.href = data.onboardingUrl
    } else {
      alert(data.error || 'Failed to start onboarding')
    }
  }

  if (loadingConnect) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center">
        <p className="text-neutral-500">Loading...</p>
      </div>
    )
  }

  // Not connected — show CTA
  if (!connectStatus?.connected || !connectStatus?.chargesEnabled) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] text-neutral-200">
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <DollarSign size={64} className="mx-auto text-rose-500 mb-6" />
          <h1 className="text-3xl font-bold mb-4">Start Selling on CUBES+</h1>
          <p className="text-neutral-400 mb-2">
            Share your training expertise and earn revenue from your sessions and programs.
          </p>
          <p className="text-neutral-500 text-sm mb-8">
            Platform fee: 20% on direct sales. You keep 80% of every purchase.
          </p>
          <button
            onClick={handleStartSelling}
            className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors text-lg"
          >
            {connectStatus?.connected ? 'Complete Setup' : 'Connect with Stripe'}
          </button>
          <p className="text-neutral-600 text-xs mt-4">
            Requires Pro plan or higher. Powered by Stripe Express.
          </p>
        </div>
      </div>
    )
  }

  // Connected — show dashboard
  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-neutral-200">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Seller Dashboard</h1>
          <a
            href="https://connect.stripe.com/express_login"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm border border-neutral-700 rounded-lg text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors"
          >
            Manage Payouts <ExternalLink size={14} />
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl p-5">
            <p className="text-sm text-neutral-400 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-emerald-400">${(sales?.totalRevenue ?? 0).toFixed(2)}</p>
          </div>
          <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl p-5">
            <p className="text-sm text-neutral-400 mb-1">This Month</p>
            <p className="text-3xl font-bold text-rose-400">${(sales?.thisMonth ?? 0).toFixed(2)}</p>
          </div>
          <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl p-5">
            <p className="text-sm text-neutral-400 mb-1">Total Sales</p>
            <p className="text-3xl font-bold">{sales?.totalSales ?? 0}</p>
          </div>
        </div>

        {/* Recent sales */}
        <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl">
          <div className="px-5 py-4 border-b border-[var(--surface-border)]">
            <h2 className="font-semibold">Recent Sales</h2>
          </div>
          {!sales?.recentSales?.length ? (
            <div className="p-10 text-center text-neutral-500">
              <Package size={32} className="mx-auto mb-3" />
              <p>No sales yet. List your first session or program on the marketplace!</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--surface-border)]">
              {sales.recentSales.map((sale: { entityName: string; entityType: string; buyerName: string; sellerRevenue: number; createdAt: string }, i: number) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-200">{sale.entityName}</p>
                    <p className="text-xs text-neutral-500">
                      {sale.entityType} &middot; purchased by {sale.buyerName} &middot; {new Date(sale.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">+${Number(sale.sellerRevenue).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
