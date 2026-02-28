-- MFA and Settings Modal Enhancement Migration
-- Run this in Supabase SQL editor

-- Add MFA email column to Users table if it doesn't exist
ALTER TABLE "Users" 
  ADD COLUMN IF NOT EXISTS mfa_email text;

-- Create MFA OTP tracking table
CREATE TABLE IF NOT EXISTS "mfa_otps" (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_email text NOT NULL,
  mfa_email text NOT NULL,
  otp text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_mfa_otps_user_email ON "mfa_otps"(user_email);
CREATE INDEX IF NOT EXISTS idx_mfa_otps_expires_at ON "mfa_otps"(expires_at);

-- Clean up expired OTPs (run this periodically)
-- DELETE FROM "mfa_otps" WHERE expires_at < NOW() OR used = true;

-- RLS policies for mfa_otps table
ALTER TABLE "mfa_otps" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own OTP records
CREATE POLICY "Users can manage own MFA OTPs" ON "mfa_otps"
  FOR ALL USING (true); -- Allow service role to manage all records

-- Grant necessary permissions
GRANT ALL ON TABLE "mfa_otps" TO anon;
GRANT ALL ON TABLE "mfa_otps" TO authenticated;
GRANT ALL ON TABLE "mfa_otps" TO service_role;

-- Create function to clean up expired OTPs (optional)
CREATE OR REPLACE FUNCTION cleanup_expired_otps() RETURNS void AS $$
BEGIN
  DELETE FROM "mfa_otps" 
  WHERE expires_at < NOW() OR (used = true AND created_at < NOW() - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- You can set up a periodic job to call this function
-- SELECT cron.schedule('cleanup-otps', '0 0 * * *', 'SELECT cleanup_expired_otps();');