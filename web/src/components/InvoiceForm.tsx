import { useState, type FormEvent } from 'react'
import { invoiceStatusOptions, type Invoice, type InvoiceStatus } from '../types'

type InvoiceFormErrors = Partial<Record<keyof InvoiceFormValues, string>>

const validate = (values: InvoiceFormValues): InvoiceFormErrors => {
  const errors: InvoiceFormErrors = {}

  if (!values.number.trim()) {
    errors.number = 'Invoice number is required'
  } else if (values.number.trim().length > 64) {
    errors.number = 'Invoice number must be 64 characters or fewer'
  }

  if (!values.client.trim()) {
    errors.client = 'Client is required'
  } else if (values.client.trim().length > 120) {
    errors.client = 'Client must be 120 characters or fewer'
  }

  if (values.project && values.project.trim().length > 200) {
    errors.project = 'Project must be 200 characters or fewer'
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (!values.date || !datePattern.test(values.date)) {
    errors.date = 'Date must be YYYY-MM-DD'
  }

  if (values.total === undefined || Number.isNaN(Number(values.total))) {
    errors.total = 'Total must be a number'
  } else if (Number(values.total) < 0) {
    errors.total = 'Total cannot be negative'
  }

  if (!values.status) {
    errors.status = 'Status is required'
  }

  return errors
}

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
  const [errors, setErrors] = useState<InvoiceFormErrors>({})

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)

    if (Object.values(nextErrors).filter(Boolean).length) {
      return
    }

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
            onChange={(e) => {
              setValues((v) => ({ ...v, number: e.target.value }))
              setErrors((prev) => ({ ...prev, number: '' }))
            })}
            required
            placeholder="RE-2024-010"
          />
          {errors.number && <span className="field-error">{errors.number}</span>}
        </label>
        <label className="field">
          <span>Client</span>
          <input
            className="input"
            value={values.client}
            onChange={(e) => {
              setValues((v) => ({ ...v, client: e.target.value }))
              setErrors((prev) => ({ ...prev, client: '' }))
            })}
            required
            placeholder="Client name"
          />
          {errors.client && <span className="field-error">{errors.client}</span>}
        </label>
        <label className="field">
          <span>Project (optional)</span>
          <input
            className="input"
            value={values.project}
            onChange={(e) => {
              setValues((v) => ({ ...v, project: e.target.value }))
              setErrors((prev) => ({ ...prev, project: '' }))
            })}
            placeholder="Project or work description"
          />
          {errors.project && <span className="field-error">{errors.project}</span>}
        </label>
        <label className="field">
          <span>Date</span>
          <input
            className="input"
            type="date"
            value={values.date}
            onChange={(e) => {
              setValues((v) => ({ ...v, date: e.target.value }))
              setErrors((prev) => ({ ...prev, date: '' }))
            })}
            required
          />
          {errors.date && <span className="field-error">{errors.date}</span>}
        </label>
        <label className="field">
          <span>Status</span>
          <select
            className="select"
            value={values.status}
            onChange={(e) => {
              setValues((v) => ({ ...v, status: e.target.value as InvoiceStatus }))
              setErrors((prev) => ({ ...prev, status: '' }))
            })}
          >
            {invoiceStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.status && <span className="field-error">{errors.status}</span>}
        </label>
        <label className="field">
          <span>Total</span>
          <input
            className="input"
            type="number"
            min={0}
            step={0.01}
            value={values.total}
            onChange={(e) => {
              setValues((v) => ({ ...v, total: Number(e.target.value) }))
              setErrors((prev) => ({ ...prev, total: '' }))
            })}
            required
          />
          {errors.total && <span className="field-error">{errors.total}</span>}
        </label>
      </div>
      {Object.values(errors).filter(Boolean).length > 0 && (
        <div className="form-error-summary" role="alert">
          Please fix the highlighted fields before saving.
        </div>
      )}
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
