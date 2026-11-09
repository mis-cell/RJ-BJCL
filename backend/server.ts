import express from 'express';
import cors from 'cors';
import { query } from './db.ts';

const app = express();
const PORT = Number(process.env.BACKEND_PORT || 5000);
const HOST = process.env.BACKEND_HOST || '127.0.0.1';
const identifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    const result = await query('SELECT NOW() as current_time, current_database() as db_name');
    res.json({
      status: 'online',
      message: 'Local PostgreSQL backend is running',
      database: result.rows[0].db_name,
      timestamp: result.rows[0].current_time
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Generic query endpoint for local tables
app.get('/api/data/:table', async (req, res) => {
  const { table } = req.params;
  if (!identifier.test(table)) return res.status(400).json({ error: 'Invalid table name' });
  try {
    const result = await query(`SELECT * FROM "${table}" ORDER BY 1 DESC LIMIT 1000`);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generic insert endpoint
app.post('/api/data/:table', async (req, res) => {
  const { table } = req.params;
  if (!identifier.test(table)) return res.status(400).json({ error: 'Invalid table name' });
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Expected a row object' });
  }
  const keys = Object.keys(body);
  const values = Object.values(body);
  if (keys.length === 0) return res.status(400).json({ error: 'No data provided' });
  if (keys.some(key => !identifier.test(key))) {
    return res.status(400).json({ error: 'Invalid column name' });
  }

  const columns = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  try {
    const q = `INSERT INTO "${table}" (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await query(q, values);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`[Local Backend] Running directly with local PostgreSQL on http://${HOST}:${PORT}`);
});

export default app;
