const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const sql = fs.readFileSync('supabase_test_run_events_migration.sql', 'utf8');
  await client.query(sql);
  console.log("Migration executed successfully!");
  await client.end();
}
run().catch(console.error);
