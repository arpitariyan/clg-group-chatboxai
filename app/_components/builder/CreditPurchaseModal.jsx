'use client'

import React, { useState, useEffect } from 'react'
import { X, Coins, Loader2, Check } from 'lucide-react'
import { toast } from 'react-toastify'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Modal for purchasing extra website builder credits
 */
export default function CreditPurchaseModal({ isOpen, onClose, onSuccess }) {
    const { currentUser } = useAuth()
    const [packages, setPackages] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedPackage, setSelectedPackage] = useState(null)
    const [purchasing, setPurchasing] = useState(false)

    // Fetch available packages
    useEffect(() => {
        if (isOpen) {
            fetchPackages()
        }
    }, [isOpen])

    const fetchPackages = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/website-builder/credits/packages')
            
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Invalid response type: ${contentType || 'unknown'}`)
            }
            
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch packages')
            }

            setPackages(data.packages)
        } catch (error) {
            console.error('Error fetching packages:', error)
            toast.error('Failed to load credit packages')
        } finally {
            setLoading(false)
        }
    }

    const handlePurchase = async (pkg) => {
        if (!currentUser?.email) {
            toast.error('Please sign in to purchase credits')
            return
        }

        setSelectedPackage(pkg)
        setPurchasing(true)

        try{
            // Create Razorpay order
            const response = await fetch('/api/website-builder/credits/purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    packageId: pkg.id,
                    email: currentUser.email
                }),
            })

            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Invalid response type: ${contentType || 'unknown'}`)
            }

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create order')
            }

            // Initialize Razorpay
            const options = {
                key: data.razorpayKeyId,
                amount: data.order.amount,
                currency: data.order.currency,
                name: 'ChatboxAI',
                description: `${pkg.credits} Website Builder Credits`,
                order_id: data.order.id,
                handler: async function (response) {
                    await verifyPayment(response, pkg.id)
                },
                prefill: {
                    email: currentUser.email,
                },
                theme: {
                    color: '#4F46E5'
                },
                modal: {
                    ondismiss: function() {
                        setPurchasing(false)
                        setSelectedPackage(null)
                    }
                }
            }

            const razorpay = new window.Razorpay(options)
            razorpay.open()

        } catch (error) {
            console.error('Purchase error:', error)
            toast.error(error.message || 'Failed to initiate purchase')
            setPurchasing(false)
            setSelectedPackage(null)
        }
    }

    const verifyPayment = async (paymentResponse, packageId) => {
        try {
            const response = await fetch('/api/website-builder/credits/verify-purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    razorpay_order_id: paymentResponse.razorpay_order_id,
                    razorpay_payment_id: paymentResponse.razorpay_payment_id,
                    razorpay_signature: paymentResponse.razorpay_signature,
                    packageId: packageId,
                    email: currentUser.email
                }),
            })

            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Invalid response type: ${contentType || 'unknown'}`)
            }

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Payment verification failed')
            }

            toast.success(data.message)
            setPurchasing(false)
            setSelectedPackage(null)
            
            if (onSuccess) {
                onSuccess(data.credits)
            }
            
            onClose()

        } catch (error) {
            console.error('Verification error:', error)
            toast.error(error.message || 'Payment verification failed')
            setPurchasing(false)
            setSelectedPackage(null)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative bg-gray-900 rounded-xl shadow-2xl border border-gray-800 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <Coins className="size-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">Purchase Credits</h2>
                            <p className="text-sm text-gray-400">Get extra credits to keep building</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                        disabled={purchasing}
                    >
                        <X className="size-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="size-8 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {packages.map((pkg) => (
                                <div
                                    key={pkg.id}
                                    className={`relative p-6 rounded-xl border-2 transition-all cursor-pointer ${
                                        selectedPackage?.id === pkg.id
                                            ? 'border-indigo-500 bg-indigo-500/10'
                                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                                    }`}
                                    onClick={() => !purchasing && handlePurchase(pkg)}
                                >
                                    {pkg.credits === 50 && (
                                        <div className="absolute -top-3 right-4 bg-linear-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                            BEST VALUE
                                        </div>
                                    )}
                                    
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-white mb-2">
                                            {pkg.credits}
                                        </div>
                                        <div className="text-sm text-gray-400 mb-4">Credits</div>
                                        
                                        <div className="text-2xl font-bold text-indigo-400 mb-4">
                                            ₹{pkg.priceInr}
                                        </div>

                                        <button
                                            disabled={purchasing}
                                            className={`w-full py-2.5 rounded-lg font-medium transition-all ${
                                                purchasing && selectedPackage?.id === pkg.id
                                                    ? 'bg-indigo-600 text-white cursor-not-allowed'
                                                    : selectedPackage?.id === pkg.id
                                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                                            }`}
                                        >
                                            {purchasing && selectedPackage?.id === pkg.id ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <Loader2 className="size-4 animate-spin" />
                                                    Processing...
                                                </span>
                                            ) : (
                                                'Buy Now'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && (
                        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Check className="size-5 text-blue-400 mt-0.5 shrink-0" />
                                <div className="text-sm text-gray-300">
                                    <p className="font-medium text-blue-400 mb-1">One-time Purchase</p>
                                    <p className="text-gray-400">
                                        Purchased credits are separate from your weekly credits and only used once.
                                        Your weekly credits will continue to reset every week.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Load Razorpay script */}
            <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
        </div>
    )
}
