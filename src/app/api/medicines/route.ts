import { withPermission } from '@/lib/permissions/middleware'
import { getLocalDb } from '@/lib/db/local/client'
import { medicines } from '@/lib/db/local/schema'
import { eq, ilike, or, sql } from 'drizzle-orm'

const getHandler = withPermission('prescriptions')(async function handler(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q') || ''

  const db = getLocalDb()

  let query = db.select().from(medicines)

  if (q) {
    const pattern = `%${q}%`
    query = query.where(
      or(
        ilike(medicines.name, pattern),
        ilike(medicines.description || sql`''`, pattern)
      )
    )
  }

  const results = await query.orderBy(medicines.name).limit(50)

  // Enrich with current stock from inventory_batches
  const enriched = await Promise.all(
    results.map(async (med) => {
      const batches = await db
        .select({
          total: sql<number>`COALESCE(SUM(quantity), 0)`.mapWith(Number),
        })
        .from((db as any).inventory_batches)
        .where(eq((db as any).inventory_batches.inventory_item_id, med.id))

      return {
        ...med,
        current_stock: Number(batches[0]?.total || 0),
      }
    })
  )

  return new Response(JSON.stringify({ data: enriched }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

export const GET = getHandler