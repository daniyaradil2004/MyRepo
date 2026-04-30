import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { addToFavorites, getUserFavorites, removeFromFavorites } from '@/lib/api/favorites'
import type { Product } from '@/types'

interface FavoritesState {
    items: Product[]
    favoriteIds: string[]
    loading: boolean
    error: string | null
}

const initialState: FavoritesState = {
    items: [],
    favoriteIds: [],
    loading: false,
    error: null,
}

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error) return error.message
    return fallback
}

export const fetchFavoritesThunk = createAsyncThunk(
    'favorites/fetchFavorites',
    async (_, { rejectWithValue }) => {
        try {
            return await getUserFavorites()
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch favorites'))
        }
    }
)

export const addToFavoritesThunk = createAsyncThunk(
    'favorites/addToFavorites',
    async (productId: string, { rejectWithValue }) => {
        try {
            await addToFavorites({ product_id: productId })
            return productId
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to add favorite'))
        }
    }
)

export const removeFromFavoritesThunk = createAsyncThunk(
    'favorites/removeFromFavorites',
    async (productId: string, { rejectWithValue }) => {
        try {
            await removeFromFavorites(productId)
            return productId
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to remove favorite'))
        }
    }
)

const favoritesSlice = createSlice({
    name: 'favorites',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchFavoritesThunk.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchFavoritesThunk.fulfilled, (state, action) => {
                state.loading = false
                state.items = action.payload
                state.favoriteIds = action.payload.map((item) => item.id)
            })
            .addCase(fetchFavoritesThunk.rejected, (state, action) => {
                state.loading = false
                state.error = (action.payload as string) || 'Failed to fetch favorites'
            })
            .addCase(addToFavoritesThunk.pending, (state, action) => {
                state.error = null
                const productId = action.meta.arg
                if (!state.favoriteIds.includes(productId)) {
                    state.favoriteIds.push(productId)
                }
            })
            .addCase(addToFavoritesThunk.fulfilled, (state) => {
                state.error = null
            })
            .addCase(addToFavoritesThunk.rejected, (state, action) => {
                const productId = action.meta.arg
                state.favoriteIds = state.favoriteIds.filter((id) => id !== productId)
                state.error = (action.payload as string) || 'Failed to add favorite'
            })
            .addCase(removeFromFavoritesThunk.pending, (state, action) => {
                state.error = null
                const productId = action.meta.arg
                state.favoriteIds = state.favoriteIds.filter((id) => id !== productId)
            })
            .addCase(removeFromFavoritesThunk.fulfilled, (state, action) => {
                const productId = action.payload
                state.items = state.items.filter((item) => item.id !== productId)
                state.favoriteIds = state.favoriteIds.filter((id) => id !== productId)
            })
            .addCase(removeFromFavoritesThunk.rejected, (state, action) => {
                const productId = action.meta.arg
                if (!state.favoriteIds.includes(productId)) {
                    state.favoriteIds.push(productId)
                }
                state.error = (action.payload as string) || 'Failed to remove favorite'
            })
    },
})

export default favoritesSlice.reducer
