import { getLocalClient } from '@/lib/db/local/client'
import { readFileSync } from 'fs'
import { join } from 'path'

async function runMigrations() {
  const client = getLocalClient()
  
  console.log('Running migrations for local database...')
  
  // Read the local migration SQL
  const migrationSql = readFileSync(join(__dirname, '../drizzle/local/0000_bent_logan.sql'), 'utf-8')
  
  try {
    // Split by statement separator and execute each statement
    const statements = migrationSql.split('--> statement-breakpoint').filter(s => s.trim())
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (!statement) continue
      
      try {
        // Use query to run raw SQL
        await client.query(statement)
        console.log(`  ✓ Statement ${i + 1}/${statements.length}`)
      } catch (err: any) {
        // Ignore table/index already exists errors (code 42P07, 42P06)
        if (err.code === '42P07' || err.code === '42P06' || err.message?.includes('already exists')) {
          console.log(`  ⊘ Statement ${i + 1}: Skipped (already exists)`)
        } else {
          console.error(`✗ Error on statement ${i + 1}: ${err.message || err.code}`)
          if (statement.length > 100) {
            console.error(`  Statement: ${statement.slice(0, 100)}...`)
          } else {
            console.error(`  Statement: ${statement}`)
          }
          throw err
        }
      }
    }
    
    console.log('✓ Migrations completed successfully')
  } catch (err) {
    console.error('Migration failed:', err)
    throw err
  }
}

runMigrations().catch((err) => {
  console.error('Failed:', err.message || err)
  process.exit(1)
})
