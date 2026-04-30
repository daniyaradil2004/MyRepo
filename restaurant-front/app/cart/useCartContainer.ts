'use client'

import { useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
    fetchCartThunk,
    updateCartItemThunk,
    removeCartItemThunk,
} from '@/store/slices/cartSlice'
import { fetchProductByIdThunk } from '@/store/slices/productsSlice'
import { createOrder } from '@/lib/api/orders'
import { getUserProfile } from '@/lib/api/user'
import type { CartItem, Product } from '@/types'

export interface CartItemWithProduct extends CartItem {
    product?: Product
}

export function useCartContainer() {
    const router = useRouter()
    const dispatch = useAppDispatch()

    // Redux selectors
    const { items, total: subtotal, loading, error } = useAppSelector((state) => state.cart)
    const { productsCache } = useAppSelector((state) => state.products)

    useEffect(() => {
        dispatch(fetchCartThunk())
    }, [dispatch])

    useEffect(() => {
        items.forEach((item) => {
            if (!productsCache[item.product_id]) {
                dispatch(fetchProductByIdThunk(item.product_id))
            }
        })
    }, [items, productsCache, dispatch])

    const cartItemsWithProducts: CartItemWithProduct[] = useMemo(() => {
        return items.map((item) => ({
            ...item,
            product: productsCache[item.product_id],
        }))
    }, [items, productsCache])

    const tax = useMemo(() => subtotal * 0.08, [subtotal])
    const total = useMemo(() => subtotal + tax, [subtotal, tax])

    const updateQuantity = useCallback(
        async (productId: string, quantity: number) => {
            if (quantity <= 0) {
                dispatch(removeCartItemThunk(productId))
            } else {
                dispatch(updateCartItemThunk({ productId, quantity }))
            }
        },
        [dispatch]
    )

    const removeItem = useCallback(
        async (productId: string) => {
            dispatch(removeCartItemThunk(productId))
        },
        [dispatch]
    )

    const handleCheckout = useCallback(async () => {
        try {
            // Validate user profile
            const userProfile = await getUserProfile()
            const missingFields: string[] = []

            if (!userProfile.phone || userProfile.phone.trim() === '') {
                missingFields.push('phone number')
            }

            if (!userProfile.address) {
                missingFields.push('address')
            } else {
                if (!userProfile.address.street || userProfile.address.street.trim() === '') {
                    missingFields.push('street address')
                }
                if (!userProfile.address.city || userProfile.address.city.trim() === '') {
                    missingFields.push('city')
                }
                if (!userProfile.address.state || userProfile.address.state.trim() === '') {
                    missingFields.push('state')
                }
                if (!userProfile.address.zip_code || userProfile.address.zip_code.trim() === '') {
                    missingFields.push('zip code')
                }
                if (!userProfile.address.country || userProfile.address.country.trim() === '') {
                    missingFields.push('country')
                }
            }

            if (missingFields.length > 0) {
                throw new Error(
                    `Please complete your profile before placing an order. Missing: ${missingFields.join(', ')}`
                )
            }

            const order = await createOrder()
            router.push(`/orders/${order.id}`)
        } catch (err: any) {
            throw err
        }
    }, [router])

    return {
        // Data
        cartItemsWithProducts,
        subtotal,
        tax,
        total,
        loading,
        error,
        // Handlers
        updateQuantity,
        removeItem,
        handleCheckout,
    }
}
