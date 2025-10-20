-- CuraGenesis CRM - Database Initialization Script
-- Run this ONCE before deploying the CRM for the first time
-- This creates all base tables that the startup script expects to exist

-- ============================================================================
-- STEP 1: Create Users Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email TEXT UNIQUE NOT NULL,
  corp_email TEXT UNIQUE,
  name TEXT NOT NULL,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'AGENT',
  active BOOLEAN DEFAULT true,
  onboard_status TEXT DEFAULT 'INVITED',
  onboarded_at TIMESTAMPTZ,
  first_login_at TIMESTAMPTZ,
  recruiter_invited_by_id TEXT,
  baa_completed BOOLEAN DEFAULT false,
  baa_completed_at TIMESTAMPTZ,
  w9_completed BOOLEAN DEFAULT false,
  w9_completed_at TIMESTAMPTZ,
  password_reset_required BOOLEAN DEFAULT false,
  email_temp_password TEXT,
  crm_temp_password TEXT,
  workmail_user_id TEXT,
  department TEXT,
  manager_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_active_idx ON users(active);

-- ============================================================================
-- STEP 2: Create Accounts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  practice_name TEXT NOT NULL,
  specialty TEXT,
  state TEXT,
  npi_org TEXT,
  ein_tin TEXT,
  phone_display TEXT,
  phone_e164 TEXT,
  email TEXT,
  website TEXT,
  ehr_system TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  zip TEXT,
  lead_source TEXT,
  status TEXT DEFAULT 'PENDING',
  owner_rep_id TEXT REFERENCES users(id),
  curagenesis_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS accounts_owner_rep_idx ON accounts(owner_rep_id);
CREATE INDEX IF NOT EXISTS accounts_status_idx ON accounts(status);
CREATE INDEX IF NOT EXISTS accounts_state_idx ON accounts(state);

-- ============================================================================
-- STEP 3: Create Contacts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL,
  full_name TEXT NOT NULL,
  npi_individual TEXT,
  title TEXT,
  email TEXT,
  phone_display TEXT,
  phone_e164 TEXT,
  preferred_contact_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contacts_account_idx ON contacts(account_id);

-- ============================================================================
-- STEP 4: Create Submissions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  submitted_by_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  idempotency_key TEXT UNIQUE NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  http_code INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS submissions_account_idx ON submissions(account_id);
CREATE INDEX IF NOT EXISTS submissions_status_idx ON submissions(status);
CREATE INDEX IF NOT EXISTS submissions_idempotency_idx ON submissions(idempotency_key);

-- ============================================================================
-- STEP 5: Create Activity Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  "entityType" VARCHAR(255),
  entity_id VARCHAR(255),
  entity_name VARCHAR(255),
  details TEXT,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log("entityType", entity_id);

-- ============================================================================
-- STEP 6: Create Rep Profiles Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS rep_profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_sales_usd NUMERIC(12,2) DEFAULT 0,
  total_profit_usd NUMERIC(12,2) DEFAULT 0,
  total_accounts_count INT DEFAULT 0,
  active_accounts_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rep_profiles_user_id_idx ON rep_profiles(user_id);

-- ============================================================================
-- STEP 7: Create Onboarding Tokens Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS onboarding_tokens_token_idx ON onboarding_tokens(token);
CREATE INDEX IF NOT EXISTS onboarding_tokens_user_idx ON onboarding_tokens(user_id);

-- ============================================================================
-- STEP 8: Create Settings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS settings_key_idx ON settings(key);

-- ============================================================================
-- STEP 9: Create Invite Tokens Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS invite_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  temp_password TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by_id TEXT,
  role TEXT DEFAULT 'AGENT',
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invite_tokens_token_idx ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS invite_tokens_email_idx ON invite_tokens(email);

-- ============================================================================
-- STEP 10: Create Documents Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS library_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INT,
  uploaded_by_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_recipients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  document_id TEXT NOT NULL REFERENCES library_documents(id) ON DELETE CASCADE,
  rep_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'SENT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_recipients_document_idx ON document_recipients(document_id);
CREATE INDEX IF NOT EXISTS document_recipients_rep_idx ON document_recipients(rep_id);

CREATE TABLE IF NOT EXISTS user_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  file_name TEXT,
  file_key TEXT,
  mime_type TEXT,
  size_bytes INT,
  status TEXT DEFAULT 'PENDING',
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_documents_user_idx ON user_documents(user_id);

-- ============================================================================
-- STEP 11: Create Mail Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS mail_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  subject TEXT,
  snippet TEXT,
  received_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  has_attachments BOOLEAN DEFAULT FALSE,
  attachment_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mail_messages_user_idx ON mail_messages(user_id);
CREATE INDEX IF NOT EXISTS mail_messages_folder_idx ON mail_messages(folder);

-- ============================================================================
-- DONE!
-- ============================================================================

-- Verify tables were created
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

