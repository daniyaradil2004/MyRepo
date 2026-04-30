import { configureStore } from '@reduxjs/toolkit'
import cartReducer, {
    fetchCartThunk,
    addToCartThunk,
    updateCartItemThunk,
    removeCartItemThunk,
    clearCart,
} from '@/store/slices/cartSlice'

// Mock API functions
jest.mock('@/lib/api/cart', () => ({
    getCart: jest.fn(),
    addToCart: jest.fn(),
    updateCartItem: jest.fn(),
    removeCartItem: jest.fn(),
}))

import { getCart, addToCart, updateCartItem, removeCartItem } from '@/lib/api/cart'

const createTestStore = () =>
    configureStore({
        reducer: {
            cart: cartReducer,
        },
    })

type TestStore = ReturnType<typeof createTestStore>

describe('cartSlice', () => {
    let store: TestStore

    beforeEach(() => {
        store = createTestStore()
        jest.clearAllMocks()
    })

    describe('initial state', () => {
        it('should have correct initial state', () => {
            const state = store.getState().cart
            expect(state.items).toEqual([])
            expect(state.total).toBe(0)
            expect(state.loading).toBe(false)
            expect(state.error).toBeNull()
        })
    })

    describe('clearCart action', () => {
        it('should clear cart state', () => {
            store.dispatch(clearCart())
            const state = store.getState().cart
            expect(state.items).toEqual([])
            expect(state.total).toBe(0)
        })
    })

    describe('fetchCartThunk', () => {
        it('should fetch cart successfully', async () => {
            const mockCart = {
                items: [
                    { product_id: '1', quantity: 2, price: 10.99 },
                    { product_id: '2', quantity: 1, price: 15.99 },
                ],
                total: 37.97,
            }

                ; (getCart as jest.Mock).mockResolvedValue(mockCart)

            await store.dispatch(fetchCartThunk())

            const state = store.getState().cart
            expect(state.items).toEqual(mockCart.items)
            expect(state.total).toBe(mockCart.total)
            expect(state.loading).toBe(false)
            expect(state.error).toBeNull()
        })

        it('should handle fetch cart failure', async () => {
            ; (getCart as jest.Mock).mockRejectedValue(new Error('Failed to fetch cart'))

            await store.dispatch(fetchCartThunk())

            const state = store.getState().cart
            expect(state.error).toBeTruthy()
            expect(state.loading).toBe(false)
        })
    })

    describe('addToCartThunk', () => {
        it('should add item to cart', async () => {
            const mockCart = {
                items: [{ product_id: '1', quantity: 1, price: 10.99 }],
                total: 10.99,
            }

                ; (addToCart as jest.Mock).mockResolvedValue(undefined)
                ; (getCart as jest.Mock).mockResolvedValue(mockCart)

            await store.dispatch(addToCartThunk({ product_id: '1', quantity: 1 }))

            const state = store.getState().cart
            expect(state.items).toEqual(mockCart.items)
            expect(state.total).toBe(mockCart.total)
        })
    })

    describe('updateCartItemThunk', () => {
        it('should update cart item quantity', async () => {
            const mockCart = {
                items: [{ product_id: '1', quantity: 3, price: 10.99 }],
                total: 32.97,
            }

                ; (updateCartItem as jest.Mock).mockResolvedValue(undefined)
                ; (getCart as jest.Mock).mockResolvedValue(mockCart)

            await store.dispatch(updateCartItemThunk({ productId: '1', quantity: 3 }))

            const state = store.getState().cart
            expect(state.total).toBe(32.97)
        })
    })

    describe('removeCartItemThunk', () => {
        it('should remove item from cart', async () => {
            const mockCart = {
                items: [],
                total: 0,
            }

                ; (removeCartItem as jest.Mock).mockResolvedValue(undefined)
                ; (getCart as jest.Mock).mockResolvedValue(mockCart)

            await store.dispatch(removeCartItemThunk('1'))

            const state = store.getState().cart
            expect(state.items).toEqual([])
            expect(state.total).toBe(0)
        })
    })
})
