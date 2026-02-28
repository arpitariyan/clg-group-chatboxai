-- Migration: Add website_images table for tracking uploaded and generated images
-- Created: 2026-01-17
-- Purpose: Store and track images used in website builder projects for reusability

-- Create website_images table
CREATE TABLE IF NOT EXISTS website_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES website_projects(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('uploaded', 'generated')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_website_images_project_id ON website_images(project_id);
CREATE INDEX IF NOT EXISTS idx_website_images_type ON website_images(type);
CREATE INDEX IF NOT EXISTS idx_website_images_created_at ON website_images(created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE website_images ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view images from their own projects
CREATE POLICY "Users can view their own project images"
ON website_images
FOR SELECT
USING (
    project_id IN (
        SELECT id FROM website_projects 
        WHERE user_email = auth.jwt()->>'email'
    )
);

-- Policy: Users can insert images to their own projects
CREATE POLICY "Users can insert images to their own projects"
ON website_images
FOR INSERT
WITH CHECK (
    project_id IN (
        SELECT id FROM website_projects 
        WHERE user_email = auth.jwt()->>'email'
    )
);

-- Policy: Users can update images in their own projects
CREATE POLICY "Users can update their own project images"
ON website_images
FOR UPDATE
USING (
    project_id IN (
        SELECT id FROM website_projects 
        WHERE user_email = auth.jwt()->>'email'
    )
);

-- Policy: Users can delete images from their own projects
CREATE POLICY "Users can delete their own project images"
ON website_images
FOR DELETE
USING (
    project_id IN (
        SELECT id FROM website_projects 
        WHERE user_email = auth.jwt()->>'email'
    )
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_website_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS set_updated_at ON website_images;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON website_images
    FOR EACH ROW
    EXECUTE FUNCTION update_website_images_updated_at();

-- Add comments for documentation
COMMENT ON TABLE website_images IS 'Stores images uploaded or generated for website builder projects';
COMMENT ON COLUMN website_images.id IS 'Unique identifier for the image';
COMMENT ON COLUMN website_images.project_id IS 'Reference to the website project';
COMMENT ON COLUMN website_images.image_url IS 'Public URL of the image from Supabase Storage';
COMMENT ON COLUMN website_images.file_path IS 'Storage path in Supabase Storage bucket';
COMMENT ON COLUMN website_images.type IS 'Type of image: uploaded or generated';
COMMENT ON COLUMN website_images.metadata IS 'Additional metadata (original filename, prompt, size, etc.)';
COMMENT ON COLUMN website_images.created_at IS 'Timestamp when the image was created';
COMMENT ON COLUMN website_images.updated_at IS 'Timestamp when the image was last updated';
