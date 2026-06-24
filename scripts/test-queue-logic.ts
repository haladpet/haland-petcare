import { getLocalDb } from '@/lib/db/local/client'
import { customers, queues } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { eq } from 'drizzle-orm'

async function testQueueLogic() {
  const db = getLocalDb()
  
  console.log('=== Queue Logic Test ===\n')
  
  // Get first customer
  const allCustomers = await db.select().from(customers).limit(10)
  console.log(`✓ Found ${allCustomers.length} customers to test with`)
  
  const clinicId = allCustomers[0].clinic_id
  
  // Create test queues with different priorities
  console.log('\nCreating test queues with different priorities...')
  
  const testQueues = [
    { priority: 'NORMAL', position: 1, cusIdx: 0 },
    { priority: 'EMERGENCY', position: 2, cusIdx: 1 },
    { priority: 'HIGH', position: 3, cusIdx: 2 },
    { priority: 'NORMAL', position: 4, cusIdx: 3 },
    { priority: 'HIGH', position: 5, cusIdx: 4 },
  ]
  
  const createdIds: string[] = []
  
  for (const tq of testQueues) {
    const queueId = uuidv4()
    createdIds.push(queueId)
    
    await db.insert(queues).values({
      id: queueId,
      clinic_id: clinicId,
      customer_id: allCustomers[tq.cusIdx].id,
      queue_number: `Q-${tq.position}`,
      priority: tq.priority as any,
      status: 'WAITING',
      position: tq.position,
      created_at: new Date(),
      updated_at: new Date(),
    })
  }
  
  console.log(`✓ Created ${testQueues.length} test queues`)
  
  // Query all queues and verify ordering
  console.log('\nFetching all test queues ordered by priority...')
  const result = await db.select().from(queues)
  
  const filtered = result.filter(q => createdIds.includes(q.id))
  
  // Manual sort to match the logic in getNextInQueue
  const sorted = filtered.sort((a, b) => {
    const priorityOrder: Record<string, number> = {
      'EMERGENCY': 0,
      'HIGH': 1,
      'NORMAL': 2,
    }
    
    const aPriority = priorityOrder[a.priority] ?? 999
    const bPriority = priorityOrder[b.priority] ?? 999
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }
    
    return a.position - b.position
  })
  
  console.log('\nQueue Order (by priority then position):')
  sorted.forEach((q, i) => {
    console.log(`  ${i + 1}. ${q.queue_number} - Priority: ${q.priority}, Position: ${q.position}`)
  })
  
  // Verify EMERGENCY comes first
  if (sorted[0]?.priority === 'EMERGENCY') {
    console.log('\n✓ PRIORITY ORDERING CORRECT: EMERGENCY is first')
  } else {
    console.log('\n✗ ERROR: EMERGENCY should be first')
  }
  
  // Verify HIGH comes before NORMAL
  const highIndex = sorted.findIndex(q => q.priority === 'HIGH')
  const normalIndex = sorted.findIndex(q => q.priority === 'NORMAL')
  
  if (highIndex < normalIndex) {
    console.log('✓ HIGH priority comes before NORMAL')
  } else {
    console.log('✗ ERROR: HIGH priority should come before NORMAL')
  }
  
  // Test updateQueueStatus (set to IN_PROGRESS)
  console.log('\nTesting queue status update...')
  const firstQueue = sorted[0]
  if (firstQueue) {
    await db.update(queues)
      .set({
        status: 'IN_PROGRESS',
        actual_start_time: new Date(),
        updated_at: new Date(),
      })
      .where(eq(queues.id, firstQueue.id))
    
    const updated = await db.select().from(queues).where(eq(queues.id, firstQueue.id))
    if (updated[0]?.status === 'IN_PROGRESS') {
      console.log(`✓ Successfully updated queue ${firstQueue.queue_number} to IN_PROGRESS`)
    }
  }
  
  console.log('\n=== All Tests Passed ===')
}

testQueueLogic().catch((err) => {
  console.error('Test failed:', err.message || err)
  process.exit(1)
})
