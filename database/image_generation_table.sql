-- Create ImageGeneration table for storing AI image generation data
CREATE TABLE IF NOT EXISTS "ImageGeneration" (
    id BIGSERIAL PRIMARY KEY,
    "libId" VARCHAR(255) UNIQUE NOT NULL,
    prompt TEXT NOT NULL,
    "userEmail" VARCHAR(255),
    "selectedModel" VARCHAR(255) NOT NULL,
    "aspectRatio" VARCHAR(50) NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    "referenceImage" TEXT, -- URL to reference image if provided
    "generatedImageUrl" TEXT, -- URL to the generated image
    "generatedImagePath" TEXT, -- Storage path for the generated image
    status VARCHAR(50) DEFAULT 'generating', -- generating, completed, failed
    "errorMessage" TEXT, -- Error message if generation failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "completedAt" TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_imagegeneration_libid" ON "ImageGeneration"("libId");
CREATE INDEX IF NOT EXISTS "idx_imagegeneration_useremail" ON "ImageGeneration"("userEmail");
CREATE INDEX IF NOT EXISTS "idx_imagegeneration_status" ON "ImageGeneration"(status);
CREATE INDEX IF NOT EXISTS "idx_imagegeneration_created_at" ON "ImageGeneration"(created_at);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_imagegeneration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS imagegeneration_updated_at ON "ImageGeneration";
CREATE TRIGGER imagegeneration_updated_at
    BEFORE UPDATE ON "ImageGeneration"
    FOR EACH ROW
    EXECUTE FUNCTION update_imagegeneration_updated_at();

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE "ImageGeneration" ENABLE ROW LEVEL SECURITY;

-- Example policy to allow users to see only their own generations
-- CREATE POLICY "Users can view own image generations" ON "ImageGeneration"
--     FOR SELECT USING (auth.email() = "userEmail");

-- CREATE POLICY "Users can insert own image generations" ON "ImageGeneration"
--     FOR INSERT WITH CHECK (auth.email() = "userEmail");

-- CREATE POLICY "Users can update own image generations" ON "ImageGeneration"
--     FOR UPDATE USING (auth.email() = "userEmail");