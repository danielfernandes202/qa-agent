import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from the root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is missing in .env");
  process.exit(1);
}

const sql = process.argv[2];

if (!sql) {
  console.error("Please provide a SQL query as an argument");
  process.exit(1);
}

const client = new Client({
  connectionString,
});

async function main() {
  try {
    await client.connect();
    console.log("Connected to database successfully.");
    console.log(`Executing: ${sql}`);
    
    const res = await client.query(sql);
    console.log("Result:", JSON.stringify(res.rows, null, 2));
  } catch (err: any) {
    console.error("Error executing query:", err.message);
  } finally {
    await client.end();
  }
}

main();
