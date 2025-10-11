export interface EmailProvisionResult {
  address: string;
  tempPassword: string;
}

export interface EmailAdapter {
  generateAddress(first: string, last: string): Promise<string>;
  createMailbox(address: string): Promise<{ tempPassword: string }>;
}

export class EmailAdapterLocal implements EmailAdapter {
  async generateAddress(first: string, last: string): Promise<string> {
    // Generate a unique email address
    const base = (first[0] + last).toLowerCase().replace(/[^a-z0-9]/g, '');
    // Add a random suffix if needed to ensure uniqueness
    const suffix = Math.random().toString(36).substring(2, 5);
    return `${base}${suffix}@curagenesis.com`;
  }

  async createMailbox(address: string): Promise<{ tempPassword: string }> {
    // Generate a secure temporary password
    const temp = Math.random().toString(36).slice(2, 10).toUpperCase() + "A!1";
    console.log(`[LOCAL] Create mailbox: ${address} / tempPw=${temp}`);
    return { tempPassword: temp };
  }
}

// TODO: Implement AWS WorkMail adapter for production
// export class EmailAdapterWorkMail implements EmailAdapter {
//   private workmail: WorkMail;
//   
//   constructor() {
//     this.workmail = new WorkMail({ region: 'us-east-1' });
//   }
//   
//   async generateAddress(first: string, last: string): Promise<string> {
//     // Implementation with WorkMail
//   }
//   
//   async createMailbox(address: string): Promise<{ tempPassword: string }> {
//     // Implementation with WorkMail CreateUser API
//   }
// }

// Factory function to get the appropriate adapter
export function getEmailAdapter(): EmailAdapter {
  const mode = process.env.PROVISIONING_MODE || 'local';
  
  switch (mode) {
    case 'godaddy':
      const { EmailAdapterGoDaddy } = require('./emailAdapterGoDaddy');
      return new EmailAdapterGoDaddy();
    case 'aws':
      // TODO: return new EmailAdapterWorkMail();
      console.warn('AWS WorkMail adapter not implemented, falling back to local');
      return new EmailAdapterLocal();
    case 'local':
    default:
      return new EmailAdapterLocal();
  }
}
