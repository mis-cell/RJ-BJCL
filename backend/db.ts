import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Direct connection to your LOCAL PostgreSQL database (bjcl_db)
export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'bjcl_db',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
});

// Test local database connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('[Local PostgreSQL] Error connecting to local database bjcl_db:', err.message);
  } else {
    console.log('[Local PostgreSQL] SUCCESS: Connected to local PostgreSQL database "bjcl_db" on port 5432.');
    release();
  }
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
