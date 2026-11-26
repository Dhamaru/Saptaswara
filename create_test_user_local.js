const { createClient } = require('@supabase/supabase-js');

// Local-only helper: creates a throwaway user in a local Supabase instance.
// A service-role key must never live in source control — load it from the
// environment (e.g. SUPABASE_SERVICE_ROLE_KEY=... node create_test_user_local.js).
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error(
    'SUPABASE_SERVICE_ROLE_KEY is not set. Export the key from your local ' +
      'Supabase instance before running this script.'
  );
  process.exit(1);
}

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(supabaseUrl)) {
  console.error('Refusing to create a test user against a non-local Supabase URL:', supabaseUrl);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function create() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: process.env.TEST_USER_EMAIL || 'localtest@example.com',
    password: process.env.TEST_USER_PASSWORD || 'password123',
    email_confirm: true,
  });

  if (error) {
    console.error('Error creating user:', error);
    process.exitCode = 1;
  } else {
    console.log('Test user created successfully:', data.user.id);
  }
}

create();
