-- Completely Safe and Idempotent Migration
-- This can be run multiple times without errors
-- Run this in Supabase SQL editor

-- Step 1: Add new columns to Users table (safe with IF NOT EXISTS)
ALTER TABLE "Users" 
  ADD COLUMN IF NOT EXISTS plan text CHECK (plan IN ('free','pro')) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS credits integer DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS subscription_id text,
  ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT 'violet',
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS last_monthly_reset date;

-- Step 2: Create tables (safe with IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "subscriptions" (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_email text NOT NULL,
  razorpay_subscription_id text UNIQUE,
  razorpay_order_id text,
  plan_type text NOT NULL,
  amount integer NOT NULL,
  currency text DEFAULT 'INR',
  status text NOT NULL,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "bug_reports" (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_email text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'open',
  created_at timestamp with time zone DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "usage_logs" (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_email text NOT NULL,
  model text NOT NULL,
  operation_type text DEFAULT 'generation',
  credits_consumed integer NOT NULL,
  credits_remaining integer NOT NULL,
  created_at timestamp with time zone DEFAULT NOW()
);

-- Step 3: Create or replace function (safe with OR REPLACE)
CREATE OR REPLACE FUNCTION reset_monthly_credits() RETURNS void AS $$
BEGIN
  UPDATE "Users"
  SET 
    credits = CASE
      WHEN plan = 'free' THEN 5000
      WHEN plan = 'pro' THEN 25000
      ELSE credits
    END,
    last_monthly_reset = CURRENT_DATE
  WHERE 
    last_monthly_reset IS NULL
    OR (CURRENT_DATE - last_monthly_reset) >= 30;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Set arpitariyanm@gmail.com as Pro user (safe with WHERE clause)
UPDATE "Users" 
SET 
  plan = 'pro',
  credits = GREATEST(credits, 25000), -- Don't reduce credits if higher
  last_monthly_reset = CURRENT_DATE
WHERE email = 'arpitariyanm@gmail.com';

-- Step 5: Create indexes (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_users_plan ON "Users"(plan);
CREATE INDEX IF NOT EXISTS idx_users_email ON "Users"(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_email ON subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_email ON bug_reports(user_email);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_email ON usage_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);

-- Step 6: Enable RLS and create policies (wrapped in DO block for safety)
DO $$
BEGIN
    -- Enable RLS on tables
    BEGIN
        ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        -- RLS already enabled, continue
    END;
    
    BEGIN
        ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        -- RLS already enabled, continue
    END;
    
    BEGIN
        ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        -- RLS already enabled, continue
    END;

    -- Drop and recreate policies to ensure they're correct
    -- Subscriptions policies
    BEGIN
        DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
        DROP POLICY IF EXISTS "Users can insert own subscriptions" ON subscriptions;
        DROP POLICY IF EXISTS "Users can update own subscriptions" ON subscriptions;
        
        CREATE POLICY "Users can view own subscriptions" ON subscriptions
            FOR SELECT USING (user_email = auth.jwt() ->> 'email');
            
        CREATE POLICY "Users can insert own subscriptions" ON subscriptions
            FOR INSERT WITH CHECK (user_email = auth.jwt() ->> 'email');
            
        CREATE POLICY "Users can update own subscriptions" ON subscriptions
            FOR UPDATE USING (user_email = auth.jwt() ->> 'email');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating subscriptions policies: %', SQLERRM;
    END;

    -- Bug reports policies  
    BEGIN
        DROP POLICY IF EXISTS "Users can view own bug reports" ON bug_reports;
        DROP POLICY IF EXISTS "Users can insert own bug reports" ON bug_reports;
        
        CREATE POLICY "Users can view own bug reports" ON bug_reports
            FOR SELECT USING (user_email = auth.jwt() ->> 'email');
            
        CREATE POLICY "Users can insert own bug reports" ON bug_reports
            FOR INSERT WITH CHECK (user_email = auth.jwt() ->> 'email');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating bug_reports policies: %', SQLERRM;
    END;

    -- Usage logs policies
    BEGIN
        DROP POLICY IF EXISTS "Users can view own usage logs" ON usage_logs;
        DROP POLICY IF EXISTS "Users can insert own usage logs" ON usage_logs;
        
        CREATE POLICY "Users can view own usage logs" ON usage_logs
            FOR SELECT USING (user_email = auth.jwt() ->> 'email');
            
        CREATE POLICY "Users can insert own usage logs" ON usage_logs
            FOR INSERT WITH CHECK (user_email = auth.jwt() ->> 'email');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating usage_logs policies: %', SQLERRM;
    END;
END $$;

-- Step 7: Verify setup
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Tables created: subscriptions, bug_reports, usage_logs';
    RAISE NOTICE 'Users table extended with plan system columns';
    RAISE NOTICE 'RLS policies configured for data security';
END $$;