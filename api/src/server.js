import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { authRouter } from './routes/auth.js'
import { invoiceRouter } from './routes/invoices.js'

dotenv.config()

const { PORT = 4000 } = process.env

const app = express()
app.use(cors())
app.use(express.json())

const router = express.Router()
authRouter(router)
invoiceRouter(router)
app.use('/api', router)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${PORT}`)
})
