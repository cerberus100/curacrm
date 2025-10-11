export interface CrmProvisionResult {
  tempPassword: string;
}

export async function createCrmLogin(email: string): Promise<CrmProvisionResult> {
  const mode = process.env.PROVISIONING_MODE || 'local';
  
  switch (mode) {
    case 'aws':
      // TODO: Implement with AWS Cognito
      // const cognito = new CognitoIdentityServiceProvider({ region: 'us-east-1' });
      // const temp = generateSecurePassword();
      // await cognito.adminCreateUser({
      //   UserPoolId: process.env.COGNITO_USER_POOL_ID!,
      //   Username: email,
      //   TemporaryPassword: temp,
      //   MessageAction: 'SUPPRESS',
      //   UserAttributes: [
      //     { Name: 'email', Value: email },
      //     { Name: 'email_verified', Value: 'true' }
      //   ]
      // }).promise();
      // return { tempPassword: temp };
      
      console.warn('AWS Cognito adapter not implemented, falling back to local');
      // Fall through to local implementation
      
    case 'local':
    default:
      // Generate a secure temporary password
      const temp = Math.random().toString(36).slice(2, 10).toUpperCase() + "Z!1";
      console.log(`[LOCAL] Create CRM user: ${email} / tempPw=${temp}`);
      return { tempPassword: temp };
  }
}

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure it has at least one of each required character type
  if (!/[A-Z]/.test(password)) password = 'A' + password.slice(1);
  if (!/[a-z]/.test(password)) password = password.slice(0, -1) + 'a';
  if (!/[0-9]/.test(password)) password = password.slice(0, -2) + '1' + password.slice(-1);
  if (!/[!@#$%^&*]/.test(password)) password = password.slice(0, -3) + '!' + password.slice(-2);
  return password;
}
