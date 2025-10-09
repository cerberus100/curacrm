-- Add curagenesis_user_id column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS curagenesis_user_id VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_accounts_curagenesis_user_id ON accounts(curagenesis_user_id);

-- Add is_primary column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- Add provider to ContactType enum if it doesn't exist
ALTER TYPE "ContactType" ADD VALUE IF NOT EXISTS 'provider';
