import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_WORKMAIL_WEB_URL || 'https://curagenesis.awsapps.com/mail';
  return NextResponse.redirect(url, { status: 302 });
}


