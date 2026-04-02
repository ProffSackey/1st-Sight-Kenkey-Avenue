#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Test Orders Table Insert
 * Attempts to insert with different field combinations to diagnose schema
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

async function testInsert() {
  try {
    console.log('Testing orders table structure...\n');

    // Get a branch to use for testing
    const { data: branches } = await supabaseAdmin
      .from('branches')
      .select('id')
      .limit(1);

    if (!branches || branches.length === 0) {
      console.log('No branches found. Creating test branch...');
      const { error } = await supabaseAdmin
        .from('branches')
        .insert({ id: 'BR-TEST', name: 'Test Branch', location: 'Test Location' });
      if (error) {
        console.error('Error creating test branch:', error);
        return;
      }
    }

    const branchId = branches?.[0]?.id || 'BR-TEST';

    // Get a cashier
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('role', 'Cashier')
      .limit(1);

    if (!employees || employees.length === 0) {
      console.log('No cashier found in test');
      return;
    }

    const cashierId = employees[0].id;

    console.log('Testing insert WITHOUT customer_name field...');
    const testOrderId = `TEST-${Date.now()}`;
    
    const testData = {
      id: testOrderId,
      branch_id: branchId,
      cashier_id: cashierId,
      order_date: new Date().toISOString().split('T')[0],
      order_time: new Date().toTimeString().slice(0, 8),
      total_amount: 0,
      discount_applied: 0,
      final_amount: 0,
      payment_method: 'Cash',
      payment_status: 'completed',
    };

    console.log('Insert data:', testData);
    const { error, data } = await supabaseAdmin
      .from('orders')
      .insert(testData)
      .select();

    if (error) {
      console.error('\nError inserting:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    } else {
      console.log('\n✓ Insert successful!');
      console.log('Inserted:', data);
      
      // Delete test record
      await supabaseAdmin.from('orders').delete().eq('id', testOrderId);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testInsert();

