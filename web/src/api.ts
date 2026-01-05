import { Invoice, InvoiceListResponse, InvoiceStatus } from './types'

const { VITE_API_URL = '' } = import.meta.env

const baseUrl = VITE_API_URL || ''

type InvoiceFilters = {
  search: string
  status: InvoiceStatus | ''
  fromDate: string
  toDate: string
  sort: string
  page: number
  pageSize: number
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

export async function fetchInvoices(token: string, filters: InvoiceFilters): Promise<InvoiceListResponse> {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('paid', filters.status === 'paid' ? 'true' : 'false')
  if (filters.fromDate) params.set('from', filters.fromDate)
  if (filters.toDate) params.set('to', filters.toDate)
  params.set('page', String(filters.page))
  params.set('pageSize', String(filters.pageSize))
  if (filters.sort) params.set('sort', filters.sort)

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

  return {
    items: (data.items || []).map((row: any) => ({
      id: String(row.id ?? ''),
      number: row.invoice_number,
      client: row.customer_name,
      project: row.project_name,
      date: row.invoice_date,
      total: Number(row.total) || 0,
      status: row.paid ? 'paid' : 'unpaid',
      vat: Number(row.vat) || Number(row.total) * 0.19
    })),
    page: data.page,
    pageSize: data.pageSize,
    totalCount: data.totalCount,
    totals: {
      vat: Number(data?.totals?.vat) || 0,
      paid: Number(data?.totals?.paid) || 0,
      open: Number(data?.totals?.open) || 0
    }
  }
}

export function exportInvoicesUrl(token: string, filters: InvoiceFilters) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('paid', filters.status === 'paid' ? 'true' : 'false')
  if (filters.fromDate) params.set('from', filters.fromDate)
  if (filters.toDate) params.set('to', filters.toDate)
  if (filters.sort) params.set('sort', filters.sort)

  const query = params.toString()
  const connector = query ? '&' : '?'
  const exportUrl = `${baseUrl}/api/invoices/export${query ? `?${query}` : ''}`
  return `${exportUrl}${connector}token=${encodeURIComponent(token)}`
}

export async function deleteInvoice(token: string, id: string) {
  const res = await fetch(`${baseUrl}/api/invoices/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Failed to delete invoice')
  }
}
