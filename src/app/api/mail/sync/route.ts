import { NextRequest, NextResponse } from 'next/server';
import { syncWorkMailEmails } from '@/lib/workmail-sync';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/mail/sync
 * Admin-only: Sync emails from WorkMail to CRM database
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin access
    await requireAdmin();

    console.log('🔄 Starting manual email sync...');
    
    // Run the sync
    await syncWorkMailEmails();
    
    return NextResponse.json({
      success: true,
      message: 'Email sync completed successfully'
    });

  } catch (error) {
    console.error('❌ Email sync failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync emails',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mail/sync
 * Check sync status
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    // Count emails in database
    const emailCount = await db.mailMessage.count();
    const repCount = await db.user.count({
      where: {
        role: 'AGENT',
        active: true,
        corpEmail: { not: null }
      }
    });

    return NextResponse.json({
      status: 'ready',
      emailCount,
      repCount,
      lastSync: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Failed to get sync status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
