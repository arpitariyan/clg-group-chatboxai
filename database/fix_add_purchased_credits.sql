-- Fix for add_purchased_credits function
-- Run this in Supabase SQL Editor to replace the existing function

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
    
    -- Add purchased credits
    UPDATE website_user_credits
    SET 
        purchased_credits = website_user_credits.purchased_credits + p_amount,
        updated_at = NOW()
    WHERE user_email = p_user_email
    RETURNING website_user_credits.purchased_credits INTO v_purchased_after;
    
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
