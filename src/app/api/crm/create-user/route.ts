import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { WorkMailClient, CreateUserCommand, RegisterToWorkMailCommand } from '@aws-sdk/client-workmail';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const prisma = new PrismaClient();

// Allow separate regions for WorkMail and SES; fall back to AWS_REGION
const workmailRegion = process.env.AWS_REGION_WORKMAIL || process.env.AWS_REGION || 'us-east-1';
const sesRegion = process.env.AWS_REGION_SES || process.env.AWS_REGION || 'us-east-1';
const workmailClient = new WorkMailClient({ region: workmailRegion });
const sesClient = new SESClient({ region: sesRegion });
const WORKMAIL_ORG_ID = process.env.WORKMAIL_ORG_ID || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, role = 'AGENT', department, managerId } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'firstName, lastName, and email are required' }, { status: 400 });
    }

    const corpEmail = email.includes('@') ? email : `${email}@curagenesis.com`;

    const existing = await prisma.user.findUnique({ where: { email: corpEmail } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const emailTempPassword = generateTempPassword();
    const crmTempPassword = generateTempPassword();

    let workmailUserId: string | undefined;
    if (WORKMAIL_ORG_ID) {
      try {
        const createUser = await workmailClient.send(new CreateUserCommand({
          OrganizationId: WORKMAIL_ORG_ID,
          Name: `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, ''),
          DisplayName: `${firstName} ${lastName}`,
          Password: emailTempPassword,
        }));
        workmailUserId = createUser.UserId;
        if (workmailUserId) {
          await workmailClient.send(new RegisterToWorkMailCommand({
            OrganizationId: WORKMAIL_ORG_ID,
            EntityId: workmailUserId,
            Email: corpEmail,
          }));
        }
      } catch (e) {
        console.error('WorkMail creation error:', e);
        // Continue; backend team may finalize later
      }
    }

    const newUser = await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email: corpEmail,
        role,
        emailTempPassword,
        crmTempPassword,
        // mapped fields
        // workmail_user_id / department / manager_id / is_active
        // These columns are added at startup if missing
      } as any,
    });

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const appBase = process.env.CRM_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    const onboardingLink = `${appBase}/onboard?token=${token}`;

    await prisma.$executeRawUnsafe(
      'INSERT INTO onboarding_tokens (id, token, user_id, expires_at, used, created_at, updated_at) VALUES ($1, $2, $3, $4, false, NOW(), NOW()) ON CONFLICT (token) DO NOTHING',
      cryptoRandomId(), token, newUser.id, expiresAt
    ).catch(() => {});

    try {
      await sesClient.send(new SendEmailCommand({
        Source: 'noreply@curagenesis.com',
        Destination: { ToAddresses: [corpEmail] },
        Message: {
          Subject: { Data: 'Welcome to CuraGenesis CRM - Your Account Details' },
          Body: {
            Html: { Data: emailHtml(firstName, corpEmail, emailTempPassword, crmTempPassword, onboardingLink) },
          },
        },
      }));
    } catch (e) {
      console.error('SES send error:', e);
    }

    return NextResponse.json({
      success: true,
      user: { id: newUser.id, email: newUser.email, role: newUser.role },
      credentials: { emailTempPassword, crmTempPassword, onboardingLink },
    });
  } catch (error) {
    console.error('Error creating CRM user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
  return password;
}

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function cryptoRandomId(): string {
  return 'tok_' + Math.random().toString(36).slice(2, 10);
}

function emailHtml(firstName: string, corpEmail: string, emailPw: string, crmPw: string, link: string) {
  return `
    <h2>Welcome to CuraGenesis CRM!</h2>
    <p>Hi ${firstName},</p>
    <p>Your account has been created.</p>
    <div>
      <p><strong>WorkMail Email:</strong> ${corpEmail}</p>
      <p><strong>Email Password:</strong> ${emailPw}</p>
      <p><strong>CRM Login:</strong> ${corpEmail}</p>
      <p><strong>CRM Password:</strong> ${crmPw}</p>
      <p><a href="${link}">Complete Onboarding</a> (expires in 72 hours)</p>
    </div>
  `;
}


