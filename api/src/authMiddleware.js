import jwt from 'jsonwebtoken'

const { JWT_SECRET = '' } = process.env

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const tokenParam = req.query.token
  const token = header.startsWith('Bearer ') ? header.slice(7) : tokenParam

  if (!token) {
    return res.status(401).json({ message: 'Missing authorization token' })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    return next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}
