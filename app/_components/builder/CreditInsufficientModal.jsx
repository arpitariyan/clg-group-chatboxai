'use client'

import React from 'react'
import { AlertTriangle, Coins, Clock, Crown } from 'lucide-react'
import { formatTimeUntilReset } from '@/lib/creditUtils'

/**
 * Modal shown when user has insufficient credits
 */
export default function CreditInsufficientModal({ 
    isOpen, 
    onClose, 
    onPurchase, 
    credits,
    isPro 
}) {
    if (!isOpen) return null

    const weeklyResetTime = credits?.weekStartDate ? formatTimeUntilReset(credits.weekStartDate) : 'Soon'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative bg-gray-900 rounded-xl shadow-2xl border border-gray-800 max-w-md w-full mx-4">
                {/* Header */}
                <div className="p-6 border-b border-gray-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                            <AlertTriangle className="size-6 text-orange-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">Out of Credits</h2>
                    </div>
                    <p className="text-gray-400 text-sm">
                        You've used all your available credits for website building
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Current Status */}
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-400">Weekly Credits</span>
                            <span className="text-lg font-bold text-white">{credits?.weekly || 0}</span>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-400">Purchased Credits</span>
                            <span className="text-lg font-bold text-white">{credits?.purchased || 0}</span>
                        </div>
                        <div className="pt-3 border-t border-gray-700 flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-300">Total Available</span>
                            <span className="text-xl font-bold text-orange-400">{credits?.total || 0}</span>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                        {/* Wait for Reset */}
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <Clock className="size-5 text-blue-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-medium text-blue-400 mb-1">Wait for Weekly Reset</h3>
                                    <p className="text-sm text-gray-400">
                                        Your {isPro ? '100' : '10'} weekly credits will reset {weeklyResetTime.toLowerCase()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Purchase Credits */}
                        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <Coins className="size-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <h3 className="font-medium text-indigo-400 mb-1">Buy Extra Credits</h3>
                                    <p className="text-sm text-gray-400 mb-3">
                                        Purchase one-time credits to continue building right away
                                    </p>
                                    <button
                                        onClick={() => {
                                            onClose()
                                            onPurchase()
                                        }}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        View Credit Packages
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Upgrade to Pro (if free user) */}
                        {!isPro && (
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Crown className="size-5 text-purple-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-medium text-purple-400 mb-1">Upgrade to Pro</h3>
                                        <p className="text-sm text-gray-400">
                                            Get 100 weekly credits (10x more) and unlock all features
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
