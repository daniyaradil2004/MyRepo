import { apiRequest, getStoredToken } from "@/config/api"
import type { Cart, AddToCartRequest, UpdateCartItemRequest } from "@/types"

/**
 * Cart API
 */

export async function getCart(): Promise<Cart> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<Cart>("/api/cart", {
    method: "GET",
  })
}

export async function addToCart(data: AddToCartRequest): Promise<{ status: string }> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<{ status: string }>("/api/cart/items", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateCartItem(productId: string, data: UpdateCartItemRequest): Promise<{ status: string }> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<{ status: string }>(`/api/cart/items/${productId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function removeCartItem(productId: string): Promise<{ status: string }> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<{ status: string }>(`/api/cart/items/${productId}`, {
    method: "DELETE",
  })
}

export async function clearCart(): Promise<{ status: string }> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<{ status: string }>("/api/cart/clear", {
    method: "DELETE",
  })
}

export async function createOrder(): Promise<any> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<any>("/api/orders", {
    method: "POST",
  })
}
