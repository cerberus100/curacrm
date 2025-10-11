#!/usr/bin/env node

/**
 * Test script to verify GoDaddy/Microsoft 365 authentication
 * Run with: node scripts/test-godaddy-auth.js
 */

require('dotenv').config();

async function getAccessToken() {
  const tenantId = process.env.GODADDY_TENANT_ID;
  const clientId = process.env.GODADDY_CLIENT_ID;
  const clientSecret = process.env.GODADDY_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    console.error('❌ Missing required environment variables:');
    console.error('   GODADDY_TENANT_ID:', tenantId ? '✓' : '✗');
    console.error('   GODADDY_CLIENT_ID:', clientId ? '✓' : '✗');
    console.error('   GODADDY_CLIENT_SECRET:', clientSecret ? '✓' : '✗');
    return;
  }

  console.log('🔐 Attempting to get access token...');
  console.log('   Tenant ID:', tenantId);
  console.log('   Client ID:', clientId);

  try {
    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to get access token:');
      console.error(JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Successfully obtained access token!');
    console.log('   Token expires in:', data.expires_in, 'seconds');
    
    // Test the token by fetching subscribed SKUs
    console.log('\n📋 Fetching available licenses...');
    
    const skuResponse = await fetch(
      'https://graph.microsoft.com/v1.0/subscribedSkus',
      {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        }
      }
    );

    if (!skuResponse.ok) {
      console.error('❌ Failed to fetch licenses');
      return;
    }

    const skuData = await skuResponse.json();
    
    console.log('\n📊 Available Microsoft 365 Licenses:');
    skuData.value.forEach(sku => {
      const available = sku.prepaidUnits.enabled - sku.consumedUnits;
      console.log(`   - ${sku.skuPartNumber}`);
      console.log(`     SKU ID: ${sku.skuId}`);
      console.log(`     Available: ${available} of ${sku.prepaidUnits.enabled}`);
      console.log('');
    });

    // Test fetching users
    console.log('👥 Fetching existing users...');
    
    const usersResponse = await fetch(
      'https://graph.microsoft.com/v1.0/users?$top=5',
      {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        }
      }
    );

    if (!usersResponse.ok) {
      console.error('❌ Failed to fetch users');
      return;
    }

    const usersData = await usersResponse.json();
    console.log(`   Found ${usersData.value.length} users (showing first 5)`);
    
    usersData.value.forEach(user => {
      console.log(`   - ${user.displayName} (${user.userPrincipalName})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
getAccessToken();
