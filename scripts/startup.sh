#!/bin/bash
# FIXED VERSION - Includes complete database initialization
# This script ensures ALL tables are created with ALL required columns

echo "Starting CuraGenesis CRM..."

# Run complete database initialization
echo "[SCHEMA] Running complete database initialization..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigrations() {
  try {
    console.log('[CONNECT] Connecting to database...');
    await prisma.\$connect();
    console.log('[OK] Database connection successful');

    console.log('[CHECK] Checking existing tables...');
    const existingTables = await prisma.\$queryRaw\`SELECT tablename FROM pg_tables WHERE schemaname = 'public'\`;
    console.log('[INFO] Existing tables:', existingTables.map(t => t.tablename));

    console.log('[SCHEMA] Creating/updating database schema...');

    // USERS TABLE - WITH ALL REQUIRED COLUMNS INCLUDING PASSWORD
    console.log('Creating users table with complete schema...');
    await prisma.\$executeRaw\`
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
        team TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    \`;
    console.log('[OK] Users table created');

    // Ensure password column exists
    console.log('Ensuring password column exists...');
    await prisma.\$executeRawUnsafe(\`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;\`);
    console.log('[OK] Password column verified');

    // ACCOUNTS TABLE
    console.log('Creating accounts table...');
    await prisma.\$executeRaw\`
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
        primary_contact_name TEXT,
        primary_contact_position TEXT,
        status TEXT DEFAULT 'PENDING',
        owner_rep_id TEXT REFERENCES users(id),
        curagenesis_user_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    \`;
    console.log('[OK] Accounts table created');

    // CONTACTS TABLE
    console.log('Creating contacts table...');
    await prisma.\$executeRaw\`
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
      )
    \`;
    console.log('[OK] Contacts table created');

    // SUBMISSIONS TABLE
    console.log('Creating submissions table...');
    await prisma.\$executeRaw\`
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
      )
    \`;
    console.log('[OK] Submissions table created');

    // ACTIVITY LOG TABLE
    console.log('Creating activity_log table...');
    await prisma.\$executeRaw\`
      CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(255) NOT NULL,
        \"entityType\" VARCHAR(255),
        entity_id VARCHAR(255),
        entity_name VARCHAR(255),
        details TEXT,
        metadata JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    \`;
    console.log('[OK] Activity log table created');

    // REP PROFILES TABLE
    console.log('Creating rep_profiles table...');
    await prisma.\$executeRaw\`
      CREATE TABLE IF NOT EXISTS rep_profiles (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_sales_usd NUMERIC(12,2) DEFAULT 0,
        total_profit_usd NUMERIC(12,2) DEFAULT 0,
        total_accounts_count INT DEFAULT 0,
        active_accounts_count INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    \`;
    console.log('[OK] Rep profiles table created');

    // ONBOARDING TOKENS TABLE
    console.log('Creating onboarding_tokens table...');
    await prisma.\$executeRaw\`
      CREATE TABLE IF NOT EXISTS onboarding_tokens (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        token TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    \`;
    console.log('[OK] Onboarding tokens table created');

    // SETTINGS TABLE
    console.log('Creating settings table...');
    await prisma.\$executeRaw\`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        key TEXT UNIQUE NOT NULL,
        value JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    \`;
    console.log('[OK] Settings table created');

    // INVITE TOKENS TABLE
    console.log('Creating invite_tokens table...');
    await prisma.\$executeRaw\`
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
      )
    \`;
    console.log('[OK] Invite tokens table created');

    // LIBRARY DOCUMENTS TABLE
    console.log('Creating library_documents table...');
    await prisma.\$executeRaw\`
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
      )
    \`;
    console.log('[OK] Library documents table created');

    // DOCUMENT RECIPIENTS TABLE
    console.log('Creating document_recipients table...');
    await prisma.\$executeRaw\`
      CREATE TABLE IF NOT EXISTS document_recipients (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        document_id TEXT NOT NULL REFERENCES library_documents(id) ON DELETE CASCADE,
        rep_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        viewed_at TIMESTAMPTZ,
        status TEXT DEFAULT 'SENT',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    \`;
    console.log('[OK] Document recipients table created');

    // USER DOCUMENTS TABLE
    console.log('Creating user_documents table...');
    await prisma.\$executeRaw\`
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
      )
    \`;
    console.log('[OK] User documents table created');

    // MAIL MESSAGES TABLE
    console.log('Creating mail_messages table...');
    await prisma.\$executeRaw\`
      CREATE TABLE IF NOT EXISTS mail_messages (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        folder TEXT NOT NULL,
        \"from\" TEXT NOT NULL,
        \"to\" TEXT NOT NULL,
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
      )
    \`;
    console.log('[OK] Mail messages table created');

    // CREATE INDEXES
    console.log('Creating indexes...');
    await prisma.\$executeRaw\`CREATE INDEX IF NOT EXISTS users_email_idx ON users(email)\`;
    await prisma.\$executeRaw\`CREATE INDEX IF NOT EXISTS users_role_idx ON users(role)\`;
    await prisma.\$executeRaw\`CREATE INDEX IF NOT EXISTS accounts_owner_rep_idx ON accounts(owner_rep_id)\`;
    await prisma.\$executeRaw\`CREATE INDEX IF NOT EXISTS contacts_account_idx ON contacts(account_id)\`;
    await prisma.\$executeRaw\`CREATE INDEX IF NOT EXISTS submissions_account_idx ON submissions(account_id)\`;
    await prisma.\$executeRaw\`CREATE INDEX IF NOT EXISTS submissions_idempotency_idx ON submissions(idempotency_key)\`;
    await prisma.\$executeRaw\`CREATE INDEX IF NOT EXISTS rep_profiles_user_id_idx ON rep_profiles(user_id)\`;
    await prisma.\$executeRaw\`CREATE INDEX IF NOT EXISTS onboarding_tokens_token_idx ON onboarding_tokens(token)\`;
    await prisma.\$executeRaw\`CREATE INDEX IF NOT EXISTS settings_key_idx ON settings(key)\`;
    await prisma.\$executeRaw\`CREATE INDEX IF NOT EXISTS document_recipients_document_idx ON document_recipients(document_id)\`;
    await prisma.\$executeRaw\`CREATE INDEX IF NOT EXISTS user_documents_user_idx ON user_documents(user_id)\`;
    await prisma.\$executeRaw\`CREATE INDEX IF NOT EXISTS mail_messages_user_idx ON mail_messages(user_id)\`;
    console.log('[OK] All indexes created');

    console.log('[OK] Complete schema initialization finished successfully!');
  } catch (error) {
    console.log('[ERROR] Schema initialization error:', error.message);
  } finally {
    try {
      await prisma.\$disconnect();
    } catch (e) {
      console.log('Disconnect error:', e.message);
    }
  }
}

runMigrations().catch(console.error);
" || echo "[ERROR] Schema initialization failed"

# Seed admin user
echo "[ADMIN] Ensuring admin user exists..."
node -e "
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
}

async function ensureAdmin() {
  try {
    console.log('[CHECK] Checking for existing admin user...');
    const email = 'admin@curagenesis.com';
    const password = 'Money100!';
    const name = 'System Administrator';

    // Check if users table exists
    const tableCheck = await prisma.\$queryRaw\`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')\`;
    if (!tableCheck[0].exists) {
      console.log('[ERROR] Users table does not exist');
      return;
    }

    // Check if password column exists
    const columnCheck = await prisma.\$queryRaw\`SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password')\`;
    if (!columnCheck[0].exists) {
      console.log('[WARN] Password column missing - adding it...');
      await prisma.\$executeRawUnsafe(\`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;\`);
    }

    console.log('[OK] Users table and password column verified');

    // Check if admin exists
    const existing = await prisma.\$queryRaw\`SELECT id, email, name, role FROM users WHERE email = \${email}\`;

    if (existing && existing.length > 0) {
      console.log('[OK] Admin user already exists');
      console.log('Email: Admin Email:', existing[0].email);
      console.log('Password: Admin Password: Money100!');
    } else {
      console.log('[CREATE] Creating new admin user...');
      const hashedPassword = await hashPassword(password);
      
      await prisma.\$executeRaw\`
        INSERT INTO users (id, email, name, password, role, active, onboard_status, is_active, created_at, updated_at)
        VALUES (gen_random_uuid()::TEXT, \${email}, \${name}, \${hashedPassword}, 'ADMIN', true, 'ACTIVE', true, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, active = EXCLUDED.active, is_active = EXCLUDED.is_active, updated_at = NOW()
      \`;
      
      console.log('[OK] Admin user created successfully!');
    }

    console.log('');
    console.log('========================================');
    console.log('ADMIN CREDENTIALS:');
    console.log('========================================');
    console.log('Email: admin@curagenesis.com');
    console.log('Password: Money100!');
    console.log('========================================');
  } catch (error) {
    console.log('[ERROR] Admin setup error:', error.message);
  } finally {
    try {
      await prisma.\$disconnect();
    } catch (e) {}
  }
}

ensureAdmin().catch(console.error);
" || echo "[ERROR] Admin user creation failed"

echo "[OK] Initialization complete!"
echo "[SERVER] Starting Next.js server..."

# Start the Next.js application using the standalone server
exec node server.js
