import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { addToCart, getCart, removeCartItem, updateCartItem } from '@/lib/api/cart'
import type { AddToCartRequest, CartItem } from '@/types'

interface CartState {
    items: CartItem[]
    total: number
    loading: boolean
    error: string | null
}

const initialState: CartState = {
    items: [],
    total: 0,
    loading: false,
    error: null,
}

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error) return error.message
    return fallback
}

export const fetchCartThunk = createAsyncThunk(
    'cart/fetchCart',
    async (_, { rejectWithValue }) => {
        try {
            return await getCart()
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch cart'))
        }
    }
)

export const addToCartThunk = createAsyncThunk(
    'cart/addToCart',
    async (payload: AddToCartRequest, { rejectWithValue }) => {
        try {
            await addToCart(payload)
            return await getCart()
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to add item to cart'))
        }
    }
)

export const updateCartItemThunk = createAsyncThunk(
    'cart/updateCartItem',
    async (payload: { productId: string; quantity: number }, { rejectWithValue }) => {
        try {
            await updateCartItem(payload.productId, { quantity: payload.quantity })
            return await getCart()
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update cart item'))
        }
    }
)

export const removeCartItemThunk = createAsyncThunk(
    'cart/removeCartItem',
    async (productId: string, { rejectWithValue }) => {
        try {
            await removeCartItem(productId)
            return await getCart()
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to remove cart item'))
        }
    }
)

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        clearCart: (state) => {
            state.items = []
            state.total = 0
            state.error = null
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCartThunk.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchCartThunk.fulfilled, (state, action) => {
                state.loading = false
                state.items = action.payload.items
                state.total = action.payload.total
            })
            .addCase(fetchCartThunk.rejected, (state, action) => {
                state.loading = false
                state.error = (action.payload as string) || 'Failed to fetch cart'
            })
            .addCase(addToCartThunk.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(addToCartThunk.fulfilled, (state, action) => {
                state.loading = false
                state.items = action.payload.items
                state.total = action.payload.total
            })
            .addCase(addToCartThunk.rejected, (state, action) => {
                state.loading = false
                state.error = (action.payload as string) || 'Failed to add item to cart'
            })
            .addCase(updateCartItemThunk.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(updateCartItemThunk.fulfilled, (state, action) => {
                state.loading = false
                state.items = action.payload.items
                state.total = action.payload.total
            })
            .addCase(updateCartItemThunk.rejected, (state, action) => {
                state.loading = false
                state.error = (action.payload as string) || 'Failed to update cart item'
            })
            .addCase(removeCartItemThunk.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(removeCartItemThunk.fulfilled, (state, action) => {
                state.loading = false
                state.items = action.payload.items
                state.total = action.payload.total
            })
            .addCase(removeCartItemThunk.rejected, (state, action) => {
                state.loading = false
                state.error = (action.payload as string) || 'Failed to remove cart item'
            })
    },
})

export const { clearCart } = cartSlice.actions
export default cartSlice.reducer
