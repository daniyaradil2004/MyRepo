"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChefHat } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { login, register, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated (but wait for auth check to complete)
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/home")
    }
  }, [isAuthenticated, isLoading, router])

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters long"
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Password must contain at least one uppercase letter"
    }
    if (!/[a-z]/.test(pwd)) {
      return "Password must contain at least one lowercase letter"
    }
    if (!/[0-9]/.test(pwd)) {
      return "Password must contain at least one number"
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (isLogin) {
        await login({ email, password })
        // Only redirect after successful login
        // Clear form
        setEmail("")
        setPassword("")
        router.push("/home")
      } else {
        if (!name.trim()) {
          setError("Name is required")
          setLoading(false)
          return
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match")
          setLoading(false)
          return
        }
        const passwordError = validatePassword(password)
        if (passwordError) {
          setError(passwordError)
          setLoading(false)
          return
        }
        await register({ name, email, password })
        // After successful registration, show success message and switch to login
        setError(null)
        setSuccess("Registration successful! Please sign in.")
        setIsLogin(true)
        setEmail("")
        setPassword("")
        setConfirmPassword("")
        setName("")
        setLoading(false) // Reset loading state after successful registration
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.")
      setLoading(false)
    }
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't show auth page if already authenticated (will redirect)
  if (isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Brand Section */}
        <div className="hidden md:flex flex-col justify-center items-center space-y-6 p-8">
          <div className="bg-primary rounded-full p-6">
            <ChefHat className="w-16 h-16 text-primary-foreground" />
          </div>
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-foreground">FoodFlow</h1>
            <p className="text-xl text-muted-foreground">Delicious food, delivered with recommendations you'll love</p>
          </div>
          <div className="space-y-4 pt-8 w-full">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Browse Catalog</h3>
                <p className="text-sm text-muted-foreground">Explore our wide selection of delicious dishes</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Smart Recommendations</h3>
                <p className="text-sm text-muted-foreground">Get personalized suggestions based on your taste</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Order & Enjoy</h3>
                <p className="text-sm text-muted-foreground">Track your favorites, reviews, and order history</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Form Section */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-sm border-0 shadow-lg">
            <CardHeader className="space-y-2 text-center pb-6">
              <CardTitle className="text-2xl text-foreground">{isLogin ? "Welcome Back" : "Create Account"}</CardTitle>
              <CardDescription>
                {isLogin ? "Sign in to your account to continue" : "Join us to start ordering"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-green-500/10 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm">
                    {success}
                  </div>
                )}
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Full Name</label>
                    <Input
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-secondary text-foreground placeholder:text-muted-foreground border-0"
                      required={!isLogin}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-secondary text-foreground placeholder:text-muted-foreground border-0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-secondary text-foreground placeholder:text-muted-foreground border-0"
                    required
                    minLength={8}
                  />
                  {!isLogin && password.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Must be 8+ characters with uppercase, lowercase, and numbers
                    </p>
                  )}
                </div>
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Confirm Password</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-secondary text-foreground placeholder:text-muted-foreground border-0"
                      required={!isLogin}
                      minLength={8}
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold mt-6"
                >
                  {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
                </Button>
              </form>

              <div className="mt-6 space-y-4">
                <button
                  onClick={() => {
                    setIsLogin(!isLogin)
                    setError(null)
                    setSuccess(null)
                    setConfirmPassword("")
                    setLoading(false) // Reset loading state when switching forms
                  }}
                  className="w-full text-sm text-primary hover:underline font-medium py-2"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
