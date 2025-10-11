#!/bin/bash

# Add export const dynamic = 'force-dynamic' to API routes that don't have it

routes_fixed=0

for file in $(find src/app/api -name "route.ts" -type f); do
  if ! grep -q "export const dynamic" "$file"; then
    echo "Fixing: $file"
    
    # Add after imports, before first export function
    sed -i.bak '/^import/!b; :a; n; /^import/ba; /^$/a\
export const dynamic = '\''force-dynamic'\'';
' "$file"
    
    rm -f "${file}.bak"
    routes_fixed=$((routes_fixed + 1))
  fi
done

echo "✅ Fixed $routes_fixed routes"
