-- Migration for Website Builder Credit System
-- This creates a separate credit system specifically for website builder functionality
-- Run this in Supabase SQL editor

-- ============================================================================
-- TABLE: website_user_credits
-- Stores weekly and purchased credits for each user
-- ============================================================================
CREATE TABLE IF NOT EXISTS website_user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL REFERENCES "Users"(email) ON DELETE CASCADE,
    weekly_credits INTEGER NOT NULL DEFAULT 10,
    purchased_credits INTEGER NOT NULL DEFAULT 0,
    week_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_pro BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user
    UNIQUE(user_email)
);

-- ============================================================================
-- TABLE: website_credit_transactions
-- Records all credit-related transactions for auditing and history
-- ============================================================================
CREATE TABLE IF NOT EXISTS website_credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL REFERENCES "Users"(email) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deduct', 'purchase', 'weekly_reset')),
    amount INTEGER NOT NULL,
    weekly_credits_before INTEGER,
    weekly_credits_after INTEGER,
    purchased_credits_before INTEGER,
    purchased_credits_after INTEGER,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: website_credit_packages
-- Defines available credit packages for purchase
-- ============================================================================
CREATE TABLE IF NOT EXISTS website_credit_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    credits INTEGER NOT NULL,
    price_inr INTEGER NOT NULL, -- Price in INR (rupees)
    display_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique credit amounts
    UNIQUE(credits)
);

-- ============================================================================
-- SEED DATA: Insert credit packages
-- ============================================================================
INSERT INTO website_credit_packages (credits, price_inr, display_name, sort_order)
VALUES 
    (10, 49, '10 Credits Pack', 1),
    (20, 69, '20 Credits Pack', 2),
    (50, 79, '50 Credits Pack', 3),
    (100, 99, '100 Credits Pack', 4)
ON CONFLICT (credits) DO NOTHING;

-- ============================================================================
-- INDEXES: For better query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_website_user_credits_email ON website_user_credits(user_email);
CREATE INDEX IF NOT EXISTS idx_website_user_credits_week_start ON website_user_credits(week_start_date);
CREATE INDEX IF NOT EXISTS idx_website_credit_transactions_email ON website_credit_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_website_credit_transactions_type ON website_credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_website_credit_transactions_created ON website_credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_website_credit_packages_active ON website_credit_packages(is_active);

-- ============================================================================
-- RLS POLICIES: Enable Row Level Security
-- ============================================================================
ALTER TABLE website_user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_credit_packages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS website_user_credits_all_policy ON website_user_credits;
DROP POLICY IF EXISTS website_credit_transactions_all_policy ON website_credit_transactions;
DROP POLICY IF EXISTS website_credit_packages_read_policy ON website_credit_packages;

-- Allow all operations (authorization handled in API layer)
CREATE POLICY website_user_credits_all_policy ON website_user_credits
    FOR ALL USING (true);

CREATE POLICY website_credit_transactions_all_policy ON website_credit_transactions
    FOR ALL USING (true);

-- Credit packages are read-only for everyone
CREATE POLICY website_credit_packages_read_policy ON website_credit_packages
    FOR SELECT USING (is_active = true);

-- ============================================================================
-- FUNCTION: reset_weekly_credits
-- Resets weekly credits for all users whose week has expired (7+ days)
-- ============================================================================
CREATE OR REPLACE FUNCTION reset_weekly_credits() 
RETURNS TABLE(
    user_email TEXT,
    old_credits INTEGER,
    new_credits INTEGER,
    week_start DATE
) AS $$
BEGIN
    RETURN QUERY
    WITH updated_users AS (
        UPDATE website_user_credits
        SET 
            weekly_credits = CASE
                WHEN is_pro THEN 100
                ELSE 10
            END,
            week_start_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE 
            (CURRENT_DATE - week_start_date) >= 7
        RETURNING 
            website_user_credits.user_email,
            0 AS old_weekly_credits, -- We don't have the old value in UPDATE RETURNING
            weekly_credits AS new_weekly_credits,
            week_start_date
    ),
    transaction_records AS (
        INSERT INTO website_credit_transactions (
            user_email,
            transaction_type,
            amount,
            weekly_credits_after,
            purchased_credits_after,
            description
        )
        SELECT 
            u.user_email,
            'weekly_reset',
            u.new_weekly_credits,
            u.new_weekly_credits,
            c.purchased_credits,
            'Weekly credits auto-reset'
        FROM updated_users u
        JOIN website_user_credits c ON c.user_email = u.user_email
        RETURNING 1
    )
    SELECT 
        u.user_email,
        0 AS old_credits,
        u.new_weekly_credits AS new_credits,
        u.week_start_date AS week_start
    FROM updated_users u;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_or_create_user_credits
-- Gets user credits or creates initial record if doesn't exist
-- Also checks if weekly reset is needed
-- ============================================================================
CREATE OR REPLACE FUNCTION get_or_create_user_credits(p_user_email TEXT, p_is_pro BOOLEAN DEFAULT FALSE)
RETURNS TABLE(
    weekly_credits INTEGER,
    purchased_credits INTEGER,
    total_credits INTEGER,
    week_start_date DATE,
    is_pro BOOLEAN
) AS $$
DECLARE
    v_record RECORD;
    v_initial_credits INTEGER;
BEGIN
    -- Determine initial credits based on plan
    v_initial_credits := CASE WHEN p_is_pro THEN 100 ELSE 10 END;
    
    -- Try to get existing record
    SELECT * INTO v_record
    FROM website_user_credits
    WHERE user_email = p_user_email;
    
    -- If no record exists, create one
    IF NOT FOUND THEN
        INSERT INTO website_user_credits (
            user_email,
            weekly_credits,
            purchased_credits,
            week_start_date,
            is_pro
        ) VALUES (
            p_user_email,
            v_initial_credits,
            0,
            CURRENT_DATE,
            p_is_pro
        )
        RETURNING * INTO v_record;
        
        -- Record the initial credit allocation
        INSERT INTO website_credit_transactions (
            user_email,
            transaction_type,
            amount,
            weekly_credits_after,
            purchased_credits_after,
            description
        ) VALUES (
            p_user_email,
            'weekly_reset',
            v_initial_credits,
            v_initial_credits,
            0,
            'Initial credit allocation'
        );
    ELSE
        -- Check if weekly reset is needed (7+ days have passed)
        IF (CURRENT_DATE - v_record.week_start_date) >= 7 THEN
            UPDATE website_user_credits
            SET 
                weekly_credits = v_initial_credits,
                week_start_date = CURRENT_DATE,
                is_pro = p_is_pro,
                updated_at = NOW()
            WHERE user_email = p_user_email
            RETURNING * INTO v_record;
            
            -- Record the reset transaction
            INSERT INTO website_credit_transactions (
                user_email,
                transaction_type,
                amount,
                weekly_credits_after,
                purchased_credits_after,
                description
            ) VALUES (
                p_user_email,
                'weekly_reset',
                v_initial_credits,
                v_initial_credits,
                v_record.purchased_credits,
                'Weekly credits auto-reset'
            );
        END IF;
        
        -- Update pro status if it changed
        IF v_record.is_pro != p_is_pro THEN
            UPDATE website_user_credits
            SET is_pro = p_is_pro, updated_at = NOW()
            WHERE user_email = p_user_email
            RETURNING * INTO v_record;
        END IF;
    END IF;
    
    -- Return the credits
    RETURN QUERY SELECT 
        v_record.weekly_credits,
        v_record.purchased_credits,
        v_record.weekly_credits + v_record.purchased_credits AS total_credits,
        v_record.week_start_date,
        v_record.is_pro;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: deduct_website_credits
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
    
    -- Update credits
    UPDATE website_user_credits
    SET 
        weekly_credits = weekly_credits - v_weekly_deduct,
        purchased_credits = purchased_credits - v_purchased_deduct,
        updated_at = NOW()
    WHERE user_email = p_user_email
    RETURNING * INTO v_record;
    
    -- Record transaction
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
        v_record.weekly_credits,
        v_purchased_before,
        v_record.purchased_credits,
        p_description
    );
    
    -- Return success
    RETURN QUERY SELECT 
        TRUE,
        v_record.weekly_credits,
        v_record.purchased_credits,
        v_record.weekly_credits + v_record.purchased_credits,
        'Credits deducted successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: add_purchased_credits
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
    
    v_purchased_before := v_record.purchased_credits;
    
    -- Add purchased credits
    UPDATE website_user_credits
    SET 
        purchased_credits = purchased_credits + p_amount,
        updated_at = NOW()
    WHERE user_email = p_user_email
    RETURNING * INTO v_record;
    
    -- Record transaction
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
        v_record.weekly_credits,
        v_record.weekly_credits,
        v_purchased_before,
        v_record.purchased_credits,
        p_description
    );
    
    -- Return success
    RETURN QUERY SELECT 
        TRUE,
        v_record.weekly_credits,
        v_record.purchased_credits,
        v_record.weekly_credits + v_record.purchased_credits,
        'Credits added successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- To verify the migration, run:
-- SELECT * FROM website_credit_packages ORDER BY sort_order;
-- SELECT * FROM get_or_create_user_credits('test@example.com', false);
