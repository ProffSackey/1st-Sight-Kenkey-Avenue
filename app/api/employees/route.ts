import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireApiAuth(request, ['Admin']);
    if (response) {
      return response;
    }

    const body = await request.json();
    const { fullName, email, phone, role, branch, password } = body;
    const normalizedRole = role?.trim()
      ? `${role.trim().charAt(0).toUpperCase()}${role.trim().slice(1).toLowerCase()}`
      : 'Cashier';

    if (!['Admin', 'Manager', 'Cashier', 'Supervisor'].includes(normalizedRole)) {
      return NextResponse.json(
        { error: `Invalid role: ${role}. Expected Admin, Manager, Cashier, or Supervisor.` },
        { status: 400 },
      );
    }

    const requiresBranch = normalizedRole !== 'Admin';

    if (!fullName?.trim() || !email?.trim() || !phone?.trim() || !password?.trim() || (requiresBranch && !branch?.trim())) {
      return NextResponse.json({ error: 'Please fill in all fields.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    let branchId: string | null = null;

    if (requiresBranch) {
      const { data: branchData, error: branchError } = await supabaseAdmin
        .from('branches')
        .select('id')
        .eq('name', branch.trim())
        .single();

      if (branchError || !branchData) {
        return NextResponse.json({ error: `Invalid branch: ${branch}` }, { status: 400 });
      }

      branchId = branchData.id;
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: fullName,
        phone,
        branch: requiresBranch ? branch.trim() : '',
        role: normalizedRole,
      },
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: `Error creating account: ${error.message}` }, { status: 400 });
    }

    const employeeId = `EMP-${Math.floor(100000 + Math.random() * 900000)}`;

    const { error: insertError } = await supabaseAdmin.from('employees').insert({
      supabase_user_id: data.user?.id,
      employee_id: employeeId,
      full_name: fullName,
      email,
      phone,
      role: normalizedRole,
      branch_id: branchId,
      status: 'active',
    });

    if (insertError) {
      if (data.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
      }
      return NextResponse.json({ error: `Error registering employee details: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: `${fullName} was created as ${normalizedRole}. They can now log in with their credentials.`,
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Error creating employee: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { auth, response } = await requireApiAuth(request, ['Admin', 'Manager']);
    if (response) {
      return response;
    }
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: branchesData } = await supabaseAdmin
      .from('branches')
      .select('id, name');

    const branchMap: Record<string, string> = {};
    (branchesData || []).forEach((branch) => {
      if (branch?.id) {
        branchMap[branch.id] = branch.name || branch.id;
      }
    });

    const { data: employeesData, error: employeesError } = await supabaseAdmin
      .from('employees')
      .select(`
        id,
        supabase_user_id,
        employee_id,
        full_name,
        email,
        phone,
        role,
        branch_id,
        status,
        created_at
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (employeesError) {
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }

    const visibleEmployees = (employeesData || []).filter((employee) => {
      if (auth?.role === 'Admin') {
        return true;
      }
      return Boolean(auth?.branchId) && employee.branch_id === auth.branchId;
    });

    const employees = visibleEmployees.map((employee) => ({
      id: employee.supabase_user_id,
      supabaseUserId: employee.supabase_user_id,
      employeeId: employee.employee_id,
      fullName: employee.full_name,
      email: employee.email,
      phone: employee.phone || '',
      role: employee.role,
      branch: employee.role === 'Admin' ? 'All Branches' : branchMap[employee.branch_id] || '',
      status: employee.status,
      createdAt: {
        date: new Date(employee.created_at).toLocaleDateString('en-GB', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit',
        }),
        time: new Date(employee.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      },
    }));

    return NextResponse.json(employees, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: `Error fetching employees: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 500 },
    );
  }
}
