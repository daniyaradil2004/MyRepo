"use client"

import { useState, useEffect } from "react"
import { CheckCircle, ArrowLeft, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Navigation from "@/components/navigation"
import ProtectedRoute from "@/components/ProtectedRoute"
import { getOrderById } from "@/lib/api/orders"
import { getCart } from "@/lib/api/cart"
import type { Order } from "@/types"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

export default function OrderSuccessPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    if (orderId) {
      loadOrder()
      loadCartCount()
    }
  }, [orderId])

  const loadOrder = async () => {
    try {
      setLoading(true)
      const orderData = await getOrderById(orderId)
      setOrder(orderData)
    } catch (err: any) {
      setError(err.message || "Failed to load order")
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

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navigation cartCount={0} />
          <main className="max-w-4xl mx-auto px-4 py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading order details...</p>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !order) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navigation cartCount={cartCount} />
          <main className="max-w-4xl mx-auto px-4 py-12">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-12 pb-12 text-center space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Order Not Found</h2>
                <p className="text-muted-foreground">{error || "The order you're looking for doesn't exist."}</p>
                <div className="flex gap-3 justify-center">
                  <Link href="/home">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Go to Home</Button>
                  </Link>
                  <Link href="/profile">
                    <Button variant="outline" className="bg-transparent">View Order History</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation cartCount={cartCount} />

        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-8">
            <Link href="/home" className="flex items-center gap-2 text-primary hover:text-primary/80 font-semibold mb-4">
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </Link>
          </div>

          {/* Success Message */}
          <Card className="border-0 shadow-lg mb-6">
            <CardContent className="pt-12 pb-12 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">Order Placed Successfully!</h1>
                <p className="text-muted-foreground text-lg">
                  Thank you for your order. We've received it and will start preparing your delicious meal right away.
                </p>
              </div>
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-2">Order ID</p>
                <p className="text-lg font-mono font-semibold text-foreground">{order.id}</p>
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card className="border-0 shadow-lg mb-6">
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Order Details
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-semibold text-foreground capitalize">{order.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-bold text-primary text-lg">${order.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Items</span>
                      <span className="font-semibold text-foreground">{order.items.length}</span>
                    </div>
                  </div>
                </div>

                {order.items.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <h3 className="font-semibold text-foreground mb-3">Order Items</h3>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-foreground">
                            {item.product_name} × {item.quantity}
                          </span>
                          <span className="text-muted-foreground">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {order.delivery_address && (
                  <div className="border-t border-border pt-4">
                    <h3 className="font-semibold text-foreground mb-2">Delivery Address</h3>
                    <p className="text-sm text-muted-foreground">
                      {order.delivery_address.street}, {order.delivery_address.city}, {order.delivery_address.state}{" "}
                      {order.delivery_address.zip_code}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/profile?tab=orders">
              <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                View Order History
              </Button>
            </Link>
            <Link href="/home">
              <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

