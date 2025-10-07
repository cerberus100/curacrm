#!/bin/bash
# Quick start script for UI demo (no real API needed)

echo "🎨 CuraGenesis CRM - UI Demo Mode"
echo "=================================="
echo ""

# Create minimal .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating demo .env file..."
    cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/curagenesis_crm?schema=public"
CURAGENESIS_API_BASE="https://demo.example.com"
CURAGENESIS_API_KEY="demo_key_ui_testing_only"
CURAGENESIS_API_TIMEOUT_MS="10000"
NEXT_PUBLIC_CG_METRICS_BASE="https://demo.example.com"
CG_METRICS_API_KEY="demo_metrics_key_ui_testing_only"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EOF
    echo "✅ Demo .env created"
    echo ""
fi

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate > /dev/null 2>&1
echo "✅ Prisma Client ready"
echo ""

# Setup database
echo "🗄️  Setting up database..."
npx prisma db push --accept-data-loss --force-reset > /dev/null 2>&1
echo "✅ Database tables created"
echo ""

# Seed data
echo "🌱 Adding test data..."
npx prisma db seed > /dev/null 2>&1
echo "✅ Test data loaded"
echo ""

echo "🚀 Starting development server..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🌐 Open: http://localhost:3000"
echo "  📱 UI Demo Mode - API errors are expected"
echo "  🎨 Test the look and feel!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run dev
