/**
 * Environment Variable Validation
 * 
 * Validates that all required environment variables are present at startup.
 * Throws an error if any required variable is missing or empty.
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'ENCRYPTION_KEY',
  'SYNC_SECRET',
  'NEXTAUTH_SECRET',
] as const

const OPTIONAL_ENV_VARS = [
  'NEXTAUTH_URL',
  'BASE_URL',
  'NODE_ENV',
] as const

type EnvVar = typeof REQUIRED_ENV_VARS[number] | typeof OPTIONAL_ENV_VARS[number]

class EnvValidationError extends Error {
  constructor(missingVars: string[]) {
    super(`Missing required environment variables:\n${missingVars.map(v => `  - ${v}`).join('\n')}\n\nPlease set these in your .env file or environment.`)
    this.name = 'EnvValidationError'
  }
}

/**
 * Validate that all required environment variables are set.
 * Call this at application startup.
 */
export function validateEnv(): void {
  const missing: string[] = []

  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key]
    if (!value || value.trim() === '') {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new EnvValidationError(missing)
  }
}

/**
 * Get a required environment variable.
 * Throws if the variable is not set.
 */
export function getRequiredEnv(key: typeof REQUIRED_ENV_VARS[number]): string {
  const value = process.env[key]
  if (!value || value.trim() === '') {
    throw new Error(`Required environment variable ${key} is not set`)
  }
  return value
}

/**
 * Get an optional environment variable with a default value.
 */
export function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue
}

/**
 * Check if the application is running in production mode.
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Check if the application is running in test mode.
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test'
}

/**
 * Check if the application is running in development mode.
 */
export function isDevelopment(): boolean {
  return !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
}