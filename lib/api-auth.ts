import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type EmployeeRole = "Admin" | "Manager" | "Cashier" | "Supervisor";

export type AuthContext = {
  userId: string;
  employeeId: string;
  role: EmployeeRole;
  branchId: string | null;
};

export async function requireApiAuth(
  request: NextRequest,
  allowedRoles?: EmployeeRole[],
): Promise<{ auth?: AuthContext; response?: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      response: NextResponse.json({ error: "Missing or invalid authorization header." }, { status: 401 }),
    };
  }

  const accessToken = authHeader.slice(7);
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return {
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from("employees")
    .select("id, role, branch_id")
    .eq("supabase_user_id", authData.user.id)
    .eq("status", "active")
    .single();

  if (employeeError || !employee) {
    return {
      response: NextResponse.json({ error: "Employee profile not found." }, { status: 403 }),
    };
  }

  const role = employee.role as EmployeeRole;
  if (allowedRoles && !allowedRoles.includes(role)) {
    return {
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return {
    auth: {
      userId: authData.user.id,
      employeeId: employee.id,
      role,
      branchId: employee.branch_id ?? null,
    },
  };
}
