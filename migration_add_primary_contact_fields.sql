-- Add primary contact fields to accounts table
ALTER TABLE accounts 
  ADD COLUMN IF NOT EXISTS primary_contact_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS primary_contact_position VARCHAR(255);

SELECT 'Primary contact fields added to accounts table' as status;

