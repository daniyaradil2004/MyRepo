import { apiRequest, storeToken, storeUser, removeToken, removeUser } from "@/config/api"
import type { LoginRequest, RegisterRequest, LoginResponse } from "@/types"

/**
 * Authentication API
 */

export async function register(data: RegisterRequest): Promise<void> {
  try {
    // Don't store token/user - user needs to login manually after registration
    await apiRequest<LoginResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    })
  } catch (error: any) {
    // Provide more specific error messages
    if (error.message.includes("CORS") || error.message.includes("Network error")) {
      throw new Error(
        "Cannot connect to the server. Please ensure the backend is running and CORS is configured correctly."
      )
    }
    throw error
  }
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  try {
    const result = await apiRequest<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    })
    
    // Store token and user
    storeToken(result.token)
    storeUser(result.user)
    
    return result
  } catch (error: any) {
    // Provide more specific error messages
    if (error.message.includes("CORS") || error.message.includes("Network error")) {
      throw new Error(
        "Cannot connect to the server. Please ensure the backend is running and CORS is configured correctly."
      )
    }
    // Handle authentication errors
    if (error.status === 401) {
      throw new Error("Invalid email or password. Please try again.")
    }
    throw error
  }
}

export function logout(): void {
  removeToken()
  removeUser()
}

