-- Migration: Add image-to-image generation tracking to IMAGE_GENERATION collection
-- Purpose: Track generation mode (text-to-image vs image-to-image) and reference image presence
-- Status: Pending - Execute manually via Appwrite Console once schema is ready
-- 
-- Note: This migration adds new optional attributes to the existing IMAGE_GENERATION collection.
-- The attributes are optional to maintain backward compatibility with existing records.
--
-- To execute in Appwrite Console:
-- 1. Go to Appwrite Console > Select Project > Databases
-- 2. Select the database containing IMAGE_GENERATION collection
-- 3. Click on IMAGE_GENERATION collection
-- 4. Click "Attributes" tab
-- 5. Click "Create Attribute" for each new attribute below:

-- Attribute 1: generationType
-- Type: String
-- Size: 50
-- Required: No (Optional)
-- Encrypted: No
-- Default Value: (leave empty)
-- Description: Records whether generation was 'text-to-image' or 'image-to-image'

-- Attribute 2: hasReferenceImage
-- Type: Boolean
-- Required: No (Optional)
-- Encrypted: No
-- Default Value: false
-- Description: Indicates whether original generation used a reference image

/*
APPWRITE COLLECTION SCHEMA UPDATE
==================================

Add these 2 attributes to the existing IMAGE_GENERATION_COLLECTION:

1. generationType (String, Optional)
   - Type: String
   - Size: 50 characters
   - Default: empty string
   - Description: Stores 'text-to-image' or 'image-to-image' to track generation mode

2. hasReferenceImage (Boolean, Optional) 
   - Type: Boolean
   - Default: false
   - Description: Flag indicating if this generation used a reference image

These fields enable:
- UI to display generation type ("Image Edit" vs "Text-to-Image")
- Regenerate flow to preserve generation mode metadata
- Future reference image reuse on regenerate operations

BACKWARD COMPATIBILITY:
All existing records will work with these new optional attributes.
Queries for generationType will return empty/false for pre-migration records.

IMPLEMENTATION STATUS:
- ✅ Backend: Ready (API routes handle generation mode detection)
- ✅ Frontend: Ready (image-gen page displays mode with sensible fallbacks)
- ⏳ Database: Pending this schema update
*/
