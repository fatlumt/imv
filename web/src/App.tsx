import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Route, Routes, useNavigate, useParams, BrowserRouter } from 'react-router-dom'
import { createInvoice, deleteInvoice, exportInvoicesUrl, fetchInvoices, updateInvoice } from './api'
import { AuthProvider, useAuth } from './auth'
import { InvoiceForm, type InvoiceFormValues } from './components/InvoiceForm'
import { formatCurrency, matchesFilters, mockInvoices, summarizeInvoices } from './invoiceUtils'
import { invoiceStatusOptions, type Invoice, type InvoiceStatus } from './types'

const sortOptions = [
  { value: 'date_desc', label: 'Date (newest)' },
  { value: 'date_asc', label: 'Date (oldest)' },
  { value: 'amount_desc', label: 'Amount (high to low)' },
  { value: 'amount_asc', label: 'Amount (low to high)' },
]

function AppShell() {
  const { token, login: loginUser, logout } = useAuth()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<InvoiceStatus | ''>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sort, setSort] = useState(sortOptions[0].value)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [totalCount, setTotalCount] = useState(mockInvoices.length)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [authError, setAuthError] = useState('')
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices)
  const [totals, setTotals] = useState(summarizeInvoices(mockInvoices))
  const [loading, setLoading] = useState(false)

  const loadInvoices = useCallback(async () => {
    if (!token) {
      setInvoices(mockInvoices)
      setTotalCount(mockInvoices.length)
      setTotals(summarizeInvoices(mockInvoices))
      return
    }

    setLoading(true)
    setError('')
    try {
      const data = await fetchInvoices(token, { search, status, fromDate, toDate, sort, page, pageSize })
      setInvoices(data.items)
      setTotalCount(data.totalCount || data.items.length)
      setTotals(data.totals || summarizeInvoices(data.items))
    } catch (err: any) {
      setError(err?.message || 'Unable to load invoices')
    } finally {
      setLoading(false)
    }
  }, [fromDate, page, pageSize, search, sort, status, toDate, token])

  useEffect(() => {
    void loadInvoices()
  }, [loadInvoices])

  const filtered = useMemo(() => {
    if (token) return invoices

    const base = invoices.filter((invoice) => matchesFilters(invoice, { search, status, fromDate, toDate, sort }))

    return base.sort((a, b) => {
      switch (sort) {
        case 'date_asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'amount_desc':
          return b.total - a.total
        case 'amount_asc':
          return a.total - b.total
        case 'date_desc':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime()
      }
    })
  }, [fromDate, invoices, search, sort, status, toDate, token])

  const derivedTotals = token ? totals : summarizeInvoices(filtered)
  const derivedTotalCount = token ? totalCount : filtered.length
  const pageCount = Math.max(1, Math.ceil(derivedTotalCount / pageSize))
  const currentPage = Math.min(page, pageCount)
  const displayed = token ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    if (!token && page !== currentPage) {
      setPage(currentPage)
    }
  }, [currentPage, page, token])

  const handleExport = () => {
    if (!token) return
    const exportUrl = exportInvoicesUrl(token, { search, status, fromDate, toDate, sort, page, pageSize })
    window.location.href = exportUrl
  }

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    setAuthError('')
    setError('')
    try {
      await loginUser(email, password)
      setPage(1)
      await loadInvoices()
    } catch (err: any) {
      setAuthError(err?.message || 'Login failed')
    }
  }

  const handleLogout = () => {
    logout()
    setInvoices(mockInvoices)
    setTotals(summarizeInvoices(mockInvoices))
    setPage(1)
    navigate('/')
  }

  const handleSaveInvoice = async (values: InvoiceFormValues, editingId?: string) => {
    setError('')

    const preparedInvoice: Invoice = {
      id: editingId || '',
      number: values.number || editingId || `INV-${Date.now()}`,
      client: values.client,
      project: values.project,
      date: values.date,
      status: values.status,
      total: Number(values.total) || 0,
      vat: Number(values.total) * 0.19,
    }

    if (!token) {
      setInvoices((current) => {
        const nextList = editingId
          ? current.map((inv) => (inv.id === editingId ? { ...inv, ...preparedInvoice } : inv))
          : [
              {
                ...preparedInvoice,
                id: String(Date.now()),
              },
              ...current,
            ]
        setTotals(summarizeInvoices(nextList))
        setTotalCount(nextList.length)
        setPage(1)
        return nextList
      })
      navigate('/')
      return
    }

    setLoading(true)
    try {
      if (editingId) {
        await updateInvoice(token, editingId, preparedInvoice)
      } else {
        await createInvoice(token, preparedInvoice)
      }
      await loadInvoices()
      navigate('/')
    } catch (err: any) {
      setError(err?.message || 'Unable to save invoice')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!token) {
      setError('Login to manage invoices.')
      return
    }

    const confirmDelete = window.confirm('Delete this invoice? This action cannot be undone.')
    if (!confirmDelete) return

    setLoading(true)
    setError('')
    try {
      await deleteInvoice(token, id)
      await loadInvoices()
    } catch (err: any) {
      setError(err?.message || 'Unable to delete invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div>
          <p className="badge">Step 8 · Routed forms & auth context</p>
          <h1>Invoices Dashboard</h1>
          <p style={{ margin: 0, color: '#5f6a78' }}>
            Responsive SPA preserving current filters, exports, and labels across desktop/mobile.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {token ? (
            <>
              <button className="button" onClick={handleExport} aria-label="Export CSV">
                Export CSV
              </button>
              <button className="button secondary" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <span style={{ color: '#607080', fontSize: 13 }}>Login to export and sync with API</span>
          )}
        </div>
      </header>

      {!token && (
        <section className="card" aria-label="Authentication">
          <form className="login" onSubmit={handleLogin}>
            <div>
              <label className="field">
                <span>Email</span>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ margin: 0, color: '#607080', fontSize: 13 }}>
                Mock data shown until authenticated. Use existing credentials from the PHP app to load live data.
              </p>
              {authError && (
                <div className="error" role="alert">
                  {authError}
                </div>
              )}
              <button className="button" type="submit">
                Login & load invoices
              </button>
            </div>
          </form>
        </section>
      )}

      <Routes>
        <Route
          path="/invoice/new"
          element={
            <InvoiceFormRoute
              heading="New invoice"
              loading={loading}
              onSave={(values) => handleSaveInvoice(values)}
              invoices={invoices}
            />
          }
        />
        <Route
          path="/invoice/:id/edit"
          element={
            <InvoiceFormRoute
              heading="Edit invoice"
              loading={loading}
              invoices={invoices}
              onSave={(values, editingId) => handleSaveInvoice(values, editingId)}
            />
          }
        />
        <Route
          path="/"
          element={
            <Dashboard
              search={search}
              status={status}
              fromDate={fromDate}
              toDate={toDate}
              sort={sort}
              setSearch={setSearch}
              setStatus={setStatus}
              setFromDate={setFromDate}
              setToDate={setToDate}
              setSort={setSort}
              onCreate={() => navigate('/invoice/new')}
              onEdit={(invoice) => navigate(`/invoice/${invoice.id}/edit`)}
              onDelete={handleDelete}
              invoices={displayed}
              totals={derivedTotals}
              totalCount={derivedTotalCount}
              page={currentPage}
              pageCount={pageCount}
              setPage={setPage}
              loading={loading}
              error={error}
            />
          }
        />
      </Routes>
    </div>
  )
}

function InvoiceFormRoute({ heading, invoices, onSave, loading }: {
  heading: string
  invoices: Invoice[]
  onSave: (values: InvoiceFormValues, id?: string) => Promise<void>
  loading: boolean
}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const existing = invoices.find((inv) => inv.id === id)

  return (
    <section className="card" aria-label="Invoice form">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <Link className="back-link" to="/">
          ← Back to invoices
        </Link>
        <span className="badge">Routed form preserves existing labels</span>
      </div>
      {id && !existing && (
        <div className="error" role="alert" style={{ marginTop: 12 }}>
          Invoice not found in the current list
        </div>
      )}
      <InvoiceForm
        heading={heading}
        initialValues={existing || undefined}
        loading={loading}
        onSubmit={async (values) => onSave(values, existing?.id)}
        onCancel={() => navigate('/')}
      />
    </section>
  )
}

function Dashboard({
  search,
  status,
  fromDate,
  toDate,
  sort,
  setSearch,
  setStatus,
  setFromDate,
  setToDate,
  setSort,
  onCreate,
  onEdit,
  onDelete,
  invoices,
  totals,
  totalCount,
  page,
  pageCount,
  setPage,
  loading,
  error,
}: {
  search: string
  status: InvoiceStatus | ''
  fromDate: string
  toDate: string
  sort: string
  setSearch: (value: string) => void
  setStatus: (value: InvoiceStatus | '') => void
  setFromDate: (value: string) => void
  setToDate: (value: string) => void
  setSort: (value: string) => void
  onCreate: () => void
  onEdit: (invoice: Invoice) => void
  onDelete: (id: string) => void
  invoices: Invoice[]
  totals: { vat: number; paid: number; open: number }
  totalCount: number
  page: number
  pageCount: number
  setPage: (page: number) => void
  loading: boolean
  error: string
}) {
  return (
    <>
      <section className="card" aria-label="Invoice actions">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: '0 0 4px' }}>New invoice</h2>
            <p style={{ margin: 0, color: '#607080', fontSize: 13 }}>
              Opens a routed form to mirror the existing create/edit flow while keeping labels and status options.
            </p>
          </div>
          <button className="button" type="button" onClick={onCreate}>
            New Invoice
          </button>
        </div>
      </section>

      <section className="card">
        <div className="filters" aria-label="Filters">
          <label className="field">
            <span>Search</span>
            <input
              className="input"
              type="search"
              placeholder="Invoice number, client, notes"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              className="select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as InvoiceStatus | '')
                setPage(1)
              }}
            >
              <option value="">All</option>
              {invoiceStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Date from</span>
            <input
              className="input"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPage(1)
              }}
            />
          </label>
          <label className="field">
            <span>Date to</span>
            <input
              className="input"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setPage(1)
              }}
            />
          </label>
          <label className="field">
            <span>Sort</span>
            <select
              className="select"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setPage(1)
              }}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="totals" aria-label="Summary totals">
        <div className="total-card">
          <h3>VAT Collected</h3>
          <strong>{formatCurrency(totals.vat)}</strong>
        </div>
        <div className="total-card">
          <h3>Paid</h3>
          <strong>{formatCurrency(totals.paid)}</strong>
        </div>
        <div className="total-card">
          <h3>Open</h3>
          <strong>{formatCurrency(totals.open)}</strong>
        </div>
      </section>

      <section className="card" aria-label="Invoices table">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>
              {totalCount} invoice{totalCount === 1 ? '' : 's'}
            </strong>
            {loading && <span className="badge">Loading...</span>}
          </div>
          <span style={{ fontSize: 12, color: '#607080' }}>
            Pagination and inline actions now wired to API data
          </span>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <table className="table" role="grid">
          <thead>
            <tr>
              <th>#</th>
              <th>Client</th>
              <th>Date</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.number}</td>
                <td>{invoice.client}</td>
                <td>{invoice.date}</td>
                <td>
                  <span className="badge">{invoice.status}</span>
                </td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(invoice.total)}</td>
                <td style={{ textAlign: 'right' }}>
                  <div className="row-actions">
                    <button className="link-button" type="button" onClick={() => onEdit(invoice)}>
                      Edit
                    </button>
                    <button className="link-button danger" type="button" onClick={() => onDelete(invoice.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination" aria-label="Pagination">
          <button
            className="button secondary"
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
          >
            Previous
          </button>
          <span className="page-indicator">
            Page {page} of {pageCount}
          </span>
          <button
            className="button secondary"
            type="button"
            onClick={() => setPage(Math.min(pageCount, page + 1))}
            disabled={page >= pageCount || loading}
          >
            Next
          </button>
        </div>
      </section>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}
