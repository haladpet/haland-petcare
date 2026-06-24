import { withPermission } from '@/lib/permissions/middleware'
import {
  getRevenueReport,
  getVisitsByDoctor,
  getMostPrescribedMedicines,
  getCageOccupancyRate,
  getDailyVisitCount,
  getSummaryStats,
} from '@/lib/db/local/repositories/report.repo'

const getHandler = withPermission('reports')(async function handler(
  req: Request,
  ctx: { params: Promise<{ type: string }> }
) {
  const { type } = await ctx.params
  const url = new URL(req.url)
  const clinicId = url.searchParams.get('clinic_id') || ''
  const dateFrom = url.searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const dateTo = url.searchParams.get('to') || new Date().toISOString().split('T')[0]
  const limit = Number(url.searchParams.get('limit') || '10')

  if (!clinicId) {
    return new Response(JSON.stringify({ error: 'clinic_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    let data: any

    switch (type) {
      case 'revenue':
        data = await getRevenueReport(clinicId, dateFrom, dateTo)
        break
      case 'visits-by-doctor':
        data = await getVisitsByDoctor(clinicId, dateFrom, dateTo)
        break
      case 'most-prescribed':
        data = await getMostPrescribedMedicines(clinicId, dateFrom, dateTo, limit)
        break
      case 'cage-occupancy':
        data = await getCageOccupancyRate(clinicId)
        break
      case 'daily-visits':
        data = await getDailyVisitCount(clinicId, dateFrom, dateTo)
        break
      case 'summary':
        data = await getSummaryStats(clinicId)
        break
      default:
        return new Response(JSON.stringify({ error: `Unknown report type: ${type}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
    }

    return new Response(JSON.stringify({ data }), {
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

export const GET = getHandler