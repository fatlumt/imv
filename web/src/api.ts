import { Invoice, InvoiceStatus } from './types'

const { VITE_API_URL = '' } = import.meta.env

const baseUrl = VITE_API_URL || ''

type InvoiceFilters = {
  search: string
  status: InvoiceStatus | ''
  fromDate: string
  toDate: string
  sort: string
}

export async function login(email: string, password: string) {
  const res = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Login failed')
  }

  return res.json()
}

export async function fetchInvoices(token: string, filters: InvoiceFilters): Promise<Invoice[]> {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('paid', filters.status === 'paid' ? 'true' : 'false')
  if (filters.fromDate) params.set('from', filters.fromDate)
  if (filters.toDate) params.set('to', filters.toDate)

  const res = await fetch(`${baseUrl}/api/invoices?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Failed to load invoices')
  }

  const data = await res.json()

  return data.map((row: any) => ({
    id: String(row.id ?? ''),
    number: row.invoice_number,
    client: row.customer_name,
    project: row.project_name,
    date: row.invoice_date,
    total: Number(row.total) || 0,
    status: row.paid ? 'paid' : 'unpaid',
    vat: Number(row.total) * 0.19
  }))
}

export function exportInvoicesUrl(token: string, filters: InvoiceFilters) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('paid', filters.status === 'paid' ? 'true' : 'false')
  if (filters.fromDate) params.set('from', filters.fromDate)
  if (filters.toDate) params.set('to', filters.toDate)

  const query = params.toString()
  const connector = query ? '&' : '?'
  const exportUrl = `${baseUrl}/api/invoices/export${query ? `?${query}` : ''}`
  return `${exportUrl}${connector}token=${encodeURIComponent(token)}`
}
