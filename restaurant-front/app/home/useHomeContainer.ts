'use client'

import { useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
    fetchProductsThunk,
    fetchRecommendationsThunk,
} from '@/store/slices/productsSlice'
import { fetchCartThunk, addToCartThunk } from '@/store/slices/cartSlice'
import {
    fetchFavoritesThunk,
    addToFavoritesThunk,
    removeFromFavoritesThunk,
} from '@/store/slices/favoritesSlice'
import type { Product } from '@/types'

export interface HomeContainerProps {
    searchQuery: string
    setSearchQuery: (query: string) => void
}

export function useHomeContainer({ searchQuery, setSearchQuery }: HomeContainerProps) {
    const router = useRouter()
    const dispatch = useAppDispatch()

    // Redux selectors
    const { products, mostFrequentByUser, mostFrequentGlobal, reviewBasedProducts, cartBasedProducts, loading, error } =
        useAppSelector((state) => state.products)
    const { items: cartItems, total: cartTotal } = useAppSelector((state) => state.cart)
    const { favoriteIds } = useAppSelector((state) => state.favorites)
    const { isAuthenticated } = useAppSelector((state) => state.auth)

    // Load data on mount
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchProductsThunk())
            dispatch(fetchRecommendationsThunk())
            dispatch(fetchCartThunk())
            dispatch(fetchFavoritesThunk())
        }
    }, [isAuthenticated, dispatch])

    // Memoized cart count
    const cartCount = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + item.quantity, 0)
    }, [cartItems])

    // Memoized filtered products
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products
        const query = searchQuery.toLowerCase()
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query)
        )
    }, [products, searchQuery])

    // Memoized event handlers
    const handleToggleFavorite = useCallback(
        async (productId: string) => {
            if (!isAuthenticated) {
                router.push('/')
                return
            }

            const isFavorite = favoriteIds.includes(productId)
            if (isFavorite) {
                dispatch(removeFromFavoritesThunk(productId))
            } else {
                dispatch(addToFavoritesThunk(productId))
            }
        },
        [isAuthenticated, favoriteIds, dispatch, router]
    )

    const handleAddToCart = useCallback(
        async (productId: string) => {
            if (!isAuthenticated) {
                router.push('/')
                return
            }

            dispatch(addToCartThunk({ product_id: productId, quantity: 1 }))
        },
        [isAuthenticated, dispatch, router]
    )

    const handleSearch = useCallback(() => {
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
        }
    }, [searchQuery, router])

    return {
        // Data
        products,
        filteredProducts,
        mostFrequentByUser,
        mostFrequentGlobal,
        reviewBasedProducts,
        cartBasedProducts,
        favoriteIds,
        cartCount,
        loading,
        error,
        isAuthenticated,
        // Handlers
        handleToggleFavorite,
        handleAddToCart,
        handleSearch,
    }
}
