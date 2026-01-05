import { useState, type FormEvent } from 'react'
import { invoiceStatusOptions, type Invoice, type InvoiceStatus } from '../types'

export interface InvoiceFormValues {
  number: string
  client: string
  project: string
  date: string
  status: InvoiceStatus
  total: number
}

interface InvoiceFormProps {
  heading: string
  onSubmit: (values: InvoiceFormValues) => Promise<void> | void
  onCancel: () => void
  initialValues?: Partial<Invoice>
  loading?: boolean
}

export function InvoiceForm({ heading, onSubmit, onCancel, initialValues, loading }: InvoiceFormProps) {
  const [values, setValues] = useState<InvoiceFormValues>({
    number: initialValues?.number || '',
    client: initialValues?.client || '',
    project: initialValues?.project || '',
    date: initialValues?.date || new Date().toISOString().slice(0, 10),
    status: initialValues?.status || 'unpaid',
    total: initialValues?.total || 0,
  })

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await onSubmit(values)
  }

  return (
    <form className="invoice-form" onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px' }}>{heading}</h2>
          <p style={{ margin: 0, color: '#607080', fontSize: 13 }}>
            Keeps the same labels and status options as the existing create/edit flow.
          </p>
        </div>
      </div>
      <div className="form-grid" style={{ marginTop: 16 }}>
        <label className="field">
          <span>Invoice number</span>
          <input
            className="input"
            value={values.number}
            onChange={(e) => setValues((v) => ({ ...v, number: e.target.value }))}
            required
            placeholder="RE-2024-010"
          />
        </label>
        <label className="field">
          <span>Client</span>
          <input
            className="input"
            value={values.client}
            onChange={(e) => setValues((v) => ({ ...v, client: e.target.value }))}
            required
            placeholder="Client name"
          />
        </label>
        <label className="field">
          <span>Project (optional)</span>
          <input
            className="input"
            value={values.project}
            onChange={(e) => setValues((v) => ({ ...v, project: e.target.value }))}
            placeholder="Project or work description"
          />
        </label>
        <label className="field">
          <span>Date</span>
          <input
            className="input"
            type="date"
            value={values.date}
            onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
            required
          />
        </label>
        <label className="field">
          <span>Status</span>
          <select
            className="select"
            value={values.status}
            onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as InvoiceStatus }))}
          >
            {invoiceStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Total</span>
          <input
            className="input"
            type="number"
            min={0}
            step={0.01}
            value={values.total}
            onChange={(e) => setValues((v) => ({ ...v, total: Number(e.target.value) }))}
            required
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 16 }}>
        <button className="button secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="button" type="submit" disabled={loading}>
          Save invoice
        </button>
      </div>
    </form>
  )
}
