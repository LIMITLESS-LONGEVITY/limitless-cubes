'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Dumbbell,
  CalendarDays,
  LayoutGrid,
  Layers,
  Sparkles,
  Users,
  ArrowRight,
  Loader2,
} from 'lucide-react'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface MeResponse {
  id: string
  fullName: string
  memberships: Array<{
    organizationId: string
    isOwner: boolean
    isAdmin: boolean
  }>
}

interface StatsResponse {
  exercises: number
  sessions: number
  programs: number
}

export default function Home() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${basePath}/api/v1/me`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setMe(data)
          // Fetch quick stats
          const [exRes, sessRes, progRes] = await Promise.all([
            fetch(`${basePath}/api/v1/exercises?limit=1`, { credentials: 'include' }),
            fetch(`${basePath}/api/v1/sessions?limit=1`, { credentials: 'include' }),
            fetch(`${basePath}/api/v1/programs?limit=1`, { credentials: 'include' }),
          ])
          const [exData, sessData, progData] = await Promise.all([
            exRes.ok ? exRes.json() : { pagination: { total: 0 } },
            sessRes.ok ? sessRes.json() : { pagination: { total: 0 } },
            progRes.ok ? progRes.json() : { pagination: { total: 0 } },
          ])
          setStats({
            exercises: exData.pagination?.total ?? 0,
            sessions: sessData.pagination?.total ?? 0,
            programs: progData.pagination?.total ?? 0,
          })
        }
      } catch {
        // Not authenticated
      } finally {
        setAuthChecked(true)
      }
    }
    checkAuth()
  }, [])

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
      </div>
    )
  }

  // Authenticated dashboard
  if (me) {
    const firstName = me.fullName?.split(' ')[0] || 'Coach'
    return (
      <div className="min-h-screen bg-neutral-950">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-3xl font-semibold text-neutral-100 mb-2">
            Welcome back, {firstName}
          </h1>
          <p className="text-neutral-400 mb-10">
            Here is a quick overview of your content library.
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {[
              { label: 'Exercises', value: stats?.exercises ?? 0, icon: Dumbbell, color: 'text-emerald-400' },
              { label: 'Sessions', value: stats?.sessions ?? 0, icon: CalendarDays, color: 'text-purple-400' },
              { label: 'Programs', value: stats?.programs ?? 0, icon: LayoutGrid, color: 'text-amber-400' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-neutral-900 border border-neutral-800 rounded-lg p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-neutral-500 uppercase tracking-wide">
                    {stat.label}
                  </span>
                </div>
                <p className="text-3xl font-semibold text-neutral-100">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            href="/builder"
            className="inline-flex items-center gap-3 px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white text-lg font-medium rounded-xl transition-colors"
          >
            <Layers className="w-5 h-5" />
            Open Builder
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    )
  }

  // Landing page (unauthenticated)
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        {/* Branding */}
        <div className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl font-bold text-neutral-100 tracking-tight mb-4">
            CUBES<span className="text-rose-500">+</span>
          </h1>
          <p className="text-xl sm:text-2xl text-neutral-400 max-w-lg mx-auto leading-relaxed">
            Build training programs that move the world
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link
            href="/api/auth/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white text-base font-medium rounded-xl transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/api/auth/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-200 text-base font-medium rounded-xl transition-colors"
          >
            Get Started
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            {
              icon: Dumbbell,
              title: 'Exercise Library',
              description: 'Catalog and organize your exercises with video, domains, and difficulty levels.',
            },
            {
              icon: Sparkles,
              title: 'Session Builder',
              description: 'Drag-and-drop session design with phases, sets, reps, and rest periods.',
            },
            {
              icon: Users,
              title: 'Client Management',
              description: 'Assign programs to clients and track their progress over time.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 text-center"
            >
              <feature.icon className="w-8 h-8 text-rose-400 mx-auto mb-3" />
              <h3 className="text-base font-medium text-neutral-100 mb-2">{feature.title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
