import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
  const email = 'test_jira_vault@example.com';
  const password = 'password123';
  
  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.log('Login failed, trying signup...');
    const res = await supabase.auth.signUp({
      email,
      password,
    });
    data = res.data;
    error = res.error;
  }

  console.log('Auth:', error ? error.message : 'Success');
  
  if (!error) {
    const res = await supabase.rpc('store_jira_credentials', {
      p_jira_url: 'https://test.atlassian.net',
      p_email: email,
      p_api_token: 'dummy-token'
    });
    console.log('RPC result:', JSON.stringify(res, null, 2));
  }
}
main();
