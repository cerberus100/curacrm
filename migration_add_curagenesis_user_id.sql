-- Add curagenesis_user_id column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS curagenesis_user_id VARCHAR(255);

-- Add total_orders column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;

-- Add last_synced_at column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_accounts_curagenesis_user_id ON accounts(curagenesis_user_id);

-- Add is_primary column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- Add provider to ContactType enum if it doesn't exist
ALTER TYPE "ContactType" ADD VALUE IF NOT EXISTS 'provider';
