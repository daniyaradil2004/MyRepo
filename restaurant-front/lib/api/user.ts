import { apiRequest, getStoredToken, storeUser } from "@/config/api"
import type { User, Address } from "@/types"

/**
 * User API
 */

export async function getUserProfile(): Promise<User> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<User>("/api/user/profile", {
    method: "GET",
  })
}

export interface UpdateProfileRequest {
  name?: string
  phone?: string
  address?: Address
}

export async function updateUserProfile(data: UpdateProfileRequest): Promise<User> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  const updatedUser = await apiRequest<User>("/api/user/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  })
  
  // Update stored user
  if (typeof window !== "undefined") {
    const currentUser = JSON.parse(localStorage.getItem("auth_user") || "{}")
    storeUser({ ...currentUser, ...updatedUser })
  }
  
  return updatedUser
}
