import { apiRequest, getStoredToken } from "@/config/api"
import type { Order, CreateOrderRequest } from "@/types"

/**
 * Orders API
 */

export async function createOrder(data?: CreateOrderRequest): Promise<Order> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<Order>("/api/orders", {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  })
}

export async function getOrderById(id: string): Promise<Order> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  try {
    return await apiRequest<Order>(`/api/orders/${id}`, {
      method: "GET",
    })
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error("Order not found")
    }
    throw error
  }
}

export async function getUserOrders(): Promise<Order[]> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<Order[]>("/api/user/orders", {
    method: "GET",
  })
}
