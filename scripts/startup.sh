#!/bin/bash

echo "🚀 Starting CuraGenesis CRM..."

# Run critical schema updates
echo "📊 Running schema updates..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function runMigrations() {
  try {
    console.log('Adding primary_contact_name column...');
    await prisma.\$executeRawUnsafe('ALTER TABLE accounts ADD COLUMN IF NOT EXISTS primary_contact_name TEXT');

    console.log('Adding primary_contact_position column...');
    await prisma.\$executeRawUnsafe('ALTER TABLE accounts ADD COLUMN IF NOT EXISTS primary_contact_position TEXT');

    console.log('Creating Team enum type...');
    await prisma.\$executeRawUnsafe(\"CREATE TYPE \\\"Team\\\" AS ENUM ('IN_HOUSE', 'VANTAGE_POINT')\").catch(() => console.log('Team enum already exists'));

    console.log('Adding team column to users...');
    await prisma.\$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS team \"Team\"');

    console.log('Creating team index...');
    await prisma.\$executeRawUnsafe('CREATE INDEX IF NOT EXISTS users_team_idx ON users(team) WHERE team IS NOT NULL');

    // Rep profiles table
    console.log('Creating rep_profiles table...');
    await prisma.\$executeRawUnsafe(\`
      CREATE TABLE IF NOT EXISTS rep_profiles (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_accounts_count INT DEFAULT 0,
        active_accounts_count INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    \`);
    await prisma.\$executeRawUnsafe('CREATE INDEX IF NOT EXISTS rep_profiles_user_id_idx ON rep_profiles(user_id)');

    // New CRM user creation fields
    console.log('Adding CRM user creation columns...');
    await prisma.\$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS workmail_user_id TEXT');
    await prisma.\$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT');
    await prisma.\$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id TEXT');
    await prisma.\$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN');
    await prisma.\$executeRawUnsafe('UPDATE users SET is_active = CASE WHEN is_active IS NULL THEN true ELSE is_active END');

    // Onboarding tokens table (if missing)
    console.log('Ensuring onboarding_tokens table exists...');
    await prisma.\$executeRawUnsafe('CREATE TABLE IF NOT EXISTS onboarding_tokens (id TEXT PRIMARY KEY, token TEXT UNIQUE, user_id TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, used BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())');
    await prisma.\$executeRawUnsafe('CREATE INDEX IF NOT EXISTS onboarding_tokens_token_idx ON onboarding_tokens(token)');
    await prisma.\$executeRawUnsafe('CREATE INDEX IF NOT EXISTS onboarding_tokens_user_idx ON onboarding_tokens(user_id)');

    console.log('✅ Schema updates complete');
  } catch (error) {
    console.log('⚠️  Schema update error:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}
runMigrations();
" || echo "⚠️  Schema updates skipped"

# Seed admin user (skip if password column doesn't exist)
echo "🌱 Ensuring admin user exists..."
node -e "
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return salt + ':' + hash;
}

async function ensureAdmin() {
  try {
    const email = 'admin@curagenesis.com';
    const password = 'Money100!';
    const name = 'Admin User';

    // Try to find existing admin
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true }
    }).catch(() => {
      // If password column doesn't exist, create without it
      return prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true }
      });
    });

    if (existing) {
      console.log('✅ Admin user exists');
      // Try to update password if column exists
      const hashedPassword = await hashPassword(password);
      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: 'ADMIN',
          active: true,
          onboardStatus: 'ACTIVE',
        }
      }).catch(() => {
        console.log('⚠️  Password column not found - please run: ALTER TABLE users ADD COLUMN password VARCHAR(255);');
      });
    } else {
      console.log('Creating new admin user...');
      const hashedPassword = await hashPassword(password);
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'ADMIN',
          active: true,
          onboardStatus: 'ACTIVE',
          onboardedAt: new Date(),
        }
      }).catch(async () => {
        // If password column doesn't exist, create without it
        console.log('⚠️  Password column not found, creating user without password');
        await prisma.user.create({
          data: {
            email,
            name,
            role: 'ADMIN',
            active: true,
            onboardStatus: 'ACTIVE',
            onboardedAt: new Date(),
          }
        });
      });
      console.log('✅ Admin user created!');
    }
    
    console.log('📧 Admin Email: admin@curagenesis.com');
    console.log('🔑 Admin Password: Money100!');
  } catch (error) {
    console.log('⚠️  Admin setup error:', error.message || error);
  } finally {
    await prisma.\$disconnect();
  }
}

ensureAdmin();
" || echo "⚠️  Admin user creation skipped"

echo "✅ Initialization complete!"

# Create activity_log table if it doesn't exist
echo "Creating activity_log table if it doesn't exist..."
psql "$DATABASE_URL" <<EOF 2>/dev/null || true
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log("entityType", entity_id);
EOF

# Start the Next.js application using the standalone server
echo "🌐 Starting Next.js server..."
exec node server.js