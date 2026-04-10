const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error("No service role key found!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function create() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'test@example.com',
    password: 'password123',
    email_confirm: true
  });

  if (error) {
    if (error.message.includes('already registered')) {
        console.log('User already exists. Done.');
    } else {
        console.error('Error creating user:', error);
    }
  } else {
    console.log('Test user created successfully:', data.user.id);
  }
}

create();
