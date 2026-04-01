'use client'

import { useState, useEffect, useRef } from 'react'
import { Menu, X, LogOut, User, ChevronDown, Bell } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface AuthUser {
  id: string
  fullName: string
  email: string
  avatarUrl: string | null
  role: string
}

const NAV_LINKS = [
  { href: '/builder', label: 'Builder' },
  { href: '/library/exercises', label: 'Library' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/clients', label: 'Clients' },
  { href: '/admin', label: 'Admin' },
]

export function Header() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: user } = useQuery<AuthUser>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/v1/me`, { credentials: 'include' })
      if (!res.ok) throw new Error('Not authenticated')
      return res.json()
    },
    retry: false,
  })

  const { data: notifications } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/v1/notifications?unread=true&limit=1`, { credentials: 'include' })
      if (!res.ok) return { unreadCount: 0 }
      return res.json()
    },
    enabled: !!user,
    refetchInterval: 30_000,
  })

  // Scroll detection
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    await fetch('/learn/api/users/logout', { method: 'POST', credentials: 'include' })
    window.location.href = '/'
  }

  const unreadCount = notifications?.unreadCount ?? 0

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-neutral-950/90 backdrop-blur-md -webkit-backdrop-filter-blur-md border-b border-neutral-800/50'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="text-xl font-semibold tracking-[0.12em] text-rose-500 hover:text-rose-400 transition-colors">
          LIMITLESS
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const fullHref = `${basePath}${link.href}`
            const isActive = pathname?.startsWith(fullHref)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'text-rose-500'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Notifications */}
              <Link
                href="/notifications"
                className="relative p-2 text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* User dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-sm font-medium text-neutral-300">
                    {user.fullName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </div>
                  <ChevronDown size={14} className={`text-neutral-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-12 w-64 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-800">
                      <p className="text-sm font-medium text-neutral-200">{user.fullName}</p>
                      <p className="text-xs text-neutral-500">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-neutral-800 text-neutral-400 capitalize">
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="py-1">
                      <a href="/learn/account/profile" className="dropdown-item">
                        <User size={14} /> Profile
                      </a>
                      <button onClick={handleLogout} className="dropdown-item text-red-400 hover:text-red-300 w-full">
                        <LogOut size={14} /> Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <a
                href="/learn/login?redirect=/train"
                className="px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Log In
              </a>
              <a
                href="/learn/create-account?redirect=/train"
                className="px-3 py-1.5 text-sm font-medium border border-rose-500/50 text-rose-400 rounded-md hover:bg-rose-500/10 transition-colors"
              >
                Get Started
              </a>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-neutral-400 hover:text-neutral-200"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800">
          <nav className="px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 text-sm text-neutral-300 hover:text-white rounded-md hover:bg-neutral-800/50"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
