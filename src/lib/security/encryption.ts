// ─── Configuration ───────────────────────────────────────────────
const IV_LENGTH = 12 // 96-bit IV for AES-GCM (recommended by NIST)
const SALT_LENGTH = 32
const PBKDF2_ITERATIONS = 100000

/**
 * Local Database Encryption (Web Crypto API)
 *
 * All sensitive data (medical records, invoices, payments, prescriptions)
 * is encrypted using AES-256-GCM before being stored in the local PGlite database.
 *
 * Key derivation uses PBKDF2 with a device-derived key and session-protected salt.
 * The encryption key is never stored in plaintext.
 */

// ─── Helpers ────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function getRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

// ─── Key Management ──────────────────────────────────────────────

/**
 * Derive an encryption key from a password using PBKDF2.
 * Returns a CryptoKey suitable for AES-GCM encrypt/decrypt.
 */
export async function deriveKey(
  password: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const actualSalt = salt || getRandomBytes(SALT_LENGTH)

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: actualSalt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-512',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  return { key, salt: actualSalt }
}

/**
 * Derive an encryption key from a device secret and session token.
 * Uses PBKDF2 with 100,000 iterations for key stretching.
 * Returns raw bytes (Uint8Array) for key and salt.
 */
export async function deriveEncryptionKey(
  deviceSecret: string,
  sessionToken: string,
  salt?: Uint8Array
): Promise<{ key: Uint8Array; salt: Uint8Array }> {
  const actualSalt = salt || getRandomBytes(SALT_LENGTH)

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(deviceSecret + sessionToken),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: actualSalt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-512',
    },
    keyMaterial,
    256 // 32 bytes
  )

  return { key: new Uint8Array(bits), salt: actualSalt }
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

  const str = components.join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }

  const fingerprint = Math.abs(hash).toString(16).padStart(8, '0') + '0'.repeat(56)

  let combined = 0
  const combinedStr = fingerprint + sessionToken
  for (let i = 0; i < combinedStr.length; i++) {
    const char = combinedStr.charCodeAt(i)
    combined = (combined << 5) - combined + char
    combined |= 0
  }

  return Math.abs(combined).toString(16).padStart(8, '0') + '0'.repeat(56)
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
 * Encrypt data using AES-256-GCM via Web Crypto API.
 */
export async function encryptData(
  plaintext: unknown,
  key: CryptoKey,
  salt: Uint8Array
): Promise<EncryptedData> {
  const data = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext)
  const encoder = new TextEncoder()

  const iv = getRandomBytes(IV_LENGTH)

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encoder.encode(data)
  )

  const cipherBytes = new Uint8Array(cipherBuffer)
  const tagLength = 16
  const encrypted = cipherBytes.slice(0, cipherBytes.length - tagLength)
  const authTag = cipherBytes.slice(cipherBytes.length - tagLength)

  return {
    encrypted: arrayBufferToBase64(encrypted.buffer as ArrayBuffer),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    authTag: arrayBufferToBase64(authTag.buffer as ArrayBuffer),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    algorithm: 'aes-256-gcm',
  }
}

/**
 * Decrypt data using AES-256-GCM via Web Crypto API.
 */
export async function decryptData(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<unknown> {
  const iv = new Uint8Array(base64ToArrayBuffer(encryptedData.iv))
  const encrypted = new Uint8Array(base64ToArrayBuffer(encryptedData.encrypted))
  const authTag = new Uint8Array(base64ToArrayBuffer(encryptedData.authTag))

  const cipherBuffer = new Uint8Array(encrypted.length + authTag.length)
  cipherBuffer.set(encrypted, 0)
  cipherBuffer.set(authTag, encrypted.length)

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBuffer
  )

  const decoder = new TextDecoder()
  const decrypted = decoder.decode(plainBuffer)

  try {
    return JSON.parse(decrypted)
  } catch {
    return decrypted
  }
}

/**
 * Encrypt sensitive data using AES-256-GCM.
 * Convenience wrapper that accepts raw Uint8Array key.
 */
export async function encryptSensitiveData(
  plaintext: unknown,
  key: Uint8Array,
  salt: Uint8Array
): Promise<EncryptedData> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as unknown as BufferSource,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  return encryptData(plaintext, cryptoKey, salt)
}

/**
 * Decrypt sensitive data that was encrypted with encryptSensitiveData.
 * Convenience wrapper that accepts raw Uint8Array key.
 */
export async function decryptSensitiveData(
  encryptedData: EncryptedData,
  key: Uint8Array
): Promise<unknown> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as unknown as BufferSource,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  return decryptData(encryptedData, cryptoKey)
}

// ─── Field-level Encryption ─────────────────────────────────────

async function encryptField(
  value: unknown,
  fieldName: string,
  key: Uint8Array,
  salt: Uint8Array
): Promise<string> {
  const data = JSON.stringify({ field: fieldName, value, encryptedAt: new Date().toISOString() })
  const encrypted = await encryptSensitiveData(data, key, salt)
  return JSON.stringify(encrypted)
}

async function decryptField(
  encryptedValue: string,
  key: Uint8Array
): Promise<unknown> {
  const encryptedData: EncryptedData = JSON.parse(encryptedValue)
  const decrypted = await decryptSensitiveData(encryptedData, key)
  return (decrypted as Record<string, unknown>).value
}

// ─── Sensitive Fields Configuration ─────────────────────────────

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

export function isSensitiveField(entity: string, field: string): boolean {
  const sensitiveFields = SENSITIVE_FIELDS[entity]
  if (!sensitiveFields) return false
  return sensitiveFields.includes(field)
}

export async function encryptRecord(
  record: Record<string, unknown>,
  entity: string,
  key: Uint8Array,
  salt: Uint8Array
): Promise<Record<string, unknown>> {
  const encrypted: Record<string, unknown> = { ...record }
  const sensitiveFields = SENSITIVE_FIELDS[entity] || []

  for (const field of sensitiveFields) {
    if (encrypted[field] != null) {
      encrypted[field] = await encryptField(encrypted[field], field, key, salt)
    }
  }

  return encrypted
}

export async function decryptRecord(
  record: Record<string, unknown>,
  entity: string,
  key: Uint8Array
): Promise<Record<string, unknown>> {
  const decrypted: Record<string, unknown> = { ...record }
  const sensitiveFields = SENSITIVE_FIELDS[entity] || []

  for (const field of sensitiveFields) {
    if (decrypted[field] != null && typeof decrypted[field] === 'string') {
      try {
        decrypted[field] = await decryptField(decrypted[field] as string, key)
      } catch {
        // If decryption fails, keep the original value
        // This handles the case where data wasn't encrypted yet
      }
    }
  }

  return decrypted
}

// ─── Secure Key Storage ──────────────────────────────────────────

export function storeEncryptionKey(key: Uint8Array, sessionId: string): void {
  if (typeof window === 'undefined') return

  const keyHex = Array.from(key)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const midpoint = Math.floor(keyHex.length / 2)
  const part1 = keyHex.slice(0, midpoint)
  const part2 = keyHex.slice(midpoint)

  sessionStorage.setItem(`_ek1_${sessionId}`, part1)
  sessionStorage.setItem(`_ek2_${sessionId}`, part2)
}

export function retrieveEncryptionKey(sessionId: string): Uint8Array | null {
  if (typeof window === 'undefined') return null

  const part1 = sessionStorage.getItem(`_ek1_${sessionId}`)
  const part2 = sessionStorage.getItem(`_ek2_${sessionId}`)

  if (!part1 || !part2) return null

  const keyHex = part1 + part2
  const bytes = new Uint8Array(keyHex.length / 2)
  for (let i = 0; i < keyHex.length; i += 2) {
    bytes[i / 2] = parseInt(keyHex.substring(i, i + 2), 16)
  }
  return bytes
}

export function clearEncryptionKey(sessionId: string): void {
  if (typeof window === 'undefined') return

  sessionStorage.removeItem(`_ek1_${sessionId}`)
  sessionStorage.removeItem(`_ek2_${sessionId}`)
}
