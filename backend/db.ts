import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Force node-postgres to return DATE (1082) and TIMESTAMP (1114) as raw strings
pg.types.setTypeParser(1082, (val: string) => val);
pg.types.setTypeParser(1114, (val: string) => val);

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const { Pool } = pg;

// Direct connection to your LOCAL PostgreSQL database (bjcl_db)
export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'bjcl_db',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
});

pool.on('error', (err) => {
  console.error('[Local PostgreSQL] Idle connection error:', err.message);
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
