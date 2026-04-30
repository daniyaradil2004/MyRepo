import { configureStore } from '@reduxjs/toolkit'
import productsReducer, {
    fetchProductsThunk,
    fetchProductByIdThunk,
    fetchRecommendationsThunk,
} from '@/store/slices/productsSlice'

// Mock API functions
jest.mock('@/lib/api/products', () => ({
    getProducts: jest.fn(),
    getProductById: jest.fn(),
}))

jest.mock('@/lib/api/recommendations', () => ({
    getPersonalizedRecommendations: jest.fn(),
    getCartBasedRecommendations: jest.fn(),
    getMostFrequentByUser: jest.fn(),
    getMostFrequentGlobal: jest.fn(),
    getReviewBasedRecommendations: jest.fn(),
}))

import { getProducts, getProductById } from '@/lib/api/products'
import {
    getPersonalizedRecommendations,
    getCartBasedRecommendations,
    getMostFrequentByUser,
    getMostFrequentGlobal,
    getReviewBasedRecommendations,
} from '@/lib/api/recommendations'

describe('productsSlice', () => {
    let store: ReturnType<typeof configureStore>

    beforeEach(() => {
        store = configureStore({
            reducer: {
                products: productsReducer,
            },
        })
        jest.clearAllMocks()
    })

    describe('initial state', () => {
        it('should have correct initial state', () => {
            const state = store.getState().products
            expect(state.products).toEqual([])
            expect(state.productsCache).toEqual({})
            expect(state.loading).toBe(false)
            expect(state.error).toBeNull()
        })
    })

    describe('fetchProductsThunk', () => {
        it('should fetch products successfully', async () => {
            const mockProducts = [
                { id: '1', name: 'Product 1', price: 10 },
                { id: '2', name: 'Product 2', price: 20 },
            ]

                ; (getProducts as jest.Mock).mockResolvedValue(mockProducts)

            await store.dispatch(fetchProductsThunk())

            const state = store.getState().products
            expect(state.products).toEqual(mockProducts)
            expect(state.loading).toBe(false)
            expect(state.error).toBeNull()
        })

        it('should handle fetch failure', async () => {
            ; (getProducts as jest.Mock).mockRejectedValue(new Error('Network error'))

            await store.dispatch(fetchProductsThunk())

            const state = store.getState().products
            expect(state.error).toBe('Network error')
            expect(state.loading).toBe(false)
        })
    })

    describe('fetchProductByIdThunk', () => {
        it('should fetch single product and update cache', async () => {
            const mockProduct = { id: '1', name: 'Product 1', price: 10 }
                ; (getProductById as jest.Mock).mockResolvedValue(mockProduct)

            await store.dispatch(fetchProductByIdThunk('1'))

            const state = store.getState().products
            expect(state.productsCache['1']).toEqual(mockProduct)
        })

        it('should use cached product if available', async () => {
            const mockProduct = { id: '1', name: 'Product 1', price: 10 }

            // Seed cache first
            store = configureStore({
                reducer: { products: productsReducer },
                preloadedState: {
                    products: {
                        products: [],
                        productsCache: { '1': mockProduct },
                        loading: false,
                        error: null,
                        // Add other initial state properties...
                        mostFrequentByUser: [],
                        mostFrequentGlobal: [],
                        recommendedProducts: [],
                        reviewBasedProducts: [],
                        cartBasedProducts: [],
                    }
                }
            })

            await store.dispatch(fetchProductByIdThunk('1'))

            // API should NOT be called
            expect(getProductById).not.toHaveBeenCalled()

            const state = store.getState().products
            expect(state.productsCache['1']).toEqual(mockProduct)
        })
    })

    describe('fetchRecommendationsThunk', () => {
        it('should fetch all recommendations successfully', async () => {
            const mockRecs = [{ id: '1', name: 'Rec 1' }]

                ; (getPersonalizedRecommendations as jest.Mock).mockResolvedValue(mockRecs)
                ; (getCartBasedRecommendations as jest.Mock).mockResolvedValue(mockRecs)
                ; (getMostFrequentByUser as jest.Mock).mockResolvedValue(mockRecs)
                ; (getMostFrequentGlobal as jest.Mock).mockResolvedValue(mockRecs)
                ; (getReviewBasedRecommendations as jest.Mock).mockResolvedValue(mockRecs)

            await store.dispatch(fetchRecommendationsThunk())

            const state = store.getState().products
            expect(state.recommendedProducts).toEqual(mockRecs)
            expect(state.cartBasedProducts).toEqual(mockRecs)
            expect(state.mostFrequentByUser).toEqual(mockRecs)
            expect(state.mostFrequentGlobal).toEqual(mockRecs)
            expect(state.reviewBasedProducts).toEqual(mockRecs)
        })

        it('should handle partial failures in recommendations', async () => {
            const mockRecs = [{ id: '1', name: 'Rec 1' }]

                ; (getPersonalizedRecommendations as jest.Mock).mockResolvedValue(mockRecs)
                // This one fails
                ; (getCartBasedRecommendations as jest.Mock).mockRejectedValue(new Error('Failed'))

            await store.dispatch(fetchRecommendationsThunk())

            const state = store.getState().products
            // Successful one should be set
            expect(state.recommendedProducts).toEqual(mockRecs)
            // Failed one should be empty array (handled by Promise.allSettled logic in thunk)
            expect(state.cartBasedProducts).toEqual([])
        })
    })
})
