#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Add customer_name column to orders table
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

async function addCustomerNameColumn() {
  try {
    console.log('Adding customer_name column to orders table...\n');

    // Use the SQL function approach - since we can't run raw SQL via the JS client,
    // we need to check if the column exists and create it if needed
    // Actually, let's try a different approach using a dummy insert to force the schema cache refresh

    // First, let's try to query the table schema using PostgREST introspection
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert({
        id: 'SCHEMA-CHECK',
        branch_id: 'TEMP',
        cashier_id: '00000000-0000-0000-0000-000000000000',
        customer_name: 'test',
        order_date: '2026-01-01',
        order_time: '00:00:00',
        total_amount: 0,
        discount_applied: 0,
        final_amount: 0,
        payment_method: 'Cash',
        payment_status: 'completed'
      })
      .select();

    if (error) {
      console.error('Error:', error.message);
      if (error.message.includes('customer_name')) {
        console.log('\nThe customer_name column needs to be added to the orders table.');
        console.log('Please run the database migration to add this column.');
        console.log('\nSQL to run in Supabase SQL Editor:');
        console.log('ALTER TABLE orders ADD COLUMN customer_name VARCHAR(100);');
      }
    } else {
      console.log('Column appears to exist!');
      // Clean up
      await supabaseAdmin.from('orders').delete().eq('id', 'SCHEMA-CHECK');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

addCustomerNameColumn();

