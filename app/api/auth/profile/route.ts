import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header.' }, { status: 401 });
    }

    const accessToken = authHeader.slice(7);
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    let employee: { role: string | null; full_name: string | null; status: string | null; branch_id: string | null } | null =
      null;

    const byUserId = await supabaseAdmin
      .from('employees')
      .select('role, full_name, status, branch_id')
      .eq('supabase_user_id', user.id)
      .maybeSingle();
    employee = byUserId.data;

    if (!employee && user.email) {
      const byEmail = await supabaseAdmin
        .from('employees')
        .select('role, full_name, status, branch_id')
        .eq('email', user.email)
        .maybeSingle();
      employee = byEmail.data;
    }

    if (!employee) {
      return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
    }

    let branchName: string | null = null;
    if (employee.branch_id) {
      const { data: branch } = await supabaseAdmin
        .from('branches')
        .select('name')
        .eq('id', employee.branch_id)
        .maybeSingle();
      branchName = branch?.name ?? null;
    }

    return NextResponse.json(
      {
        email: user.email ?? null,
        role: employee.role,
        fullName: employee.full_name,
        status: employee.status,
        branchId: employee.branch_id,
        branchName,
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to resolve profile: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 500 },
    );
  }
}
