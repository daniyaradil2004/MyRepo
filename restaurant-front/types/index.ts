// User Types
export interface User {
  id: string
  email: string
  name: string
  phone: string
  address: Address
  created_at: string
  updated_at: string
}

export interface Address {
  street: string
  city: string
  state: string
  zip_code: string
  country: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

// Product Types
export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  image: string
  available: boolean
  rating: number
  rating_count: number
  created_at: string
  updated_at: string
}

// Cart Types
export interface CartItem {
  product_id: string
  quantity: number
  price: number
}

export interface Cart {
  id: string
  user_id: string
  items: CartItem[]
  total: number
  updated_at: string
}

export interface AddToCartRequest {
  product_id: string
  quantity: number
}

export interface UpdateCartItemRequest {
  quantity: number
}

// Order Types
export interface OrderItem {
  product_id: string
  product_name: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  user_id: string
  items: OrderItem[]
  total: number
  status: "pending" | "processing" | "delivered" | "cancelled"
  delivery_address: Address
  created_at: string
  updated_at: string
}

export interface CreateOrderRequest {
  // Empty body - uses cart and user address
}

// Comment/Review Types
export interface Comment {
  id: string
  user_id: string
  product_id: string
  text: string
  rating: number
  created_at: string
  updated_at: string
  user_name?: string
}

export interface CreateCommentRequest {
  product_id: string
  text: string
  rating: number
}

export interface UpdateCommentRequest {
  rating?: number
  text?: string
}

// Favorite Types
export interface AddFavoriteRequest {
  product_id: string
}

export interface FavoriteResponse {
  status: "added" | "removed"
}

// Recommendation Types
export interface RecommendationResponse {
  products: Product[]
}

// API Response Types
export interface ApiError {
  message: string
  error?: string
}

export interface ApiResponse<T> {
  data?: T
  error?: ApiError
}

