import { configureStore } from '@reduxjs/toolkit'
import favoritesReducer, {
    fetchFavoritesThunk,
    addToFavoritesThunk,
    removeFromFavoritesThunk,
} from '@/store/slices/favoritesSlice'

// Mock API functions
jest.mock('@/lib/api/favorites', () => ({
    getUserFavorites: jest.fn(),
    addToFavorites: jest.fn(),
    removeFromFavorites: jest.fn(),
}))

import { getUserFavorites, addToFavorites, removeFromFavorites } from '@/lib/api/favorites'

describe('favoritesSlice', () => {
    let store: ReturnType<typeof configureStore>

    beforeEach(() => {
        store = configureStore({
            reducer: {
                favorites: favoritesReducer,
            },
        })
        jest.clearAllMocks()
    })

    describe('initial state', () => {
        it('should have correct initial state', () => {
            const state = store.getState().favorites
            expect(state.items).toEqual([])
            expect(state.favoriteIds).toEqual([])
            expect(state.loading).toBe(false)
            expect(state.error).toBeNull()
        })
    })

    describe('fetchFavoritesThunk', () => {
        it('should fetch favorites successfully', async () => {
            const mockFavorites = [
                { id: '1', name: 'Product 1' },
                { id: '2', name: 'Product 2' },
            ]
                ; (getUserFavorites as jest.Mock).mockResolvedValue(mockFavorites)

            await store.dispatch(fetchFavoritesThunk())

            const state = store.getState().favorites
            expect(state.items).toEqual(mockFavorites)
            expect(state.favoriteIds).toEqual(['1', '2'])
            expect(state.loading).toBe(false)
        })
    })

    describe('addToFavoritesThunk', () => {
        it('should optimistically add favorite', async () => {
            // Setup initial state empty

            // Delay API response to check optimistic update
            let resolveApi: Function
            const apiPromise = new Promise(resolve => { resolveApi = resolve })
                ; (addToFavorites as jest.Mock).mockReturnValue(apiPromise)

            const promise = store.dispatch(addToFavoritesThunk('1'))

            // Check immediately - should be added optimistically
            expect(store.getState().favorites.favoriteIds).toContain('1')

            // Resolve API
            // @ts-ignore
            resolveApi()
            await promise

            // Should still be there
            expect(store.getState().favorites.favoriteIds).toContain('1')
        })

        it('should rollback on failure', async () => {
            ; (addToFavorites as jest.Mock).mockRejectedValue(new Error('Failed'))

            await store.dispatch(addToFavoritesThunk('1'))

            const state = store.getState().favorites
            expect(state.favoriteIds).not.toContain('1')
            expect(state.error).toBeTruthy()
        })
    })

    describe('removeFromFavoritesThunk', () => {
        it('should optimistically remove favorite', async () => {
            // Seed store with favorites
            store = configureStore({
                reducer: { favorites: favoritesReducer },
                preloadedState: {
                    favorites: {
                        items: [{ id: '1', name: 'P1' }] as any,
                        favoriteIds: ['1'],
                        loading: false,
                        error: null,
                    }
                }
            })

            // Delay API response
            let resolveApi: Function
            const apiPromise = new Promise(resolve => { resolveApi = resolve })
                ; (removeFromFavorites as jest.Mock).mockReturnValue(apiPromise)

            const promise = store.dispatch(removeFromFavoritesThunk('1'))

            // Check immediately - should be removed optimistically
            expect(store.getState().favorites.favoriteIds).not.toContain('1')

            // Resolve API
            // @ts-ignore
            resolveApi()
            await promise

            // Should still be gone
            expect(store.getState().favorites.favoriteIds).not.toContain('1')
        })

        it('should rollback on failure (add back)', async () => {
            // Seed store
            store = configureStore({
                reducer: { favorites: favoritesReducer },
                preloadedState: {
                    favorites: {
                        items: [{ id: '1', name: 'P1' }] as any,
                        favoriteIds: ['1'],
                        loading: false,
                        error: null,
                    }
                }
            })

                ; (removeFromFavorites as jest.Mock).mockRejectedValue(new Error('Failed'))

            await store.dispatch(removeFromFavoritesThunk('1'))

            // Should be added back
            const state = store.getState().favorites
            expect(state.favoriteIds).toContain('1')
            expect(state.error).toBeTruthy()
        })
    })
})
