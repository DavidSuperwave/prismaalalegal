-- Add channel column to conversations table
ALTER TABLE conversations ADD COLUMN channel TEXT DEFAULT 'fb';

-- Add channel column to leads table for tracking
ALTER TABLE leads ADD COLUMN channel TEXT DEFAULT 'fb';

-- Update existing records to have default channel
UPDATE conversations SET channel = 'fb' WHERE channel IS NULL;
UPDATE leads SET channel = 'fb' WHERE channel IS NULL;
