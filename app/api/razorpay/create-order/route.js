import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request) {
  try {
    // Check if Razorpay credentials are configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials not configured');
      return NextResponse.json(
        { 
          error: 'Payment system configuration error',
          details: 'Razorpay credentials are not properly configured'
        },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { amount, currency = 'INR', receipt, userEmail } = await request.json();

    // Validate request
    if (!amount || amount < 100) { // Minimum amount 1 INR (100 paisa)
      return NextResponse.json(
        { error: 'Invalid amount. Minimum amount is ₹1.' },
        { status: 400 }
      );
    }

    // Generate or validate receipt (must be under 40 characters)
    let finalReceipt = receipt;
    if (!finalReceipt) {
      finalReceipt = `pro_${Date.now()}`;
    }
    
    // Ensure receipt is under 40 characters
    if (finalReceipt.length > 40) {
      finalReceipt = finalReceipt.substring(0, 40);
    }

    console.log('Creating Razorpay order:', { amount, currency, receipt: finalReceipt });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount, // Amount in paisa
      currency: currency,
      receipt: finalReceipt,
      payment_capture: 1, // Auto capture payment
    });

    console.log('Razorpay order created successfully:', order.id);

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      created_at: order.created_at
    });

  } catch (error) {
    console.error('Razorpay order creation error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create payment order';
    let errorDetails = '';

    // Handle Razorpay-specific error structure
    if (error.error && error.error.description) {
      errorDetails = error.error.description;
      if (errorDetails.includes('receipt')) {
        errorMessage = 'Invalid receipt format';
      } else if (errorDetails.includes('amount')) {
        errorMessage = 'Invalid payment amount';
      }
    } else if (error.message) {
      errorDetails = error.message;
      if (error.message.includes('authentication')) {
        errorMessage = 'Payment authentication failed';
        errorDetails = 'Invalid Razorpay credentials';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error occurred';
        errorDetails = 'Please check your internet connection';
      }
    } else {
      errorDetails = 'An unexpected error occurred';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}