import { NextResponse } from 'next/server'
import { getServerDb } from '@/lib/db/server/client'
import {
  clinics,
  customers,
  pets,
  medicalRecords,
  prescriptions,
  prescriptionItems,
  medicines,
  cages,
  hospitalizations,
  hospitalizationRateHistory,
  hospitalizationMonitoring,
  inventoryItems,
  inventoryBatches,
  inventoryTransactions,
  invoices,
  invoiceItems,
  payments,
  auditLogs,
  syncQueue,
  conflictQueue,
  serverUsers,
  devices,
  sessions,
} from '@/lib/db/server/schema'

// Cron job: Daily backup at 02:00
// Triggered by Vercel Cron Jobs (vercel.json)
// This endpoint dumps critical data as JSON for backup purposes
export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const db = getServerDb()
    const timestamp = new Date().toISOString()

    const [
      clinicsData,
      customersData,
      petsData,
      medicalRecordsData,
      prescriptionsData,
      prescriptionItemsData,
      medicinesData,
      cagesData,
      hospitalizationsData,
      hospitalizationRateHistoryData,
      hospitalizationMonitoringData,
      inventoryItemsData,
      inventoryBatchesData,
      inventoryTransactionsData,
      invoicesData,
      invoiceItemsData,
      paymentsData,
      auditLogsData,
      syncQueueData,
      conflictQueueData,
      usersData,
      devicesData,
      sessionsData,
    ] = await Promise.all([
      db.select().from(clinics),
      db.select().from(customers),
      db.select().from(pets),
      db.select().from(medicalRecords),
      db.select().from(prescriptions),
      db.select().from(prescriptionItems),
      db.select().from(medicines),
      db.select().from(cages),
      db.select().from(hospitalizations),
      db.select().from(hospitalizationRateHistory),
      db.select().from(hospitalizationMonitoring),
      db.select().from(inventoryItems),
      db.select().from(inventoryBatches),
      db.select().from(inventoryTransactions),
      db.select().from(invoices),
      db.select().from(invoiceItems),
      db.select().from(payments),
      db.select().from(auditLogs),
      db.select().from(syncQueue),
      db.select().from(conflictQueue),
      db.select().from(serverUsers),
      db.select().from(devices),
      db.select().from(sessions),
    ])

    const backup = {
      timestamp,
      status: 'COMPLETED',
      tables: {
        clinics: clinicsData.length,
        customers: customersData.length,
        pets: petsData.length,
        medical_records: medicalRecordsData.length,
        prescriptions: prescriptionsData.length,
        prescription_items: prescriptionItemsData.length,
        medicines: medicinesData.length,
        cages: cagesData.length,
        hospitalizations: hospitalizationsData.length,
        hospitalization_rate_history: hospitalizationRateHistoryData.length,
        hospitalization_monitoring: hospitalizationMonitoringData.length,
        inventory_items: inventoryItemsData.length,
        inventory_batches: inventoryBatchesData.length,
        inventory_transactions: inventoryTransactionsData.length,
        invoices: invoicesData.length,
        invoice_items: invoiceItemsData.length,
        payments: paymentsData.length,
        audit_logs: auditLogsData.length,
        sync_queue: syncQueueData.length,
        conflict_queue: conflictQueueData.length,
        server_users: usersData.length,
        devices: devicesData.length,
        sessions: sessionsData.length,
      },
      data: {
        clinics: clinicsData,
        customers: customersData,
        pets: petsData,
        medical_records: medicalRecordsData,
        prescriptions: prescriptionsData,
        prescription_items: prescriptionItemsData,
        medicines: medicinesData,
        cages: cagesData,
        hospitalizations: hospitalizationsData,
        hospitalization_rate_history: hospitalizationRateHistoryData,
        hospitalization_monitoring: hospitalizationMonitoringData,
        inventory_items: inventoryItemsData,
        inventory_batches: inventoryBatchesData,
        inventory_transactions: inventoryTransactionsData,
        invoices: invoicesData,
        invoice_items: invoiceItemsData,
        payments: paymentsData,
        audit_logs: auditLogsData,
        sync_queue: syncQueueData,
        conflict_queue: conflictQueueData,
        server_users: usersData,
        devices: devicesData,
        sessions: sessionsData,
      },
    }

    console.log('[CRON:BACKUP]', JSON.stringify({ timestamp, status: 'COMPLETED', tableCounts: backup.tables }))

    return new Response(JSON.stringify(backup), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[CRON:BACKUP:ERROR]', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}