import { withPermission } from '@/lib/permissions/middleware'
import {
  getLowStockItems,
  getExpiringSoonItems,
  createInventoryItem,
  addBatch,
} from '@/lib/db/local/repositories/inventory.repo'
import { getLocalDb } from '@/lib/db/local/client'
import { inventoryItems } from '@/lib/db/local/schema'

const getHandler = withPermission('inventory')(async function handler(req: Request) {
  const url = new URL(req.url)
  const filter = url.searchParams.get('filter') // 'low-stock' | 'expiring-soon' | 'all'
  const threshold = Number(url.searchParams.get('threshold') || '5')
  const daysThreshold = Number(url.searchParams.get('days') || '30')

  try {
    if (filter === 'low-stock') {
      const items = await getLowStockItems(threshold)
      return new Response(JSON.stringify({ data: items }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (filter === 'expiring-soon') {
      const items = await getExpiringSoonItems(daysThreshold)
      return new Response(JSON.stringify({ data: items }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Default: return all inventory items with stock
    const db = getLocalDb()
    const allItems = await db.select().from(inventoryItems).orderBy(inventoryItems.name)

    // Enrich with stock
    const { getStock } = await import('@/lib/db/local/repositories/inventory.repo')
    const enriched = await Promise.all(
      allItems.map(async (item) => {
        const stock = await getStock(item.id)
        return { ...item, current_stock: stock }
      })
    )

    return new Response(JSON.stringify({ data: enriched }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

const postHandler = withPermission('inventory')(async function handler(req: Request) {
  const body = await req.json()
  const { action, ...data } = body

  try {
    if (action === 'add-batch') {
      const batch = await addBatch(data)
      return new Response(JSON.stringify({ data: batch }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Default: create inventory item
    const item = await createInventoryItem(data)
    return new Response(JSON.stringify({ data: item }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

export const GET = getHandler
export const POST = postHandler