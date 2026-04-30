import { apiRequest, getStoredToken } from "@/config/api"
import {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    createOrder,
} from "@/lib/api/cart"

// Mock the API config and request function
jest.mock("@/config/api", () => ({
    apiRequest: jest.fn(),
    getStoredToken: jest.fn(),
}))

describe("Cart API", () => {
    const mockToken = "mock-token"

    beforeEach(() => {
        jest.clearAllMocks()
            ; (getStoredToken as jest.Mock).mockReturnValue(mockToken)
    })

    describe("getCart", () => {
        it("should fetch cart data when authenticated", async () => {
            const mockCart = { items: [], total: 0 }
                ; (apiRequest as jest.Mock).mockResolvedValue(mockCart)

            const result = await getCart()

            expect(getStoredToken).toHaveBeenCalled()
            expect(apiRequest).toHaveBeenCalledWith("/api/cart", { method: "GET" })
            expect(result).toEqual(mockCart)
        })

        it("should throw error when NOT authenticated", async () => {
            ; (getStoredToken as jest.Mock).mockReturnValue(null)

            await expect(getCart()).rejects.toThrow("Authentication required")
        })
    })

    describe("addToCart", () => {
        it("should add item to cart", async () => {
            const data = { product_id: "1", quantity: 2 }
                ; (apiRequest as jest.Mock).mockResolvedValue({ status: "success" })

            const result = await addToCart(data)

            expect(apiRequest).toHaveBeenCalledWith("/api/cart/items", {
                method: "POST",
                body: JSON.stringify(data),
            })
            expect(result).toEqual({ status: "success" })
        })
    })

    describe("updateCartItem", () => {
        it("should update cart item", async () => {
            const productId = "1"
            const data = { quantity: 3 }
                ; (apiRequest as jest.Mock).mockResolvedValue({ status: "success" })

            const result = await updateCartItem(productId, data)

            expect(apiRequest).toHaveBeenCalledWith(`/api/cart/items/${productId}`, {
                method: "PUT",
                body: JSON.stringify(data),
            })
            expect(result).toEqual({ status: "success" })
        })
    })

    describe("removeCartItem", () => {
        it("should remove cart item", async () => {
            const productId = "1"
                ; (apiRequest as jest.Mock).mockResolvedValue({ status: "success" })

            const result = await removeCartItem(productId)

            expect(apiRequest).toHaveBeenCalledWith(`/api/cart/items/${productId}`, {
                method: "DELETE",
            })
            expect(result).toEqual({ status: "success" })
        })
    })

    describe("clearCart", () => {
        it("should clear the cart", async () => {
            ; (apiRequest as jest.Mock).mockResolvedValue({ status: "success" })

            const result = await clearCart()

            expect(apiRequest).toHaveBeenCalledWith("/api/cart/clear", {
                method: "DELETE",
            })
            expect(result).toEqual({ status: "success" })
        })
    })

    describe("createOrder", () => {
        it("should create an order", async () => {
            ; (apiRequest as jest.Mock).mockResolvedValue({ id: "order-1" })

            const result = await createOrder()

            expect(apiRequest).toHaveBeenCalledWith("/api/orders", {
                method: "POST",
            })
            expect(result).toEqual({ id: "order-1" })
        })
    })
})
