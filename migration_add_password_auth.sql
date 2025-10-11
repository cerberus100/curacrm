-- Add password field to users table for real authentication
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Update environment variables needed
-- JWT_SECRET="your-secret-key-change-in-production"
