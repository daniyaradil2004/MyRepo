"use client"

import { memo } from "react"
import { Heart, ShoppingCart, Star, Plus, Minus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface Product {
  id: string
  name: string
  price: number
  category: string
  rating: number
  image: string
  isFavorite: boolean
  recommended?: boolean
}

interface ProductCardProps {
  product: Product
  onToggleFavorite: (id: string) => void
  onAddToCart: (id: string) => void
  // New props for cart controls
  cartQuantity?: number
  onUpdateQuantity?: (id: string, quantity: number) => void
  onRemoveFromCart?: (id: string) => void
}

function ProductCard({
  product,
  onToggleFavorite,
  onAddToCart,
  cartQuantity = 0,
  onUpdateQuantity,
  onRemoveFromCart,
}: ProductCardProps) {
  const isInCart = cartQuantity > 0

  return (
    <div className="bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-square bg-secondary overflow-hidden group">
        <Link href={`/product/${product.id}`}>
          <img
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
          />
        </Link>
        {product.recommended && (
          <div className="absolute top-2 right-2 bg-accent text-accent-foreground px-2 py-1 rounded-full text-xs font-semibold">
            Recommended
          </div>
        )}
        <button
          onClick={() => onToggleFavorite(product.id)}
          className="absolute top-2 left-2 p-2 bg-white/80 hover:bg-white rounded-full transition-all z-10"
        >
          <Heart
            className={`w-5 h-5 ${product.isFavorite ? "fill-destructive text-destructive" : "text-foreground"}`}
          />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">{product.category}</p>
          <Link href={`/product/${product.id}`}>
            <h3 className="font-semibold text-foreground truncate hover:text-primary cursor-pointer transition">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-accent text-accent" />
            <span className="text-sm font-semibold text-foreground">{product.rating.toFixed(1)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-primary">${product.price.toFixed(2)}</span>

          {/* Show cart controls if item is in cart, otherwise show add button */}
          {isInCart && onUpdateQuantity && onRemoveFromCart ? (
            <div className="flex items-center gap-2 animate-in fade-in duration-300">
              <button
                onClick={() => onRemoveFromCart(product.id)}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition"
                title="Remove from cart"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 bg-secondary rounded-lg px-1">
                <button
                  onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
                  className="p-1.5 hover:bg-primary/10 rounded transition"
                >
                  <Minus className="w-3.5 h-3.5 text-foreground" />
                </button>
                <span className="w-8 text-center font-semibold text-sm text-foreground">
                  {cartQuantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(product.id, cartQuantity + 1)}
                  className="p-1.5 hover:bg-primary/10 rounded transition"
                >
                  <Plus className="w-3.5 h-3.5 text-foreground" />
                </button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => onAddToCart(product.id)}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Memoize component to prevent re-renders when parent updates
// Only re-render if product data or callbacks change
export default memo(ProductCard, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.isFavorite === nextProps.product.isFavorite &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.rating === nextProps.product.rating &&
    prevProps.cartQuantity === nextProps.cartQuantity &&
    prevProps.onToggleFavorite === nextProps.onToggleFavorite &&
    prevProps.onAddToCart === nextProps.onAddToCart &&
    prevProps.onUpdateQuantity === nextProps.onUpdateQuantity &&
    prevProps.onRemoveFromCart === nextProps.onRemoveFromCart
  )
})
