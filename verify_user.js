const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/web/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  console.log('Total users:', data.users.length);
  const found = data.users.find(u => u.email === 'kasivasi2005@gmail.com');
  if (found) {
    console.log('User exists in database. Last sign in:', found.last_sign_in_at);
  } else {
    console.log('User "kasivasi2005@gmail.com" DOES NOT EXIST in the database. They must sign up first.');
  }

  // Also query Abhogi to see vadi/samvadi values
  const { data: abhogi, error: abhogiErr } = await supabase.from('ragas').select('name, vadi, samvadi, time_of_day').eq('name', 'Abhogi').single();
  console.log('\n--- Abhogi Raga DB Check ---');
  if (abhogiErr) console.error(abhogiErr);
  else console.log(abhogi);
}

checkUser();
