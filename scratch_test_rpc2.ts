import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const email = `test_${Date.now()}@example.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  if (authError) {
    console.error("Auth error:", authError);
    return;
  }
  
  console.log("User created:", authData.user?.id);
  
  const { error } = await supabase.rpc('store_jira_credentials', {
    p_jira_url: 'https://test.atlassian.net',
    p_email: email,
    p_api_token: 'test_token_123'
  });
  
  if (error) {
    console.error("RPC Error:", error);
    console.log("JSON stringified:", JSON.stringify(error));
  } else {
    console.log("RPC Success on first insert!");
  }

  // Try updating
  const { error: error2 } = await supabase.rpc('store_jira_credentials', {
    p_jira_url: 'https://test2.atlassian.net',
    p_email: email,
    p_api_token: 'new_token_456'
  });

  if (error2) {
    console.error("RPC Error 2:", error2);
    console.log("JSON stringified 2:", JSON.stringify(error2));
  } else {
    console.log("RPC Success on update!");
  }
}
test();
