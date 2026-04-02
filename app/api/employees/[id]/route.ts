import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiAuth } from '@/lib/api-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { response } = await requireApiAuth(request, ['Admin']);
    if (response) {
      return response;
    }

    const { id: employeeId } = await params;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(employeeId);

    if (error) {
      return NextResponse.json({ error: 'Error: Employee record not found.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Employee was deleted.' }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: `Error deleting employee: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { response } = await requireApiAuth(request, ['Admin']);
    if (response) {
      return response;
    }

    const { id: employeeId } = await params;
    const body = await request.json();
    const { newPassword, employeeName } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
    }

    if (!newPassword?.trim()) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(employeeId, {
      password: newPassword,
    });

    if (error) {
      return NextResponse.json({ error: `Error resetting password: ${error.message}` }, { status: 400 });
    }

    return NextResponse.json(
      { message: `Password for ${employeeName} has been reset successfully.` },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Error resetting password: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 500 },
    );
  }
}
