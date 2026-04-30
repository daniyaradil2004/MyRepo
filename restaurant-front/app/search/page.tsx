"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Filter, ArrowLeft } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import Navigation from "@/components/navigation"
import ProductCard from "@/components/product-card"
import { searchProducts, getProducts } from "@/lib/api/products"
import { getUserFavorites } from "@/lib/api/favorites"
import { getCart } from "@/lib/api/cart"
import { addToCart } from "@/lib/api/cart"
import { addToFavorites, removeFromFavorites } from "@/lib/api/favorites"
import { useAuth } from "@/contexts/AuthContext"
import type { Product } from "@/types"
import Link from "next/link"

interface FilterOptions {
  categories: string[]
  priceRange: [number, number]
  ratingMin: number
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [showFilters, setShowFilters] = useState(true)
  const [loading, setLoading] = useState(true)
  const [cartCount, setCartCount] = useState(0)
  const { isAuthenticated } = useAuth()

  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    priceRange: [0, 100],
    ratingMin: 0,
  })

  useEffect(() => {
    loadProducts()
    if (isAuthenticated) {
      loadFavorites()
      loadCartCount()
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (searchQuery) {
      performSearch()
    } else {
      setProducts(allProducts || [])
    }
  }, [searchQuery])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const all = await getProducts()
      setAllProducts(all || [])
      setProducts(all || [])
      
      // If there's a search query, perform search
      if (searchQuery) {
        await performSearch()
      }
    } catch (err: any) {
      console.error("Failed to load products:", err)
      setAllProducts([])
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setProducts(allProducts || [])
      return
    }

    try {
      const results = await searchProducts(searchQuery)
      setProducts(results || [])
    } catch (err: any) {
      console.error("Search failed:", err)
      setProducts([])
    }
  }

  const loadFavorites = async () => {
    try {
      const userFavorites = await getUserFavorites()
      setFavorites((userFavorites || []).map((p) => p.id))
    } catch {
      setFavorites([])
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

  const allCategories = useMemo(() => {
    if (!allProducts || allProducts.length === 0) {
      return []
    }
    const categories = new Set(allProducts.map((p) => p.category))
    return Array.from(categories).sort()
  }, [allProducts])

  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) {
      return []
    }
    return products.filter((product) => {
      // Category filter
      const matchesCategory = filters.categories.length === 0 || filters.categories.includes(product.category)

      // Price filter
      const matchesPrice = product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]

      // Rating filter
      const matchesRating = product.rating >= filters.ratingMin

      return matchesCategory && matchesPrice && matchesRating
    })
  }, [products, filters])

  const toggleCategory = (category: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }))
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
      console.error("Failed to update favorites:", err)
    }
  }

  const handleAddToCart = async (productId: string) => {
    if (!isAuthenticated) {
      router.push("/")
      return
    }

    try {
      await addToCart({ product_id: productId, quantity: 1 })
      await loadCartCount()
    } catch (err: any) {
      console.error("Failed to add to cart:", err)
    }
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      performSearch()
    }
  }

  const resetFilters = () => {
    setFilters({ categories: [], priceRange: [0, 100], ratingMin: 0 })
    setSearchQuery("")
    setProducts(allProducts || [])
  }

  const activeFiltersCount =
    filters.categories.length +
    (filters.ratingMin > 0 ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 100 ? 1 : 0)

  const maxPrice = useMemo(() => {
    if (!allProducts || allProducts.length === 0) {
      return 100
    }
    return Math.max(...allProducts.map((p) => p.price), 100)
  }, [allProducts])

  return (
    <div className="min-h-screen bg-background">
      <Navigation cartCount={cartCount} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-8 space-y-4">
          <Link href="/home" className="flex items-center gap-2 text-primary hover:text-primary/80 font-semibold mb-4">
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
          <div className="relative">
            <Search className="absolute left-4 top-4 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by dish name, cuisine, ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-12 h-12 bg-card text-foreground text-lg border-0 shadow-md"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-primary hover:text-primary/80 font-semibold transition"
            >
              <Filter className="w-5 h-5" />
              Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>
            {activeFiltersCount > 0 && (
              <button onClick={resetFilters} className="text-muted-foreground hover:text-foreground transition text-sm">
                Clear all
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading products...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            {showFilters && (
              <div className="lg:col-span-1">
                <Card className="border-0 shadow-lg sticky top-24">
                  <CardContent className="pt-6 space-y-6">
                    {/* Category Filter */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground">Categories</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {allCategories.map((category) => (
                          <label key={category} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={filters.categories.includes(category)}
                              onChange={() => toggleCategory(category)}
                              className="w-4 h-4 rounded border-border cursor-pointer"
                            />
                            <span className="text-foreground group-hover:text-primary transition">{category}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Price Filter */}
                    <div className="space-y-3 pt-4 border-t border-border">
                      <h3 className="font-semibold text-foreground">Price Range</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Min</span>
                          <span className="font-semibold text-foreground">${filters.priceRange[0]}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={maxPrice}
                          value={filters.priceRange[0]}
                          onChange={(e) => {
                            const newMin = Math.min(Number.parseInt(e.target.value), filters.priceRange[1])
                            setFilters((prev) => ({ ...prev, priceRange: [newMin, prev.priceRange[1]] }))
                          }}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Max</span>
                          <span className="font-semibold text-foreground">${filters.priceRange[1]}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={maxPrice}
                          value={filters.priceRange[1]}
                          onChange={(e) => {
                            const newMax = Math.max(Number.parseInt(e.target.value), filters.priceRange[0])
                            setFilters((prev) => ({ ...prev, priceRange: [prev.priceRange[0], newMax] }))
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Rating Filter */}
                    <div className="space-y-3 pt-4 border-t border-border">
                      <h3 className="font-semibold text-foreground">Minimum Rating</h3>
                      <div className="space-y-2">
                        {[0, 3, 3.5, 4, 4.5].map((rating) => (
                          <label key={rating} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="radio"
                              checked={filters.ratingMin === rating}
                              onChange={() => setFilters((prev) => ({ ...prev, ratingMin: rating }))}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <span className="text-foreground group-hover:text-primary transition">
                              {rating === 0 ? "Any" : `${rating} & up`}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Results */}
            <div className={showFilters ? "lg:col-span-3" : "lg:col-span-4"}>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Search Results</h2>
                    <p className="text-muted-foreground">Found {filteredProducts.length} dishes</p>
                  </div>
                </div>

                {filteredProducts.length === 0 ? (
                  <Card className="border-0 shadow-lg">
                    <CardContent className="pt-12 pb-12 text-center space-y-4">
                      <h3 className="text-xl font-semibold text-foreground">
                        {searchQuery ? `Nothing found for "${searchQuery}"` : "No dishes found"}
                      </h3>
                      <p className="text-muted-foreground">
                        {searchQuery 
                          ? "Try a different search term or adjust your filters" 
                          : "Try adjusting your filters"}
                      </p>
                      <div className="flex gap-3 justify-center">
                        {searchQuery && (
                          <Button 
                            onClick={() => {
                              setSearchQuery("")
                              setProducts(allProducts || [])
                            }} 
                            variant="outline"
                            className="bg-transparent"
                          >
                            Clear Search
                          </Button>
                        )}
                        {(activeFiltersCount > 0 || searchQuery) && (
                          <Button onClick={resetFilters} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            Clear All Filters
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
