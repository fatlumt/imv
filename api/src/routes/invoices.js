import { pool } from '../db.js'
import { requireAuth } from '../authMiddleware.js'

const allowedStatuses = ['paid', 'unpaid']

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true'
  return false
}

const validateInvoicePayload = (payload, { partial = false } = {}) => {
  const errors = []

  const safeNumber = payload.invoice_number?.toString().trim()
  const safeCustomer = payload.customer_name?.toString().trim()
  const safeProject = payload.project_name?.toString().trim() || ''
  const safeDate = payload.invoice_date?.toString()
  const safeTotal = Number(payload.total)
  const safePaid = parseBoolean(payload.paid)

  if (!partial || safeNumber) {
    if (!safeNumber) errors.push('invoice_number is required')
    if (safeNumber && safeNumber.length > 64) errors.push('invoice_number must be 64 characters or fewer')
  }

  if (!partial || safeCustomer) {
    if (!safeCustomer) errors.push('customer_name is required')
    if (safeCustomer && safeCustomer.length > 120) errors.push('customer_name must be 120 characters or fewer')
  }

  if (safeProject.length > 200) {
    errors.push('project_name must be 200 characters or fewer')
  }

  if (!partial || safeDate) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (!safeDate || !datePattern.test(safeDate)) {
      errors.push('invoice_date must be YYYY-MM-DD')
    }
  }

  if (!partial || !Number.isNaN(safeTotal)) {
    if (Number.isNaN(safeTotal)) {
      errors.push('total must be a number')
    } else if (safeTotal < 0) {
      errors.push('total cannot be negative')
    }
  }

  if (payload.status && !allowedStatuses.includes(payload.status)) {
    errors.push('status must be paid or unpaid')
  }

  return {
    errors,
    data: {
      invoice_number: safeNumber,
      customer_name: safeCustomer,
      project_name: safeProject,
      invoice_date: safeDate,
      total: Number.isNaN(safeTotal) ? undefined : safeTotal,
      paid: safePaid
    }
  }
}

export const invoiceRouter = (router) => {
  router.get('/invoices', requireAuth, async (req, res) => {
    const { search = '', from, to, paid, page = 1, pageSize = 20, sort = 'date_desc' } = req.query
    const currentPage = Math.max(parseInt(page, 10) || 1, 1)
    const size = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100)
    const offset = (currentPage - 1) * size
    const clauses = []
    const params = []

    if (search) {
      clauses.push('(customer_name LIKE ? OR invoice_number LIKE ? OR project_name LIKE ?)')
      const term = `%${search}%`
      params.push(term, term, term)
    }

    if (from) {
      clauses.push('invoice_date >= ?')
      params.push(from)
    }

    if (to) {
      clauses.push('invoice_date <= ?')
      params.push(to)
    }

    if (paid !== undefined) {
      clauses.push('paid = ?')
      params.push(paid === 'true' ? 1 : 0)
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

    const sortClause = (() => {
      switch (sort) {
        case 'date_asc':
          return 'ORDER BY invoice_date ASC'
        case 'amount_desc':
          return 'ORDER BY total DESC'
        case 'amount_asc':
          return 'ORDER BY total ASC'
        case 'date_desc':
        default:
          return 'ORDER BY invoice_date DESC'
      }
    })()

    const baseQuery = `FROM invoices ${where}`
    const dataSql = `SELECT id, invoice_number, customer_name, project_name, invoice_date, total, paid, (total * 0.19) AS vat ${baseQuery} ${sortClause} LIMIT ? OFFSET ?`
    const countSql = `SELECT COUNT(*) as totalCount, SUM(total) as totalAmount, SUM(total * 0.19) as vatAmount, SUM(CASE WHEN paid = 1 THEN total ELSE 0 END) as paidAmount ${baseQuery}`

    try {
      const [rows] = await pool.execute(dataSql, [...params, size, offset])
      const [aggregate] = await pool.execute(countSql, params)
      const { totalCount = 0, totalAmount = 0, vatAmount = 0, paidAmount = 0 } = aggregate[0] || {}

      return res.json({
        items: rows,
        page: currentPage,
        pageSize: size,
        totalCount,
        totals: {
          vat: Number(vatAmount) || 0,
          paid: Number(paidAmount) || 0,
          open: Number(totalAmount || 0) - Number(paidAmount || 0)
        }
      })
    } catch (error) {
      return res.status(500).json({ message: 'Failed to load invoices', error: error.message })
    }
  })

  router.get('/invoices/:id', requireAuth, async (req, res) => {
    const { id } = req.params

    try {
      const [rows] = await pool.execute(
        'SELECT id, invoice_number, customer_name, project_name, invoice_date, total, paid, (total * 0.19) AS vat FROM invoices WHERE id = ? LIMIT 1',
        [id]
      )

      if (!rows.length) {
        return res.status(404).json({ message: 'Invoice not found' })
      }

      return res.json(rows[0])
    } catch (error) {
      return res.status(500).json({ message: 'Failed to load invoice', error: error.message })
    }
  })

  router.get('/invoices/export', requireAuth, async (req, res) => {
    const { search = '', from, to, paid, sort = 'date_desc' } = req.query
    const clauses = []
    const params = []

    if (search) {
      clauses.push('(customer_name LIKE ? OR invoice_number LIKE ? OR project_name LIKE ?)')
      const term = `%${search}%`
      params.push(term, term, term)
    }

    if (from) {
      clauses.push('invoice_date >= ?')
      params.push(from)
    }

    if (to) {
      clauses.push('invoice_date <= ?')
      params.push(to)
    }

    if (paid !== undefined) {
      clauses.push('paid = ?')
      params.push(paid === 'true' ? 1 : 0)
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const sortClause = (() => {
      switch (sort) {
        case 'date_asc':
          return 'ORDER BY invoice_date ASC'
        case 'amount_desc':
          return 'ORDER BY total DESC'
        case 'amount_asc':
          return 'ORDER BY total ASC'
        case 'date_desc':
        default:
          return 'ORDER BY invoice_date DESC'
      }
    })()

    const sql = `SELECT invoice_number, customer_name, project_name, invoice_date, total, paid FROM invoices ${where} ${sortClause} LIMIT 2000`

    try {
      const [rows] = await pool.execute(sql, params)
      const headers = ['invoice_number', 'customer_name', 'project_name', 'invoice_date', 'total', 'paid']
      const csvRows = [headers.join(',')]

      rows.forEach((row) => {
        const values = headers.map((key) => {
          const value = row[key]
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })

        csvRows.push(values.join(','))
      })

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"')
      return res.status(200).send(csvRows.join('\n'))
    } catch (error) {
      return res.status(500).json({ message: 'Failed to export invoices', error: error.message })
    }
  })

  router.delete('/invoices/:id', requireAuth, async (req, res) => {
    const { id } = req.params

    try {
      const [existing] = await pool.execute('SELECT id FROM invoices WHERE id = ? LIMIT 1', [id])
      if (!existing.length) {
        return res.status(404).json({ message: 'Invoice not found' })
      }

      await pool.execute('DELETE FROM invoices WHERE id = ?', [id])
      return res.status(204).send()
    } catch (error) {
      return res.status(500).json({ message: 'Failed to delete invoice', error: error.message })
    }
  })

  router.post('/invoices', requireAuth, async (req, res) => {
    const { errors, data } = validateInvoicePayload(req.body)

    if (errors.length) {
      return res.status(400).json({ message: errors.join(', ') })
    }

    try {
      const [result] = await pool.execute(
        'INSERT INTO invoices (invoice_number, customer_name, project_name, invoice_date, total, paid) VALUES (?, ?, ?, ?, ?, ?)',
        [data.invoice_number, data.customer_name, data.project_name || '', data.invoice_date, Number(data.total) || 0, data.paid ? 1 : 0]
      )

      const [rows] = await pool.execute(
        'SELECT id, invoice_number, customer_name, project_name, invoice_date, total, paid, (total * 0.19) AS vat FROM invoices WHERE id = ?',
        [result.insertId]
      )

      return res.status(201).json(rows[0])
    } catch (error) {
      return res.status(500).json({ message: 'Failed to create invoice', error: error.message })
    }
  })

  router.put('/invoices/:id', requireAuth, async (req, res) => {
    const { id } = req.params
    const { errors, data } = validateInvoicePayload(req.body, { partial: true })

    if (errors.length) {
      return res.status(400).json({ message: errors.join(', ') })
    }

    try {
      const [existing] = await pool.execute(
        'SELECT id FROM invoices WHERE id = ? LIMIT 1',
        [id]
      )

      if (!existing.length) {
        return res.status(404).json({ message: 'Invoice not found' })
      }

      await pool.execute(
        'UPDATE invoices SET invoice_number = COALESCE(?, invoice_number), customer_name = COALESCE(?, customer_name), project_name = COALESCE(?, project_name), invoice_date = COALESCE(?, invoice_date), total = COALESCE(?, total), paid = COALESCE(?, paid) WHERE id = ?',
        [data.invoice_number, data.customer_name, data.project_name, data.invoice_date, data.total, typeof data.paid === 'boolean' ? (data.paid ? 1 : 0) : null, id]
      )

      const [rows] = await pool.execute(
        'SELECT id, invoice_number, customer_name, project_name, invoice_date, total, paid, (total * 0.19) AS vat FROM invoices WHERE id = ?',
        [id]
      )

      return res.json(rows[0])
    } catch (error) {
      return res.status(500).json({ message: 'Failed to update invoice', error: error.message })
    }
  })
}
