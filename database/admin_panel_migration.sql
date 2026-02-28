-- Migration to add admin-related columns to Users table
-- Run this in Supabase SQL editor

-- Add is_manual_assignment column to track admin-assigned Pro plans
ALTER TABLE "Users" 
  ADD COLUMN IF NOT EXISTS is_manual_assignment boolean DEFAULT false;

-- Add last_login column to track user login activity
ALTER TABLE "Users" 
  ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;

-- Add is_blocked column to block users
ALTER TABLE "Users" 
  ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_is_manual_assignment ON "Users"(is_manual_assignment);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON "Users"(last_login);
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON "Users"(is_blocked);

-- Add comment to document the new columns
COMMENT ON COLUMN "Users"."is_manual_assignment" IS 'Indicates if the Pro plan was manually assigned by admin';
COMMENT ON COLUMN "Users"."last_login" IS 'Timestamp of user last login';
COMMENT ON COLUMN "Users"."is_blocked" IS 'Indicates if the user is blocked from accessing the application';

-- Optional: Create a trigger to update last_login automatically
-- This would require additional setup in your authentication flow

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'Users' 
  AND column_name IN ('is_manual_assignment', 'last_login', 'is_blocked')
ORDER BY column_name;
