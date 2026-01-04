import { useMemo, useState } from 'react';
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

  const filtered = useMemo(() => {
    const base = mockInvoices.filter((invoice) =>
      matchesFilters(invoice, { search, status, fromDate, toDate })
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
  }, [fromDate, search, sort, status, toDate]);

  const vatTotal = filtered.reduce((sum, inv) => sum + inv.vat, 0);
  const paidTotal = filtered.reduce((sum, inv) => sum + (inv.status === 'paid' ? inv.total : 0), 0);
  const unpaidTotal = filtered.reduce((sum, inv) => sum + (inv.status !== 'paid' ? inv.total : 0), 0);

  const handleExport = () => {
    const params = new URLSearchParams({ search, status, from: fromDate, to: toDate, sort });
    const exportUrl = `/api/invoices/export?${params.toString()}`;
    window.location.href = exportUrl;
  };

  return (
    <div className="app-shell">
      <header className="header">
        <div>
          <p className="badge">Step 4 · Frontend scaffold</p>
          <h1>Invoices Dashboard</h1>
          <p style={{ margin: 0, color: '#5f6a78' }}>
            Responsive SPA preserving current filters, exports, and labels across desktop/mobile.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="button" onClick={handleExport} aria-label="Export CSV">
            Export CSV
          </button>
          <button className="button secondary" disabled>
            New Invoice
          </button>
        </div>
      </header>

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
          <strong>{filtered.length} invoices</strong>
          <span style={{ fontSize: 12, color: '#607080' }}>Pagination and inline actions to be wired to API</span>
        </div>
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
