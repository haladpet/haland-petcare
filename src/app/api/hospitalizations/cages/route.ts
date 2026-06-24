import { withPermission } from '@/lib/permissions/middleware'
import { findAll } from '@/lib/db/local/repositories/cage.repo'

const getHandler = withPermission('hospitalization')(async function handler(req: Request) {
  const cages = await findAll()
  return new Response(JSON.stringify({ data: cages }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

export const GET = getHandler