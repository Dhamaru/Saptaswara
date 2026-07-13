const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('practice_logs').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Table exists, data:', data);
  }
}
check();
