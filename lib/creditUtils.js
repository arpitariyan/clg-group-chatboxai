/**
 * Utility functions for credit management
 */

/**
 * Calculate days until next weekly reset
 * @param {string} weekStartDate - ISO date string
 * @returns {number} Days remaining
 */
export function getDaysUntilReset(weekStartDate) {
    if (!weekStartDate) return 0

    const start = new Date(weekStartDate)
    const now = new Date()
    const diffTime = start.getTime() - now.getTime() + (7 * 24 * 60 * 60 * 1000)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return Math.max(0, diffDays)
}

/**
 * Format credit count for display
 * @param {number} count - Credit count
 * @returns {string} Formatted string
 */
export function formatCredits(count) {
    if (count === null || count === undefined) return '0'
    return count.toLocaleString()
}

/**
 * Get credit status (low, medium, high)
 * @param {number} total - Total credits
 * @param {boolean} isPro - Is pro user
 * @returns {string} Status ('low', 'medium', 'high')
 */
export function getCreditStatus(total, isPro) {
    const threshold = isPro ? 20 : 2

    if (total === 0) return 'empty'
    if (total <= threshold) return 'low'
    if (total <= threshold * 3) return 'medium'
    return 'high'
}

/**
 * Get status color class
 * @param {string} status - Credit status
 * @returns {string} Tailwind color class
 */
export function getStatusColor(status) {
    switch (status) {
        case 'empty':
            return 'text-red-500'
        case 'low':
            return 'text-orange-500'
        case 'medium':
            return 'text-yellow-500'
        case 'high':
            return 'text-green-500'
        default:
            return 'text-gray-500'
    }
}

/**
 * Get status background color class
 * @param {string} status - Credit status
 * @returns {string} Tailwind background color class
 */
export function getStatusBgColor(status) {
    switch (status) {
        case 'empty':
            return 'bg-red-500/10 border-red-500/30'
        case 'low':
            return 'bg-orange-500/10 border-orange-500/30'
        case 'medium':
            return 'bg-yellow-500/10 border-yellow-500/30'
        case 'high':
            return 'bg-green-500/10 border-green-500/30'
        default:
            return 'bg-gray-500/10 border-gray-500/30'
    }
}

/**
 * Format time until reset
 * @param {string} weekStartDate - ISO date string
 * @returns {string} Formatted time string
 */
export function formatTimeUntilReset(weekStartDate) {
    const days = getDaysUntilReset(weekStartDate)

    if (days === 0) return 'Resets today'
    if (days === 1) return 'Resets tomorrow'
    return `Resets in ${days} days`
}
