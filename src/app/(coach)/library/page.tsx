'use client'

import Link from 'next/link'
import {
  Dumbbell,
  CalendarDays,
  LayoutGrid,
  Plus,
  Layers,
  ArrowRight,
} from 'lucide-react'

const cards = [
  {
    href: '/library/exercises',
    label: 'Exercises',
    description: 'Individual exercises with video, domains, and difficulty levels',
    icon: Dumbbell,
  },
  {
    href: '/library/sessions',
    label: 'Sessions',
    description: 'Structured workout sessions built from exercises',
    icon: CalendarDays,
  },
  {
    href: '/library/programs',
    label: 'Programs',
    description: 'Multi-session training programs for clients',
    icon: LayoutGrid,
  },
]

export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-100">Library</h1>
            <p className="text-sm text-neutral-400 mt-1">Browse and manage your content</p>
          </div>
        </div>

        {/* Content Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors"
            >
              <card.icon className="w-8 h-8 text-rose-400 mb-4" />
              <h2 className="text-lg font-medium text-neutral-100 mb-1 flex items-center gap-2">
                {card.label}
                <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-rose-400 transition-colors" />
              </h2>
              <p className="text-sm text-neutral-500 leading-relaxed">{card.description}</p>
              <span className="inline-block mt-3 text-sm text-rose-400 group-hover:text-rose-300 transition-colors">
                Browse &rarr;
              </span>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="text-lg font-medium text-neutral-300 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/library/exercises/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-200 hover:border-neutral-700 transition-colors"
          >
            <Plus className="w-4 h-4 text-rose-400" />
            Create Exercise
          </Link>
          <Link
            href="/builder"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Layers className="w-4 h-4" />
            Open Builder
          </Link>
        </div>
      </div>
    </div>
  )
}
