"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

export default function ReportsPage() {
  const [clinicId, setClinicId] = useState('')
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [activeTab, setActiveTab] = useState('revenue')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const fetchReport = useCallback(async (type: string) => {
    if (!clinicId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/reports/${type}?clinic_id=${clinicId}&from=${dateFrom}&to=${dateTo}`
      )
      const json = await res.json()
      setData(json.data || null)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [clinicId, dateFrom, dateTo])

  useEffect(() => {
    if (clinicId) fetchReport(activeTab)
  }, [activeTab, clinicId, fetchReport])

  const handleExportCSV = async () => {
    if (!data) return
    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.json_to_sheet(Array.isArray(data) ? data : [data])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, activeTab)
      XLSX.writeFile(wb, `report-${activeTab}-${dateFrom}-${dateTo}.xlsx`)
    } catch {
      alert('Export failed. Install xlsx library: npm install xlsx')
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text(`Report: ${activeTab}`, 20, 20)
      doc.setFontSize(10)
      doc.text(`Period: ${dateFrom} - ${dateTo}`, 20, 30)
      let y = 40
      if (Array.isArray(data)) {
        data.forEach((row: any, i: number) => {
          if (y > 280) { doc.addPage(); y = 20 }
          doc.text(JSON.stringify(row), 20, y)
          y += 8
        })
      }
      doc.save(`report-${activeTab}-${dateFrom}-${dateTo}.pdf`)
    } catch {
      alert('Export failed. Install jspdf library: npm install jspdf')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting || !data}>
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting || !data}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Clinic ID</label>
            <Input
              value={clinicId}
              onChange={(e) => setClinicId(e.target.value)}
              placeholder="Enter clinic UUID"
            />
          </div>
          <div>
            <label className="text-sm font-medium">From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="daily-visits">Daily Visits</TabsTrigger>
          <TabsTrigger value="visits-by-doctor">By Doctor</TabsTrigger>
          <TabsTrigger value="most-prescribed">Top Medicines</TabsTrigger>
          <TabsTrigger value="cage-occupancy">Cage Occupancy</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Revenue Report</h2>
            {loading && <Skeleton className="h-64 w-full" />}
            {!loading && data && Array.isArray(data) && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Date</th>
                      <th className="text-right py-2">Invoices</th>
                      <th className="text-right py-2">Invoiced</th>
                      <th className="text-right py-2">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="py-2">{row.date}</td>
                        <td className="text-right">{row.invoice_count}</td>
                        <td className="text-right">Rp {Number(row.total_invoiced).toLocaleString('id-ID')}</td>
                        <td className="text-right">Rp {Number(row.total_paid).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && !data && clinicId && (
              <p className="text-muted-foreground text-sm">No data for this period.</p>
            )}
            {!clinicId && (
              <p className="text-muted-foreground text-sm">Enter a clinic ID to view reports.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="daily-visits">
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Daily Visit Count</h2>
            {loading && <Skeleton className="h-64 w-full" />}
            {!loading && data && Array.isArray(data) && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Date</th>
                      <th className="text-right py-2">Visits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="py-2">{row.date}</td>
                        <td className="text-right">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="visits-by-doctor">
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Visits by Doctor</h2>
            {loading && <Skeleton className="h-64 w-full" />}
            {!loading && data && Array.isArray(data) && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Doctor ID</th>
                      <th className="text-right py-2">Visits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="py-2">{row.doctor_id?.slice(0, 8)}...</td>
                        <td className="text-right">{row.visit_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="most-prescribed">
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Most Prescribed Medicines</h2>
            {loading && <Skeleton className="h-64 w-full" />}
            {!loading && data && Array.isArray(data) && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Medicine</th>
                      <th className="text-right py-2">Total Qty</th>
                      <th className="text-right py-2">Prescriptions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="py-2">{row.medicine_name}</td>
                        <td className="text-right">{row.total_quantity}</td>
                        <td className="text-right">{row.prescription_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="cage-occupancy">
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Cage Occupancy</h2>
            {loading && <Skeleton className="h-48 w-full" />}
            {!loading && data && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <Card className="p-4 bg-green-50">
                    <div className="text-3xl font-bold text-green-700">{data.availableCages}</div>
                    <div className="text-sm text-muted-foreground">Available</div>
                  </Card>
                  <Card className="p-4 bg-red-50">
                    <div className="text-3xl font-bold text-red-700">{data.occupiedCages}</div>
                    <div className="text-sm text-muted-foreground">Occupied</div>
                  </Card>
                  <Card className="p-4 bg-blue-50">
                    <div className="text-3xl font-bold text-blue-700">{data.occupancyRate}%</div>
                    <div className="text-sm text-muted-foreground">Occupancy Rate</div>
                  </Card>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Clinic Summary</h2>
            {loading && <Skeleton className="h-48 w-full" />}
            {!loading && data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold">{data.totalCustomers}</div>
                  <div className="text-xs text-muted-foreground">Customers</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold">{data.totalPets}</div>
                  <div className="text-xs text-muted-foreground">Pets</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold">{data.activeHospitalizations}</div>
                  <div className="text-xs text-muted-foreground">Active Hosp.</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold">Rp {Number(data.pendingInvoicesTotal).toLocaleString('id-ID')}</div>
                  <div className="text-xs text-muted-foreground">Pending ({data.pendingInvoicesCount})</div>
                </Card>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}