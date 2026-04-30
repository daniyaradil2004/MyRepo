"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { getStoredToken, getStoredUser, storeToken, storeUser, removeToken, removeUser } from "@/config/api"
import { login as apiLogin, register as apiRegister, logout as apiLogout } from "@/lib/api/auth"
import { getUserProfile } from "@/lib/api/user"
import type { User, LoginRequest, RegisterRequest } from "@/types"

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Validate token on initialization
    const validateAuth = async () => {
      const storedToken = getStoredToken()
      const storedUser = getStoredUser()
      
      if (storedToken && storedUser) {
        try {
          // Validate token by fetching user profile
          const userProfile = await getUserProfile()
          // Token is valid, update user data
          setToken(storedToken)
          setUser(userProfile)
          // Update stored user in case it's outdated
          storeUser(userProfile)
        } catch (error) {
          // Token is invalid, clear auth state
          removeToken()
          removeUser()
          setToken(null)
          setUser(null)
        }
      }
      
      setIsLoading(false)
    }
    
    validateAuth()
  }, [])

  const login = async (data: LoginRequest) => {
    try {
      const response = await apiLogin(data)
      setToken(response.token)
      setUser(response.user)
      storeToken(response.token)
      storeUser(response.user)
    } catch (error) {
      throw error
    }
  }

  const register = async (data: RegisterRequest) => {
    try {
      // Don't auto-login after registration - just register the user
      await apiRegister(data)
      // Don't set token or user - user needs to login manually
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    apiLogout()
    setToken(null)
    setUser(null)
    removeToken()
    removeUser()
  }

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

