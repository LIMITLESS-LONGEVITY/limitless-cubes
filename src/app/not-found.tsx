import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-rose-500 mb-4">404</p>
        <h1 className="text-2xl font-semibold text-neutral-100 mb-2">Page not found</h1>
        <p className="text-neutral-400 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/builder"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Back to Builder
          </Link>
          <Link
            href="/library"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-200 text-sm font-medium rounded-lg transition-colors"
          >
            Browse Library
          </Link>
        </div>
      </div>
    </div>
  )
}
