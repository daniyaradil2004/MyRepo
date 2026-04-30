import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProductCard from '@/components/product-card'

describe('ProductCard', () => {
    const mockProduct = {
        id: '1',
        name: 'Test Product',
        price: 19.99,
        category: 'Test Category',
        rating: 4.5,
        image: '/test-image.jpg',
        isFavorite: false,
    }

    const mockOnToggleFavorite = jest.fn()
    const mockOnAddToCart = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should render product information correctly', () => {
        render(
            <ProductCard
                product={mockProduct}
                onToggleFavorite={mockOnToggleFavorite}
                onAddToCart={mockOnAddToCart}
            />
        )

        expect(screen.getByText('Test Product')).toBeInTheDocument()
        expect(screen.getByText('Test Category')).toBeInTheDocument()
        expect(screen.getByText('$19.99')).toBeInTheDocument()
        expect(screen.getByText('4.5')).toBeInTheDocument()
    })

    it('should call onToggleFavorite when favorite button is clicked', async () => {
        const user = userEvent.setup()

        render(
            <ProductCard
                product={mockProduct}
                onToggleFavorite={mockOnToggleFavorite}
                onAddToCart={mockOnAddToCart}
            />
        )

        const favoriteButton = screen.getAllByRole('button')[0]
        await user.click(favoriteButton)

        expect(mockOnToggleFavorite).toHaveBeenCalledWith('1')
        expect(mockOnToggleFavorite).toHaveBeenCalledTimes(1)
    })

    it('should call onAddToCart when add to cart button is clicked', async () => {
        const user = userEvent.setup()

        render(
            <ProductCard
                product={mockProduct}
                onToggleFavorite={mockOnToggleFavorite}
                onAddToCart={mockOnAddToCart}
            />
        )

        const addToCartButton = screen.getAllByRole('button')[1]
        await user.click(addToCartButton)

        expect(mockOnAddToCart).toHaveBeenCalledWith('1')
        expect(mockOnAddToCart).toHaveBeenCalledTimes(1)
    })

    it('should display favorite state correctly', () => {
        const favoriteProduct = { ...mockProduct, isFavorite: true }

        const { rerender } = render(
            <ProductCard
                product={mockProduct}
                onToggleFavorite={mockOnToggleFavorite}
                onAddToCart={mockOnAddToCart}
            />
        )

        // Check unfavorite state
        let favoriteButton = screen.getAllByRole('button')[0]
        let heartIcon = favoriteButton.querySelector('svg')
        expect(heartIcon).not.toHaveClass('fill-destructive')

        // Rerender with favorite state
        rerender(
            <ProductCard
                product={favoriteProduct}
                onToggleFavorite={mockOnToggleFavorite}
                onAddToCart={mockOnAddToCart}
            />
        )

        favoriteButton = screen.getAllByRole('button')[0]
        heartIcon = favoriteButton.querySelector('svg')
        expect(heartIcon).toHaveClass('fill-destructive')
    })

    it('should display recommended badge when product is recommended', () => {
        const recommendedProduct = { ...mockProduct, recommended: true }

        render(
            <ProductCard
                product={recommendedProduct}
                onToggleFavorite={mockOnToggleFavorite}
                onAddToCart={mockOnAddToCart}
            />
        )

        expect(screen.getByText('Recommended')).toBeInTheDocument()
    })

    it('should not display recommended badge when product is not recommended', () => {
        render(
            <ProductCard
                product={mockProduct}
                onToggleFavorite={mockOnToggleFavorite}
                onAddToCart={mockOnAddToCart}
            />
        )

        expect(screen.queryByText('Recommended')).not.toBeInTheDocument()
    })
})
