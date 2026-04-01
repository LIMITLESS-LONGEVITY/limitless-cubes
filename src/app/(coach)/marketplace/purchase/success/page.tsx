'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ShoppingBag, ArrowRight } from 'lucide-react'

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-neutral-200 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        <CheckCircle size={64} className="mx-auto text-emerald-400 mb-6" />
        <h1 className="text-2xl font-bold mb-3">Purchase Successful!</h1>
        <p className="text-neutral-400 mb-8">
          Your content has been unlocked. You now have full access to view and use it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/marketplace"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors"
          >
            <ShoppingBag size={16} /> Browse More
          </Link>
          <Link
            href="/library/sessions"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors"
          >
            My Library <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
