import { z } from 'zod'

// Phone validation: 11 digits starting with 8
const phoneRegex = /^8\d{10}$/

export const profileSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
    email: z.string().email('Invalid email address'),
    phone: z
        .string()
        .regex(phoneRegex, 'Phone must be 11 digits starting with 8')
        .optional()
        .or(z.literal('')),
    address: z.object({
        street: z.string().min(1, 'Street is required'),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required'),
        zip_code: z.string().min(1, 'Zip code is required'),
        country: z.string().min(1, 'Country is required'),
    }),
})

export type ProfileFormData = z.infer<typeof profileSchema>
