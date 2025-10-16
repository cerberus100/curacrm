# CuraGenesis API - CURL Example for Testing

## API Endpoint Information

**Base URL:** `https://w6mxt54h5f.execute-api.us-east-2.amazonaws.com/Prod`
**Endpoint:** `/admin_createUserWithBaa`
**Method:** `POST`

## Required Headers

```bash
x-vendor-token: YOUR_VENDOR_TOKEN
x-api-key: YOUR_API_KEY
Content-Type: application/json
Idempotency-Key: UNIQUE_KEY_PER_REQUEST
```

## Example CURL Command

```bash
curl -X POST https://w6mxt54h5f.execute-api.us-east-2.amazonaws.com/Prod/admin_createUserWithBaa \
  -H "Content-Type: application/json" \
  -H "x-vendor-token: YOUR_VENDOR_TOKEN_HERE" \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "Doctor",
    "baaSigned": false,
    "paSigned": false,
    "facilityName": "Test Medical Center",
    "facilityAddress": {
      "line1": "123 Main St",
      "line2": "Suite 100",
      "city": "Dallas",
      "state": "TX",
      "zip": "75201",
      "country": "US"
    },
    "facilityPhone": "+12145551234",
    "facilityEmail": "practice@testmedical.com",
    "facilityNPI": "1234567890",
    "facilityTIN": "123456789",
    "facilityURL": "https://testmedical.com",
    "leadSource": "Online",
    "primaryContactName": "John Smith",
    "primaryContactEmail": "john@testmedical.com",
    "primaryContactPhone": "+12145551234",
    "primaryContactPosition": "Practice Manager",
    "physicianInfo": {
      "name": "Dr. Test Doctor",
      "email": "doctor@testmedical.com",
      "npi": "9876543210"
    }
  }'
```

## Testing with Your Actual Values

1. **Get your credentials from environment:**
   ```bash
   # Check your .env or environment variables
   echo $CURAGENESIS_VENDOR_TOKEN
   echo $CURAGENESIS_API_KEY
   ```

2. **Generate a unique Idempotency Key:**
   ```bash
   # On Mac/Linux:
   uuidgen
   
   # Or use timestamp:
   echo "test-$(date +%s)"
   ```

3. **Test the endpoint:**
   ```bash
   # Replace YOUR_VENDOR_TOKEN_HERE and YOUR_API_KEY_HERE with actual values
   curl -X POST https://w6mxt54h5f.execute-api.us-east-2.amazonaws.com/Prod/admin_createUserWithBaa \
     -H "Content-Type: application/json" \
     -H "x-vendor-token: YOUR_VENDOR_TOKEN_HERE" \
     -H "x-api-key: YOUR_API_KEY_HERE" \
     -H "Idempotency-Key: test-$(date +%s)" \
     -d '{
       "email": "test@example.com",
       "firstName": "Test",
       "lastName": "User",
       "baaSigned": false,
       "paSigned": false,
       "facilityName": "Test Practice"
     }' \
     -v
   ```

## Expected Responses

### Success (200/201):
```json
{
  "success": true,
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "User created successfully"
}
```

### Authentication Error (403):
```json
{
  "error": "Invalid key=value pair (missing equal-sign) in Authorization header"
}
```
This means the headers are incorrect. Make sure you're using `x-vendor-token` and `x-api-key`, NOT `Authorization: Bearer`.

### Validation Error (400):
```json
{
  "error": "Validation failed",
  "details": ["facilityName is required"]
}
```

### Server Error (500):
```json
{
  "error": "Internal server error"
}
```

## Debugging Tips

1. **Use `-v` flag to see full request/response:**
   ```bash
   curl -v -X POST ... 
   ```

2. **Save response to file:**
   ```bash
   curl -X POST ... > response.json
   ```

3. **Pretty print JSON response:**
   ```bash
   curl -X POST ... | jq .
   ```

4. **Check what headers are being sent:**
   ```bash
   curl -X POST ... -v 2>&1 | grep ">"
   ```

## Common Issues

1. **403 Forbidden** - Check your `x-vendor-token` and `x-api-key` values
2. **Invalid key=value pair** - You're using wrong header format (should be `x-vendor-token` not `Authorization`)
3. **Timeout** - The API timeout is set to 60 seconds, if it takes longer there might be an issue
4. **Idempotency conflict** - Use a new unique key for each request

## Notes from CRM Implementation

- We changed from `Authorization: Bearer ${apiKey}` to using `x-vendor-token` and `x-api-key` headers
- The API expects both headers to be present
- Idempotency-Key is recommended to prevent duplicate submissions
- The timeout is set to 60 seconds in production
