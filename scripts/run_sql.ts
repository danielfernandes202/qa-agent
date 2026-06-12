import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const connectionString = process.env.DATABASE_URL;

const client = new Client({ connectionString });

async function main() {
  try {
    await client.connect();
    console.log("Connected to database successfully.");
    const sql = fs.readFileSync('scripts/test.sql', 'utf8');
    const res = await client.query(sql);
    console.log("SQL script executed successfully!");
    if (res && res.length) {
        console.log(res[res.length - 1].rows);
    } else {
        console.log(res.rows);
    }
  } catch (err: any) {
    console.error("Error executing query:", err.message);
  } finally {
    await client.end();
  }
}

main();
