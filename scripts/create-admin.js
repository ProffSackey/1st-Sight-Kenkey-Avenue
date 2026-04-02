/* eslint-disable @typescript-eslint/no-require-imports */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  for (const line of fileContents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

loadEnvFile(path.join(__dirname, '..', '.env.local'));
loadEnvFile(path.join(__dirname, '..', '.env'));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
};

const askWithDefault = async (question, defaultValue) => {
  const suffix = defaultValue ? ' (press Enter to use configured value)' : '';
  const answer = await ask(`${question}${suffix}: `);
  return answer || defaultValue || '';
};

const main = async () => {
  console.log('--- Create Admin User ---');

  const configuredDeveloperToken = process.env.DEVELOPER_TOKEN || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const inEnvSupabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  if (!configuredDeveloperToken) {
    console.error('Error: DEVELOPER_TOKEN is missing from the environment.');
    process.exit(1);
  }

  if (!supabaseServiceRoleKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY is missing from the environment.');
    process.exit(1);
  }

  if (!inEnvSupabaseUrl) {
    console.error('Error: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is missing from the environment.');
    process.exit(1);
  }

  const developerToken = await askWithDefault('Developer token', configuredDeveloperToken);
  const fullName = await ask('Admin full name: ');
  const email = await ask('Admin email: ');
  const password = await ask('Admin password: ');

  if (!developerToken || !fullName || !email || !password) {
    console.error('Error: all fields are required.');
    process.exit(1);
  }

  if (developerToken !== configuredDeveloperToken) {
    console.error('Error: invalid developer token.');
    process.exit(1);
  }

  const supabaseUrl = inEnvSupabaseUrl.replace(/\/+$/, '');

  const requestBody = {
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'admin',
    },
  };

  console.log('\nCreating admin user via Supabase Admin API...');

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Supabase request failed:', response.status, response.statusText);
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log('Admin user created successfully:');
    console.log(JSON.stringify(data, null, 2));

    const outFile = path.join(__dirname, '..', 'admin-user-created.json');
    fs.writeFileSync(outFile, JSON.stringify({ createdAt: new Date().toISOString(), user: data }, null, 2));
    console.log(`Result saved to ${outFile}`);

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
};

main();
