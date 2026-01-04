import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { deleteInvoice, exportInvoicesUrl, fetchInvoices, login } from './api.ts';
import { Invoice, InvoiceStatus } from './types.ts';
import { formatCurrency, matchesFilters, mockInvoices, summarizeInvoices } from './invoiceUtils.ts';

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
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(mockInvoices.length);
  const [token, setToken] = useState<string | null>(localStorage.getItem('jwt'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [totals, setTotals] = useState(summarizeInvoices(mockInvoices));
  const [loading, setLoading] = useState(false);

  const loadInvoices = useCallback(async () => {
    if (!token) {
      setInvoices(mockInvoices);
      setTotalCount(mockInvoices.length);
      setTotals(summarizeInvoices(mockInvoices));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await fetchInvoices(token, { search, status, fromDate, toDate, sort, page, pageSize });
      setInvoices(data.items);
      setTotalCount(data.totalCount || data.items.length);
      setTotals(data.totals || summarizeInvoices(data.items));
    } catch (err: any) {
      setError(err?.message || 'Unable to load invoices');
    } finally {
      setLoading(false);
    }
  }, [fromDate, page, pageSize, search, sort, status, toDate, token]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const filtered = useMemo(() => {
    if (token) return invoices;

    const base = invoices.filter((invoice) =>
      matchesFilters(invoice, { search, status, fromDate, toDate, sort })
    );

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
  }, [fromDate, invoices, search, sort, status, toDate, token]);

  const derivedTotals = token ? totals : summarizeInvoices(filtered);
  const derivedTotalCount = token ? totalCount : filtered.length;
  const pageCount = Math.max(1, Math.ceil(derivedTotalCount / pageSize));
  const currentPage = Math.min(page, pageCount);
  const displayed = token
    ? filtered
    : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (!token && page !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, page, token]);

  const handleExport = () => {
    if (!token) return;
    const exportUrl = exportInvoicesUrl(token, { search, status, fromDate, toDate, sort, page, pageSize });
    window.location.href = exportUrl;
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const result = await login(email, password);
      localStorage.setItem('jwt', result.token);
      setToken(result.token);
      setPage(1);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    setToken(null);
    setInvoices(mockInvoices);
    setTotals(summarizeInvoices(mockInvoices));
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!token) {
      setError('Login to manage invoices.');
      return;
    }

    const confirmDelete = window.confirm('Delete this invoice? This action cannot be undone.');
    if (!confirmDelete) return;

    setLoading(true);
    setError('');
    try {
      await deleteInvoice(token, id);
      await loadInvoices();
    } catch (err: any) {
      setError(err?.message || 'Unable to delete invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="header">
        <div>
          <p className="badge">Step 6 · Pagination & inline actions</p>
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
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              className="select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as InvoiceStatus | '');
                setPage(1);
              }}
            >
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
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
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
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="field">
            <span>Sort</span>
            <select
              className="select"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
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
          <strong>{formatCurrency(derivedTotals.vat)}</strong>
        </div>
        <div className="total-card">
          <h3>Paid</h3>
          <strong>{formatCurrency(derivedTotals.paid)}</strong>
        </div>
        <div className="total-card">
          <h3>Open</h3>
          <strong>{formatCurrency(derivedTotals.open)}</strong>
        </div>
      </section>

      <section className="card" aria-label="Invoices table">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>
              {derivedTotalCount} invoice{derivedTotalCount === 1 ? '' : 's'}
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
            {displayed.map((invoice) => (
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
                    <button className="link-button" type="button" disabled>
                      Edit
                    </button>
                    <button className="link-button danger" type="button" onClick={() => void handleDelete(invoice.id)}>
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || loading}
          >
            Previous
          </button>
          <span className="page-indicator">
            Page {currentPage} of {pageCount}
          </span>
          <button
            className="button secondary"
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={currentPage >= pageCount || loading}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
