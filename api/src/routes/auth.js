import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'

const { JWT_SECRET = '' } = process.env

export const authRouter = (router) => {
  router.post('/login', async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    try {
      const [rows] = await pool.execute(
        'SELECT id, email, password AS password_hash FROM users WHERE email = ? LIMIT 1',
        [email]
      )

      const user = rows[0]
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' })
      }

      const passwordMatches = await bcrypt.compare(password, user.password_hash)
      if (!passwordMatches) {
        return res.status(401).json({ message: 'Invalid credentials' })
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: '1h'
      })

      return res.json({ token })
    } catch (error) {
      return res.status(500).json({ message: 'Login failed', error: error.message })
    }
  })
}
