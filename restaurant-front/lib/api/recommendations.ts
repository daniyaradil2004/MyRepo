import { apiRequest, getStoredToken } from "@/config/api"
import type { Product } from "@/types"

/**
 * Recommendations API
 */

export async function getPersonalizedRecommendations(): Promise<Product[]> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<Product[]>("/api/recommendations/personalized", {
    method: "GET",
  })
}

export async function getCartBasedRecommendations(): Promise<Product[]> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<Product[]>("/api/recommendations/cart", {
    method: "GET",
  })
}

export async function getMostFrequentByUser(): Promise<Product[]> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<Product[]>("/api/recommendations/mostfrequent", {
    method: "GET",
  })
}

export async function getMostFrequentGlobal(): Promise<Product[]> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<Product[]>("/api/recommendations/trending", {
    method: "GET",
  })
}

export async function getReviewBasedRecommendations(): Promise<Product[]> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<Product[]>("/api/recommendations/reviewbased", {
    method: "GET",
  })
}