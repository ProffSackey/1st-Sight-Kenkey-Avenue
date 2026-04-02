#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Reset Script - Clears all data from the database except the admin user
 * This script should be run from the project root
 * Usage: node scripts/reset-all-data.js
 */

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

async function resetAllData() {
  try {
    console.log('Starting data reset...\n');

    // Step 1: Delete all orders (depends on items and employees)
    console.log('Deleting all orders...');
    const { error: ordersError } = await supabaseAdmin
      .from('orders')
      .delete()
      .neq('id', '');

    if (ordersError) {
      console.error('Error deleting orders:', ordersError.message);
    } else {
      console.log('✓ Orders deleted\n');
    }

    // Step 2: Delete all order items
    console.log('Deleting all order items...');
    const { error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .delete()
      .neq('id', '');

    if (orderItemsError) {
      console.error('Error deleting order items:', orderItemsError.message);
    } else {
      console.log('✓ Order items deleted\n');
    }

    // Step 3: Delete all stock movements
    console.log('Deleting all stock movements...');
    const { error: stockError } = await supabaseAdmin
      .from('stock_movements')
      .delete()
      .neq('id', '');

    if (stockError) {
      console.error('Error deleting stock movements:', stockError.message);
    } else {
      console.log('✓ Stock movements deleted\n');
    }

    // Step 4: Delete all refunds
    console.log('Deleting all refunds...');
    const { error: refundsError } = await supabaseAdmin
      .from('refunds')
      .delete()
      .neq('id', '');

    if (refundsError) {
      console.error('Error deleting refunds:', refundsError.message);
    } else {
      console.log('✓ Refunds deleted\n');
    }

    // Step 5: Delete all reports
    console.log('Deleting all reports...');
    const { error: reportsError } = await supabaseAdmin
      .from('reports')
      .delete()
      .neq('id', '');

    if (reportsError) {
      console.error('Error deleting reports:', reportsError.message);
    } else {
      console.log('✓ Reports deleted\n');
    }

    // Step 6: Delete all items
    console.log('Deleting all items...');
    const { error: itemsError } = await supabaseAdmin
      .from('items')
      .delete()
      .neq('id', '');

    if (itemsError) {
      console.error('Error deleting items:', itemsError.message);
    } else {
      console.log('✓ Items deleted\n');
    }

    // Step 7: Delete all categories
    console.log('Deleting all categories...');
    const { error: categoriesError } = await supabaseAdmin
      .from('categories')
      .delete()
      .neq('id', '');

    if (categoriesError) {
      console.error('Error deleting categories:', categoriesError.message);
    } else {
      console.log('✓ Categories deleted\n');
    }

    // Step 8: Get admin user ID to preserve
    console.log('Fetching admin user...');
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    let adminUserId = null;
    const adminUsers = users.filter(u => u.user_metadata?.role === 'Admin');
    
    if (adminUsers.length > 0) {
      adminUserId = adminUsers[0].id;
      console.log(`✓ Found admin user: ${adminUsers[0].email}\n`);
    } else {
      console.log('⚠ No admin user found in auth\n');
    }

    // Step 9: Delete all non-admin employees from database
    console.log('Deleting non-admin employees from database...');
    if (adminUserId) {
      const { error: empError } = await supabaseAdmin
        .from('employees')
        .delete()
        .neq('supabase_user_id', adminUserId);

      if (empError) {
        console.error('Error deleting non-admin employees:', empError.message);
      } else {
        console.log('✓ Non-admin employees deleted from database\n');
      }
    }

    // Step 10: Delete non-admin auth users
    console.log('Deleting non-admin auth users...');
    for (const user of users) {
      if (user.id !== adminUserId && user.user_metadata?.role !== 'Admin') {
        try {
          await supabaseAdmin.auth.admin.deleteUser(user.id);
          console.log(`✓ Deleted auth user: ${user.email}`);
        } catch (error) {
          console.error(`Error deleting user ${user.email}:`, error);
        }
      }
    }

    // Step 11: Delete all branches
    console.log('\nDeleting all branches...');
    const { error: branchesError } = await supabaseAdmin
      .from('branches')
      .delete()
      .neq('id', '');

    if (branchesError) {
      console.error('Error deleting branches:', branchesError.message);
    } else {
      console.log('✓ Branches deleted\n');
    }

    console.log('✅ Data reset completed successfully!');
    console.log('✅ All data has been cleared except the admin user.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during reset:', error.message);
    process.exit(1);
  }
}

resetAllData();

