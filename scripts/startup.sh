#!/bin/bash

echo "🚀 Starting CuraGenesis CRM..."

# Run critical schema updates
echo "📊 Running schema updates..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function runMigrations() {
  try {
    await prisma.\$executeRaw\`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS primary_contact_name TEXT\`;
    await prisma.\$executeRaw\`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS primary_contact_position TEXT\`;
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
      }).catch((e) => {
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
      }).catch(async (e) => {
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

# Start the Next.js application using the standalone server
echo "🌐 Starting Next.js server..."
exec node server.js