/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !process.env[key]) {
      process.env[key] = valueParts.join('=').trim();
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function createEmployeesFromAuthUsers() {
  try {
    console.log('Creating employee records for existing auth users...\n');

    // Get all auth users
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError.message);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log('No auth users found.');
      return;
    }

    // Get existing employees
    const { data: existingEmployees, error: empError } = await supabaseAdmin
      .from('employees')
      .select('supabase_user_id');

    if (empError) {
      console.error('Error fetching existing employees:', empError.message);
      process.exit(1);
    }

    const existingUserIds = new Set(existingEmployees.map(emp => emp.supabase_user_id));

    // Get branches for assignment
    const { data: branches, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('id, name')
      .limit(1);

    if (branchError) {
      console.error('Error fetching branches:', branchError.message);
      process.exit(1);
    }

    const defaultBranchId = branches && branches.length > 0 ? branches[0].id : null;

    // Create employee records for users that don't have them
    for (const user of users) {
      if (existingUserIds.has(user.id)) {
        console.log(`✓ Employee record already exists for ${user.email}`);
        continue;
      }

      // Determine role from user metadata or email
      let role = 'Cashier'; // default
      if (user.user_metadata?.role) {
        const metaRole = user.user_metadata.role.toLowerCase();
        if (metaRole === 'admin') role = 'Admin';
        else if (metaRole === 'manager') role = 'Manager';
        else if (metaRole === 'supervisor') role = 'Supervisor';
        else role = 'Cashier';
      } else if (user.email === 'admin@innovative.local') {
        role = 'Admin';
      }

      // Generate employee_id
      const employeeId = `EMP-${Math.floor(100000 + Math.random() * 900000)}`;

      const employeeData = {
        supabase_user_id: user.id,
        employee_id: employeeId,
        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
        email: user.email,
        phone: user.user_metadata?.phone || '+233000000000',
        role: role,
        branch_id: defaultBranchId,
        status: 'active',
      };

      const { error: insertError } = await supabaseAdmin
        .from('employees')
        .insert(employeeData);

      if (insertError) {
        console.error(`❌ Failed to create employee for ${user.email}:`, insertError.message);
      } else {
        console.log(`✅ Created employee record for ${user.email} (${role})`);
      }
    }

    console.log('\nEmployee creation completed!');

  } catch (err) {
    console.error('Script failed:', err.message);
    process.exit(1);
  }
}

createEmployeesFromAuthUsers();
