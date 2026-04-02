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
    console.log('--- Delete Admin User ---');

    const { adminClient } = await requireAdminConfig(rl);
    const identifier = await ask(rl, 'Admin email or user ID: ');

    if (!identifier) {
      console.error('Error: admin email or user ID is required.');
      process.exit(1);
    }

    const user = await resolveUser(adminClient, identifier);
    if (!user) {
      console.error('Error: no user found for that email or user ID.');
      process.exit(1);
    }

    const confirmation = await ask(
      rl,
      `Type DELETE to remove ${user.email || user.id}: `
    );

    if (confirmation !== 'DELETE') {
      console.log('Deletion cancelled.');
      return;
    }

    const { error } = await adminClient.auth.admin.deleteUser(user.id);
    if (error) {
      throw error;
    }

    console.log('Admin user deleted successfully:');
    console.log(
      JSON.stringify(
        {
          id: user.id,
          email: user.email,
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
