"use client"

import { useState, useEffect } from "react"
import { Search, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import Navigation from "@/components/navigation"
import ProductCard from "@/components/product-card"
import ProtectedRoute from "@/components/ProtectedRoute"
import { getProducts } from "@/lib/api/products"
import { getPersonalizedRecommendations, getCartBasedRecommendations, getMostFrequentByUser, getMostFrequentGlobal, getReviewBasedRecommendations } from "@/lib/api/recommendations"
import { getCart } from "@/lib/api/cart"
import { addToCart } from "@/lib/api/cart"
import { addToFavorites, removeFromFavorites } from "@/lib/api/favorites"
import { getUserFavorites } from "@/lib/api/favorites"
import { useAuth } from "@/contexts/AuthContext"
import type { Product } from "@/types"

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
  const [cartBasedProducts, setCartBasedProducts] = useState<Product[]>([])
  const [mostFrequentByUser, setMostFrequentByUser] = useState<Product[]>([])
  const [mostFrequentGlobal, setMostFrequentGlobal] = useState<Product[]>([])
  const [reviewBasedProducts, setReviewBasedProducts] = useState<Product[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [cartCount, setCartCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [isAuthenticated])

  const loadData = async () => {
    try {
      setLoading(true)
      // Load all products
      const allProducts = await getProducts()
      setProducts(allProducts)

      // Load cart count
      if (isAuthenticated) {
        try {
          const cart = await getCart()
          setCartCount(cart.items.reduce((sum, item) => sum + item.quantity, 0))
        } catch {
          setCartCount(0)
        }

        // Load favorites
        try {
          const userFavorites = await getUserFavorites()
          setFavorites(userFavorites.map((p) => p.id))
        } catch {
          setFavorites([])
        }

        // Load personalized recommendations
        try {
          const personalized = await getPersonalizedRecommendations()
          setRecommendedProducts(personalized || [])
        } catch {
          setRecommendedProducts([])
        }

        // Load cart-based recommendations
        try {
          const cartBased = await getCartBasedRecommendations()
          setCartBasedProducts(cartBased || [])
        } catch {
          setCartBasedProducts([])
        }

        // Load most frequent by user (first recommendation)
        try {
          const mostFrequent = await getMostFrequentByUser()
          setMostFrequentByUser(mostFrequent || [])
        } catch {
          setMostFrequentByUser([])
        }

        // Load most frequent global (second recommendation)
        try {
          const trending = await getMostFrequentGlobal()
          setMostFrequentGlobal(trending || [])
        } catch {
          setMostFrequentGlobal([])
        }

        // Load review-based recommendations (third recommendation)
        try {
          const reviewBased = await getReviewBasedRecommendations()
          setReviewBasedProducts(reviewBased || [])
        } catch {
          setReviewBasedProducts([])
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load products")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = async (productId: string) => {
    if (!isAuthenticated) {
      router.push("/")
      return
    }

    try {
      const isFavorite = favorites.includes(productId)
      if (isFavorite) {
        await removeFromFavorites(productId)
        setFavorites(favorites.filter((id) => id !== productId))
      } else {
        await addToFavorites({ product_id: productId })
        setFavorites([...favorites, productId])
      }
    } catch (err: any) {
      setError(err.message || "Failed to update favorites")
    }
  }

  const handleAddToCart = async (productId: string) => {
    if (!isAuthenticated) {
      router.push("/")
      return
    }

    try {
      await addToCart({ product_id: productId, quantity: 1 })
      // Reload cart count
      const cart = await getCart()
      setCartCount(cart.items.reduce((sum, item) => sum + item.quantity, 0))
    } catch (err: any) {
      setError(err.message || "Failed to add to cart")
    }
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navigation cartCount={0} />
          <main className="max-w-6xl mx-auto px-4 py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading products...</p>
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

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary/10 to-accent/10 py-12 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground text-balance">Welcome to FoodFlow</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Discover amazing dishes, get personalized recommendations, and enjoy seamless ordering.
          </p>
          <div className="flex gap-2 max-w-md">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search dishes, cuisines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 bg-card border-border"
              />
            </div>
            <Button onClick={handleSearch} className="bg-primary hover:bg-primary/90">
              Search
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <section className="py-4 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
          </div>
        </section>
      )}

      {/* Recommendations Section - Three Types in One Row */}
      {isAuthenticated && (mostFrequentByUser.length > 0 || mostFrequentGlobal.length > 0 || reviewBasedProducts.length > 0) && (
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold text-foreground">Recommended for You</h2>
                <p className="text-muted-foreground">Personalized recommendations just for you</p>
              </div>
            </div>

            {/* Three Recommendations in One Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* First Recommendation: Most Frequent By User */}
              {mostFrequentByUser.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Your Most Ordered</h3>
                    <p className="text-xs text-muted-foreground">Based on your order history</p>
                  </div>
                  {mostFrequentByUser.map((product, index) => (
                    <ProductCard
                      key={`user-frequent-${product.id}-${index}`}
                      product={{
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        category: product.category,
                        rating: product.rating,
                        image: product.image,
                        isFavorite: favorites.includes(product.id),
                      }}
                      onToggleFavorite={handleToggleFavorite}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Your Most Ordered</h3>
                    <p className="text-xs text-muted-foreground">Based on your order history</p>
                  </div>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="pt-6 pb-6 text-center">
                      <p className="text-sm text-muted-foreground">No orders yet</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Second Recommendation: Most Frequent Global */}
              {mostFrequentGlobal.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Trending Now</h3>
                    <p className="text-xs text-muted-foreground">Most popular across all users</p>
                  </div>
                  {mostFrequentGlobal.map((product, index) => (
                    <ProductCard
                      key={`global-frequent-${product.id}-${index}`}
                      product={{
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        category: product.category,
                        rating: product.rating,
                        image: product.image,
                        isFavorite: favorites.includes(product.id),
                      }}
                      onToggleFavorite={handleToggleFavorite}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Trending Now</h3>
                    <p className="text-xs text-muted-foreground">Most popular across all users</p>
                  </div>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="pt-6 pb-6 text-center">
                      <p className="text-sm text-muted-foreground">No trending items</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Third Recommendation: Review Based */}
              {reviewBasedProducts.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Your 5-Star Favorites</h3>
                    <p className="text-xs text-muted-foreground">Products you've rated 5 stars</p>
                  </div>
                  {reviewBasedProducts.map((product, index) => (
                    <ProductCard
                      key={`review-based-${product.id}-${index}`}
                      product={{
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        category: product.category,
                        rating: product.rating,
                        image: product.image,
                        isFavorite: favorites.includes(product.id),
                      }}
                      onToggleFavorite={handleToggleFavorite}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Your 5-Star Favorites</h3>
                    <p className="text-xs text-muted-foreground">Products you've rated 5 stars</p>
                  </div>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="pt-6 pb-6 text-center">
                      <p className="text-sm text-muted-foreground">No 5-star reviews yet</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Related Items Section - Based on Cart */}
      {isAuthenticated && cartCount > 0 && cartBasedProducts && cartBasedProducts.length > 0 && (
        <section className="py-12 px-4 bg-secondary/50">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Often Bought Together</h2>
              <p className="text-muted-foreground">Customers who ordered these items also got:</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {cartBasedProducts.map((product, index) => (
                <ProductCard
                  key={`cart-based-${product.id}-${index}`}
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    category: product.category,
                    rating: product.rating,
                    image: product.image,
                    isFavorite: favorites.includes(product.id),
                  }}
                  onToggleFavorite={handleToggleFavorite}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Products Section */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Our Complete Menu</h2>
          {filteredProducts.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-12 pb-12 text-center space-y-4">
                <h3 className="text-xl font-semibold text-foreground">No products found</h3>
                <p className="text-muted-foreground">Try adjusting your search</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    category: product.category,
                    rating: product.rating,
                    image: product.image,
                    isFavorite: favorites.includes(product.id),
                  }}
                  onToggleFavorite={handleToggleFavorite}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Restaurant Info Section */}
      <section className="py-12 px-4 bg-gradient-to-r from-primary/5 to-accent/5 mt-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-3xl">⏱️</span>
                </div>
                <h3 className="text-xl font-bold text-foreground">Fast Delivery</h3>
                <p className="text-muted-foreground">Average delivery time of 30-45 minutes</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-3xl">🌟</span>
                </div>
                <h3 className="text-xl font-bold text-foreground">Quality Assured</h3>
                <p className="text-muted-foreground">Fresh ingredients and expert chefs</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-3xl">🎁</span>
                </div>
                <h3 className="text-xl font-bold text-foreground">Loyalty Rewards</h3>
                <p className="text-muted-foreground">Earn points with every order</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-lg mt-8">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <h3 className="text-2xl font-bold text-foreground">About FoodFlow Restaurant</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Welcome to FoodFlow, where culinary excellence meets modern convenience. Since 2020, we've been serving
                the community with authentic, delicious dishes prepared by our award-winning chefs. From traditional
                Italian pasta to Asian fusion, we pride ourselves on using only the finest ingredients and innovative
                cooking techniques. Our AI-powered recommendation system learns your preferences to suggest dishes
                you'll love. Whether you're a regular or trying us for the first time, we're committed to delivering an
                exceptional dining experience to your doorstep.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
      </div>
    </ProtectedRoute>
  )
}

