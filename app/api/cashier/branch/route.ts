import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { auth, response } = await requireApiAuth(request, ['Cashier', 'Manager', 'Admin']);
    if (response) {
      return response;
    }

    if (!auth?.branchId) {
      return NextResponse.json({ error: 'No branch assigned to employee.' }, { status: 403 });
    }

    const { data: branchRecord, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('id, name')
      .eq('id', auth.branchId)
      .single();

    if (branchError || !branchRecord) {
      return NextResponse.json({ error: 'Invalid branch assignment.' }, { status: 403 });
    }

    return NextResponse.json({
      branchId: branchRecord.id,
      branchName: branchRecord.name,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
