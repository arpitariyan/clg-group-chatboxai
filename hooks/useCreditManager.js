'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Custom hook for managing website builder credits
 * Handles fetching, refreshing, and check operations for user credits
 */
export function useCreditManager() {
    const { currentUser } = useAuth()
    const [credits, setCredits] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Fetch credits from API
    const fetchCredits = useCallback(async () => {
        if (!currentUser?.email) {
            setCredits(null)
            setLoading(false)
            return
        }

        try {
            setError(null)
            const response = await fetch(`/api/website-builder/credits?email=${encodeURIComponent(currentUser.email)}`)
            const contentType = response.headers.get('content-type')
            
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Invalid response type: ${contentType || 'unknown'}`)
            }
            
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch credits')
            }

            setCredits(data.credits)
        } catch (err) {
            console.error('Error fetching credits:', err)
            setError(err.message)
            setCredits(null)
        } finally {
            setLoading(false)
        }
    }, [currentUser?.email])

    // Check if user has sufficient credits
    const hasCredits = useCallback((amount = 1) => {
        if (!credits) return false
        return credits.total >= amount
    }, [credits])

    // Refresh credits (useful after operations)
    const refreshCredits = useCallback(async () => {
        setLoading(true)
        await fetchCredits()
    }, [fetchCredits])

    // Deduct credits (optimistic update)
    const deductCredits = useCallback(async (amount, description) => {
        if (!credits) {
            throw new Error('Credits not loaded')
        }

        if (!hasCredits(amount)) {
            throw new Error('Insufficient credits')
        }

        // Optimistic update
        const oldCredits = { ...credits }
        setCredits(prev => ({
            ...prev,
            total: prev.total - amount
        }))

        try {
            const response = await fetch('/api/website-builder/credits/deduct', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: currentUser.email,
                    amount,
                    description
                }),
            })

            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Invalid response type: ${contentType || 'unknown'}`)
            }

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to deduct credits')
            }

            setCredits(data.credits)
            return data.credits
        } catch (err) {
            // Revert optimistic update on error
            setCredits(oldCredits)
            throw err
        }
    }, [credits, currentUser?.email, hasCredits])

    // Initial fetch
    useEffect(() => {
        if (currentUser?.email) {
            fetchCredits()
        }
    }, [currentUser?.email, fetchCredits])

    return {
        credits,
        loading,
        error,
        hasCredits,
        refreshCredits,
        deductCredits,
        // Helper computed values
        weeklyCredits: credits?.weekly || 0,
        purchasedCredits: credits?.purchased || 0,
        totalCredits: credits?.total || 0,
        isPro: credits?.isPro || false
    }
}

export default useCreditManager
