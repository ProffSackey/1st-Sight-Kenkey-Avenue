/* eslint-disable @typescript-eslint/no-require-imports */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

const ask = (rl, question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
};

const askWithDefault = async (rl, question, defaultValue) => {
  const suffix = defaultValue ? ' (press Enter to use configured value)' : '';
  const answer = await ask(rl, `${question}${suffix}: `);
  return answer || defaultValue || '';
};

const createPrompt = () => {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
};

const requireAdminConfig = async (rl) => {
  const configuredDeveloperToken = process.env.DEVELOPER_TOKEN || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  if (!configuredDeveloperToken) {
    throw new Error('DEVELOPER_TOKEN is missing from the environment.');
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing from the environment.');
  }

  if (!supabaseUrl) {
    throw new Error(
      'SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is missing from the environment.'
    );
  }

  const developerToken = await askWithDefault(
    rl,
    'Developer token',
    configuredDeveloperToken
  );

  if (!developerToken) {
    throw new Error('Developer token is required.');
  }

  if (developerToken !== configuredDeveloperToken) {
    throw new Error('Invalid developer token.');
  }

  const adminClient = createClient(
    supabaseUrl.replace(/\/+$/, ''),
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return { adminClient };
};

const isUuid = (value) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
};

const findUserByEmail = async (adminClient, email) => {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users || [];
    const matchedUser = users.find(
      (user) => (user.email || '').toLowerCase() === email.toLowerCase()
    );

    if (matchedUser) {
      return matchedUser;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
};

const resolveUser = async (adminClient, identifier) => {
  if (isUuid(identifier)) {
    const { data, error } = await adminClient.auth.admin.getUserById(identifier);

    if (error) {
      throw error;
    }

    return data.user || null;
  }

  return findUserByEmail(adminClient, identifier);
};

module.exports = {
  ask,
  askWithDefault,
  createPrompt,
  requireAdminConfig,
  resolveUser,
};
