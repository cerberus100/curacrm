# Delete Practice by Owner Email

## Wait 3 minutes for v22 to deploy (started at 3:10 PM)

Then run this command in your terminal:

```bash
curl -X DELETE https://curagenesiscrm.com/api/accounts/delete-by-owner \
  -H "Content-Type: application/json" \
  -H "Cookie: $(curl -s https://curagenesiscrm.com/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"admin@curagenesis.com","password":"CuraGenesis2024!"}' -c - | grep auth-token | awk '{print $7}')" \
  -d '{"email":"asiegel@curagenesis.com"}'
```

Or simpler - just open browser console on curagenesiscrm.com and paste:

```javascript
fetch('/api/accounts/delete-by-owner', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email: 'asiegel@curagenesis.com' })
}).then(r => r.json()).then(console.log)
```

This will delete all accounts created by asiegel@curagenesis.com.

---

## What I Also Fixed:

**NPI Validation** - The contact form was rejecting NPIs that weren't exactly 10 digits. Now it allows empty/optional NPIs.

Deploy v23 with this fix coming next...

