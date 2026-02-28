-- Migration to add subscription date tracking to Users table
-- This adds the subscription_start_date and subscription_end_date columns
-- Run this in Supabase SQL editor

-- Step 1: Add subscription date columns to Users table
ALTER TABLE "Users" 
  ADD COLUMN IF NOT EXISTS subscription_start_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone;

-- Step 2: Add index for efficient subscription status queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_end_date ON "Users"(subscription_end_date);
CREATE INDEX IF NOT EXISTS idx_users_plan_end_date ON "Users"(plan, subscription_end_date);

-- Step 3: Add a computed column helper function to check if subscription is active
CREATE OR REPLACE FUNCTION is_subscription_active(
  plan_type text,
  subscription_end_date timestamp with time zone
) RETURNS boolean AS $$
BEGIN
  -- If no plan or free plan, return false
  IF plan_type IS NULL OR plan_type = 'free' THEN
    RETURN false;
  END IF;
  
  -- If pro plan but no end date, assume active (for legacy users)
  IF plan_type = 'pro' AND subscription_end_date IS NULL THEN
    RETURN true;
  END IF;
  
  -- If pro plan with end date, check if it's still valid
  IF plan_type = 'pro' AND subscription_end_date IS NOT NULL THEN
    RETURN subscription_end_date > NOW();
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Update existing pro users without subscription_end_date
-- This gives them 1 month from now (for testing purposes)
-- In production, you might want to handle this differently
UPDATE "Users" 
SET 
  subscription_start_date = NOW(),
  subscription_end_date = NOW() + INTERVAL '1 month'
WHERE 
  plan = 'pro' 
  AND subscription_end_date IS NULL 
  AND email != 'arpitariyanm@gmail.com'; -- Exclude the special account

-- Step 5: Keep arpitariyanm@gmail.com as permanent Pro without expiry
UPDATE "Users" 
SET 
  plan = 'pro',
  credits = 25000,
  subscription_start_date = '2024-01-01 00:00:00+00',
  subscription_end_date = '2099-12-31 23:59:59+00' -- Far future date
WHERE email = 'arpitariyanm@gmail.com';

-- Step 6: Create a function to automatically downgrade expired subscriptions
CREATE OR REPLACE FUNCTION downgrade_expired_subscriptions() RETURNS integer AS $$
DECLARE
  affected_count integer := 0;
BEGIN
  -- Update expired pro users to free plan (except special accounts)
  UPDATE "Users"
  SET 
    plan = 'free',
    credits = 5000,
    last_monthly_reset = CURRENT_DATE
  WHERE 
    plan = 'pro'
    AND subscription_end_date IS NOT NULL
    AND subscription_end_date <= NOW()
    AND email != 'arpitariyanm@gmail.com'; -- Never downgrade special account
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  -- Log the downgrade action
  INSERT INTO usage_logs (user_email, model, operation_type, credits_consumed, credits_remaining, created_at)
  SELECT 
    email,
    'subscription_system',
    'auto_downgrade',
    0,
    credits,
    NOW()
  FROM "Users"
  WHERE 
    plan = 'free'
    AND subscription_end_date IS NOT NULL
    AND subscription_end_date <= NOW()
    AND email != 'arpitariyanm@gmail.com'
    AND NOT EXISTS (
      SELECT 1 FROM usage_logs 
      WHERE user_email = "Users".email 
      AND operation_type = 'auto_downgrade' 
      AND DATE(created_at) = CURRENT_DATE
    );
  
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create a view for easy subscription status checking
CREATE OR REPLACE VIEW user_subscription_status AS
SELECT 
  id,
  email,
  name,
  plan,
  credits,
  subscription_start_date,
  subscription_end_date,
  is_subscription_active(plan, subscription_end_date) as is_active,
  CASE 
    WHEN plan = 'free' THEN 'Free Plan'
    WHEN plan = 'pro' AND subscription_end_date IS NULL THEN 'Pro Plan (Permanent)'
    WHEN plan = 'pro' AND subscription_end_date > NOW() THEN 
      'Pro Plan (Expires: ' || TO_CHAR(subscription_end_date, 'DD Mon YYYY') || ')'
    WHEN plan = 'pro' AND subscription_end_date <= NOW() THEN 'Pro Plan (Expired)'
    ELSE 'Unknown Plan'
  END as status_description,
  CASE 
    WHEN plan = 'pro' AND subscription_end_date IS NOT NULL AND subscription_end_date > NOW() THEN
      EXTRACT(epoch FROM (subscription_end_date - NOW())) / 86400 -- days remaining
    ELSE 0
  END as days_remaining
FROM "Users";

-- Step 8: Add helpful comments
COMMENT ON COLUMN "Users".subscription_start_date IS 'When the current subscription period started';
COMMENT ON COLUMN "Users".subscription_end_date IS 'When the current subscription period ends (NULL for permanent accounts)';
COMMENT ON FUNCTION is_subscription_active(text, timestamp with time zone) IS 'Returns true if the subscription is currently active';
COMMENT ON FUNCTION downgrade_expired_subscriptions() IS 'Downgrades expired pro users to free plan, returns count affected';
COMMENT ON VIEW user_subscription_status IS 'Easy-to-read view of all user subscription statuses';

-- Step 9: Grant necessary permissions (adjust as needed for your setup)
-- These might not be needed depending on your RLS setup
-- GRANT SELECT ON user_subscription_status TO authenticated;
-- GRANT EXECUTE ON FUNCTION is_subscription_active(text, timestamp with time zone) TO authenticated;