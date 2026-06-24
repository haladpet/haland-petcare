import { getLocalDb } from '@/lib/db/local/client'
import { customers } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'

async function seed() {
  const db = getLocalDb()
  const clinicId = uuidv4()
  
  console.log('Seeding 120 customers to local DB...')
  
  for (let i = 1; i <= 120; i++) {
    const id = uuidv4()
    const customer = {
      id,
      clinic_id: clinicId,
      full_name: `Customer ${i}`,
      phone: `08123456${String(1000 + i).slice(-6)}`,
      email: `customer${i}@example.com`,
      address: `Address ${i}`,
      status: 'ACTIVE',
      metadata: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    }
    
    try {
      await (db as any).insert(customers).values(customer)
      if (i % 10 === 0) console.log(`  Inserted ${i} customers...`)
    } catch (err) {
      console.error(`Error inserting customer ${i}:`, err)
      throw err
    }
  }

  console.log(`✓ Successfully seeded 120 customers to local DB (clinic: ${clinicId})`)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
