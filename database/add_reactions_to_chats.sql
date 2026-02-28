-- Migration to add like and dislike columns to Chats table
-- Run this in your Supabase SQL editor

-- Add columns if they don't exist
DO $$ 
BEGIN 
    -- Add liked column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Chats' AND column_name = 'liked'
    ) THEN
        ALTER TABLE "Chats" ADD COLUMN "liked" BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add disliked column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Chats' AND column_name = 'disliked'
    ) THEN
        ALTER TABLE "Chats" ADD COLUMN "disliked" BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add updated_at column if it doesn't exist for tracking changes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Chats' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE "Chats" ADD COLUMN "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create or update trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS update_chats_updated_at ON "Chats";
CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON "Chats"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for better performance on reactions
CREATE INDEX IF NOT EXISTS idx_chats_reactions ON "Chats" (liked, disliked);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'Chats' 
AND column_name IN ('liked', 'disliked', 'updated_at')
ORDER BY column_name;