import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Onboarding token is required' }, { status: 400 });

    const record = await prisma.$queryRawUnsafe<any[]>(
      'SELECT t.token, t.expires_at AS "expiresAt", t.used, u.id, u.email, u.role, u.name FROM onboarding_tokens t JOIN users u ON u.id = t.user_id WHERE t.token = $1 LIMIT 1',
      token
    );
    const row = record[0];
    if (!row) return NextResponse.json({ error: 'Invalid onboarding token' }, { status: 404 });
    if (row.used) return NextResponse.json({ error: 'Onboarding token has already been used' }, { status: 410 });
    if (new Date(row.expiresAt) < new Date()) return NextResponse.json({ error: 'Onboarding token has expired' }, { status: 410 });

    return NextResponse.json({ valid: true, user: { id: row.id, email: row.email, role: row.role, name: row.name }, expiresAt: row.expiresAt });
  } catch (e) {
    console.error('Error validating onboarding token:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, newEmailPassword, newCrmPassword, profileData } = await request.json();
    if (!token || !newEmailPassword || !newCrmPassword) {
      return NextResponse.json({ error: 'Token, newEmailPassword, and newCrmPassword are required' }, { status: 400 });
    }

    const recs = await prisma.$queryRawUnsafe<any[]>(
      'SELECT id, user_id AS "userId", expires_at AS "expiresAt", used FROM onboarding_tokens WHERE token=$1 LIMIT 1',
      token
    );
    const tok = recs[0];
    if (!tok || tok.used || new Date(tok.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired onboarding token' }, { status: 410 });
    }

    const user = await prisma.user.update({
      where: { id: tok.userId },
      data: {
        emailTempPassword: null,
        crmTempPassword: null,
        ...(profileData || {}),
        updatedAt: new Date(),
      },
      select: { id: true, email: true, role: true, name: true },
    });

    await prisma.$executeRawUnsafe('UPDATE onboarding_tokens SET used=true, updated_at=NOW() WHERE id=$1', tok.id);

    // TODO: WorkMail password change via AWS SDK (backend infra ready)

    return NextResponse.json({ success: true, message: 'Onboarding completed successfully', user });
  } catch (e) {
    console.error('Error completing onboarding:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}


