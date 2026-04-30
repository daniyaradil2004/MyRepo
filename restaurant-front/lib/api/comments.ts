import { apiRequest, getStoredToken } from "@/config/api"
import type { Comment, CreateCommentRequest, UpdateCommentRequest } from "@/types"

/**
 * Comments API
 */

export async function createComment(data: CreateCommentRequest): Promise<Comment> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<Comment>("/api/comments", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateComment(id: string, data: UpdateCommentRequest): Promise<Comment> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  try {
    return await apiRequest<Comment>(`/api/comments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  } catch (error: any) {
    if (error.status === 403) {
      throw new Error("You don't have permission to edit this comment")
    }
    if (error.status === 404) {
      throw new Error("Comment not found")
    }
    throw error
  }
}

export async function deleteComment(id: string): Promise<{ status: string }> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  try {
    return await apiRequest<{ status: string }>(`/api/comments/${id}`, {
      method: "DELETE",
    })
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error("Comment not found")
    }
    throw error
  }
}

export async function getUserComments(): Promise<Comment[]> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Authentication required")
  }

  return apiRequest<Comment[]>("/api/user/comments", {
    method: "GET",
  })
}
