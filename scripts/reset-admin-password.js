/* eslint-disable @typescript-eslint/no-require-imports */

const {
  ask,
  createPrompt,
  requireAdminConfig,
  resolveUser,
} = require('./admin-utils');

const main = async () => {
  const rl = createPrompt();

  try {
    console.log('--- Reset Admin Password ---');

    const { adminClient } = await requireAdminConfig(rl);
    const identifier = await ask(rl, 'Admin email or user ID: ');
    const newPassword = await ask(rl, 'New password: ');

    if (!identifier || !newPassword) {
      console.error('Error: admin email or user ID and new password are required.');
      process.exit(1);
    }

    const user = await resolveUser(adminClient, identifier);
    if (!user) {
      console.error('Error: no user found for that email or user ID.');
      process.exit(1);
    }

    const { data, error } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (error) {
      throw error;
    }

    console.log('Admin password reset successfully:');
    console.log(
      JSON.stringify(
        {
          id: data.user.id,
          email: data.user.email,
          updated_at: data.user.updated_at,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error('Error:', error.message || error);
    process.exit(1);
  } finally {
    rl.close();
  }
};

main();
