-- Add columns to track selected model information in Library table
ALTER TABLE "Library" 
ADD COLUMN "selectedModel" integer,
ADD COLUMN "modelName" varchar;

-- Add columns to track which model was used for each chat response
ALTER TABLE "Chats" 
ADD COLUMN "usedModel" varchar,
ADD COLUMN "modelApi" varchar;

-- Create an index on the new columns for better query performance
CREATE INDEX idx_library_selected_model ON "Library"("selectedModel");
CREATE INDEX idx_chats_used_model ON "Chats"("usedModel");