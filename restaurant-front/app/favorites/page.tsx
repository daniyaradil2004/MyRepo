"use client"

import { useState, useEffect } from "react"
import { Heart, ArrowLeft, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Navigation from "@/components/navigation"
import ProtectedRoute from "@/components/ProtectedRoute"
import { getUserFavorites, removeFromFavorites } from "@/lib/api/favorites"
import { addToCart } from "@/lib/api/cart"
import { getCart } from "@/lib/api/cart"
import type { Product } from "@/types"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cartCount, setCartCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    loadFavorites()
    loadCartCount()
  }, [])

  const loadFavorites = async () => {
    try {
      setLoading(true)
      const userFavorites = await getUserFavorites()
      setFavorites(userFavorites || [])
    } catch (err: any) {
      setError(err.message || "Failed to load favorites")
      setFavorites([])
    } finally {
      setLoading(false)
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

  const removeFavorite = async (productId: string) => {
    try {
      await removeFromFavorites(productId)
      setFavorites(favorites.filter((item) => item.id !== productId))
    } catch (err: any) {
      setError(err.message || "Failed to remove favorite")
    }
  }

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCart({ product_id: productId, quantity: 1 })
      await loadCartCount()
    } catch (err: any) {
      setError(err.message || "Failed to add to cart")
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navigation cartCount={0} />
          <main className="max-w-6xl mx-auto px-4 py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading favorites...</p>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation cartCount={cartCount} />

        <main className="max-w-6xl mx-auto px-4 py-12">
          <div className="mb-8">
            <Link href="/home" className="flex items-center gap-2 text-primary hover:text-primary/80 font-semibold mb-4">
              <ArrowLeft className="w-5 h-5" />
              Back to Menu
            </Link>
            <h1 className="text-3xl font-bold text-foreground">My Favorites</h1>
            <p className="text-muted-foreground mt-2">Your saved dishes for quick ordering</p>
          </div>

          {error && (
            <Card className="border-0 shadow-lg mb-4">
              <CardContent className="pt-6">
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
              </CardContent>
            </Card>
          )}

          {!favorites || favorites.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-12 pb-12 text-center space-y-4">
                <Heart className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
                <h2 className="text-2xl font-semibold text-foreground">No favorites yet</h2>
                <p className="text-muted-foreground">Heart your favorite dishes to save them here!</p>
                <Link href="/home">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Browse Menu</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((item) => (
                <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="relative aspect-square bg-secondary overflow-hidden group">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <button
                      onClick={() => removeFavorite(item.id)}
                      className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white rounded-full transition-all"
                    >
                      <Heart className="w-5 h-5 fill-destructive text-destructive" />
                    </button>
                  </div>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">{item.category}</p>
                      <h3 className="font-semibold text-foreground text-lg">{item.name}</h3>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Rating</p>
                        <p className="font-semibold text-foreground">{item.rating.toFixed(1)} ⭐</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Reviews</p>
                        <p className="text-sm text-foreground">{item.rating_count}</p>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4 flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">${item.price.toFixed(2)}</span>
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(item.id)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
