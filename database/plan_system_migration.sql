-- Migration for adding plan, credits, and subscription system to Users table
-- Run this in Supabase SQL editor

-- First, let's check the structure of the Users table
-- If you're unsure about the primary key, run this query first to check:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'Users';

-- Add new columns to Users table (matching existing table name)
ALTER TABLE "Users" 
  ADD COLUMN IF NOT EXISTS plan text CHECK (plan IN ('free','pro')) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS credits integer DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS subscription_id text,
  ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT 'violet',
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS last_monthly_reset date;

-- Create subscriptions tracking table
-- Note: Replace 'id' with the actual primary key column name from your Users table
-- Common alternatives: uid, user_id, etc.
CREATE TABLE IF NOT EXISTS "subscriptions" (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_email text REFERENCES "Users"(email),
  razorpay_subscription_id text UNIQUE,
  razorpay_order_id text,
  plan_type text NOT NULL,
  amount integer NOT NULL,
  currency text DEFAULT 'INR',
  status text NOT NULL,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Create bug reports table for settings
CREATE TABLE IF NOT EXISTS "bug_reports" (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_email text REFERENCES "Users"(email),
  title text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'open',
  created_at timestamp with time zone DEFAULT NOW()
);

-- Create usage logs table for analytics
CREATE TABLE IF NOT EXISTS "usage_logs" (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_email text REFERENCES "Users"(email),
  model text NOT NULL,
  operation_type text DEFAULT 'generation',
  credits_consumed integer NOT NULL,
  credits_remaining integer NOT NULL,
  created_at timestamp with time zone DEFAULT NOW()
);

-- Monthly credit reset function
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

-- Set arpitariyanm@gmail.com as permanent Pro user
UPDATE "Users" 
SET 
  plan = 'pro',
  credits = 25000,
  last_monthly_reset = CURRENT_DATE
WHERE email = 'arpitariyanm@gmail.com';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_plan ON "Users"(plan);
CREATE INDEX IF NOT EXISTS idx_users_email ON "Users"(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_email ON subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_email ON bug_reports(user_email);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_email ON usage_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);

-- Enable RLS (Row Level Security) on new tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (user_email = (SELECT email FROM "Users" WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (user_email = (SELECT email FROM "Users" WHERE email = auth.jwt() ->> 'email'));

-- RLS policies for bug reports
CREATE POLICY "Users can view own bug reports" ON bug_reports
  FOR SELECT USING (user_email = (SELECT email FROM "Users" WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert own bug reports" ON bug_reports
  FOR INSERT WITH CHECK (user_email = (SELECT email FROM "Users" WHERE email = auth.jwt() ->> 'email'));

-- RLS policies for usage logs
CREATE POLICY "Users can view own usage logs" ON usage_logs
  FOR SELECT USING (user_email = (SELECT email FROM "Users" WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert own usage logs" ON usage_logs
  FOR INSERT WITH CHECK (user_email = (SELECT email FROM "Users" WHERE email = auth.jwt() ->> 'email'));