'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ShoppingBag, Star, GitFork, Download, Search, Filter } from 'lucide-react'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface MarketplaceItem {
  id: string
  name: string
  description: string | null
  durationSeconds: number
  marketplacePrice: string
  downloadCount: number
  creator: { id: string; fullName: string; avatarUrl: string | null }
  domains: { domain: { name: string } }[]
  difficultyLevel: { label: string } | null
  _count: { likes: number; forks: number }
}

interface PurchaseRecord {
  entityType: string
  entityId: string
}

export default function MarketplacePage() {
  const [type, setType] = useState<'session' | 'program'>('session')
  const [domain, setDomain] = useState('')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/v1/me`, { credentials: 'include' })
      if (!res.ok) return null
      return res.json()
    },
  })

  const { data: listings, isLoading } = useQuery({
    queryKey: ['marketplace-listings', type, domain, sort, page],
    queryFn: async () => {
      const params = new URLSearchParams({ type, sort, page: String(page), limit: '20' })
      if (domain) params.set('domain', domain)
      const res = await fetch(`${basePath}/api/v1/marketplace/listings?${params}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load listings')
      return res.json()
    },
  })

  const { data: purchases } = useQuery<{ data: PurchaseRecord[] }>({
    queryKey: ['my-purchases'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/v1/me/purchases?limit=100`, { credentials: 'include' })
      if (!res.ok) return { data: [] }
      return res.json()
    },
  })

  const purchasedIds = new Set(purchases?.data?.map((p) => p.entityId) ?? [])

  async function handlePurchase(entityId: string) {
    const res = await fetch(`${basePath}/api/v1/marketplace/purchase`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType: type, entityId }),
    })
    const data = await res.json()
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl
    } else {
      alert(data.error || 'Failed to start purchase')
    }
  }

  const items: MarketplaceItem[] = listings?.data ?? []

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-neutral-200">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Marketplace</h1>
            <p className="text-neutral-400 mt-1">Purchase premium training content from top coaches</p>
          </div>
          <Link
            href="/marketplace/sell"
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Start Selling
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          {(['session', 'program'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setPage(1) }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                type === t ? 'bg-rose-600/20 text-rose-400' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              {t === 'session' ? 'Sessions' : 'Programs'}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1) }}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200"
          >
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="text-center py-20 text-neutral-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={48} className="mx-auto text-neutral-600 mb-4" />
            <p className="text-neutral-400">No marketplace listings yet</p>
            <p className="text-neutral-500 text-sm mt-1">Be the first to list your content</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const isOwn = me?.id === item.creator.id
              const isPurchased = purchasedIds.has(item.id)

              return (
                <div key={item.id} className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl p-5 hover:border-neutral-600 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/library/${type}s/${item.id}`} className="text-lg font-semibold text-neutral-100 hover:text-rose-400 transition-colors line-clamp-1">
                        {item.name}
                      </Link>
                      <p className="text-sm text-neutral-400 mt-0.5">{item.creator.fullName}</p>
                    </div>
                    <span className="ml-3 px-3 py-1 bg-rose-600/20 text-rose-400 text-sm font-bold rounded-lg whitespace-nowrap">
                      ${Number(item.marketplacePrice).toFixed(2)}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-sm text-neutral-400 line-clamp-2 mb-3">{item.description}</p>
                  )}

                  {/* Domain pills */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.domains.map((d) => (
                      <span key={d.domain.name} className="px-2 py-0.5 text-xs bg-neutral-800 text-neutral-300 rounded-full">
                        {d.domain.name}
                      </span>
                    ))}
                    {item.difficultyLevel && (
                      <span className="px-2 py-0.5 text-xs bg-amber-900/30 text-amber-400 rounded-full">
                        {item.difficultyLevel.label}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-neutral-500 mb-4">
                    <span className="flex items-center gap-1"><Download size={12} /> {item.downloadCount}</span>
                    <span className="flex items-center gap-1"><GitFork size={12} /> {item._count.forks}</span>
                    <span>{Math.round(item.durationSeconds / 60)} min</span>
                  </div>

                  {/* Action */}
                  {isOwn ? (
                    <span className="block text-center py-2 text-sm text-neutral-500 bg-neutral-800/50 rounded-lg">Your listing</span>
                  ) : isPurchased ? (
                    <Link
                      href={`/library/${type}s/${item.id}`}
                      className="block text-center py-2 text-sm text-emerald-400 bg-emerald-900/20 rounded-lg font-medium"
                    >
                      Owned &#10003;
                    </Link>
                  ) : (
                    <button
                      onClick={() => handlePurchase(item.id)}
                      className="w-full py-2 text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
                    >
                      Purchase
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {listings && listings.total > 20 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm bg-neutral-800 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-neutral-400">
              Page {page} of {Math.ceil(listings.total / 20)}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * 20 >= listings.total}
              className="px-4 py-2 text-sm bg-neutral-800 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
