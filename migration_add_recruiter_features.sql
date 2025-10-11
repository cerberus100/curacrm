-- Add RECRUITER role to enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'RECRUITER';

-- Add OnboardStatus enum
CREATE TYPE "OnboardStatus" AS ENUM (
  'INVITED',
  'EMAIL_CREATED',
  'CRM_USER_CREATED',
  'PENDING_DOCS',
  'ACTIVE',
  'SUSPENDED'
);

-- Add DocType enum
CREATE TYPE "DocType" AS ENUM (
  'BAA',
  'HIRE_AGREEMENT',
  'W9',
  'OTHER'
);

-- Add DocStatus enum
CREATE TYPE "DocStatus" AS ENUM (
  'PENDING',
  'SENT',
  'SIGNED',
  'REJECTED'
);

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS corp_email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS crm_temp_password VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_temp_password VARCHAR(255),
ADD COLUMN IF NOT EXISTS onboard_status "OnboardStatus" DEFAULT 'INVITED',
ADD COLUMN IF NOT EXISTS recruiter_invited_by_id UUID REFERENCES users(id);

-- Create rep_profiles table
CREATE TABLE IF NOT EXISTS rep_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  total_sales_usd DECIMAL(12, 2) DEFAULT 0,
  total_profit_usd DECIMAL(12, 2) DEFAULT 0,
  active_accounts_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_documents table
CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type "DocType" NOT NULL,
  status "DocStatus" DEFAULT 'PENDING',
  file_key VARCHAR(255),
  envelope_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_corp_email ON users(corp_email);
CREATE INDEX IF NOT EXISTS idx_users_onboard_status ON users(onboard_status);
CREATE INDEX IF NOT EXISTS idx_users_recruiter_invited_by_id ON users(recruiter_invited_by_id);
CREATE INDEX IF NOT EXISTS idx_rep_profiles_user_id ON rep_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_envelope_id ON user_documents(envelope_id);

-- Add updated_at triggers
CREATE TRIGGER update_rep_profiles_updated_at BEFORE UPDATE ON rep_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_documents_updated_at BEFORE UPDATE ON user_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
