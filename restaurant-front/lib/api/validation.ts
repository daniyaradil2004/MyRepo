import { getStoredToken } from '@/config/api'

// Simulated async email validation
// In a real app, this would call an API endpoint
export async function checkEmailAvailability(email: string): Promise<boolean> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // For demo purposes, consider these emails as taken
    const takenEmails = ['test@example.com', 'admin@foodflow.com', 'user@test.com']

    return !takenEmails.includes(email.toLowerCase())
}

// Debounced async validation
let debounceTimer: NodeJS.Timeout | null = null

export function debouncedEmailValidation(
    email: string,
    callback: (isAvailable: boolean) => void,
    delay: number = 800
) {
    if (debounceTimer) {
        clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(async () => {
        const isAvailable = await checkEmailAvailability(email)
        callback(isAvailable)
    }, delay)
}
