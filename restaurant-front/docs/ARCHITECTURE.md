# FoodFlow Frontend Architecture

## Overview

This document describes the architectural patterns and best practices implemented in the FoodFlow restaurant ordering application.

## State Management - Redux Toolkit

### Store Structure

The application uses Redux Toolkit for centralized state management with the following slices:

- **authSlice**: Authentication state (user, token, loading, error)
- **productsSlice**: Products and recommendations with caching
- **cartSlice**: Shopping cart with optimistic updates
- **favoritesSlice**: User favorites with optimistic updates

### Usage

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loginThunk } from '@/store/slices/authSlice'

// In your component
const dispatch = useAppDispatch()
const { user, isAuthenticated } = useAppSelector((state) => state.auth)

// Dispatch async actions
dispatch(loginThunk({ email, password }))
```

### Async Thunks

All API calls are wrapped in async thunks for consistent error handling and loading states:

- `loginThunk`, `registerThunk`, `logoutThunk`, `validateTokenThunk`
- `fetchProductsThunk`, `fetchRecommendationsThunk`, `fetchProductByIdThunk`
- `fetchCartThunk`, `addToCartThunk`, `updateCartItemThunk`, `removeCartItemThunk`
- `fetchFavoritesThunk`, `addToFavoritesThunk`, `removeFromFavoritesThunk`

## Performance Optimization

### Memoization

#### React.memo for Components

Components are wrapped with `React.memo` to prevent unnecessary re-renders:

```typescript
// ProductCard component
export default memo(ProductCard, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.isFavorite === nextProps.product.isFavorite &&
    // ... other comparisons
  )
})
```

#### useCallback for Event Handlers

Event handlers are memoized to maintain referential equality:

```typescript
const handleAddToCart = useCallback(
  async (productId: string) => {
    dispatch(addToCartThunk({ product_id: productId, quantity: 1 }))
  },
  [dispatch]
)
```

#### useMemo for Computed Values

Expensive calculations are memoized:

```typescript
const filteredProducts = useMemo(() => {
  return products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
}, [products, searchQuery])
```

## Container/Presenter Pattern

### Custom Hooks as Containers

Business logic is separated from UI using custom hooks:

**Container (useHomeContainer.ts)**:
- Redux state management
- API calls via thunks
- Event handlers with useCallback
- Computed values with useMemo
- Returns data and handlers

**Presenter (page.tsx)**:
- Receives props from container hook
- Renders UI only
- No business logic
- Calls handlers passed from container

### Example Usage

```typescript
// Container hook
export function useHomeContainer({ searchQuery, setSearchQuery }) {
  const dispatch = useAppDispatch()
  const products = useAppSelector((state) => state.products.products)
  
  const handleAddToCart = useCallback(async (productId) => {
    dispatch(addToCartThunk({ product_id: productId, quantity: 1 }))
  }, [dispatch])
  
  return { products, handleAddToCart }
}

// Presenter component
export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { products, handleAddToCart } = useHomeContainer({ 
    searchQuery, 
    setSearchQuery 
  })
  
  return (
    <div>
      {products.map(product => (
        <ProductCard 
          key={product.id}
          product={product}
          onAddToCart={handleAddToCart}
        />
      ))}
    </div>
  )
}
```

## Forms with Async Validation

### React Hook Form + Zod

Complex forms use react-hook-form with Zod validation:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema } from '@/lib/validation/profileSchema'

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(profileSchema)
})
```

### Async Validation

Email availability is checked asynchronously with debouncing:

```typescript
import { debouncedEmailValidation } from '@/lib/api/validation'

debouncedEmailValidation(email, (isAvailable) => {
  if (!isAvailable) {
    setError('email', { message: 'Email already taken' })
  }
})
```

## Testing

### Unit Tests

Tests are written using Jest and React Testing Library:

- **Redux Slices**: Test reducers, async thunks, state transitions
- **Components**: Test rendering, user interactions, props
- **Validation**: Test form schemas and validation logic

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Coverage Requirements

Minimum 20% coverage across:
- Branches
- Functions
- Lines
- Statements

## Lazy Loading

Next.js 13+ with App Router automatically code-splits pages. For additional optimization, heavy components can be lazy-loaded:

```typescript
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSkeleton />,
  ssr: false
})
```

## Best Practices

### 1. Always Use Typed Hooks

```typescript
// ✅ Good
import { useAppDispatch, useAppSelector } from '@/store/hooks'

// ❌ Bad
import { useDispatch, useSelector } from 'react-redux'
```

### 2. Memoize Callbacks Passed to Memoized Components

```typescript
// ✅ Good
const handleClick = useCallback(() => {}, [])
<MemoizedComponent onClick={handleClick} />

// ❌ Bad
<MemoizedComponent onClick={() => {}} />
```

### 3. Use useMemo for Expensive Calculations

```typescript
// ✅ Good
const filtered = useMemo(() => 
  items.filter(item => item.active), 
  [items]
)

// ❌ Bad
const filtered = items.filter(item => item.active)
```

### 4. Separate Business Logic from UI

Use custom hooks to extract business logic:

```typescript
// ✅ Good
function useProductLogic() {
  // All business logic here
  return { data, handlers }
}

function ProductPage() {
  const logic = useProductLogic()
  // Only UI here
}

// ❌ Bad
function ProductPage() {
  // Mix of business logic and UI
}
```

### 5. Test Business Logic, Not Implementation Details

```typescript
// ✅ Good
it('should add item to cart', async () => {
  await dispatch(addToCartThunk({ product_id: '1', quantity: 1 }))
  expect(store.getState().cart.items).toHaveLength(1)
})

// ❌ Bad
it('should call API', async () => {
  expect(mockApi).toHaveBeenCalled()
})
```

## File Structure

```
app/
├── home/
│   ├── page.tsx              # Presenter (UI)
│   └── useHomeContainer.ts   # Container (logic)
├── cart/
│   ├── page.tsx              # Presenter (UI)
│   └── useCartContainer.ts   # Container (logic)
store/
├── index.ts                  # Store configuration
├── hooks.ts                  # Typed hooks
├── ReduxProvider.tsx         # Provider wrapper
└── slices/
    ├── authSlice.ts
    ├── productsSlice.ts
    ├── cartSlice.ts
    └── favoritesSlice.ts
components/
├── product-card.tsx          # Memoized component
└── navigation.tsx            # Memoized component
lib/
├── api/                      # API functions
└── validation/               # Zod schemas
__tests__/
├── store/slices/            # Redux tests
├── components/              # Component tests
└── lib/validation/          # Validation tests
```

## Future Enhancements

1. **RTK Query**: Consider migrating to RTK Query for automatic caching and refetching
2. **Optimistic UI**: Expand optimistic updates to more operations
3. **Persistence**: Add Redux persist for offline support
4. **Code Splitting**: Further optimize bundle size with route-based splitting
5. **E2E Tests**: Add Playwright or Cypress for end-to-end testing
