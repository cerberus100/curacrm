ALTER TABLE accounts ADD COLUMN IF NOT EXISTS primary_contact_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS primary_contact_position TEXT;
SELECT 'Migration complete - columns added' as status;

