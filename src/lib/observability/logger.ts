/**
 * Structured Logging with Pino-compatible format
 * 
 * All logs follow a consistent JSON structure:
 * {
 *   "timestamp": "ISO8601",
 *   "level": "info|warn|error|debug",
 *   "service": "haland-petcare",
 *   "user": "userId or null",
 *   "clinic": "clinicId or null",
 *   "action": "descriptive action name",
 *   "message": "human readable message",
 *   "duration_ms": number (optional),
 *   "error": "error message" (optional),
 *   "metadata": {} (optional)
 * }
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  service: string
  user: string | null
  clinic: string | null
  action: string
  message: string
  duration_ms?: number
  error?: string
  stack?: string
  metadata?: Record<string, any>
}

const SERVICE_NAME = 'haland-petcare'

function createLogEntry(
  level: LogLevel,
  action: string,
  message: string,
  context?: {
    userId?: string | null
    clinicId?: string | null
    durationMs?: number
    error?: Error | string
    metadata?: Record<string, any>
  }
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    user: context?.userId || null,
    clinic: context?.clinicId || null,
    action,
    message,
    duration_ms: context?.durationMs,
    error: context?.error
      ? typeof context.error === 'string'
        ? context.error
        : context.error.message
      : undefined,
    stack: context?.error instanceof Error ? context.error.stack : undefined,
    metadata: context?.metadata,
  }
}

function writeLog(entry: LogEntry) {
  const output = JSON.stringify(entry)

  switch (entry.level) {
    case 'error':
      console.error(output)
      break
    case 'warn':
      console.warn(output)
      break
    case 'debug':
      console.debug(output)
      break
    default:
      console.log(output)
  }
}

// ─── Public API ──────────────────────────────────────────────────

export const logger = {
  info(
    action: string,
    message: string,
    context?: {
      userId?: string | null
      clinicId?: string | null
      durationMs?: number
      metadata?: Record<string, any>
    }
  ) {
    writeLog(createLogEntry('info', action, message, context))
  },

  warn(
    action: string,
    message: string,
    context?: {
      userId?: string | null
      clinicId?: string | null
      durationMs?: number
      error?: Error | string
      metadata?: Record<string, any>
    }
  ) {
    writeLog(createLogEntry('warn', action, message, context))
  },

  error(
    action: string,
    message: string,
    context?: {
      userId?: string | null
      clinicId?: string | null
      durationMs?: number
      error?: Error | string
      metadata?: Record<string, any>
    }
  ) {
    writeLog(createLogEntry('error', action, message, context))
  },

  debug(
    action: string,
    message: string,
    context?: {
      userId?: string | null
      clinicId?: string | null
      durationMs?: number
      metadata?: Record<string, any>
    }
  ) {
    if (process.env.NODE_ENV !== 'production') {
      writeLog(createLogEntry('debug', action, message, context))
    }
  },

  /**
   * Log a sync operation with timing.
   */
  sync(
    action: string,
    message: string,
    context: {
      userId?: string | null
      clinicId?: string | null
      durationMs: number
      synced?: number
      failed?: number
      conflicts?: number
      metadata?: Record<string, any>
    }
  ) {
    writeLog(
      createLogEntry('info', `sync:${action}`, message, {
        ...context,
        metadata: {
          synced: context.synced,
          failed: context.failed,
          conflicts: context.conflicts,
          ...context.metadata,
        },
      })
    )
  },

  /**
   * Log an audit event.
   */
  audit(
    action: string,
    context: {
      userId: string
      clinicId: string
      entity?: string
      entityId?: string
      status: string
      metadata?: Record<string, any>
    }
  ) {
    writeLog(
      createLogEntry('info', `audit:${action}`, `Audit: ${action}`, {
        userId: context.userId,
        clinicId: context.clinicId,
        metadata: {
          entity: context.entity,
          entityId: context.entityId,
          status: context.status,
          ...context.metadata,
        },
      })
    )
  },

  /**
   * Log a security event.
   */
  security(
    action: string,
    message: string,
    context: {
      userId?: string | null
      clinicId?: string | null
      metadata?: Record<string, any>
    }
  ) {
    writeLog(
      createLogEntry('warn', `security:${action}`, message, {
        userId: context.userId,
        clinicId: context.clinicId,
        metadata: context.metadata,
      })
    )
  },
}

// ─── Metrics Collection ──────────────────────────────────────────

interface MetricPoint {
  name: string
  value: number
  tags: Record<string, string>
  timestamp: string
}

const metricsBuffer: MetricPoint[] = []
const MAX_METRICS_BUFFER = 1000

export const metrics = {
  /**
   * Record a counter metric.
   */
  increment(name: string, tags: Record<string, string> = {}) {
    metricsBuffer.push({
      name,
      value: 1,
      tags,
      timestamp: new Date().toISOString(),
    })
    flushIfNeeded()
  },

  /**
   * Record a gauge metric.
   */
  gauge(name: string, value: number, tags: Record<string, string> = {}) {
    metricsBuffer.push({
      name,
      value,
      tags,
      timestamp: new Date().toISOString(),
    })
    flushIfNeeded()
  },

  /**
   * Record a timing metric in milliseconds.
   */
  timing(name: string, durationMs: number, tags: Record<string, string> = {}) {
    metricsBuffer.push({
      name: `${name}_ms`,
      value: durationMs,
      tags,
      timestamp: new Date().toISOString(),
    })
    flushIfNeeded()
  },

  /**
   * Get all buffered metrics.
   */
  getBuffer(): MetricPoint[] {
    return [...metricsBuffer]
  },

  /**
   * Flush metrics buffer.
   */
  flush(): MetricPoint[] {
    const flushed = [...metricsBuffer]
    metricsBuffer.length = 0
    return flushed
  },
}

function flushIfNeeded() {
  if (metricsBuffer.length >= MAX_METRICS_BUFFER) {
    const flushed = metrics.flush()
    logger.debug('metrics:flush', `Flushed ${flushed.length} metrics`, {
      metadata: { count: flushed.length },
    })
  }
}

// ─── Error Boundary ──────────────────────────────────────────────

/**
 * Global error boundary for API routes.
 * Wraps a handler and catches any unhandled errors.
 */
export function withErrorBoundary(
  handler: (req: Request, ...args: any[]) => Promise<Response>
): (req: Request, ...args: any[]) => Promise<Response> {
  return async (req: Request, ...args: any[]) => {
    try {
      return await handler(req, ...args)
    } catch (err: any) {
      logger.error('api:unhandled_error', `Unhandled error in ${req.url}`, {
        error: err,
        metadata: {
          url: req.url,
          method: req.method,
        },
      })

      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}