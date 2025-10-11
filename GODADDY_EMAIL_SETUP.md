# GoDaddy Email Integration Setup

This guide explains how to set up automated email creation for GoDaddy Microsoft 365 accounts.

## Prerequisites

1. GoDaddy account with Microsoft 365 email service
2. Microsoft 365 admin access
3. Azure Active Directory access (comes with M365)

## Step 1: Register an Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Configure the app:
   - Name: `CuraGenesis CRM Email Provisioning`
   - Supported account types: "Single tenant"
   - Redirect URI: Leave blank (not needed for service-to-service)
5. Save the **Application (client) ID** and **Directory (tenant) ID**

## Step 2: Create Client Secret

1. In your app registration, go to "Certificates & secrets"
2. Click "New client secret"
3. Description: `CRM Email Provisioning`
4. Expires: Choose appropriate expiration
5. Save the secret value immediately (you can't see it again!)

## Step 3: Grant API Permissions

1. In your app registration, go to "API permissions"
2. Click "Add a permission" > "Microsoft Graph" > "Application permissions"
3. Add these permissions:
   - `User.ReadWrite.All` - To create and manage users
   - `Directory.ReadWrite.All` - To assign licenses
4. Click "Grant admin consent" (requires admin privileges)

## Step 4: Find Your License SKU ID

Run this PowerShell command (or use Graph Explorer):

```powershell
Connect-MgGraph -Scopes "Organization.Read.All"
Get-MgSubscribedSku | Select SkuPartNumber, SkuId
```

Look for your Microsoft 365 license (e.g., "O365_BUSINESS_PREMIUM") and note the SkuId.

## Step 5: Configure Environment Variables

Add these to your `.env` file:

```env
# Email provisioning mode
PROVISIONING_MODE=godaddy

# GoDaddy/Microsoft 365 Configuration
GODADDY_TENANT_ID=your-tenant-id-here
GODADDY_CLIENT_ID=your-app-client-id-here
GODADDY_CLIENT_SECRET=your-client-secret-here
GODADDY_DOMAIN=curagenesis.com
GODADDY_M365_SKU_ID=your-sku-id-here
```

## Step 6: Test the Integration

1. Start your application with the new environment variables
2. Try creating a single invite through the Recruiter portal
3. Check the console logs for success/error messages
4. Verify the email account was created in Microsoft 365 admin center

## Troubleshooting

### Common Issues:

1. **"Insufficient privileges"**: Make sure you granted admin consent for the API permissions
2. **"License not available"**: Check you have available licenses in your subscription
3. **"User already exists"**: The email address is already taken
4. **"Invalid client secret"**: The secret may have expired or been copied incorrectly

### Verify Setup:

Test your credentials with this curl command:

```bash
# Get access token
curl -X POST https://login.microsoftonline.com/YOUR_TENANT_ID/oauth2/v2.0/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "scope=https://graph.microsoft.com/.default" \
  -d "grant_type=client_credentials"
```

## Production Considerations

1. **Rate Limits**: Microsoft Graph has rate limits. Consider implementing retry logic.
2. **License Management**: Monitor available licenses and alert when running low.
3. **Password Policy**: Ensure generated passwords meet your organization's requirements.
4. **Backup Admin**: Have a backup admin account in case of API issues.
5. **Monitoring**: Set up alerts for failed email creations.

## Alternative: Manual Process Webhook

If you prefer not to automate directly, you can:

1. Keep `PROVISIONING_MODE=local`
2. Set up a webhook to notify your admin team
3. Have them manually create accounts in GoDaddy/M365
4. Update the user record with the corp email once created

## Questions for Ian:

1. What's your Microsoft 365 license type? (Business Basic, Business Standard, etc.)
2. Do you want users to change passwords on first login?
3. Any specific email naming convention? (first.last, firstlast, f.last)
4. Should we add users to any specific groups or distribution lists?
5. Do you want to set up any email forwarding rules?
