import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRecruiter } from "@/lib/auth";
import { CreateRecruitInviteSchema } from "@/lib/validations";
import { getEmailAdapter } from "@/lib/provisioning/emailAdapter";
import { createCrmLogin } from "@/lib/provisioning/crmAdapter";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

/**
 * POST /api/recruiter/invite
 * Create a single rep invite
 */
export async function POST(request: NextRequest) {
  try {
    const recruiter = await requireRecruiter();
    
    const body = await request.json();
    const data = CreateRecruitInviteSchema.parse(body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.personal_email }
    });
    
    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: "User with this email already exists"
      }, { status: 400 });
    }
    
    // Generate corporate email
    const emailAdapter = getEmailAdapter();
    let corpEmail = await emailAdapter.generateAddress(data.first_name, data.last_name);
    
    // Check if corp email is already taken
    const corpEmailExists = await prisma.user.findUnique({
      where: { corpEmail }
    });
    
    if (corpEmailExists) {
      // Try with a number suffix
      let suffix = 2;
      let newCorpEmail = corpEmail.replace('@', `${suffix}@`);
      while (await prisma.user.findUnique({ where: { corpEmail: newCorpEmail } })) {
        suffix++;
        newCorpEmail = corpEmail.replace('@', `${suffix}@`);
      }
      corpEmail = newCorpEmail;
    }
    
    // Create user record
    const user = await prisma.user.create({
      data: {
        name: `${data.first_name} ${data.last_name}`,
        email: data.personal_email,
        corpEmail,
        role: "AGENT",
        active: true,
        onboardStatus: "INVITED",
        recruiterInvitedById: recruiter.id,
      }
    });
    
    // Create rep profile
    await prisma.repProfile.create({
      data: {
        userId: user.id,
        totalSalesUsd: 0,
        totalProfitUsd: 0,
        activeAccountsCount: 0,
      }
    });
    
    // Provision email mailbox
    const { tempPassword: emailTempPassword } = await emailAdapter.createMailbox(corpEmail);
    
    // Create CRM login
    const { tempPassword: crmTempPassword } = await createCrmLogin(corpEmail);
    
    // Update user with temp passwords
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailTempPassword,
        crmTempPassword,
        onboardStatus: "CRM_USER_CREATED",
      }
    });
    
    // Create document stubs
    const docTypes = ["BAA", "HIRE_AGREEMENT", "W9"] as const;
    await Promise.all(
      docTypes.map(type =>
        prisma.userDocument.create({
          data: {
            userId: user.id,
            type,
            status: "SENT",
          }
        })
      )
    );
    
    // Generate onboarding token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72 hour expiry
    
    // Store token in settings
    await prisma.setting.create({
      data: {
        key: `invite:${user.id}`,
        value: {
          token,
          userId: user.id,
          expiresAt: expiresAt.toISOString(),
        }
      }
    });
    
    // Send onboarding email
    const onboardingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/onboard?token=${token}`;
    
    await sendEmail({
      to: data.personal_email,
      subject: "Welcome to CuraGenesis - Complete Your Onboarding",
      html: `
        <h2>Welcome to CuraGenesis!</h2>
        <p>Hi ${data.first_name},</p>
        <p>Your account has been created. Here are your credentials:</p>
        
        <h3>Corporate Email Account</h3>
        <p><strong>Email:</strong> ${corpEmail}<br/>
        <strong>Temporary Password:</strong> ${emailTempPassword}</p>
        
        <h3>CRM Access</h3>
        <p><strong>Username:</strong> ${corpEmail}<br/>
        <strong>Temporary Password:</strong> ${crmTempPassword}</p>
        
        <p>Please complete your onboarding by clicking the link below:</p>
        <a href="${onboardingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Complete Onboarding</a>
        
        <p>This link will expire in 72 hours.</p>
        
        <p>Best regards,<br/>The CuraGenesis Team</p>
      `
    });
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        corpEmail: user.corpEmail,
        status: user.onboardStatus,
      }
    });
    
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    console.error("Failed to create invite:", error);
    return NextResponse.json({
      error: "Failed to create invite",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
