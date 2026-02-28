-- Database Migration Script for ChatBox AI File Upload Feature
-- Run these SQL commands in your Supabase SQL Editor

-- Add columns to Library table for file upload support
ALTER TABLE "Library" ADD COLUMN IF NOT EXISTS "uploadedFiles" jsonb;
ALTER TABLE "Library" ADD COLUMN IF NOT EXISTS "analyzedFilesCount" integer DEFAULT 0;
ALTER TABLE "Library" ADD COLUMN IF NOT EXISTS "processedAt" timestamp with time zone;

-- Add columns to Chats table for file analysis support  
ALTER TABLE "Chats" ADD COLUMN IF NOT EXISTS "analyzedFilesCount" integer DEFAULT 0;
ALTER TABLE "Chats" ADD COLUMN IF NOT EXISTS "processedFiles" jsonb;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_library_uploaded_files" ON "Library" USING gin ("uploadedFiles");
CREATE INDEX IF NOT EXISTS "idx_library_analyzed_files_count" ON "Library" ("analyzedFilesCount");
CREATE INDEX IF NOT EXISTS "idx_chats_analyzed_files_count" ON "Chats" ("analyzedFilesCount");

-- Add comments to document the new columns
COMMENT ON COLUMN "Library"."uploadedFiles" IS 'JSON array containing file metadata for uploaded files';
COMMENT ON COLUMN "Library"."analyzedFilesCount" IS 'Number of files analyzed in this library entry';
COMMENT ON COLUMN "Library"."processedAt" IS 'Timestamp when file analysis was completed';
COMMENT ON COLUMN "Chats"."analyzedFilesCount" IS 'Number of files analyzed in this chat';
COMMENT ON COLUMN "Chats"."processedFiles" IS 'JSON array containing processed file information';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'Library' 
  AND column_name IN ('uploadedFiles', 'analyzedFilesCount', 'processedAt')
ORDER BY column_name;

SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'Chats' 
  AND column_name IN ('analyzedFilesCount', 'processedFiles')
ORDER BY column_name;