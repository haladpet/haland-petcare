'use client'

import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <h1 className="text-6xl font-bold mb-4">Ups!</h1>
      <p className="text-xl text-muted-foreground mb-4">
        Terjadi kesalahan yang tidak terduga.
      </p>
      {error.message && (
        <p className="text-sm text-muted-foreground mb-8 max-w-md text-center">
          {error.message}
        </p>
      )}
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
        >
          Coba Lagi
        </button>
        <Link
          href="/"
          className="px-6 py-3 border border-border rounded-md hover:bg-accent transition-colors"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  )
}