export type InvoiceStatus = 'paid' | 'unpaid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  number: string;
  client: string;
  date: string;
  status: InvoiceStatus;
  total: number;
  vat: number;
}

export interface InvoiceFilters {
  search: string;
  status: InvoiceStatus | '';
  fromDate: string;
  toDate: string;
}
