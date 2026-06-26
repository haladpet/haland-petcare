import crypto from 'crypto'

interface DeviceInfo {
  userAgent?: string
  screenResolution?: string
  timezone?: string
}

export function generateDeviceFingerprint(deviceInfo: DeviceInfo): string {
  const parts = [deviceInfo.userAgent || '', deviceInfo.screenResolution || '', deviceInfo.timezone || '']
  const raw = parts.join('||')
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export function signDeviceFingerprint(rawFingerprint: string, deviceSecret: string): string {
  return crypto.createHmac('sha256', deviceSecret).update(rawFingerprint).digest('hex')
}

export function verifyDeviceFingerprint(rawFingerprint: string, deviceSecret: string, storedHash: string): boolean {
  const expected = signDeviceFingerprint(rawFingerprint, deviceSecret)
  // constant-time compare
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(storedHash, 'hex'))
}