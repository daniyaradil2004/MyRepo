/**
 * API Configuration
 * Centralized configuration for API endpoints and settings
 */

export const API_CONFIG = {
  // Base URL for the backend API
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  
  // API endpoints
  ENDPOINTS: {
    // Authentication
    AUTH: {
      REGISTER: "/api/auth/register",
      LOGIN: "/api/auth/login",
    },
    
    // Products
    PRODUCTS: {
      LIST: "/api/products",
      SEARCH: "/api/products/search",
      BY_ID: (id: string) => `/api/products/${id}`,
      COMMENTS: (productId: string) => `/api/products/${productId}/comments`,
    },
    
    // Favorites
    FAVORITES: {
      ADD: "/api/favorites",
      REMOVE: (productId: string) => `/api/favorites/${productId}`,
      USER_FAVORITES: "/api/user/favorites",
    },
    
    // Cart
    CART: {
      GET: "/api/cart",
      ADD_ITEM: "/api/cart/items",
      UPDATE_ITEM: (productId: string) => `/api/cart/items/${productId}`,
      REMOVE_ITEM: (productId: string) => `/api/cart/items/${productId}`,
      CLEAR: "/api/cart/clear",
    },
    
    // Orders
    ORDERS: {
      CREATE: "/api/orders",
      BY_ID: (id: string) => `/api/orders/${id}`,
      USER_ORDERS: "/api/user/orders",
    },
    
    // Recommendations
    RECOMMENDATIONS: {
      PERSONALIZED: "/api/recommendations/personalized",
      CART_BASED: "/api/recommendations/cart",
    },
    
    // Comments
    COMMENTS: {
      CREATE: "/api/comments",
      UPDATE: (id: string) => `/api/comments/${id}`,
      DELETE: (id: string) => `/api/comments/${id}`,
      USER_COMMENTS: "/api/user/comments",
    },
    
    // User
    USER: {
      PROFILE: "/api/user/profile",
      UPDATE_PROFILE: "/api/user/profile",
    },
  },
  
  // Request configuration
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  
  // Timeout settings
  TIMEOUT: 30000, // 30 seconds
  
  // CORS settings
  // Set to "include" if backend requires cookies/credentials
  // Set to "omit" if backend doesn't need cookies (default)
  CREDENTIALS: "omit" as RequestCredentials,
} as const

/**
 * Universal API request function with CORS and error handling
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(endpoint)
  const token = getStoredToken()

  const defaultHeaders: HeadersInit = {
    ...API_CONFIG.DEFAULT_HEADERS,
    ...(token && getAuthHeader(token)),
    ...options.headers,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)

  try {
    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
      mode: "cors", // Explicitly set CORS mode
      credentials: API_CONFIG.CREDENTIALS, // Configurable credentials
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Handle CORS errors
    if (response.type === "opaque" || response.type === "opaqueredirect") {
      throw new Error(
        "CORS error: Unable to connect to the server. Please check if the backend is running and CORS is properly configured."
      )
    }

    // Handle network errors
    if (!response.ok) {
      // Try to parse error message from response
      let errorMessage = `Request failed with status ${response.status}`
      
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
        
        // Handle specific error cases
        if (response.status === 401) {
          errorMessage = "Authentication required. Please login again."
        } else if (response.status === 403) {
          errorMessage = "You don't have permission to perform this action."
        } else if (response.status === 404) {
          errorMessage = "Resource not found."
        } else if (response.status === 409) {
          errorMessage = errorData.message || "Conflict: Resource already exists."
        } else if (response.status === 500) {
          errorMessage = "Server error. Please try again later."
        }
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage
      }

      const error = new Error(errorMessage)
      ;(error as any).status = response.status
      throw error
    }

    // Parse response
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return await response.json()
    } else {
      return (await response.text()) as unknown as T
    }
  } catch (error: any) {
    clearTimeout(timeoutId)

    // Handle abort (timeout)
    if (error.name === "AbortError") {
      throw new Error("Request timeout. Please check your connection and try again.")
    }

    // Handle network errors (CORS, connection refused, etc.)
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        "Network error: Unable to connect to the server. Please check if the backend is running at " +
        API_CONFIG.BASE_URL +
        " and CORS is properly configured."
      )
    }

    // Re-throw other errors
    throw error
  }
}

/**
 * Get full URL for an endpoint
 */
export function getApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`
}

/**
 * Get authorization header with token
 */
export function getAuthHeader(token: string | null): Record<string, string> {
  if (!token) {
    return {}
  }
  return {
    Authorization: `Bearer ${token}`,
  }
}

/**
 * Get stored token from localStorage
 */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null
  }
  return localStorage.getItem("auth_token")
}

/**
 * Store token in localStorage
 */
export function storeToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", token)
  }
}

/**
 * Remove token from localStorage
 */
export function removeToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token")
  }
}

/**
 * Get stored user from localStorage
 */
export function getStoredUser(): any | null {
  if (typeof window === "undefined") {
    return null
  }
  const userStr = localStorage.getItem("auth_user")
  if (!userStr) {
    return null
  }
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * Store user in localStorage
 */
export function storeUser(user: any): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_user", JSON.stringify(user))
  }
}

/**
 * Remove user from localStorage
 */
export function removeUser(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_user")
  }
}

