"use client"

import { useState, useEffect } from "react"
import { Trash2, Plus, Minus, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Navigation from "@/components/navigation"
import ProtectedRoute from "@/components/ProtectedRoute"
import { getCart, updateCartItem, removeCartItem } from "@/lib/api/cart"
import { createOrder } from "@/lib/api/orders"
import { getProductById } from "@/lib/api/products"
import { getUserProfile } from "@/lib/api/user"
import type { Cart, CartItem, Product } from "@/types"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface CartItemWithProduct extends CartItem {
  product?: Product
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [cartItemsWithProducts, setCartItemsWithProducts] = useState<CartItemWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadCart()
  }, [])

  const loadCart = async () => {
    try {
      setLoading(true)
      const cartData = await getCart()
      setCart(cartData)
      
      // Load product details for each cart item
      const itemsWithProducts = await Promise.all(
        cartData.items.map(async (item) => {
          try {
            const product = await getProductById(item.product_id)
            return { ...item, product }
          } catch {
            return item
          }
        })
      )
      setCartItemsWithProducts(itemsWithProducts)
    } catch (err: any) {
      setError(err.message || "Failed to load cart")
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(productId)
    } else {
      try {
        await updateCartItem(productId, { quantity })
        await loadCart()
      } catch (err: any) {
        setError(err.message || "Failed to update quantity")
      }
    }
  }

  const removeItem = async (productId: string) => {
    try {
      await removeCartItem(productId)
      await loadCart()
    } catch (err: any) {
      setError(err.message || "Failed to remove item")
    }
  }

  const handleCheckout = async () => {
    try {
      setProcessing(true)
      setError(null)
      
      // Validate user profile has complete address and phone
      const userProfile = await getUserProfile()
      const missingFields: string[] = []
      
      if (!userProfile.phone || userProfile.phone.trim() === "") {
        missingFields.push("phone number")
      }
      
      if (!userProfile.address) {
        missingFields.push("address")
      } else {
        if (!userProfile.address.street || userProfile.address.street.trim() === "") {
          missingFields.push("street address")
        }
        if (!userProfile.address.city || userProfile.address.city.trim() === "") {
          missingFields.push("city")
        }
        if (!userProfile.address.state || userProfile.address.state.trim() === "") {
          missingFields.push("state")
        }
        if (!userProfile.address.zip_code || userProfile.address.zip_code.trim() === "") {
          missingFields.push("zip code")
        }
        if (!userProfile.address.country || userProfile.address.country.trim() === "") {
          missingFields.push("country")
        }
      }
      
      if (missingFields.length > 0) {
        setError(`Please complete your profile before placing an order. Missing: ${missingFields.join(", ")}. Please update your profile first.`)
        setProcessing(false)
        // Optionally redirect to profile page
        setTimeout(() => {
          router.push("/profile")
        }, 3000)
        return
      }
      
      const order = await createOrder()
      router.push(`/orders/${order.id}`)
    } catch (err: any) {
      setError(err.message || "Failed to create order")
      setProcessing(false)
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
              <p className="mt-4 text-muted-foreground">Loading cart...</p>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  const subtotal = cart?.total || 0
  const tax = subtotal * 0.08
  const total = subtotal + tax

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation cartCount={cart?.items.length || 0} />

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/home" className="flex items-center gap-2 text-primary hover:text-primary/80 font-semibold mb-4">
            <ArrowLeft className="w-5 h-5" />
            Back to Menu
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Shopping Cart</h1>
        </div>

        {error && (
          <Card className="border-0 shadow-lg mb-4">
            <CardContent className="pt-6">
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                {error}
              </div>
            </CardContent>
          </Card>
        )}

        {cartItemsWithProducts.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-12 pb-12 text-center space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Your cart is empty</h2>
              <p className="text-muted-foreground">Start adding delicious dishes to your order!</p>
              <Link href="/home">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Continue Shopping</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItemsWithProducts.map((item) => (
                <Card key={item.product_id} className="border-0 shadow-sm">
                  <CardContent className="pt-6 flex gap-6">
                    <div className="w-24 h-24 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.product?.image || "/placeholder.svg"}
                        alt={item.product?.name || "Product"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">{item.product?.name || "Product"}</h3>
                        <p className="text-primary font-bold text-lg mt-2">${item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-secondary rounded-lg px-2 py-1">
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="p-1 hover:bg-primary/10 rounded"
                          >
                            <Minus className="w-4 h-4 text-foreground" />
                          </button>
                          <span className="w-8 text-center font-semibold text-foreground">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className="p-1 hover:bg-primary/10 rounded"
                          >
                            <Plus className="w-4 h-4 text-foreground" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.product_id)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div>
              <Card className="border-0 shadow-lg sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-foreground">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-foreground">
                      <span>Tax (8%)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between font-bold text-lg text-foreground">
                      <span>Total</span>
                      <span className="text-primary">${total.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button 
                    onClick={handleCheckout}
                    disabled={processing}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 font-semibold"
                  >
                    {processing ? "Processing..." : "Proceed to Checkout"}
                  </Button>
                  <Link href="/home">
                    <Button variant="outline" className="w-full bg-transparent">
                      Continue Shopping
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
    </ProtectedRoute>
  )
}
