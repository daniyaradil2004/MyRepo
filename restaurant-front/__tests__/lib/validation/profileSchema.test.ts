import { profileSchema } from '@/lib/validation/profileSchema'

describe('profileSchema', () => {
    describe('name validation', () => {
        it('should accept valid name', () => {
            const result = profileSchema.safeParse({
                name: 'John Doe',
                email: 'john@example.com',
                phone: '81234567890',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zip_code: '10001',
                    country: 'USA',
                },
            })

            expect(result.success).toBe(true)
        })

        it('should reject empty name', () => {
            const result = profileSchema.safeParse({
                name: '',
                email: 'john@example.com',
                phone: '81234567890',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zip_code: '10001',
                    country: 'USA',
                },
            })

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].message).toBe('Name is required')
            }
        })
    })

    describe('email validation', () => {
        it('should accept valid email', () => {
            const result = profileSchema.safeParse({
                name: 'John Doe',
                email: 'valid@example.com',
                phone: '81234567890',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zip_code: '10001',
                    country: 'USA',
                },
            })

            expect(result.success).toBe(true)
        })

        it('should reject invalid email', () => {
            const result = profileSchema.safeParse({
                name: 'John Doe',
                email: 'invalid-email',
                phone: '81234567890',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zip_code: '10001',
                    country: 'USA',
                },
            })

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].message).toBe('Invalid email address')
            }
        })
    })

    describe('phone validation', () => {
        it('should accept valid phone number', () => {
            const result = profileSchema.safeParse({
                name: 'John Doe',
                email: 'john@example.com',
                phone: '81234567890',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zip_code: '10001',
                    country: 'USA',
                },
            })

            expect(result.success).toBe(true)
        })

        it('should reject phone not starting with 8', () => {
            const result = profileSchema.safeParse({
                name: 'John Doe',
                email: 'john@example.com',
                phone: '91234567890',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zip_code: '10001',
                    country: 'USA',
                },
            })

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].message).toBe('Phone must be 11 digits starting with 8')
            }
        })

        it('should reject phone with wrong length', () => {
            const result = profileSchema.safeParse({
                name: 'John Doe',
                email: 'john@example.com',
                phone: '8123456789', // Only 10 digits
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zip_code: '10001',
                    country: 'USA',
                },
            })

            expect(result.success).toBe(false)
        })

        it('should accept empty phone', () => {
            const result = profileSchema.safeParse({
                name: 'John Doe',
                email: 'john@example.com',
                phone: '',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zip_code: '10001',
                    country: 'USA',
                },
            })

            expect(result.success).toBe(true)
        })
    })

    describe('address validation', () => {
        it('should require all address fields', () => {
            const result = profileSchema.safeParse({
                name: 'John Doe',
                email: 'john@example.com',
                phone: '81234567890',
                address: {
                    street: '',
                    city: '',
                    state: '',
                    zip_code: '',
                    country: '',
                },
            })

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues.length).toBeGreaterThan(0)
            }
        })

        it('should accept complete address', () => {
            const result = profileSchema.safeParse({
                name: 'John Doe',
                email: 'john@example.com',
                phone: '81234567890',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zip_code: '10001',
                    country: 'USA',
                },
            })

            expect(result.success).toBe(true)
        })
    })
})
