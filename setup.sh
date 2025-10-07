#!/bin/bash
# CuraGenesis CRM - Local Setup Script

echo "🚀 CuraGenesis Intake CRM - Local Setup"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo ""
    echo "Please create .env file with the following content:"
    echo ""
    cat .env.example
    echo ""
    exit 1
fi

echo "✅ .env file found"
echo ""

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate
echo ""

# Push schema to database
echo "🗄️  Creating database tables..."
npx prisma db push --accept-data-loss
echo ""

# Seed database
echo "🌱 Seeding database with test data..."
npx prisma db seed
echo ""

echo "✅ Setup complete!"
echo ""
echo "🎉 You can now run: npm run dev"
echo ""
echo "📋 Test credentials (no login required - direct access):"
echo "   Admin User ID: 00000000-0000-0000-0000-000000000001"
echo "   Rep User ID:   00000000-0000-0000-0000-000000000002"
echo ""
echo "🌐 Open http://localhost:3000 to start testing"
echo ""
