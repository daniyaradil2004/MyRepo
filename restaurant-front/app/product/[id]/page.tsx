"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ArrowLeft, Heart, ShoppingCart, Star, Send } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Navigation from "@/components/navigation"
import { getProductById, getProductComments } from "@/lib/api/products"
import { createComment, updateComment, deleteComment } from "@/lib/api/comments"
import { addToCart } from "@/lib/api/cart"
import { getCart } from "@/lib/api/cart"
import { addToFavorites, removeFromFavorites, getUserFavorites } from "@/lib/api/favorites"
import { useAuth } from "@/contexts/AuthContext"
import type { Product, Comment } from "@/types"
import Link from "next/link"
import { Edit, Trash2 } from "lucide-react"

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [isFavorite, setIsFavorite] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [newComment, setNewComment] = useState({ text: "", rating: 5 })
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editComment, setEditComment] = useState({ text: "", rating: 5 })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (productId) {
      loadProduct()
      loadComments()
      if (isAuthenticated) {
        loadFavorites()
        loadCartCount()
      }
    }
  }, [productId, isAuthenticated])

  const loadProduct = async () => {
    try {
      setLoading(true)
      const productData = await getProductById(productId)
      setProduct(productData)
    } catch (err: any) {
      setError(err.message || "Failed to load product")
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    try {
      const productComments = await getProductComments(productId)
      setComments(productComments || [])
    } catch (err: any) {
      console.error("Failed to load comments:", err)
      setComments([])
    }
  }

  const loadFavorites = async () => {
    try {
      const favorites = await getUserFavorites()
      setIsFavorite(favorites.some((p) => p.id === productId))
    } catch {
      setIsFavorite(false)
    }
  }

  const loadCartCount = async () => {
    try {
      const cart = await getCart()
      setCartCount(cart.items.reduce((sum, item) => sum + item.quantity, 0))
    } catch {
      setCartCount(0)
    }
  }

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      router.push("/")
      return
    }

    try {
      if (isFavorite) {
        await removeFromFavorites(productId)
        setIsFavorite(false)
      } else {
        await addToFavorites({ product_id: productId })
        setIsFavorite(true)
      }
    } catch (err: any) {
      setError(err.message || "Failed to update favorites")
    }
  }

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      router.push("/")
      return
    }

    try {
      await addToCart({ product_id: productId, quantity: 1 })
      await loadCartCount()
    } catch (err: any) {
      setError(err.message || "Failed to add to cart")
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      router.push("/")
      return
    }

    if (!newComment.text.trim()) {
      setError("Please enter a comment")
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const comment = await createComment({
        product_id: productId,
        text: newComment.text,
        rating: newComment.rating,
      })
      setComments([comment, ...comments])
      setNewComment({ text: "", rating: 5 })
      setShowCommentForm(false)
      
      // Reload product to update rating
      await loadProduct()
    } catch (err: any) {
      setError(err.message || "Failed to submit comment")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editComment.text.trim()) {
      setError("Please enter a comment")
      return
    }

    try {
      setSubmitting(true)
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
      
      // Reload product to update rating
      await loadProduct()
    } catch (err: any) {
      setError(err.message || "Failed to update comment")
    } finally {
      setSubmitting(false)
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
      
      // Reload product to update rating
      await loadProduct()
    } catch (err: any) {
      setError(err.message || "Failed to delete comment")
    } finally {
      setDeletingCommentId(null)
    }
  }

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditComment({ text: comment.text, rating: comment.rating })
    setShowCommentForm(false)
  }

  const cancelEditing = () => {
    setEditingCommentId(null)
    setEditComment({ text: "", rating: 5 })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation cartCount={0} />
        <main className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading product...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation cartCount={0} />
        <main className="max-w-6xl mx-auto px-4 py-12">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-12 pb-12 text-center space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Product not found</h2>
              <Link href="/home">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Back to Menu</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation cartCount={cartCount} />

      <main className="max-w-6xl mx-auto px-4 py-12">
        <Link href="/home" className="flex items-center gap-2 text-primary hover:text-primary/80 font-semibold mb-8">
          <ArrowLeft className="w-5 h-5" />
          Back to Menu
        </Link>

        {error && (
          <Card className="border-0 shadow-lg mb-4">
            <CardContent className="pt-6">
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Product Image */}
          <div className="aspect-square bg-secondary rounded-lg overflow-hidden">
            <img src={product.image || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-2">{product.category}</p>
                <h1 className="text-4xl font-bold text-foreground mb-4">{product.name}</h1>
                <p className="text-lg text-muted-foreground">{product.description}</p>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${i < Math.floor(product.rating) ? "fill-accent text-accent" : "text-muted"}`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold text-foreground">{product.rating.toFixed(1)}</span>
                </div>
                <span className="text-muted-foreground">({product.rating_count} reviews)</span>
              </div>

              <div className="text-4xl font-bold text-primary">${product.price.toFixed(2)}</div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                disabled={!isAuthenticated}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 font-semibold"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
              <Button
                onClick={handleToggleFavorite}
                disabled={!isAuthenticated}
                variant="outline"
                className="w-full h-12 font-semibold"
              >
                <Heart className={`w-5 h-5 mr-2 ${isFavorite ? "fill-destructive text-destructive" : ""}`} />
                {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              </Button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Customer Reviews</h2>
            <p className="text-muted-foreground">See what others think about this dish</p>
          </div>

          {/* Write Review Button */}
          {isAuthenticated && !showCommentForm && (
            <Button
              onClick={() => setShowCommentForm(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Write a Review
            </Button>
          )}

          {/* Review Form */}
          {isAuthenticated && showCommentForm && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Share Your Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitComment} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewComment({ ...newComment, rating: star })}
                          className="p-1"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              star <= newComment.rating ? "fill-accent text-accent" : "text-muted"
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
                      value={newComment.text}
                      onChange={(e) => setNewComment({ ...newComment, text: e.target.value })}
                      className="w-full p-3 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Send className="w-4 h-4 mr-2" />
                      {submitting ? "Submitting..." : "Post Review"}
                    </Button>
                    <Button type="button" onClick={() => setShowCommentForm(false)} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {!comments || comments.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center">No reviews yet. Be the first to review!</p>
                </CardContent>
              </Card>
            ) : (
              comments.map((comment) => {
                const isOwnComment = user && comment.user_id === user.id
                const isEditing = editingCommentId === comment.id

                return (
                  <Card key={comment.id} className="border-0 shadow-sm">
                    <CardContent className="pt-6 space-y-4">
                      {isEditing ? (
                        <form onSubmit={(e) => {
                          e.preventDefault()
                          handleEditComment(comment.id)
                        }} className="space-y-4">
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
                                    className={`w-8 h-8 ${
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
                            <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                              {submitting ? "Saving..." : "Save Changes"}
                            </Button>
                            <Button type="button" onClick={cancelEditing} variant="outline">
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-semibold text-foreground">
                                  {comment.user_name || "Anonymous User"}
                                </p>
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
                              <div className="flex items-center gap-2">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${i < comment.rating ? "fill-accent text-accent" : "text-muted"}`}
                                  />
                                ))}
                                <span className="text-sm text-muted-foreground">
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <p className="text-foreground text-sm leading-relaxed">{comment.text}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
