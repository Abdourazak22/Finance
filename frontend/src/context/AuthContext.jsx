import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api/services'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      authAPI.profile()
        .then(res => setUser(res.data))
        .catch(() => localStorage.clear())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])
/* useEffect(() => {
        setUser({nom:'Cheick', email:'cheick@gmail.com'})
        setLoading(false)
    },[])*/

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password })
    localStorage.setItem('access_token', res.data.access)
    localStorage.setItem('refresh_token', res.data.refresh)
    const profile = await authAPI.profile()
    setUser(profile.data)
    return profile.data
  }

  const register = async (data) => {
    const res = await authAPI.register(data)
    localStorage.setItem('access_token', res.data.tokens.access)
    localStorage.setItem('refresh_token', res.data.tokens.refresh)
    setUser(res.data.user)
    return res.data.user
  }

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token')
      await authAPI.logout(refresh)
    } catch {}
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
