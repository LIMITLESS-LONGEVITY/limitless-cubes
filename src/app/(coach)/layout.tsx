import { Header } from '@/components/Header'
import { getAuthPayload } from '@/lib/auth'
import { syncUser } from '@/lib/user-sync'
import { redirect } from 'next/navigation'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const payload = await getAuthPayload()

  if (!payload) {
    redirect('/')
    return null
  }

  const user = await syncUser(payload)

  // Athletes can browse library but not access builder/admin/clients
  // The library and detail pages will be accessible to athletes in Phase 5
  // For now, redirect athletes to the landing page
  if (user.role === 'athlete') {
    redirect('/')
    return null
  }

  return (
    <>
      <Header />
      <main className="pt-14">{children}</main>
    </>
  )
}
