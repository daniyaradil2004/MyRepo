import { configureStore } from '@reduxjs/toolkit'
import authReducer, {
    loginThunk,
    registerThunk,
    logoutThunk,
    validateTokenThunk,
    clearError,
} from '@/store/slices/authSlice'

// Mock API functions
jest.mock('@/lib/api/auth', () => ({
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
}))

jest.mock('@/lib/api/user', () => ({
    getUserProfile: jest.fn(),
}))

jest.mock('@/config/api', () => ({
    getStoredToken: jest.fn(),
    getStoredUser: jest.fn(),
    storeToken: jest.fn(),
    storeUser: jest.fn(),
    removeToken: jest.fn(),
    removeUser: jest.fn(),
}))

import { login as apiLogin, register as apiRegister } from '@/lib/api/auth'
import { getUserProfile } from '@/lib/api/user'
import { getStoredToken, getStoredUser } from '@/config/api'

describe('authSlice', () => {
    let store: ReturnType<typeof configureStore>

    beforeEach(() => {
        store = configureStore({
            reducer: {
                auth: authReducer,
            },
        })
        jest.clearAllMocks()
    })

    describe('initial state', () => {
        it('should have correct initial state', () => {
            const state = store.getState().auth
            expect(state.user).toBeNull()
            expect(state.token).toBeNull()
            expect(state.isLoading).toBe(true)
            expect(state.isAuthenticated).toBe(false)
            expect(state.error).toBeNull()
        })
    })

    describe('clearError action', () => {
        it('should clear error state', () => {
            // First set an error by dispatching a failed login
            store.dispatch({ type: loginThunk.rejected.type, payload: 'Login failed' })
            expect(store.getState().auth.error).toBe('Login failed')

            // Then clear it
            store.dispatch(clearError())
            expect(store.getState().auth.error).toBeNull()
        })
    })

    describe('loginThunk', () => {
        it('should handle successful login', async () => {
            const mockResponse = {
                user: { id: '1', email: 'test@example.com', name: 'Test User' },
                token: 'mock-token',
            }

                ; (apiLogin as jest.Mock).mockResolvedValue(mockResponse)

            await store.dispatch(
                loginThunk({ email: 'test@example.com', password: 'password' })
            )

            const state = store.getState().auth
            expect(state.user).toEqual(mockResponse.user)
            expect(state.token).toBe('mock-token')
            expect(state.isAuthenticated).toBe(true)
            expect(state.error).toBeNull()
        })

        it('should handle login failure', async () => {
            ; (apiLogin as jest.Mock).mockRejectedValue(new Error('Invalid credentials'))

            await store.dispatch(
                loginThunk({ email: 'test@example.com', password: 'wrong' })
            )

            const state = store.getState().auth
            expect(state.user).toBeNull()
            expect(state.token).toBeNull()
            expect(state.isAuthenticated).toBe(false)
            expect(state.error).toBeTruthy()
        })
    })

    describe('registerThunk', () => {
        it('should handle successful registration', async () => {
            ; (apiRegister as jest.Mock).mockResolvedValue(undefined)

            await store.dispatch(
                registerThunk({
                    name: 'New User',
                    email: 'new@example.com',
                    password: 'Password123',
                })
            )

            const state = store.getState().auth
            expect(state.error).toBeNull()
            expect(state.isLoading).toBe(false)
        })

        it('should handle registration failure', async () => {
            ; (apiRegister as jest.Mock).mockRejectedValue(new Error('Email already exists'))

            await store.dispatch(
                registerThunk({
                    name: 'New User',
                    email: 'existing@example.com',
                    password: 'Password123',
                })
            )

            const state = store.getState().auth
            expect(state.error).toBeTruthy()
        })
    })

    describe('logoutThunk', () => {
        it('should clear auth state on logout', async () => {
            // First login
            const mockResponse = {
                user: { id: '1', email: 'test@example.com', name: 'Test User' },
                token: 'mock-token',
            }
                ; (apiLogin as jest.Mock).mockResolvedValue(mockResponse)
            await store.dispatch(
                loginThunk({ email: 'test@example.com', password: 'password' })
            )

            // Then logout
            await store.dispatch(logoutThunk())

            const state = store.getState().auth
            expect(state.user).toBeNull()
            expect(state.token).toBeNull()
            expect(state.isAuthenticated).toBe(false)
        })
    })

    describe('validateTokenThunk', () => {
        it('should validate stored token successfully', async () => {
            const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' }
                ; (getStoredToken as jest.Mock).mockReturnValue('stored-token')
                ; (getStoredUser as jest.Mock).mockReturnValue(mockUser)
                ; (getUserProfile as jest.Mock).mockResolvedValue(mockUser)

            await store.dispatch(validateTokenThunk())

            const state = store.getState().auth
            expect(state.user).toEqual(mockUser)
            expect(state.token).toBe('stored-token')
            expect(state.isAuthenticated).toBe(true)
        })

        it('should handle invalid token', async () => {
            ; (getStoredToken as jest.Mock).mockReturnValue('invalid-token')
                ; (getStoredUser as jest.Mock).mockReturnValue({ id: '1' })
                ; (getUserProfile as jest.Mock).mockRejectedValue(new Error('Unauthorized'))

            await store.dispatch(validateTokenThunk())

            const state = store.getState().auth
            expect(state.user).toBeNull()
            expect(state.token).toBeNull()
            expect(state.isAuthenticated).toBe(false)
        })
    })
})
