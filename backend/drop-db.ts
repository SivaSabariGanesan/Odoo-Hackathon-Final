import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('Dropping public schema...');
  await db.execute(sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
  console.log('Schema recreated.');
  process.exit(0);
}
run();
