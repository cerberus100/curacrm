-- Complete database migration to sync with Prisma schema

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS corp_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS crm_temp_password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_temp_password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recruiter_invited_by_id TEXT;

-- Create OnboardStatus enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "OnboardStatus" AS ENUM ('INVITED', 'EMAIL_CREATED', 'CRM_USER_CREATED', 'PENDING_DOCS', 'ACTIVE', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add onboard_status column
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboard_status "OnboardStatus" DEFAULT 'ACTIVE';

-- Add RECRUITER to Role enum if it doesn't exist
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'RECRUITER';

-- Add unique constraint on corp_email
CREATE UNIQUE INDEX IF NOT EXISTS users_corp_email_key ON users(corp_email);

-- Add foreign key for recruiter relationship
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_recruiter_invited_by_id_fkey 
  FOREIGN KEY (recruiter_invited_by_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Create DocType and DocStatus enums
DO $$ BEGIN
    CREATE TYPE "DocType" AS ENUM ('BAA', 'HIRE_AGREEMENT', 'W9', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DocStatus" AS ENUM ('PENDING', 'SENT', 'SIGNED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create rep_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS rep_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  total_sales_usd DECIMAL(12,2) DEFAULT 0,
  total_profit_usd DECIMAL(12,2) DEFAULT 0,
  active_accounts_count INTEGER DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Create user_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type "DocType" NOT NULL,
  status "DocStatus" DEFAULT 'PENDING',
  file_key TEXT,
  envelope_id TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Create vendors table if it doesn't exist
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  phone TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  category TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Create orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  practice_id TEXT NOT NULL,
  account_id TEXT,
  order_date TIMESTAMP(3) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Create order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  vendor_product_id TEXT,
  unit_cost_usd DECIMAL(10,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (vendor_product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Update existing users to have ACTIVE onboard_status
UPDATE users SET onboard_status = 'ACTIVE' WHERE onboard_status IS NULL;

-- Confirm migration
SELECT 'Migration completed successfully!' as status;
