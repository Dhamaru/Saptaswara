const { createClient } = require('@supabase/supabase-js');

// Hardcode local Supabase 
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function create() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'localtest@example.com',
    password: 'password123',
    email_confirm: true
  });

  if (error) {
     console.error('Error creating user:', error);
  } else {
    console.log('Test user created successfully:', data.user.id);
  }
}

create();
