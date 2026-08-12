'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthUser } from '@/lib/types'
import { getCurrentUser, logoutUser } from '@/lib/api'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  loading: boolean
  setSession: (user: AuthUser, token: string) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const TOKEN_KEY = 'lunaguard.auth.token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const saved = window.localStorage.getItem(TOKEN_KEY)
    if (!saved) {
      setLoading(false)
      return () => {
        active = false
      }
    }

    setToken(saved)
    void getCurrentUser(saved)
      .then(nextUser => {
        if (active) setUser(nextUser)
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY)
        if (active) {
          setToken(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const setSession = useCallback((nextUser: AuthUser, nextToken: string) => {
    window.localStorage.setItem(TOKEN_KEY, nextToken)
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      if (token) await logoutUser(token)
    } finally {
      window.localStorage.removeItem(TOKEN_KEY)
      setToken(null)
      setUser(null)
    }
  }, [token])

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, setSession, logout }),
    [user, token, loading, setSession, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
