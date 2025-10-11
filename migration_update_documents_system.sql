-- Migration: Update Documents System for Onboarding
-- Description: Add RequiredDocumentType table and update UserDocument

-- Update user_documents table
ALTER TABLE user_documents 
  ALTER COLUMN type TYPE VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(500),
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP;

-- Rename columns if they don't have the right mapping
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_documents' AND column_name='created_at') THEN
    ALTER TABLE user_documents RENAME COLUMN "createdAt" TO created_at;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_documents' AND column_name='updated_at') THEN
    ALTER TABLE user_documents RENAME COLUMN "updatedAt" TO updated_at;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS user_documents_user_id_idx ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS user_documents_type_idx ON user_documents(type);

-- Create required_document_types table
CREATE TABLE IF NOT EXISTS required_document_types (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  required BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS required_document_types_active_idx ON required_document_types(active);
CREATE INDEX IF NOT EXISTS required_document_types_order_idx ON required_document_types("order");

-- Insert default required document types
INSERT INTO required_document_types (id, name, code, description, "order", active)
VALUES 
  (gen_random_uuid(), 'W-9 Tax Form', 'w9', 'IRS Form W-9 for tax purposes', 1, true),
  (gen_random_uuid(), 'Business Associate Agreement', 'baa', 'HIPAA Business Associate Agreement', 2, true),
  (gen_random_uuid(), 'Independent Contractor Agreement', 'hire_agreement', 'Employment agreement', 3, true)
ON CONFLICT (code) DO NOTHING;

SELECT 'Document system migration complete' as status;

