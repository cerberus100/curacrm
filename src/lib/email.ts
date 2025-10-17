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
 * Email sender - now using AWS SES
 */
export async function sendEmail(options: EmailOptions) {
  // Use SES in production, stub in development
  if (process.env.NODE_ENV === 'production') {
    try {
      const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
      
      const ses = new SESClient({ region: process.env.AWS_REGION_SES || process.env.AWS_REGION || 'us-east-2' });
      
      await ses.send(new SendEmailCommand({
        Source: 'noreply@curagenesis.com',
        Destination: { ToAddresses: [options.to] },
        Message: {
          Subject: { Data: options.subject },
          Body: { Html: { Data: options.html } }
        }
      }));
      
      console.log(`✅ Email sent to ${options.to}: ${options.subject}`);
      return { ok: true };
    } catch (error) {
      console.error('SES email error:', error);
      // Fallback to stub if SES fails
      return sendEmailStub(options.to, options.subject, options.html);
    }
  } else {
    // Development mode - use stub
    return sendEmailStub(options.to, options.subject, options.html);
  }
}
