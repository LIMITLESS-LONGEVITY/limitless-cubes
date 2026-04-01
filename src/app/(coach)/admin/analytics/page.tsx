'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Star, GitFork, Heart, Download, Users, Activity, BarChart3, ExternalLink } from 'lucide-react'
import { downloadAdherenceCSV } from '@/lib/csv-export'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

type Period = '7d' | '30d' | '90d' | 'year'
type Tab = 'content' | 'clients' | 'community' | 'revenue'

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d')
  const [tab, setTab] = useState<Tab>('content')

  const { data: connectStatus } = useQuery({
    queryKey: ['connect-status'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/v1/marketplace/connect`, { credentials: 'include' })
      if (!res.ok) return { connected: false, chargesEnabled: false }
      return res.json()
    },
  })

  const showRevenue = connectStatus?.connected && connectStatus?.chargesEnabled

  const tabs: { key: Tab; label: string }[] = [
    { key: 'content', label: 'Content' },
    { key: 'clients', label: 'Clients' },
    { key: 'community', label: 'Community' },
    ...(showRevenue ? [{ key: 'revenue' as Tab, label: 'Revenue' }] : []),
  ]

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-neutral-200">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="year">Year</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-neutral-800 pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t.key ? 'bg-rose-600/20 text-rose-400 border-b-2 border-rose-500' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'content' && <ContentTab period={period} />}
        {tab === 'clients' && <ClientsTab period={period} />}
        {tab === 'community' && <CommunityTab />}
        {tab === 'revenue' && <RevenueTab />}
      </div>
    </div>
  )
}

/* ── Content Tab ────────────────────────────────────────────── */

function ContentTab({ period }: { period: Period }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-content', period],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/v1/analytics/content?period=${period}`, { credentials: 'include' })
      if (!res.ok) return null
      return res.json()
    },
  })

  if (isLoading || !data) return <Loading />

  const d = data
  const likeDelta = d.trend.thisMonth.likes - d.trend.lastMonth.likes
  const createdDelta = d.trend.thisMonth.created - d.trend.lastMonth.created

  return (
    <div className="space-y-6">
      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Exercises Created" value={d.totals.exercises} />
        <StatCard label="Sessions Created" value={d.totals.sessions} />
        <StatCard label="Programs Created" value={d.totals.programs} />
      </div>

      {/* Engagement */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Likes" value={d.engagement.likes} delta={likeDelta} icon={<Heart size={16} />} />
        <StatCard label="Total Forks" value={d.engagement.forks} icon={<GitFork size={16} />} />
        <StatCard label="Avg Rating" value={d.engagement.avgRating.toFixed(1)} suffix={`/ 5 (${d.engagement.ratings})`} icon={<Star size={16} />} />
      </div>

      {/* Trend */}
      <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl p-5">
        <h3 className="text-sm font-medium text-neutral-400 mb-3">This Month vs. Last Month</h3>
        <div className="flex gap-8">
          <TrendItem label="Created" current={d.trend.thisMonth.created} previous={d.trend.lastMonth.created} />
          <TrendItem label="Likes" current={d.trend.thisMonth.likes} previous={d.trend.lastMonth.likes} />
        </div>
      </div>

      {/* Top Content */}
      {d.topContent.length > 0 && (
        <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl">
          <div className="px-5 py-4 border-b border-[var(--surface-border)]">
            <h3 className="font-semibold">Top Content</h3>
          </div>
          <div className="divide-y divide-[var(--surface-border)]">
            {d.topContent.map((item: { id: string; name: string; type: string; likes: number; forks: number; ratingAvg: number; ratingCount: number }, i: number) => (
              <div key={item.id} className="px-5 py-3 flex items-center gap-4">
                <span className="text-2xl font-bold text-neutral-600 w-8">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 capitalize">{item.type}</span>
                </div>
                <div className="flex gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1"><Heart size={10} /> {item.likes}</span>
                  <span className="flex items-center gap-1"><GitFork size={10} /> {item.forks}</span>
                  <span className="flex items-center gap-1"><Star size={10} /> {item.ratingAvg.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Clients Tab ────────────────────────────────────────────── */

function ClientsTab({ period }: { period: Period }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-clients', period],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/v1/analytics/clients?period=${period}`, { credentials: 'include' })
      if (!res.ok) return null
      return res.json()
    },
  })

  if (isLoading || !data) return <Loading />

  const completionPct = Math.round(data.completionRate * 100)
  const completionColor = completionPct >= 80 ? 'text-emerald-400' : completionPct >= 60 ? 'text-amber-400' : 'text-rose-400'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Active Clients" value={data.activeClients} suffix={`/ ${data.totalClients}`} icon={<Users size={16} />} />
        <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl p-5">
          <p className="text-sm text-neutral-400 mb-1">Completion Rate</p>
          <p className={`text-3xl font-bold ${completionColor}`}>{completionPct}%</p>
        </div>
        <StatCard label="Avg RPE" value={data.avgRPE !== null ? data.avgRPE.toFixed(1) : '—'} suffix="/ 10" icon={<Activity size={16} />} />
      </div>

      {/* Adherence sparkline */}
      {data.adherenceTrend.length > 0 && (
        <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-neutral-400">Adherence Trend (12 weeks)</h3>
            <button
              onClick={() => downloadAdherenceCSV(data.adherenceTrend)}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
            >
              Download CSV
            </button>
          </div>
          <AdherenceChart data={data.adherenceTrend} />
        </div>
      )}
    </div>
  )
}

function AdherenceChart({ data }: { data: { week: string; rate: number }[] }) {
  const w = 600
  const h = 150
  const pad = { top: 10, right: 10, bottom: 30, left: 40 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom

  const points = data.map((d, i) => ({
    x: pad.left + (i / Math.max(data.length - 1, 1)) * chartW,
    y: pad.top + chartH - d.rate * chartH,
  }))

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${points[points.length - 1].x},${pad.top + chartH} L${points[0].x},${pad.top + chartH} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {/* Y axis labels */}
      {[0, 50, 100].map((v) => (
        <text key={v} x={pad.left - 8} y={pad.top + chartH - (v / 100) * chartH + 4} textAnchor="end" className="fill-neutral-600 text-[10px]">
          {v}%
        </text>
      ))}
      {/* Grid lines */}
      {[0, 50, 100].map((v) => (
        <line key={v} x1={pad.left} x2={w - pad.right} y1={pad.top + chartH - (v / 100) * chartH} y2={pad.top + chartH - (v / 100) * chartH} stroke="rgb(64 64 64)" strokeDasharray="2,4" />
      ))}
      {/* Area fill */}
      <path d={area} fill="rgb(225 29 72)" fillOpacity="0.1" />
      {/* Line */}
      <path d={line} fill="none" stroke="rgb(225 29 72)" strokeWidth="2" />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="rgb(225 29 72)" />
      ))}
      {/* X axis labels (every other) */}
      {data.map((d, i) => i % 2 === 0 ? (
        <text key={i} x={points[i].x} y={h - 5} textAnchor="middle" className="fill-neutral-600 text-[8px]">
          {d.week.split('-')[1]}
        </text>
      ) : null)}
    </svg>
  )
}

/* ── Community Tab ──────────────────────────────────────────── */

function CommunityTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-community'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/v1/analytics/community`, { credentials: 'include' })
      if (!res.ok) return null
      return res.json()
    },
  })

  if (isLoading || !data) return <Loading />

  const maxRating = Math.max(...Object.values(data.ratingDistribution as Record<string, number>), 1)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Direct Forks" value={data.totalForks} icon={<GitFork size={16} />} />
        <StatCard label="Downstream Forks" value={data.downstreamForks} />
        <StatCard label="Fork Depth" value={data.forkDepth} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rating distribution */}
        <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl p-5">
          <h3 className="text-sm font-medium text-neutral-400 mb-4">Rating Distribution</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = (data.ratingDistribution as Record<string, number>)[String(star)] ?? 0
              const pct = (count / maxRating) * 100
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-sm text-amber-400 w-8 flex items-center gap-1">{star} <Star size={10} /></span>
                  <div className="flex-1 h-5 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-neutral-500 w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl p-5">
            <p className="text-sm text-neutral-400 mb-1">Average Rating</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{data.avgRating.toFixed(1)}</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} className={s <= Math.round(data.avgRating) ? 'fill-amber-400 text-amber-400' : 'text-neutral-600'} />
                ))}
              </div>
              <span className="text-sm text-neutral-500">({data.totalRatings})</span>
            </div>
          </div>
          <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl p-5">
            <p className="text-sm text-neutral-400 mb-1">Review Response Rate</p>
            <p className="text-3xl font-bold">{Math.round(data.reviewResponseRate * 100)}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Revenue Tab ────────────────────────────────────────────── */

function RevenueTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-revenue'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/v1/analytics/revenue`, { credentials: 'include' })
      if (!res.ok) return null
      return res.json()
    },
  })

  if (isLoading || !data) return <Loading />

  const monthDelta = data.thisMonth - data.lastMonth

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Revenue" value={`$${data.totalRevenue.toFixed(2)}`} />
        <StatCard label="This Month" value={`$${data.thisMonth.toFixed(2)}`} delta={monthDelta} deltaPrefix="$" />
        <StatCard label="Total Sales" value={data.totalSales} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly trend bar chart */}
        {data.monthlyTrend.length > 0 && (
          <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl p-5">
            <h3 className="text-sm font-medium text-neutral-400 mb-4">Monthly Revenue</h3>
            <RevenueBarChart data={data.monthlyTrend} />
          </div>
        )}

        {/* Best sellers */}
        <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl">
          <div className="px-5 py-4 border-b border-[var(--surface-border)] flex items-center justify-between">
            <h3 className="font-semibold">Best Sellers</h3>
            <a
              href="https://connect.stripe.com/express_login"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1"
            >
              Manage Payouts <ExternalLink size={10} />
            </a>
          </div>
          {data.bestSelling.length === 0 ? (
            <div className="p-10 text-center text-neutral-500 text-sm">No sales yet</div>
          ) : (
            <div className="divide-y divide-[var(--surface-border)]">
              {data.bestSelling.map((item: { id: string; name: string; type: string; sales: number; revenue: number }) => (
                <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <span className="text-xs text-neutral-500 capitalize">{item.type} &middot; {item.sales} sales</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">${item.revenue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RevenueBarChart({ data }: { data: { month: string; revenue: number; sales: number }[] }) {
  const w = 300
  const h = 150
  const pad = { top: 10, right: 10, bottom: 30, left: 50 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const maxRev = Math.max(...data.map((d) => d.revenue), 1)
  const barW = Math.min(chartW / data.length - 8, 40)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {data.map((d, i) => {
        const barH = (d.revenue / maxRev) * chartH
        const x = pad.left + (i / data.length) * chartW + (chartW / data.length - barW) / 2
        const y = pad.top + chartH - barH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} fill="rgb(225 29 72)" fillOpacity="0.8" />
            <text x={x + barW / 2} y={h - 8} textAnchor="middle" className="fill-neutral-500 text-[9px]">
              {d.month.split('-')[1]}
            </text>
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" className="fill-neutral-400 text-[8px]">
              ${Math.round(d.revenue)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── Shared Components ──────────────────────────────────────── */

function StatCard({ label, value, suffix, delta, deltaPrefix, icon }: {
  label: string
  value: string | number
  suffix?: string
  delta?: number
  deltaPrefix?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-neutral-500">{icon}</span>}
        <p className="text-sm text-neutral-400">{label}</p>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold">{value}</p>
        {suffix && <span className="text-sm text-neutral-500">{suffix}</span>}
        {delta !== undefined && delta !== 0 && (
          <span className={`flex items-center text-xs font-medium ${delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {deltaPrefix}{Math.abs(delta)}
          </span>
        )}
      </div>
    </div>
  )
}

function TrendItem({ label, current, previous }: { label: string; current: number; previous: number }) {
  const delta = current - previous
  const color = delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
  return (
    <div>
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className="text-lg font-semibold">{current}</p>
      <p className={`text-xs ${color}`}>
        {delta >= 0 ? '+' : ''}{delta} vs last month
      </p>
    </div>
  )
}

function Loading() {
  return <div className="py-20 text-center text-neutral-500">Loading analytics...</div>
}
