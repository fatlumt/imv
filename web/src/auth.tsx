import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { login as apiLogin } from './api'

interface AuthContextValue {
  token: string | null
  login: (email: string, password: string) => Promise<string>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('jwt')
    if (stored) {
      setToken(stored)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password)
    localStorage.setItem('jwt', result.token)
    setToken(result.token)
    return result.token as string
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('jwt')
    setToken(null)
  }, [])

  const value = useMemo(() => ({ token, login, logout }), [login, logout, token])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
