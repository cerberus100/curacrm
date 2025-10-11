interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Email stub - logs to console instead of sending
 * Use this until AWS SES is configured
 */
export async function sendEmailStub(to: string, subject: string, body: string) {
  console.log('=== [DEV-EMAIL-STUB] ===');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Body preview:', body.substring(0, 200) + '...');
  console.log('=======================');
  return { ok: true };
}

/**
 * Email sender - uses stub for now
 * Will be replaced with AWS SES when backend is ready
 */
export async function sendEmail(options: EmailOptions) {
  // Use stub until SES is configured
  return sendEmailStub(options.to, options.subject, options.html);
  
  // TODO: Implement with AWS SES when ready
  // Uncomment below and configure environment variables:
  //
  // import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
  // 
  // const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
  // 
  // await ses.send(new SendEmailCommand({
  //   Source: process.env.SES_FROM_ADDRESS || 'noreply@curagenesis.com',
  //   Destination: { ToAddresses: [options.to] },
  //   Message: {
  //     Subject: { Data: options.subject },
  //     Body: { Html: { Data: options.html } }
  //   }
  // }));
  //
  // Environment variables needed:
  // - AWS_REGION
  // - SES_FROM_ADDRESS
  // - AWS_ACCESS_KEY_ID
  // - AWS_SECRET_ACCESS_KEY
}
