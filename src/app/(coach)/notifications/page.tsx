'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  CheckCheck,
  Loader2,
} from 'lucide-react'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface Notification {
  id: string
  type: string
  message: string
  isRead: boolean
  createdAt: string
  actor: { id: string; fullName: string; avatarUrl: string | null } | null
}

interface NotificationsResponse {
  data: Notification[]
  unreadCount: number
}

function groupByTime(notifications: Notification[]) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Today', items: [] },
    { label: 'This Week', items: [] },
    { label: 'Earlier', items: [] },
  ]

  for (const n of notifications) {
    const d = new Date(n.createdAt)
    if (d >= todayStart) {
      groups[0].items.push(n)
    } else if (d >= weekStart) {
      groups[1].items.push(n)
    } else {
      groups[2].items.push(n)
    }
  }

  return groups.filter((g) => g.items.length > 0)
}

function relativeTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/v1/notifications?limit=50`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch notifications')
      const json = await res.json()
      return json.data ?? json
    },
  })

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${basePath}/api/v1/notifications`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: 'all' }),
      })
      if (!res.ok) throw new Error('Failed to mark as read')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const notifications: Notification[] = data?.data ?? []
  const unreadCount = data?.unreadCount ?? 0
  const groups = groupByTime(notifications)

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-neutral-400" />
            <h1 className="text-2xl font-semibold text-neutral-100">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-rose-600/20 text-rose-400 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-300 bg-neutral-800 border border-neutral-700 rounded-lg hover:border-neutral-600 transition-colors disabled:opacity-50"
            >
              {markAllMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-12 text-center">
            <Bell className="w-10 h-10 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-400">All caught up \u2014 no new notifications</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.label}>
                <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">
                  {group.label}
                </h2>
                <div className="space-y-2">
                  {group.items.map((notification) => (
                    <div
                      key={notification.id}
                      className={`bg-neutral-900 border rounded-lg p-4 flex items-start gap-3 transition-colors ${
                        notification.isRead
                          ? 'border-neutral-800'
                          : 'border-l-rose-500 border-l-2 border-t-neutral-800 border-r-neutral-800 border-b-neutral-800'
                      }`}
                    >
                      {/* Actor avatar */}
                      <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-medium text-neutral-300 shrink-0">
                        {notification.actor?.avatarUrl ? (
                          <img
                            src={notification.actor.avatarUrl}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          notification.actor?.fullName?.[0]?.toUpperCase() || '?'
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-200">
                          {notification.actor && (
                            <span className="font-medium text-neutral-100">
                              {notification.actor.fullName}{' '}
                            </span>
                          )}
                          {notification.message}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {relativeTime(notification.createdAt)}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
