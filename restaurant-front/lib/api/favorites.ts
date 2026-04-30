import { apiRequest, getStoredToken } from "@/config/api"
import type { Product, AddFavoriteRequest } from "@/types"

/**
 * Favorites API
 */

export async function getUserFavorites(): Promise<Product[]> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<Product[]>("/api/user/favorites", {
    method: "GET",
  })
}

export async function addToFavorites(data: AddFavoriteRequest): Promise<{ status: string }> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  try {
    return await apiRequest<{ status: string }>("/api/favorites", {
      method: "POST",
      body: JSON.stringify(data),
    })
  } catch (error: any) {
    if (error.status === 409) {
      throw new Error("Product already in favorites")
    }
    throw error
  }
}

export async function removeFromFavorites(productId: string): Promise<{ status: string }> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  try {
    return await apiRequest<{ status: string }>(`/api/favorites/${productId}`, {
      method: "DELETE",
    })
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error("Product not in favorites")
    }
    throw error
  }
}
