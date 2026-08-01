import { Pool } from 'pg';
import dotenv from 'dotenv';
import { SCHEMA_SQL, SEED_SQL } from './sql';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Run the schema and seed scripts on startup.
 * Safe to call multiple times — uses IF NOT EXISTS / ON CONFLICT.
 */
export async function initDb(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL environment variable is missing.');
    return;
  }

  try {
    await pool.query(SCHEMA_SQL);
    console.log('✅ Schema applied');

    if (process.env.SEED_DB === 'true') {
      await pool.query(SEED_SQL);
      console.log('✅ Seed data applied');
    }
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  }
}
