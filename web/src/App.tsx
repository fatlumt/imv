import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { fetchInvoices, exportInvoicesUrl, login } from './api.ts';
import { Invoice, InvoiceStatus } from './types.ts';
import { formatCurrency, matchesFilters, mockInvoices } from './invoiceUtils.ts';

const statusOptions: InvoiceStatus[] = ['paid', 'unpaid', 'overdue', 'cancelled'];
const sortOptions = [
  { value: 'date_desc', label: 'Date (newest)' },
  { value: 'date_asc', label: 'Date (oldest)' },
  { value: 'amount_desc', label: 'Amount (high to low)' },
  { value: 'amount_asc', label: 'Amount (low to high)' },
];

export default function App() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InvoiceStatus | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState(sortOptions[0].value);
  const [token, setToken] = useState<string | null>(localStorage.getItem('jwt'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvoices(mockInvoices)
      return
    }

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchInvoices(token, { search, status, fromDate, toDate, sort })
        setInvoices(data)
      } catch (err: any) {
        setError(err?.message || 'Unable to load invoices')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [fromDate, search, sort, status, toDate, token])

  const filtered = useMemo(() => {
    const base = invoices.filter((invoice) => matchesFilters(invoice, { search, status, fromDate, toDate }))

    return base.sort((a, b) => {
      switch (sort) {
        case 'date_asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount_desc':
          return b.total - a.total;
        case 'amount_asc':
          return a.total - b.total;
        case 'date_desc':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
  }, [fromDate, search, sort, status, toDate]);

  const vatTotal = filtered.reduce((sum, inv) => sum + inv.vat, 0);
  const paidTotal = filtered.reduce((sum, inv) => sum + (inv.status === 'paid' ? inv.total : 0), 0);
  const unpaidTotal = filtered.reduce((sum, inv) => sum + (inv.status !== 'paid' ? inv.total : 0), 0);

  const handleExport = () => {
    if (!token) return
    const exportUrl = exportInvoicesUrl(token, { search, status, fromDate, toDate, sort })
    window.location.href = exportUrl
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      const result = await login(email, password)
      localStorage.setItem('jwt', result.token)
      setToken(result.token)
    } catch (err: any) {
      setError(err?.message || 'Login failed')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('jwt')
    setToken(null)
    setInvoices(mockInvoices)
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div>
          <p className="badge">Step 5 · Frontend wiring</p>
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
              <button className="button" type="submit">
                Login & load invoices
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="filters" aria-label="Filters">
          <label className="field">
            <span>Search</span>
            <input
              className="input"
              type="search"
              placeholder="Invoice number, client, notes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus | '')}>
              <option value="">All</option>
              {statusOptions.map((option) => (
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
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Date to</span>
            <input
              className="input"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Sort</span>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
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
          <strong>{formatCurrency(vatTotal)}</strong>
        </div>
        <div className="total-card">
          <h3>Paid</h3>
          <strong>{formatCurrency(paidTotal)}</strong>
        </div>
        <div className="total-card">
          <h3>Open</h3>
          <strong>{formatCurrency(unpaidTotal)}</strong>
        </div>
      </section>

      <section className="card" aria-label="Invoices table">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>{filtered.length} invoices</strong>
            {loading && <span className="badge">Loading...</span>}
          </div>
          <span style={{ fontSize: 12, color: '#607080' }}>
            Pagination and inline actions to be wired to API
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
            </tr>
          </thead>
          <tbody>
            {filtered.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.number}</td>
                <td>{invoice.client}</td>
                <td>{invoice.date}</td>
                <td>
                  <span className="badge">{invoice.status}</span>
                </td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(invoice.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
