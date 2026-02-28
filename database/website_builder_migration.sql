-- Website Projects Table
CREATE TABLE IF NOT EXISTS website_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    project_name TEXT NOT NULL,
    original_prompt TEXT NOT NULL,
    enhanced_prompt TEXT,
    current_code TEXT,
    current_version_id UUID,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Website Versions Table (for rollback functionality)
CREATE TABLE IF NOT EXISTS website_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES website_projects(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Website Conversation Table (chat history)
CREATE TABLE IF NOT EXISTS website_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES website_projects(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_website_projects_user_email ON website_projects(user_email);
CREATE INDEX IF NOT EXISTS idx_website_projects_is_published ON website_projects(is_published);
CREATE INDEX IF NOT EXISTS idx_website_versions_project_id ON website_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_website_conversations_project_id ON website_conversations(project_id);

-- RLS Policies
-- Note: Since we're using Firebase authentication (not Supabase auth),
-- we'll use permissive policies that allow all authenticated operations.
-- The application layer (API routes) handles authorization.

ALTER TABLE website_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS website_projects_all_policy ON website_projects;
DROP POLICY IF EXISTS website_projects_public_view ON website_projects;
DROP POLICY IF EXISTS website_versions_all_policy ON website_versions;
DROP POLICY IF EXISTS website_conversations_all_policy ON website_conversations;

-- Allow all operations on website_projects (authorization handled in API)
CREATE POLICY website_projects_all_policy ON website_projects
    FOR ALL USING (true);

-- Published projects are viewable by everyone
CREATE POLICY website_projects_public_view ON website_projects
    FOR SELECT USING (is_published = true);

-- Allow all operations on versions (authorization via API)
CREATE POLICY website_versions_all_policy ON website_versions
    FOR ALL USING (true);

-- Allow all operations on conversations (authorization via API)
CREATE POLICY website_conversations_all_policy ON website_conversations
    FOR ALL USING (true);
