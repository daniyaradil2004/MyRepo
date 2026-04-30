"use client"

import { useState, useEffect } from "react"
import { LogOut, Settings, MapPin, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Navigation from "@/components/navigation"
import ProtectedRoute from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { getUserProfile, updateUserProfile, type UpdateProfileRequest } from "@/lib/api/user"
import { getUserOrders } from "@/lib/api/orders"
import { getUserComments, updateComment, deleteComment } from "@/lib/api/comments"
import { getProductById } from "@/lib/api/products"
import { getUserFavorites } from "@/lib/api/favorites"
import type { User, Order, Comment } from "@/types"
import { useRouter, useSearchParams } from "next/navigation"
import { Edit, Trash2, Star } from "lucide-react"

interface CommentWithProduct extends Comment {
  product?: { name: string; id: string }
}

export default function ProfilePage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(tabParam || "overview")
  const [isEditing, setIsEditing] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [comments, setComments] = useState<CommentWithProduct[]>([])
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editComment, setEditComment] = useState({ text: "", rating: 5 })
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { logout, user: authUser } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (tabParam && ["overview", "orders", "comments"].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const [editForm, setEditForm] = useState<UpdateProfileRequest>({
    name: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zip_code: "",
      country: "",
    },
  })

  useEffect(() => {
    // Only load data if user is authenticated
    if (authUser) {
      loadProfile()
      loadOrders()
      loadComments()
      loadFavoritesCount()
    }
  }, [authUser])

  const loadProfile = async () => {
    try {
      const profile = await getUserProfile()
      setUser(profile)
      setEditForm({
        name: profile.name || "",
        phone: profile.phone || "",
        address: profile.address || {
          street: "",
          city: "",
          state: "",
          zip_code: "",
          country: "",
        },
      })
    } catch (err: any) {
      // If authentication fails, clear error and let ProtectedRoute handle redirect
      if (err.message?.includes("Authentication required") || err.status === 401) {
        setError(null)
        return
      }
      setError(err.message || "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async () => {
    try {
      const userOrders = await getUserOrders()
      setOrders(userOrders || [])
    } catch (err: any) {
      // Silently handle auth errors - ProtectedRoute will handle redirect
      if (err.message?.includes("Authentication required") || err.status === 401) {
        setOrders([])
        return
      }
      console.error("Failed to load orders:", err)
      setOrders([])
    }
  }

  const loadComments = async () => {
    try {
      const userComments = await getUserComments()
      if (!userComments || userComments.length === 0) {
        setComments([])
        return
      }
      // Load product names for comments
      const commentsWithProducts = await Promise.all(
        userComments.map(async (comment) => {
          try {
            const product = await getProductById(comment.product_id)
            return { ...comment, product: { name: product.name, id: product.id } }
          } catch {
            return comment
          }
        })
      )
      setComments(commentsWithProducts || [])
    } catch (err: any) {
      // Silently handle auth errors - ProtectedRoute will handle redirect
      if (err.message?.includes("Authentication required") || err.status === 401) {
        setComments([])
        return
      }
      console.error("Failed to load comments:", err)
      setComments([])
    }
  }

  const loadFavoritesCount = async () => {
    try {
      const userFavorites = await getUserFavorites()
      setFavoritesCount(userFavorites?.length || 0)
    } catch (err: any) {
      // Silently handle auth errors - ProtectedRoute will handle redirect
      if (err.message?.includes("Authentication required") || err.status === 401) {
        setFavoritesCount(0)
        return
      }
      console.error("Failed to load favorites count:", err)
      setFavoritesCount(0)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editComment.text.trim()) {
      setError("Please enter a comment")
      return
    }

    try {
      setSubmittingComment(true)
      setError(null)
      await updateComment(commentId, {
        text: editComment.text,
        rating: editComment.rating,
      })
      
      // Update comment in local state
      setComments(comments.map(c => 
        c.id === commentId 
          ? { ...c, text: editComment.text, rating: editComment.rating }
          : c
      ))
      setEditingCommentId(null)
      setEditComment({ text: "", rating: 5 })
    } catch (err: any) {
      setError(err.message || "Failed to update comment")
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) {
      return
    }

    try {
      setDeletingCommentId(commentId)
      setError(null)
      await deleteComment(commentId)
      
      // Remove comment from local state
      setComments(comments.filter(c => c.id !== commentId))
      // Update favorites count if needed (reload to be safe)
      await loadFavoritesCount()
    } catch (err: any) {
      setError(err.message || "Failed to delete comment")
    } finally {
      setDeletingCommentId(null)
    }
  }

  const startEditing = (comment: CommentWithProduct) => {
    setEditingCommentId(comment.id)
    setEditComment({ text: comment.text, rating: comment.rating })
  }

  const cancelEditing = () => {
    setEditingCommentId(null)
    setEditComment({ text: "", rating: 5 })
  }

  const validatePhone = (phone: string): string | null => {
    if (phone && phone.trim() !== "") {
      // Phone must be 11 digits and start with 8
      const phoneRegex = /^8\d{10}$/
      if (!phoneRegex.test(phone.trim())) {
        return "Phone number must be 11 digits and start with 8"
      }
    }
    return null
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      
      // Validate phone number if provided
      if (editForm.phone) {
        const phoneError = validatePhone(editForm.phone)
        if (phoneError) {
          setError(phoneError)
          setSaving(false)
          return
        }
      }
      
      const updated = await updateUserProfile(editForm)
      setUser(updated)
      setIsEditing(false)
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navigation cartCount={0} />
          <main className="max-w-6xl mx-auto px-4 py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading profile...</p>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  if (!user) {
    return null
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation cartCount={0} />

        <main className="max-w-6xl mx-auto px-4 py-12">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-8 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{user.name || "User"}</h1>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {isEditing ? "Cancel" : "Edit Profile"}
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <Card className="border-0 shadow-lg mb-8">
              <CardContent className="pt-6">
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
              </CardContent>
            </Card>
          )}

          {/* Edit Profile Form */}
          {isEditing && (
            <Card className="border-0 shadow-lg mb-8">
              <CardHeader>
                <CardTitle>Edit Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Full Name</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Phone</label>
                    <Input
                      type="tel"
                      placeholder="81234567890"
                      value={editForm.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "") // Only allow digits
                        if (value.length <= 11) {
                          setEditForm({ ...editForm, phone: value })
                        }
                      }}
                      className="bg-secondary text-foreground placeholder:text-muted-foreground border-0"
                      maxLength={11}
                    />
                    {editForm.phone && editForm.phone.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Must be 11 digits starting with 8 (e.g., 81234567890)
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Street</label>
                    <Input
                      value={editForm.address?.street || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          address: { ...editForm.address!, street: e.target.value },
                        })
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">City</label>
                    <Input
                      value={editForm.address?.city || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          address: { ...editForm.address!, city: e.target.value },
                        })
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">State</label>
                    <Input
                      value={editForm.address?.state || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          address: { ...editForm.address!, state: e.target.value },
                        })
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Zip Code</label>
                    <Input
                      value={editForm.address?.zip_code || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          address: { ...editForm.address!, zip_code: e.target.value },
                        })
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Country</label>
                    <Input
                      value={editForm.address?.country || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          address: { ...editForm.address!, country: e.target.value },
                        })
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Tabs Section */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-fit bg-secondary">
              <TabsTrigger value="overview">Profile Info</TabsTrigger>
              <TabsTrigger value="orders">Order History</TabsTrigger>
              <TabsTrigger value="comments">My Reviews</TabsTrigger>
            </TabsList>

            {/* Profile Info Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-primary" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Email</p>
                      <p className="text-foreground font-semibold">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Phone</p>
                      <p className="text-foreground font-semibold">{user.phone || "Not provided"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      Delivery Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {user.address && (user.address.street || user.address.city) ? (
                      <p className="text-foreground">
                        {user.address.street && `${user.address.street}, `}
                        {user.address.city && `${user.address.city}, `}
                        {user.address.state && `${user.address.state} `}
                        {user.address.zip_code && `${user.address.zip_code}, `}
                        {user.address.country}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">No address provided</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Account Statistics</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary mb-2">{orders?.length || 0}</p>
                    <p className="text-muted-foreground">Orders Placed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary mb-2">{comments?.length || 0}</p>
                    <p className="text-muted-foreground">Reviews Written</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary mb-2">{favoritesCount}</p>
                    <p className="text-muted-foreground">Favorite Items</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Order History Tab */}
            <TabsContent value="orders" className="space-y-4">
              {!orders || orders.length === 0 ? (
                <Card className="border-0 shadow-lg">
                  <CardContent className="pt-12 pb-12 text-center space-y-4">
                    <h3 className="text-xl font-semibold text-foreground">No orders yet</h3>
                    <p className="text-muted-foreground">Start ordering to see your order history here</p>
                  </CardContent>
                </Card>
              ) : (
                orders.map((order) => (
                  <Card key={order.id} className="border-0 shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-foreground text-lg">Order #{order.id.slice(-8)}</h3>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                order.status === "delivered"
                                  ? "bg-green-100 text-green-700"
                                  : order.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : order.status === "cancelled"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-foreground">
                            {order.items.map((item) => `${item.product_name} (x${item.quantity})`).join(", ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary mb-3">${order.total.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
              )}
              {!comments || comments.length === 0 ? (
                <Card className="border-0 shadow-lg">
                  <CardContent className="pt-12 pb-12 text-center space-y-4">
                    <h3 className="text-xl font-semibold text-foreground">No reviews yet</h3>
                    <p className="text-muted-foreground">Start reviewing products to see them here</p>
                  </CardContent>
                </Card>
              ) : (
                comments.map((comment) => {
                  const isEditing = editingCommentId === comment.id
                  const isOwnComment = authUser && comment.user_id === authUser.id

                  return (
                    <Card key={comment.id} className="border-0 shadow-sm">
                      <CardContent className="pt-6">
                        {isEditing ? (
                          <form onSubmit={(e) => {
                            e.preventDefault()
                            handleEditComment(comment.id)
                          }} className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-foreground block mb-2">
                                Product: {comment.product?.name || "Product"}
                              </label>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-foreground block mb-2">Rating</label>
                              <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setEditComment({ ...editComment, rating: star })}
                                    className="p-1"
                                  >
                                    <Star
                                      className={`w-6 h-6 ${
                                        star <= editComment.rating ? "fill-accent text-accent" : "text-muted"
                                      } cursor-pointer transition`}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-foreground block mb-2">Your Review</label>
                              <textarea
                                placeholder="Tell us more about your experience..."
                                value={editComment.text}
                                onChange={(e) => setEditComment({ ...editComment, text: e.target.value })}
                                className="w-full p-3 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                                rows={4}
                                required
                              />
                            </div>
                            <div className="flex gap-3">
                              <Button type="submit" disabled={submittingComment} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                {submittingComment ? "Saving..." : "Save Changes"}
                              </Button>
                              <Button type="button" onClick={cancelEditing} variant="outline">
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-semibold text-foreground">
                                    {comment.product?.name || "Product"}
                                  </h3>
                                  {isOwnComment && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => startEditing(comment)}
                                        className="p-1 text-primary hover:bg-primary/10 rounded transition"
                                        title="Edit review"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        disabled={deletingCommentId === comment.id}
                                        className="p-1 text-destructive hover:bg-destructive/10 rounded transition"
                                        title="Delete review"
                                      >
                                        {deletingCommentId === comment.id ? (
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>
                                        ) : (
                                          <Trash2 className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-5 h-5 ${i < comment.rating ? "fill-accent text-accent" : "text-muted"}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-foreground text-sm leading-relaxed">{comment.text}</p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ProtectedRoute>
  )
}
