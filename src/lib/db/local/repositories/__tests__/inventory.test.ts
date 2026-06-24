/**
 * Inventory Concurrent Deduction Test
 *
 * Tests that concurrent deductions on the same inventory item
 * do not result in negative stock. One should succeed, the other
 * should fail with INSUFFICIENT_STOCK.
 *
 * Run: npx vitest run src/lib/db/local/repositories/__tests__/inventory.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  createInventoryItem,
  addBatch,
  deductInventory,
  getStock,
} from '../inventory.repo'

describe('Inventory Concurrent Deduction', () => {
  let itemId: string

  beforeAll(async () => {
    // Create an inventory item with 10 units in one batch
    const item = await createInventoryItem({
      clinic_id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Medicine Concurrent',
      unit: 'tablet',
    })
    itemId = item.id

    await addBatch({
      inventory_item_id: itemId,
      batch_number: 'BATCH-001',
      quantity: 10,
      received_at: new Date(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    })

    // Verify initial stock
    const stock = await getStock(itemId)
    expect(stock).toBe(10)
  })

  it('should not allow negative stock from concurrent deductions', async () => {
    // Two concurrent deductions of 6 each on a stock of 10
    // One must succeed (6 deducted, 4 remaining)
    // One must fail with INSUFFICIENT_STOCK
    // Final stock must NOT be negative

    const results = await Promise.allSettled([
      deductInventory(itemId, 6, { type: 'test', id: 'concurrent-1' }),
      deductInventory(itemId, 6, { type: 'test', id: 'concurrent-2' }),
    ])

    // Count fulfilled and rejected
    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')

    // Exactly one should succeed, one should fail
    expect(fulfilled.length).toBe(1)
    expect(rejected.length).toBe(1)

    // The rejected one should have INSUFFICIENT_STOCK error
    const rejectedError = (rejected[0] as PromiseRejectedResult).reason
    expect(rejectedError.message || String(rejectedError)).toContain('INSUFFICIENT_STOCK')

    // Final stock must NOT be negative
    const finalStock = await getStock(itemId)
    expect(finalStock).toBeGreaterThanOrEqual(0)
    // After one successful deduction of 6 from 10, should be 4
    expect(finalStock).toBe(4)
  })

  it('should handle FIFO deduction across multiple batches', async () => {
    // Create a fresh item with 2 batches
    const item = await createInventoryItem({
      clinic_id: '00000000-0000-0000-0000-000000000001',
      name: 'Test FIFO Medicine',
      unit: 'capsule',
    })

    // Batch 1: expires sooner, qty 3
    await addBatch({
      inventory_item_id: item.id,
      batch_number: 'FIFO-001',
      quantity: 3,
      received_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    })

    // Batch 2: expires later, qty 5
    await addBatch({
      inventory_item_id: item.id,
      batch_number: 'FIFO-002',
      quantity: 5,
      received_at: new Date(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    })

    const stock = await getStock(item.id)
    expect(stock).toBe(8)

    // Deduct 4 — should take 3 from FIFO-001 (expiring sooner) and 1 from FIFO-002
    const result = await deductInventory(item.id, 4, { type: 'test', id: 'fifo-test' })
    expect(result.success).toBe(true)
    expect(result.deductions.length).toBeGreaterThanOrEqual(1)

    // Final stock should be 4
    const finalStock = await getStock(item.id)
    expect(finalStock).toBe(4)
  })
})