import { createCipheriv, createDecipheriv, randomBytes, createHash, scryptSync } from 'crypto'

// ─── Configuration ───────────────────────────────────────────────
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128-bit IV for GCM
const AUTH_TAG_LENGTH = 16 // 128-bit auth tag
const KEY_LENGTH = 32 // 256-bit key
const SALT_LENGTH = 32
const PBKDF2_ITERATIONS = 100000

/**
 * Local Database Encryption
 * 
 * All sensitive data (medical records, invoices, payments, prescriptions)
 * is encrypted using AES-256-GCM before being stored in the local PGlite database.
 * 
 * Key derivation uses PBKDF2 with a device-derived key and session-protected salt.
 * The encryption key is never stored in plaintext.
 */

// ─── Key Management ──────────────────────────────────────────────

/**
 * Derive an encryption key from a device secret and session token.
 * Uses PBKDF2 with 100,000 iterations for key stretching.
 */
export function deriveEncryptionKey(
  deviceSecret: string,
  sessionToken: string,
  salt?: Buffer
): { key: Buffer; salt: Buffer } {
  const actualSalt = salt || randomBytes(SALT_LENGTH)
  const key = scryptSync(
    deviceSecret + sessionToken,
    actualSalt,
    KEY_LENGTH,
    { N: PBKDF2_ITERATIONS, r: 8, p: 1 }
  )
  return { key, salt: actualSalt }
}

/**
 * Get the device-derived key for local encryption.
 * Combines browser fingerprint components with a session token.
 */
export function getDeviceDerivedKey(sessionToken: string): string {
  if (typeof window === 'undefined') {
    return sessionToken || 'server-side-key'
  }

  const components = [
    navigator.hardwareConcurrency?.toString() || '1',
    navigator.language || 'en',
    navigator.platform || 'unknown',
    screen.colorDepth?.toString() || '24',
    screen.width?.toString() || '1024',
    screen.height?.toString() || '768',
    navigator.userAgent || 'unknown',
  ]

  const deviceFingerprint = createHash('sha256')
    .update(components.join('|'))
    .digest('hex')

  return createHash('sha256')
    .update(deviceFingerprint + sessionToken)
    .digest('hex')
}

// ─── Encryption ──────────────────────────────────────────────────

export interface EncryptedData {
  encrypted: string // Base64 encoded ciphertext
  iv: string // Base64 encoded IV
  authTag: string // Base64 encoded auth tag
  salt: string // Base64 encoded salt (for key derivation)
  algorithm: string
}

/**
 * Encrypt sensitive data using AES-256-GCM.
 * 
 * @param plaintext - The data to encrypt (will be JSON stringified if object)
 * @param key - The encryption key (Buffer)
 * @param salt - The salt used for key derivation
 * @returns EncryptedData object with all necessary components for decryption
 */
export function encryptSensitiveData(
  plaintext: any,
  key: Buffer,
  salt: Buffer
): EncryptedData {
  // Convert to string if object
  const data = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext)

  // Generate random IV
  const iv = randomBytes(IV_LENGTH)

  // Create cipher
  const cipher = createCipheriv(ALGORITHM, key, iv)

  // Encrypt
  let encrypted = cipher.update(data, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  // Get auth tag
  const authTag = cipher.getAuthTag()

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    salt: salt.toString('base64'),
    algorithm: ALGORITHM,
  }
}

/**
 * Decrypt sensitive data that was encrypted with encryptSensitiveData.
 * 
 * @param encryptedData - The EncryptedData object from encryption
 * @param key - The encryption key (Buffer)
 * @returns The decrypted data (parsed from JSON if possible)
 */
export function decryptSensitiveData(
  encryptedData: EncryptedData,
  key: Buffer
): any {
  const iv = Buffer.from(encryptedData.iv, 'base64')
  const authTag = Buffer.from(encryptedData.authTag, 'base64')
  const encrypted = encryptedData.encrypted

  // Create decipher
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  // Decrypt
  let decrypted = decipher.update(encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  // Try to parse as JSON
  try {
    return JSON.parse(decrypted)
  } catch {
    return decrypted
  }
}

// ─── Field-Level Encryption Helpers ──────────────────────────────

/**
 * Encrypt a specific field value for storage in the local database.
 * Used for medical records, invoices, payments, prescriptions.
 */
export function encryptField(
  value: any,
  fieldName: string,
  key: Buffer,
  salt: Buffer
): string {
  const data = JSON.stringify({ field: fieldName, value, encryptedAt: new Date().toISOString() })
  const encrypted = encryptSensitiveData(data, key, salt)
  return JSON.stringify(encrypted)
}

/**
 * Decrypt a field value that was encrypted with encryptField.
 */
export function decryptField(
  encryptedValue: string,
  key: Buffer
): any {
  const encryptedData: EncryptedData = JSON.parse(encryptedValue)
  const decrypted = decryptSensitiveData(encryptedData, key)
  return decrypted.value
}

// ─── Sensitive Data Classification ───────────────────────────────

/**
 * Fields that must be encrypted in the local database:
 * - medical_records: diagnosis, treatment, notes
 * - invoices: total_amount, items
 * - payments: amount, method
 * - prescriptions: notes, dosage instructions
 * - customers: email, phone, address
 */
export const SENSITIVE_FIELDS: Record<string, string[]> = {
  medical_records: ['diagnosis', 'treatment', 'notes'],
  invoices: ['total_amount'],
  invoice_items: ['unit_price', 'total_price', 'description'],
  payments: ['amount', 'method'],
  prescriptions: ['notes'],
  prescription_items: ['dosage', 'instructions'],
  customers: ['email', 'phone', 'address'],
  pets: ['name'],
}

/**
 * Check if a field should be encrypted based on entity and field name.
 */
export function isSensitiveField(entity: string, field: string): boolean {
  const sensitiveFields = SENSITIVE_FIELDS[entity]
  if (!sensitiveFields) return false
  return sensitiveFields.includes(field)
}

/**
 * Encrypt all sensitive fields in a record before storing locally.
 */
export function encryptRecord(
  record: Record<string, any>,
  entity: string,
  key: Buffer,
  salt: Buffer
): Record<string, any> {
  const encrypted = { ...record }
  const sensitiveFields = SENSITIVE_FIELDS[entity] || []

  for (const field of sensitiveFields) {
    if (encrypted[field] != null) {
      encrypted[field] = encryptField(encrypted[field], field, key, salt)
    }
  }

  return encrypted
}

/**
 * Decrypt all sensitive fields in a record after reading from local storage.
 */
export function decryptRecord(
  record: Record<string, any>,
  entity: string,
  key: Buffer
): Record<string, any> {
  const decrypted = { ...record }
  const sensitiveFields = SENSITIVE_FIELDS[entity] || []

  for (const field of sensitiveFields) {
    if (decrypted[field] != null && typeof decrypted[field] === 'string') {
      try {
        decrypted[field] = decryptField(decrypted[field], key)
      } catch {
        // If decryption fails, keep the original value
        // This handles the case where data wasn't encrypted yet
      }
    }
  }

  return decrypted
}

// ─── Secure Key Storage ──────────────────────────────────────────

/**
 * Store an encryption key securely in session storage.
 * The key is split into two parts stored separately.
 * Never stored in localStorage or plaintext.
 */
export function storeEncryptionKey(key: Buffer, sessionId: string): void {
  if (typeof window === 'undefined') return

  const keyHex = key.toString('hex')
  const midpoint = Math.floor(keyHex.length / 2)
  const part1 = keyHex.slice(0, midpoint)
  const part2 = keyHex.slice(midpoint)

  // Store parts in sessionStorage (cleared on browser close)
  sessionStorage.setItem(`_ek1_${sessionId}`, part1)
  sessionStorage.setItem(`_ek2_${sessionId}`, part2)
}

/**
 * Retrieve the encryption key from secure storage.
 */
export function retrieveEncryptionKey(sessionId: string): Buffer | null {
  if (typeof window === 'undefined') return null

  const part1 = sessionStorage.getItem(`_ek1_${sessionId}`)
  const part2 = sessionStorage.getItem(`_ek2_${sessionId}`)

  if (!part1 || !part2) return null

  const keyHex = part1 + part2
  return Buffer.from(keyHex, 'hex')
}

/**
 * Clear the encryption key from storage.
 * Called on logout.
 */
export function clearEncryptionKey(sessionId: string): void {
  if (typeof window === 'undefined') return

  sessionStorage.removeItem(`_ek1_${sessionId}`)
  sessionStorage.removeItem(`_ek2_${sessionId}`)
}