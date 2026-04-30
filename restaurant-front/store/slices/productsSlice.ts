import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { getProducts, getProductById } from '@/lib/api/products'
import {
    getPersonalizedRecommendations,
    getCartBasedRecommendations,
    getMostFrequentByUser,
    getMostFrequentGlobal,
    getReviewBasedRecommendations,
} from '@/lib/api/recommendations'
import type { Product } from '@/types'

interface ProductsState {
    products: Product[]
    recommendedProducts: Product[]
    cartBasedProducts: Product[]
    mostFrequentByUser: Product[]
    mostFrequentGlobal: Product[]
    reviewBasedProducts: Product[]
    loading: boolean
    error: string | null
    productsCache: Record<string, Product>
}

const initialState: ProductsState = {
    products: [],
    recommendedProducts: [],
    cartBasedProducts: [],
    mostFrequentByUser: [],
    mostFrequentGlobal: [],
    reviewBasedProducts: [],
    loading: false,
    error: null,
    productsCache: {},
}

// Async thunks
export const fetchProductsThunk = createAsyncThunk(
    'products/fetchProducts',
    async (_, { rejectWithValue }) => {
        try {
            const products = await getProducts()
            return products
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch products')
        }
    }
)

export const fetchProductByIdThunk = createAsyncThunk(
    'products/fetchProductById',
    async (productId: string, { getState, rejectWithValue }) => {
        try {
            const state = getState() as { products: ProductsState }
            // Check cache first
            if (state.products.productsCache[productId]) {
                return state.products.productsCache[productId]
            }
            const product = await getProductById(productId)
            return product
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch product')
        }
    }
)

export const fetchRecommendationsThunk = createAsyncThunk(
    'products/fetchRecommendations',
    async (_, { rejectWithValue }) => {
        try {
            const [personalized, cartBased, frequentByUser, frequentGlobal, reviewBased] = await Promise.allSettled([
                getPersonalizedRecommendations(),
                getCartBasedRecommendations(),
                getMostFrequentByUser(),
                getMostFrequentGlobal(),
                getReviewBasedRecommendations(),
            ])

            return {
                personalized: personalized.status === 'fulfilled' ? personalized.value : [],
                cartBased: cartBased.status === 'fulfilled' ? cartBased.value : [],
                frequentByUser: frequentByUser.status === 'fulfilled' ? frequentByUser.value : [],
                frequentGlobal: frequentGlobal.status === 'fulfilled' ? frequentGlobal.value : [],
                reviewBased: reviewBased.status === 'fulfilled' ? reviewBased.value : [],
            }
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch recommendations')
        }
    }
)

const productsSlice = createSlice({
    name: 'products',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch products
            .addCase(fetchProductsThunk.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchProductsThunk.fulfilled, (state, action) => {
                state.loading = false
                state.products = action.payload
                // Update cache
                action.payload.forEach((product) => {
                    state.productsCache[product.id] = product
                })
            })
            .addCase(fetchProductsThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            // Fetch product by ID
            .addCase(fetchProductByIdThunk.fulfilled, (state, action) => {
                state.productsCache[action.payload.id] = action.payload
            })
            // Fetch recommendations
            .addCase(fetchRecommendationsThunk.pending, (state) => {
                state.loading = true
            })
            .addCase(fetchRecommendationsThunk.fulfilled, (state, action) => {
                state.loading = false
                state.recommendedProducts = action.payload.personalized || []
                state.cartBasedProducts = action.payload.cartBased || []
                state.mostFrequentByUser = action.payload.frequentByUser || []
                state.mostFrequentGlobal = action.payload.frequentGlobal || []
                state.reviewBasedProducts = action.payload.reviewBased || []
            })
            .addCase(fetchRecommendationsThunk.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
    },
})

export const { clearError } = productsSlice.actions
export default productsSlice.reducer
