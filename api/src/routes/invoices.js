import { pool } from '../db.js'
import { requireAuth } from '../authMiddleware.js'

export const invoiceRouter = (router) => {
  router.get('/invoices', requireAuth, async (req, res) => {
    const { search = '', from, to, paid } = req.query
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
    const sql = `SELECT id, invoice_number, customer_name, project_name, invoice_date, total, paid FROM invoices ${where} ORDER BY invoice_date DESC LIMIT 200`

    try {
      const [rows] = await pool.execute(sql, params)
      return res.json(rows)
    } catch (error) {
      return res.status(500).json({ message: 'Failed to load invoices', error: error.message })
    }
  })

  router.get('/invoices/export', requireAuth, async (req, res) => {
    const { search = '', from, to, paid } = req.query
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
    const sql = `SELECT invoice_number, customer_name, project_name, invoice_date, total, paid FROM invoices ${where} ORDER BY invoice_date DESC LIMIT 2000`

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

  router.post('/invoices', requireAuth, async (req, res) => {
    const { invoice_number, customer_name, project_name, invoice_date, total = 0, paid = false } = req.body

    if (!invoice_number || !customer_name || !invoice_date) {
      return res.status(400).json({ message: 'invoice_number, customer_name, and invoice_date are required' })
    }

    try {
      const [result] = await pool.execute(
        'INSERT INTO invoices (invoice_number, customer_name, project_name, invoice_date, total, paid) VALUES (?, ?, ?, ?, ?, ?)',
        [invoice_number, customer_name, project_name || '', invoice_date, Number(total), paid ? 1 : 0]
      )

      const [rows] = await pool.execute(
        'SELECT id, invoice_number, customer_name, project_name, invoice_date, total, paid FROM invoices WHERE id = ?',
        [result.insertId]
      )

      return res.status(201).json(rows[0])
    } catch (error) {
      return res.status(500).json({ message: 'Failed to create invoice', error: error.message })
    }
  })

  router.put('/invoices/:id', requireAuth, async (req, res) => {
    const { id } = req.params
    const { invoice_number, customer_name, project_name, invoice_date, total, paid } = req.body

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
        [invoice_number, customer_name, project_name, invoice_date, total, typeof paid === 'boolean' ? (paid ? 1 : 0) : null, id]
      )

      const [rows] = await pool.execute(
        'SELECT id, invoice_number, customer_name, project_name, invoice_date, total, paid FROM invoices WHERE id = ?',
        [id]
      )

      return res.json(rows[0])
    } catch (error) {
      return res.status(500).json({ message: 'Failed to update invoice', error: error.message })
    }
  })
}
