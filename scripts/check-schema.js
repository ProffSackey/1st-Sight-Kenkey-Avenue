#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Check Database Schema
 * Lists all columns in the orders table
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

async function checkSchema() {
  try {
    console.log('Checking database schema for orders table...\n');

    // Get all information from information_schema
    const { data, error } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'orders');

    if (error) {
      console.error('Error querying schema:', error);
      
      // Try alternative approach - just insert a test record to see what columns exist
      console.log('\nAttempting to check via direct query...\n');
      const { data: ordersData, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .limit(1);
      
      if (ordersError) {
        console.error('Error checking orders table:', ordersError);
      } else {
        console.log('Orders table structure (from sample record):');
        if (ordersData && ordersData.length > 0) {
          console.log('Columns:', Object.keys(ordersData[0]));
        } else {
          console.log('No records to inspect, but table is accessible');
        }
      }
    } else {
      console.log('Orders table columns:');
      console.log(data);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchema();

