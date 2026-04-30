import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '@/lib/api/auth'
import { getUserProfile } from '@/lib/api/user'
import { getStoredToken, getStoredUser, storeToken, storeUser, removeToken, removeUser } from '@/config/api'
import type { User, LoginRequest, RegisterRequest } from '@/types'

interface AuthState {
    user: User | null
    token: string | null
    isLoading: boolean
    isAuthenticated: boolean
    error: string | null
}

const initialState: AuthState = {
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
}

// Async thunks
export const validateTokenThunk = createAsyncThunk(
    'auth/validateToken',
    async (_, { rejectWithValue }) => {
        try {
            const storedToken = getStoredToken()
            const storedUser = getStoredUser()

            if (storedToken && storedUser) {
                // Validate token by fetching user profile
                const userProfile = await getUserProfile()
                // Update stored user in case it's outdated
                storeUser(userProfile)
                return { user: userProfile, token: storedToken }
            }

            return { user: null, token: null }
        } catch (error: any) {
            // Token is invalid, clear auth state
            removeToken()
            removeUser()
            return rejectWithValue(error.message || 'Token validation failed')
        }
    }
)

export const loginThunk = createAsyncThunk(
    'auth/login',
    async (data: LoginRequest, { rejectWithValue }) => {
        try {
            const response = await apiLogin(data)
            storeToken(response.token)
            storeUser(response.user)
            return response
        } catch (error: any) {
            return rejectWithValue(error.message || 'Login failed')
        }
    }
)

export const registerThunk = createAsyncThunk(
    'auth/register',
    async (data: RegisterRequest, { rejectWithValue }) => {
        try {
            await apiRegister(data)
            return null
        } catch (error: any) {
            return rejectWithValue(error.message || 'Registration failed')
        }
    }
)

export const logoutThunk = createAsyncThunk(
    'auth/logout',
    async () => {
        apiLogout()
        removeToken()
        removeUser()
    }
)

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null
        },
    },
    extraReducers: (builder) => {
        builder
            // Validate token
            .addCase(validateTokenThunk.pending, (state) => {
                state.isLoading = true
            })
            .addCase(validateTokenThunk.fulfilled, (state, action) => {
                state.isLoading = false
                state.user = action.payload.user
                state.token = action.payload.token
                state.isAuthenticated = !!action.payload.token && !!action.payload.user
            })
            .addCase(validateTokenThunk.rejected, (state) => {
                state.isLoading = false
                state.user = null
                state.token = null
                state.isAuthenticated = false
            })
            // Login
            .addCase(loginThunk.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(loginThunk.fulfilled, (state, action) => {
                state.isLoading = false
                state.user = action.payload.user
                state.token = action.payload.token
                state.isAuthenticated = true
                state.error = null
            })
            .addCase(loginThunk.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload as string
            })
            // Register
            .addCase(registerThunk.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(registerThunk.fulfilled, (state) => {
                state.isLoading = false
                state.error = null
            })
            .addCase(registerThunk.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload as string
            })
            // Logout
            .addCase(logoutThunk.fulfilled, (state) => {
                state.user = null
                state.token = null
                state.isAuthenticated = false
                state.error = null
            })
    },
})

export const { clearError } = authSlice.actions
export default authSlice.reducer
