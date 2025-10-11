import { EmailAdapter, EmailProvisionResult } from "./emailAdapter";

/**
 * GoDaddy Email Adapter using Microsoft 365 Graph API
 * 
 * Requirements:
 * 1. GoDaddy Microsoft 365 admin account
 * 2. Azure AD app registration with these permissions:
 *    - User.ReadWrite.All
 *    - Directory.ReadWrite.All
 * 3. Environment variables:
 *    - GODADDY_TENANT_ID (Azure AD tenant ID)
 *    - GODADDY_CLIENT_ID (Azure app client ID)
 *    - GODADDY_CLIENT_SECRET (Azure app secret)
 *    - GODADDY_DOMAIN (e.g., curagenesis.com)
 */
export class EmailAdapterGoDaddy implements EmailAdapter {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  async generateAddress(first: string, last: string): Promise<string> {
    // Generate email address format
    const base = `${first.toLowerCase()}.${last.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
    const domain = process.env.GODADDY_DOMAIN || 'curagenesis.com';
    
    // Check if this exact email exists
    let email = `${base}@${domain}`;
    let suffix = 1;
    
    while (await this.emailExists(email)) {
      email = `${base}${suffix}@${domain}`;
      suffix++;
    }
    
    return email;
  }

  async createMailbox(address: string): Promise<{ tempPassword: string }> {
    // Get access token
    await this.ensureAccessToken();

    // Generate secure temporary password
    const tempPassword = this.generateSecurePassword();
    
    // Extract username from email
    const [mailNickname] = address.split('@');
    const [firstName, ...lastNameParts] = mailNickname.split('.');
    const lastName = lastNameParts.join(' ');
    
    try {
      // Create user in Microsoft 365 via Graph API
      const response = await fetch('https://graph.microsoft.com/v1.0/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountEnabled: true,
          displayName: `${this.capitalize(firstName)} ${this.capitalize(lastName)}`,
          mailNickname: mailNickname,
          userPrincipalName: address,
          passwordProfile: {
            forceChangePasswordNextSignIn: true,
            password: tempPassword
          },
          givenName: this.capitalize(firstName),
          surname: this.capitalize(lastName),
          usageLocation: 'US', // Required for license assignment
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create mailbox: ${error.error?.message || response.statusText}`);
      }

      const user = await response.json();
      
      // Assign Microsoft 365 license (you'll need the SKU ID from your tenant)
      // This is typically done after user creation
      await this.assignLicense(user.id);
      
      console.log(`[GoDaddy/M365] Created mailbox: ${address}`);
      return { tempPassword };
      
    } catch (error) {
      console.error('[GoDaddy/M365] Error creating mailbox:', error);
      throw error;
    }
  }

  private async emailExists(email: string): Promise<boolean> {
    await this.ensureAccessToken();
    
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/users?$filter=userPrincipalName eq '${email}'`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          }
        }
      );
      
      if (!response.ok) {
        console.error('Failed to check email existence');
        return false;
      }
      
      const data = await response.json();
      return data.value && data.value.length > 0;
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  }

  private async ensureAccessToken(): Promise<void> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return;
    }

    const tenantId = process.env.GODADDY_TENANT_ID;
    const clientId = process.env.GODADDY_CLIENT_ID;
    const clientSecret = process.env.GODADDY_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('GoDaddy/Microsoft 365 credentials not configured');
    }

    try {
      // Get access token using client credentials flow
      const tokenResponse = await fetch(
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

      if (!tokenResponse.ok) {
        throw new Error('Failed to get access token');
      }

      const tokenData = await tokenResponse.json();
      this.accessToken = tokenData.access_token;
      // Set expiry 5 minutes before actual expiry
      this.tokenExpiry = new Date(Date.now() + (tokenData.expires_in - 300) * 1000);
      
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  private async assignLicense(userId: string): Promise<void> {
    // You need to get your tenant's license SKU ID
    // You can get this by calling: GET https://graph.microsoft.com/v1.0/subscribedSkus
    const skuId = process.env.GODADDY_M365_SKU_ID;
    
    if (!skuId) {
      console.warn('No Microsoft 365 SKU ID configured, skipping license assignment');
      return;
    }

    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/users/${userId}/assignLicense`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            addLicenses: [{
              skuId: skuId
            }],
            removeLicenses: []
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to assign license:', error);
      }
    } catch (error) {
      console.error('Error assigning license:', error);
    }
  }

  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    let password = '';
    
    // Ensure at least one of each required character type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*()'[Math.floor(Math.random() * 10)];
    
    // Fill the rest randomly
    for (let i = password.length; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}
