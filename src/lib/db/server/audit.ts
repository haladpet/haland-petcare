import { getServerPool } from './client'

export async function writeAuditLog(params: { action: string; user_id?: string | null; clinic_id?: string | null; resource?: string | null; status: 'PERMITTED' | 'DENIED' | 'INFO'; details?: any }) {
  const pool = getServerPool()
  const { action, user_id, clinic_id, resource, status, details } = params
  try {
    await pool.query(
      `INSERT INTO audit_logs(action, user_id, clinic_id, resource, status, details, created_at)
       VALUES($1,$2,$3,$4,$5,$6,now())`,
      [action, user_id || null, clinic_id || null, resource || null, status, details ? JSON.stringify(details) : null]
    )
  } catch (err) {
    // ignore audit errors
    console.error('writeAuditLog error', err)
  }
}
