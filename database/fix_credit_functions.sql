-- COMPLETE FIX for Website Builder Credit System
-- This fixes ALL SQL ambiguity errors in the credit functions
-- Run this entire script in Supabase SQL Editor

-- ============================================================================
-- FUNCTION: deduct_website_credits (FIXED)
-- Deducts credits from user account (weekly first, then purchased)
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_website_credits(
    p_user_email TEXT,
    p_amount INTEGER,
    p_description TEXT DEFAULT 'Credit deduction'
)
RETURNS TABLE(
    success BOOLEAN,
    weekly_credits INTEGER,
    purchased_credits INTEGER,
    total_credits INTEGER,
    message TEXT
) AS $$
DECLARE
    v_record RECORD;
    v_weekly_before INTEGER;
    v_purchased_before INTEGER;
    v_weekly_after INTEGER;
    v_purchased_after INTEGER;
    v_weekly_deduct INTEGER;
    v_purchased_deduct INTEGER;
BEGIN
    -- Get current credits
    SELECT * INTO v_record
    FROM website_user_credits
    WHERE user_email = p_user_email
    FOR UPDATE; -- Lock the row to prevent race conditions
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            0,
            0,
            0,
            'User credit record not found'::TEXT;
        RETURN;
    END IF;
    
    -- Store before values
    v_weekly_before := v_record.weekly_credits;
    v_purchased_before := v_record.purchased_credits;
    
    -- Check if sufficient credits
    IF (v_record.weekly_credits + v_record.purchased_credits) < p_amount THEN
        RETURN QUERY SELECT 
            FALSE,
            v_record.weekly_credits,
            v_record.purchased_credits,
            v_record.weekly_credits + v_record.purchased_credits,
            'Insufficient credits'::TEXT;
        RETURN;
    END IF;
    
    -- Calculate deduction (weekly first, then purchased)
    IF v_record.weekly_credits >= p_amount THEN
        v_weekly_deduct := p_amount;
        v_purchased_deduct := 0;
    ELSE
        v_weekly_deduct := v_record.weekly_credits;
        v_purchased_deduct := p_amount - v_record.weekly_credits;
    END IF;
    
    -- Calculate after values
    v_weekly_after := v_weekly_before - v_weekly_deduct;
    v_purchased_after := v_purchased_before - v_purchased_deduct;
    
    -- Update credits using explicit table qualifiers
    UPDATE website_user_credits
    SET 
        weekly_credits = v_weekly_after,
        purchased_credits = v_purchased_after,
        updated_at = NOW()
    WHERE user_email = p_user_email;
    
    -- Record transaction using explicit values
    INSERT INTO website_credit_transactions (
        user_email,
        transaction_type,
        amount,
        weekly_credits_before,
        weekly_credits_after,
        purchased_credits_before,
        purchased_credits_after,
        description
    ) VALUES (
        p_user_email,
        'deduct',
        p_amount,
        v_weekly_before,
        v_weekly_after,
        v_purchased_before,
        v_purchased_after,
        p_description
    );
    
    -- Return success
    RETURN QUERY SELECT 
        TRUE,
        v_weekly_after,
        v_purchased_after,
        v_weekly_after + v_purchased_after,
        'Credits deducted successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: add_purchased_credits (FIXED)
-- Adds purchased credits to user account
-- ============================================================================
CREATE OR REPLACE FUNCTION add_purchased_credits(
    p_user_email TEXT,
    p_amount INTEGER,
    p_description TEXT DEFAULT 'Credit purchase'
)
RETURNS TABLE(
    success BOOLEAN,
    weekly_credits INTEGER,
    purchased_credits INTEGER,
    total_credits INTEGER,
    message TEXT
) AS $$
DECLARE
    v_record RECORD;
    v_purchased_before INTEGER;
    v_weekly INTEGER;
    v_purchased_after INTEGER;
BEGIN
    -- Get current credits
    SELECT * INTO v_record
    FROM website_user_credits
    WHERE user_email = p_user_email
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            0,
            0,
            0,
            'User credit record not found'::TEXT;
        RETURN;
    END IF;
    
    -- Store values before update
    v_purchased_before := v_record.purchased_credits;
    v_weekly := v_record.weekly_credits;
    v_purchased_after := v_purchased_before + p_amount;
    
    -- Add purchased credits using explicit value
    UPDATE website_user_credits
    SET 
        purchased_credits = v_purchased_after,
        updated_at = NOW()
    WHERE user_email = p_user_email;
    
    -- Record transaction with explicit values
    INSERT INTO website_credit_transactions (
        user_email,
        transaction_type,
        amount,
        weekly_credits_before,
        weekly_credits_after,
        purchased_credits_before,
        purchased_credits_after,
        description
    ) VALUES (
        p_user_email,
        'purchase',
        p_amount,
        v_weekly,
        v_weekly,
        v_purchased_before,
        v_purchased_after,
        p_description
    );
    
    -- Return success
    RETURN QUERY SELECT 
        TRUE,
        v_weekly,
        v_purchased_after,
        v_weekly + v_purchased_after,
        'Credits added successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Verification queries (optional - run after the fixes)
-- ============================================================================
-- Test the functions work:
-- SELECT * FROM get_or_create_user_credits('test@example.com', false);
-- SELECT * FROM deduct_website_credits('test@example.com', 1, 'Test deduction');
