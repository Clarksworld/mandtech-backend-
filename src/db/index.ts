import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Run the schema and seed scripts on first startup.
 * Safe to call multiple times — uses IF NOT EXISTS / ON CONFLICT.
 */
export async function initDb(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const seedPath   = path.join(__dirname, 'seed.sql');

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(schemaSql);
  console.log('✅ Schema applied');

  if (process.env.SEED_DB === 'true') {
    const seedSql = fs.readFileSync(seedPath, 'utf-8');
    await pool.query(seedSql);
    console.log('✅ Seed data applied');
  }
}
