"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: string
  total_price: string
  type?: 'SERVICE' | 'MEDICINE'
  medicine_id?: string
}

interface Invoice {
  id: string
  customer_id: string
  total_amount: string
  status: string
  items: InvoiceItem[]
}

export default function POSPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [amountInput, setAmountInput] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [processing, setProcessing] = useState(false)
  const [receiptDialog, setReceiptDialog] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingInvoices, setLoadingInvoices] = useState(false)

  // Load pending invoices
  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true)
    try {
      // In a real app, we'd filter by customer or show all pending
      const res = await fetch('/api/invoices?customer_id=all')
      const json = await res.json()
      setInvoices((json.data || []).filter((inv: Invoice) =>
        inv.status === 'DRAFT' || inv.status === 'PENDING' || inv.status === 'PARTIAL'
      ))
    } catch {
      // ignore
    } finally {
      setLoadingInvoices(false)
    }
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  // Numpad input
  const handleNumpad = (value: string) => {
    if (value === 'C') {
      setAmountInput('')
    } else if (value === '⌫') {
      setAmountInput((prev) => prev.slice(0, -1))
    } else if (value === '.') {
      if (!amountInput.includes('.')) {
        setAmountInput((prev) => prev + '.')
      }
    } else if (value === '000') {
      setAmountInput((prev) => prev + '000')
    } else {
      setAmountInput((prev) => prev + value)
    }
  }

  // Quick amount buttons
  const handleQuickAmount = (amount: number) => {
    setAmountInput(String(amount))
  }

  // Process payment
  const handlePayment = async () => {
    if (!selectedInvoice) return
    const amount = Number(amountInput)
    if (!amount || amount <= 0) {
      setError('Enter a valid amount')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: selectedInvoice.id,
          amount,
          method: paymentMethod,
          item_types: selectedInvoice.items.map((item) => ({
            invoiceItemId: item.id,
            type: item.type || 'SERVICE',
            medicine_id: item.medicine_id,
            quantity: item.quantity,
          })),
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        // Payment failed — show error, invoice stays in previous state
        setError(json.error || 'Payment failed')
        setProcessing(false)
        return
      }

      // Payment success — show receipt
      setReceiptData({
        invoice: selectedInvoice,
        payment: json.data.payment,
        invoiceStatus: json.data.invoiceStatus,
        remainingBalance: json.data.remainingBalance,
        isFullyPaid: json.data.isFullyPaid,
        method: paymentMethod,
        amount,
      })
      setReceiptDialog(true)
      setAmountInput('')
      setSelectedInvoice(null)
      loadInvoices()
    } catch {
      setError('Network error — payment not processed')
    } finally {
      setProcessing(false)
    }
  }

  const totalAmount = selectedInvoice ? Number(selectedInvoice.total_amount) : 0
  const inputAmount = Number(amountInput) || 0
  const change = inputAmount - totalAmount

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Point of Sale</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice List */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h2 className="font-semibold mb-3">Pending Invoices</h2>
            {loadingInvoices && <p className="text-sm text-muted-foreground">Loading...</p>}
            {!loadingInvoices && invoices.length === 0 && (
              <p className="text-sm text-muted-foreground">No pending invoices</p>
            )}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {invoices.map((inv) => (
                <button
                  key={inv.id}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${
                    selectedInvoice?.id === inv.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-accent'
                  }`}
                  onClick={() => {
                    setSelectedInvoice(inv)
                    setAmountInput(inv.total_amount)
                    setError(null)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      INV-{inv.id.slice(0, 8)}
                    </span>
                    <Badge variant={inv.status === 'DRAFT' ? 'outline' : 'secondary'}>
                      {inv.status}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold mt-1">
                    Rp {Number(inv.total_amount).toLocaleString('id-ID')}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Payment Area */}
        <div className="lg:col-span-2">
          {selectedInvoice ? (
            <div className="space-y-4">
              {/* Invoice Detail */}
              <Card className="p-4">
                <h2 className="font-semibold mb-2">
                  Invoice INV-{selectedInvoice.id.slice(0, 8)}
                </h2>
                <div className="space-y-1 mb-3">
                  {selectedInvoice.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.description} × {item.quantity}
                      </span>
                      <span>Rp {Number(item.total_price).toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg mt-2">
                  <span>Total</span>
                  <span>Rp {totalAmount.toLocaleString('id-ID')}</span>
                </div>
              </Card>

              {/* Amount Display */}
              <Card className="p-4">
                <div className="text-center">
                  <div className="text-3xl font-mono font-bold tabular-nums">
                    Rp {inputAmount.toLocaleString('id-ID')}
                  </div>
                  {inputAmount > 0 && (
                    <div className={`text-lg mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Change: Rp {Math.max(0, change).toLocaleString('id-ID')}
                      {change < 0 && (
                        <span className="text-sm ml-2">
                          (short Rp {Math.abs(change).toLocaleString('id-ID')})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Payment Method */}
              <div className="flex gap-2">
                {['CASH', 'CARD', 'QRIS', 'TRANSFER'].map((method) => (
                  <Button
                    key={method}
                    variant={paymentMethod === method ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaymentMethod(method)}
                  >
                    {method}
                  </Button>
                ))}
              </div>

              {/* Numpad */}
              <Card className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
                    <Button
                      key={key}
                      variant={key === 'C' ? 'destructive' : key === '⌫' ? 'outline' : 'secondary'}
                      className="h-14 text-lg font-bold"
                      onClick={() => handleNumpad(key)}
                    >
                      {key}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button variant="outline" className="h-10" onClick={() => handleNumpad('000')}>
                    000
                  </Button>
                  <Button variant="outline" className="h-10" onClick={() => handleNumpad('.')}>
                    .
                  </Button>
                </div>

                {/* Quick amounts */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(totalAmount)}
                  >
                    Exact
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(Math.ceil(totalAmount / 10000) * 10000)}
                  >
                    Round Up
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(Math.ceil(totalAmount / 50000) * 50000)}
                  >
                    +50k
                  </Button>
                </div>
              </Card>

              {error && (
                <Card className="p-3 bg-red-50 border-red-300">
                  <p className="text-sm text-red-700">{error}</p>
                </Card>
              )}

              {/* Pay Button */}
              <Button
                className="w-full h-14 text-lg font-bold"
                onClick={handlePayment}
                disabled={processing || inputAmount < totalAmount}
              >
                {processing
                  ? 'Processing...'
                  : inputAmount < totalAmount
                  ? `Short Rp ${(totalAmount - inputAmount).toLocaleString('id-ID')}`
                  : `Pay Rp ${inputAmount.toLocaleString('id-ID')}`}
              </Button>
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              Select an invoice from the list to process payment.
            </Card>
          )}
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialog} onOpenChange={setReceiptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          {receiptData && (
            <div className="space-y-3">
              <div className="text-center border-b pb-3">
                <h3 className="font-bold">Haland PetCare</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date().toLocaleString('id-ID')}
                </p>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Invoice</span>
                  <span>INV-{receiptData.invoice.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Method</span>
                  <span>{receiptData.method}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <Badge variant={receiptData.isFullyPaid ? 'default' : 'secondary'}>
                    {receiptData.invoiceStatus}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-1 text-sm">
                {receiptData.invoice.items.map((item: InvoiceItem) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.description}</span>
                    <span>Rp {Number(item.total_price).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1 text-sm font-bold">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span>Rp {Number(receiptData.invoice.total_amount).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Paid</span>
                  <span>Rp {receiptData.amount.toLocaleString('id-ID')}</span>
                </div>
                {receiptData.remainingBalance > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>Remaining</span>
                    <span>Rp {receiptData.remainingBalance.toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-muted-foreground pt-2">
                Thank you for your payment!
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setReceiptDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}