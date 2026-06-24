import { getServerDb } from '@/lib/db/server/client'
import { sql } from 'drizzle-orm'

/**
 * Health Check Endpoint
 * 
 * Lightweight endpoint for:
 * - Online/offline detection by the background sync worker
 * - Load balancer health checks
 * - Monitoring systems
 * 
 * Returns 200 if the server and database are healthy.
 * No authentication required — this is a public health check.
 */
export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; latency_ms?: number; error?: string }> = {}

  // Check database connectivity
  try {
    const start = Date.now()
    const db = getServerDb()
    await db.execute(sql`SELECT 1`)
    checks.database = {
      status: 'ok',
      latency_ms: Date.now() - start,
    }
  } catch (err: any) {
    checks.database = {
      status: 'error',
      error: err.message,
    }
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage()
  checks.memory = {
    status: memoryUsage.heapUsed < 500 * 1024 * 1024 ? 'ok' : 'error', // 500MB threshold
    latency_ms: Math.round(memoryUsage.heapUsed / 1024 / 1024),
  }

  // Overall health
  const allHealthy = Object.values(checks).every((c) => c.status === 'ok')

  return new Response(
    JSON.stringify({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      checks,
    }),
    {
      status: allHealthy ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  )
}

export async function HEAD() {
  // Lightweight HEAD response for online detection
  try {
    const db = getServerDb()
    await db.execute(sql`SELECT 1`)
    return new Response(null, { status: 200 })
  } catch {
    return new Response(null, { status: 503 })
  }
}