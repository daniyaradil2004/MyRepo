export interface UserOrderHistory {
  userId: string
  orders: {
    itemId: number
    itemName: string
    quantity: number
    timestamp: Date
  }[]
}

export interface CoOccurrenceData {
  [itemId: number]: {
    [coItemId: number]: number // frequency of co-occurrence
  }
}

// Mock co-occurrence data (would come from Neo4j in production)
export const mockCoOccurrenceMatrix: CoOccurrenceData = {
  1: { 2: 8, 4: 5, 5: 3 }, // Pizza often bought with Salad, Pasta
  2: { 1: 8, 3: 6, 4: 4 }, // Salad often bought with Pizza, Burger
  3: { 2: 6, 5: 7, 6: 4 }, // Burger often bought with Salad, Tacos
  4: { 1: 5, 3: 4, 5: 9 }, // Pasta often bought with Pizza, Tacos
  5: { 3: 7, 4: 9, 6: 8 }, // Tacos often bought with Burger, Pasta, Curry
  6: { 4: 4, 5: 8 }, // Curry often bought with Pasta, Tacos
}

/**
 * Get most frequently ordered items for a user
 * Used when user first opens the app
 */
export function getMostFrequentlyOrderedItems(orderHistory: UserOrderHistory["orders"], topN = 3) {
  const itemFrequency: { [key: number]: number } = {}

  orderHistory.forEach((order) => {
    itemFrequency[order.itemId] = (itemFrequency[order.itemId] || 0) + order.quantity
  })

  return Object.entries(itemFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([itemId]) => Number.parseInt(itemId))
}

/**
 * Get collaborative filtering recommendations based on co-occurrence
 * Used when item is added to cart
 */
export function getCoOccurrenceRecommendations(cartItems: number[], allItemIds: number[], topN = 4) {
  const scoreMap: { [key: number]: number } = {}

  // Calculate recommendation scores based on co-occurrence
  cartItems.forEach((cartItemId) => {
    const coOccurrences = mockCoOccurrenceMatrix[cartItemId as keyof CoOccurrenceData] || {}
    Object.entries(coOccurrences).forEach(([itemId, frequency]) => {
      const numItemId = Number.parseInt(itemId)
      if (!cartItems.includes(numItemId)) {
        scoreMap[numItemId] = (scoreMap[numItemId] || 0) + frequency
      }
    })
  })

  // Sort by score and return top N
  return Object.entries(scoreMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([itemId]) => Number.parseInt(itemId))
}

/**
 * User-based collaborative filtering simulation
 * In production, this would query Neo4j for similar users
 */
export function getUserBasedRecommendations(currentUserPreferences: number[], topN = 4) {
  // Mock: simulate finding similar users' preferences
  const similarUserPreferences = [
    [1, 2, 4, 6],
    [2, 3, 5],
    [1, 3, 4, 5],
  ]

  const recommendationScores: { [key: number]: number } = {}

  similarUserPreferences.forEach((userPrefs) => {
    userPrefs.forEach((itemId) => {
      if (!currentUserPreferences.includes(itemId)) {
        recommendationScores[itemId] = (recommendationScores[itemId] || 0) + 1
      }
    })
  })

  return Object.entries(recommendationScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([itemId]) => Number.parseInt(itemId))
}
