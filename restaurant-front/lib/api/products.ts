import { apiRequest, getApiUrl } from "@/config/api"
import type { Product, Comment } from "@/types"

/**
 * Products API
 */

export async function getProducts(): Promise<Product[]> {
  return apiRequest<Product[]>("/api/products", {
    method: "GET",
  })
}

export async function searchProducts(query: string): Promise<Product[]> {
  const url = new URL(getApiUrl("/api/products/search"))
  url.searchParams.append("query", query)
  
  // Extract the path with query params
  const endpoint = url.pathname + url.search
  
  return apiRequest<Product[]>(endpoint, {
    method: "GET",
  })
}

export async function getProductById(id: string): Promise<Product> {
  try {
    return await apiRequest<Product>(`/api/products/${id}`, {
      method: "GET",
    })
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error("Product not found")
    }
    throw error
  }
}

export async function getProductComments(productId: string): Promise<Comment[]> {
  return apiRequest<Comment[]>(`/api/products/${productId}/comments`, {
    method: "GET",
  })
}

