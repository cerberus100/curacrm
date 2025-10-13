-- Migration: Add team field to users table
-- Purpose: Track which partner organization recruited each sales rep

-- Create Team enum type
CREATE TYPE "Team" AS ENUM ('IN_HOUSE', 'VANTAGE_POINT');

-- Add team column to users table (nullable - only for AGENT role)
ALTER TABLE users ADD COLUMN team "Team";

-- Optional: Set default for existing agents (update as needed)
-- UPDATE users SET team = 'IN_HOUSE' WHERE role = 'AGENT' AND team IS NULL;

-- Create index for faster team-based queries
CREATE INDEX users_team_idx ON users(team) WHERE team IS NOT NULL;

SELECT 'Team field added successfully' as status;

