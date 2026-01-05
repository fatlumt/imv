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

export async function getInvoice(token: string, id: string): Promise<Invoice> {
  const res = await fetch(`${baseUrl}/api/invoices/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Failed to load invoice')
  }

  const invoice = await res.json()

  return {
    id: String(invoice.id ?? ''),
    number: invoice.invoice_number,
    client: invoice.customer_name,
    project: invoice.project_name,
    date: invoice.invoice_date,
    status: invoice.paid ? 'paid' : 'unpaid',
    total: Number(invoice.total) || 0,
    vat: Number(invoice.vat) || Number(invoice.total) * 0.19
  }
}

function toPayload(invoice: Partial<Invoice>) {
  return {
    invoice_number: invoice.number,
    customer_name: invoice.client,
    project_name: invoice.project,
    invoice_date: invoice.date,
    total: invoice.total,
    paid: invoice.status === 'paid'
  }
}

export async function createInvoice(token: string, invoice: Partial<Invoice>) {
  const res = await fetch(`${baseUrl}/api/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(toPayload(invoice))
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Failed to create invoice')
  }

  const created = await res.json()

  return {
    id: String(created.id ?? ''),
    number: created.invoice_number,
    client: created.customer_name,
    project: created.project_name,
    date: created.invoice_date,
    status: created.paid ? 'paid' : 'unpaid',
    total: Number(created.total) || 0,
    vat: Number(created.vat) || Number(created.total) * 0.19
  } as Invoice
}

export async function updateInvoice(token: string, id: string, invoice: Partial<Invoice>) {
  const res = await fetch(`${baseUrl}/api/invoices/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(toPayload(invoice))
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Failed to update invoice')
  }

  const updated = await res.json()

  return {
    id: String(updated.id ?? ''),
    number: updated.invoice_number,
    client: updated.customer_name,
    project: updated.project_name,
    date: updated.invoice_date,
    status: updated.paid ? 'paid' : 'unpaid',
    total: Number(updated.total) || 0,
    vat: Number(updated.vat) || Number(updated.total) * 0.19
  } as Invoice
}
