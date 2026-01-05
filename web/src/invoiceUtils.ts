import { Invoice, InvoiceFilters } from './types.ts';

export const formatCurrency = (value: number) =>
  value.toLocaleString(undefined, { style: 'currency', currency: 'EUR' });

export const matchesFilters = (invoice: Invoice, filters: InvoiceFilters) => {
  const matchesSearch = [invoice.number, invoice.client, invoice.project || '']
    .join(' ')
    .toLowerCase()
    .includes(filters.search.toLowerCase());

  const matchesStatus = filters.status ? invoice.status === filters.status : true;
  const fromOk = filters.fromDate ? new Date(invoice.date) >= new Date(filters.fromDate) : true;
  const toOk = filters.toDate ? new Date(invoice.date) <= new Date(filters.toDate) : true;

  return matchesSearch && matchesStatus && fromOk && toOk;
};

export const summarizeInvoices = (list: Invoice[]) =>
  list.reduce(
    (acc, inv) => {
      acc.vat += inv.vat;
      if (inv.status === 'paid') {
        acc.paid += inv.total;
      } else {
        acc.open += inv.total;
      }
      return acc;
    },
    { vat: 0, paid: 0, open: 0 }
  );

export const mockInvoices: Invoice[] = [
  {
    id: '1',
    number: 'RE-2024-001',
    client: 'Acme GmbH',
    project: 'Website relaunch',
    date: '2024-06-01',
    status: 'paid',
    total: 2490,
    vat: 490,
  },
  {
    id: '2',
    number: 'RE-2024-002',
    client: 'Globex Ltd',
    project: 'Consulting Retainer',
    date: '2024-06-10',
    status: 'unpaid',
    total: 1800,
    vat: 342,
  },
  {
    id: '3',
    number: 'RE-2024-003',
    client: 'Soylent Corp',
    project: 'Operations Audit',
    date: '2024-06-18',
    status: 'overdue',
    total: 990,
    vat: 188,
  },
];
