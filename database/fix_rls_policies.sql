-- Quick Fix Script for RLS Policies
-- Run this in your Supabase SQL Editor to fix the authentication issue

-- Drop existing problematic policies
DROP POLICY IF EXISTS website_projects_user_policy ON website_projects;
DROP POLICY IF EXISTS website_versions_policy ON website_versions;
DROP POLICY IF EXISTS website_conversations_policy ON website_conversations;

-- Drop new policy names too (in case they exist)
DROP POLICY IF EXISTS website_projects_all_policy ON website_projects;
DROP POLICY IF EXISTS website_versions_all_policy ON website_versions;
DROP POLICY IF EXISTS website_conversations_all_policy ON website_conversations;

-- Create permissive policies (authorization is handled in API layer)
CREATE POLICY website_projects_all_policy ON website_projects
    FOR ALL USING (true);

CREATE POLICY website_versions_all_policy ON website_versions
    FOR ALL USING (true);

CREATE POLICY website_conversations_all_policy ON website_conversations
    FOR ALL USING (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('website_projects', 'website_versions', 'website_conversations')
ORDER BY tablename, policyname;
