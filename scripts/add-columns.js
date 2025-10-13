const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addColumns() {
  try {
    console.log('Adding primary_contact_name column...');
    await prisma.$executeRawUnsafe('ALTER TABLE accounts ADD COLUMN IF NOT EXISTS primary_contact_name TEXT');
    
    console.log('Adding primary_contact_position column...');
    await prisma.$executeRawUnsafe('ALTER TABLE accounts ADD COLUMN IF NOT EXISTS primary_contact_position TEXT');
    
    console.log('✅ Columns added successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addColumns();

