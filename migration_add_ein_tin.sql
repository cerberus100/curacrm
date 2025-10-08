-- Migration: Add einTin field to accounts table
-- Run this on your production database

-- Add the ein_tin column to the accounts table
ALTER TABLE accounts 
ADD COLUMN ein_tin CHAR(9);

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'accounts' AND column_name = 'ein_tin';

