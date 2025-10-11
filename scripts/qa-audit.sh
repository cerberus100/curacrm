#!/usr/bin/env bash
set -euo pipefail

echo "==============================================="
echo "  CuraGenesis CRM - QA Audit Script"
echo "==============================================="
echo ""

echo "== ENV CHECKS =="
if [ -f .env ]; then
  echo "✅ .env file exists"
else
  echo "❌ WARN: .env file missing"
fi

if [ -f .env ]; then
  grep -q "DATABASE_URL" .env && echo "✅ DATABASE_URL present" || echo "❌ WARN: DATABASE_URL missing"
  grep -q "JWT_SECRET" .env && echo "✅ JWT_SECRET present" || echo "❌ WARN: JWT_SECRET missing"
  grep -q "CURAGENESIS_VENDOR_TOKEN" .env && echo "✅ CURAGENESIS_VENDOR_TOKEN present" || echo "❌ WARN: CURAGENESIS_VENDOR_TOKEN missing"
fi

echo ""
echo "== PRIVATE KEY LEAKS (client) =="
if grep -R "CURAGENESIS_API_KEY\|CG_METRICS_API_KEY\|JWT_SECRET\|VENDOR_TOKEN" src/app src/components 2>/dev/null | grep -v "process.env" | grep -v "//"; then
  echo "❌ LEAKED SECRETS FOUND IN CLIENT CODE!"
else
  echo "✅ No secrets leaked in client code"
fi

echo ""
echo "== RBAC GUARDS =="
echo "Admin guards:"
if grep -R "requireAdmin" src/app/admin src/app/api/admin src/app/api/reps src/app/api/users 2>/dev/null | grep -q "requireAdmin"; then
  echo "✅ requireAdmin guards found"
  grep -R "requireAdmin" src/app/admin src/app/api/admin 2>/dev/null | wc -l | xargs echo "  Count:"
else
  echo "❌ MISSING requireAdmin usage"
fi

echo "Rep/Recruiter guards:"
if grep -R "requireRecruiter\|requireRepOrAdmin" src/app/api 2>/dev/null | grep -q "require"; then
  echo "✅ requireRecruiter/requireRepOrAdmin guards found"
else
  echo "⚠️  No recruiter/rep guards (may be expected)"
fi

echo ""
echo "== ROUTES PRESENT =="
echo "Checking critical routes:"
[ -f "src/app/api/submissions/send/route.ts" ] && echo "✅ /api/submissions/send" || echo "❌ MISSING send route"
[ -f "src/app/api/recruiter/invite/route.ts" ] && echo "✅ /api/recruiter/invite" || echo "⚠️  MISSING recruiter routes"
[ -f "src/app/api/admin/vendors/route.ts" ] && echo "✅ /api/admin/vendors" || echo "❌ MISSING vendors routes"
[ -f "src/app/api/kpi/overview/route.ts" ] && echo "✅ /api/kpi/overview" || echo "❌ MISSING KPI routes"
[ -f "src/app/api/financials/route.ts" ] && echo "✅ /api/financials" || echo "⚠️  Financials API route"

echo ""
echo "== PRISMA SCHEMA =="
echo "Generating Prisma client..."
npx prisma generate >/dev/null 2>&1 && echo "✅ Prisma client generated" || echo "❌ Prisma generate failed"

echo "Validating schema..."
npx prisma validate 2>&1 | grep -q "validated successfully" && echo "✅ Prisma schema valid" || echo "❌ Prisma schema has issues"

echo ""
echo "== BUILD/LINT =="
if command -v npm &> /dev/null; then
  echo "Package manager: npm"
  
  echo "Type checking..."
  npm run type-check 2>&1 | grep -q "error" && echo "❌ Type errors found" || echo "✅ No type errors"
  
  echo "Building..."
  if npm run build >/dev/null 2>&1; then
    echo "✅ Build successful"
  else
    echo "❌ Build failed - run 'npm run build' to see errors"
  fi
else
  echo "⚠️  npm not found"
fi

echo ""
echo "== SECURITY CHECKS =="
echo "Checking for common vulnerabilities:"

if grep -R "eval(" src 2>/dev/null; then
  echo "❌ Found eval() usage - security risk!"
else
  echo "✅ No eval() found"
fi

if grep -R "dangerouslySetInnerHTML" src 2>/dev/null | grep -v "sanitize"; then
  echo "⚠️  Found dangerouslySetInnerHTML without sanitization"
else
  echo "✅ No unsafe innerHTML"
fi

echo ""
echo "== DYNAMIC ROUTE DECLARATIONS =="
missing_count=0
for file in $(find src/app/api -name "route.ts" 2>/dev/null); do
  if ! grep -q "export const dynamic" "$file"; then
    echo "⚠️  Missing dynamic: $file"
    missing_count=$((missing_count + 1))
  fi
done

if [ $missing_count -eq 0 ]; then
  echo "✅ All API routes have dynamic declarations"
else
  echo "⚠️  $missing_count routes missing 'export const dynamic'"
fi

echo ""
echo "==============================================="
echo "  QA AUDIT COMPLETE"
echo "==============================================="
echo ""
echo "Summary:"
echo "  - Review any ❌ or ⚠️  items above"
echo "  - Run 'npm run build' if build failed"
echo "  - Check Prisma schema if validation failed"
echo "  - Fix any leaked secrets immediately"
echo ""
