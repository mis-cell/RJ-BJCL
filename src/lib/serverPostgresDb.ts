import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const poolConfig: pg.PoolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE || 'bjcl_db',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
    };

export const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  // Connected
});

pool.on('error', (err) => {
  console.error('[Local PostgreSQL Pool Error]:', err.message);
});

// Helper to sanitize table and column names
export function sanitizeIdent(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

export interface QueryFilter {
  column: string;
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in';
  value: any;
}

export interface QueryOrder {
  column: string;
  ascending: boolean;
  nullsFirst?: boolean;
}

export interface QueryPayload {
  table: string;
  select?: string;
  filters?: QueryFilter[];
  orFilters?: string[];
  orders?: QueryOrder[];
  limit?: number;
  offset?: number;
  count?: 'exact' | 'planned' | 'estimated';
  values?: any;
  onConflictCols?: string[];
}

export async function executeSelect(payload: QueryPayload) {
  const table = sanitizeIdent(payload.table);
  const params: any[] = [];
  const whereClauses: string[] = [];

  // Handle standard filters
  if (Array.isArray(payload.filters)) {
    for (const f of payload.filters) {
      const col = sanitizeIdent(f.column);
      if (!col) continue;

      if (f.op === 'is') {
        if (f.value === null) {
          whereClauses.push(`"${col}" IS NULL`);
        } else if (f.value === true) {
          whereClauses.push(`"${col}" IS TRUE`);
        } else if (f.value === false) {
          whereClauses.push(`"${col}" IS FALSE`);
        }
      } else if (f.op === 'in' && Array.isArray(f.value)) {
        params.push(f.value);
        whereClauses.push(`"${col}" = ANY($${params.length})`);
      } else {
        params.push(f.value);
        const idx = params.length;
        switch (f.op) {
          case 'eq': whereClauses.push(`"${col}" = $${idx}`); break;
          case 'neq': whereClauses.push(`"${col}" != $${idx}`); break;
          case 'gt': whereClauses.push(`"${col}" > $${idx}`); break;
          case 'gte': whereClauses.push(`"${col}" >= $${idx}`); break;
          case 'lt': whereClauses.push(`"${col}" < $${idx}`); break;
          case 'lte': whereClauses.push(`"${col}" <= $${idx}`); break;
          case 'like': whereClauses.push(`"${col}" LIKE $${idx}`); break;
          case 'ilike': whereClauses.push(`"${col}" ILIKE $${idx}`); break;
          default: whereClauses.push(`"${col}" = $${idx}`); break;
        }
      }
    }
  }

  // Handle orFilters (e.g. "user_id.ilike.admin,username.ilike.admin")
  if (Array.isArray(payload.orFilters)) {
    for (const orStr of payload.orFilters) {
      const parts = orStr.split(',').map(s => s.trim()).filter(Boolean);
      const subClauses: string[] = [];
      for (const part of parts) {
        const tokens = part.split('.');
        if (tokens.length >= 3) {
          const col = sanitizeIdent(tokens[0]);
          const op = tokens[1].toLowerCase();
          const val = tokens.slice(2).join('.');
          params.push(val);
          const idx = params.length;
          if (op === 'ilike') subClauses.push(`"${col}" ILIKE $${idx}`);
          else if (op === 'like') subClauses.push(`"${col}" LIKE $${idx}`);
          else if (op === 'eq') subClauses.push(`"${col}" = $${idx}`);
          else if (op === 'neq') subClauses.push(`"${col}" != $${idx}`);
        }
      }
      if (subClauses.length > 0) {
        whereClauses.push(`(${subClauses.join(' OR ')})`);
      }
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count query if requested
  let totalCount: number | null = null;
  if (payload.count) {
    const countSql = `SELECT COUNT(*) as count FROM "${table}" ${whereSql}`;
    try {
      const countRes = await pool.query(countSql, params);
      totalCount = parseInt(countRes.rows[0]?.count || '0', 10);
    } catch (_) {}
  }

  // Select columns
  let selectSql = '*';
  if (payload.select && payload.select !== '*' && !payload.select.includes('(')) {
    selectSql = payload.select.split(',').map(c => `"${sanitizeIdent(c.trim())}"`).join(', ');
  }

  // Ordering
  let orderSql = '';
  if (Array.isArray(payload.orders) && payload.orders.length > 0) {
    const orderParts = payload.orders.map(o => {
      const col = sanitizeIdent(o.column);
      const dir = o.ascending ? 'ASC' : 'DESC';
      const nulls = o.nullsFirst ? 'NULLS FIRST' : 'NULLS LAST';
      return `"${col}" ${dir} ${nulls}`;
    });
    orderSql = `ORDER BY ${orderParts.join(', ')}`;
  }

  // Limit & Offset
  let limitSql = '';
  if (typeof payload.limit === 'number') {
    params.push(payload.limit);
    limitSql += ` LIMIT $${params.length}`;
  }
  if (typeof payload.offset === 'number') {
    params.push(payload.offset);
    limitSql += ` OFFSET $${params.length}`;
  }

  const fullSql = `SELECT ${selectSql} FROM "${table}" ${whereSql} ${orderSql} ${limitSql}`.trim();
  const result = await pool.query(fullSql, params);

  return {
    data: result.rows,
    count: totalCount !== null ? totalCount : result.rowCount,
    error: null
  };
}

export async function executeInsert(payload: QueryPayload) {
  const table = sanitizeIdent(payload.table);
  const rawValues = Array.isArray(payload.values) ? payload.values : [payload.values];
  if (rawValues.length === 0) return { data: [], error: null };

  const sample = rawValues[0];
  const keys = Object.keys(sample).filter(k => sample[k] !== undefined);
  if (keys.length === 0) return { data: [], error: null };

  const colsSql = keys.map(k => `"${sanitizeIdent(k)}"`).join(', ');
  const params: any[] = [];
  const valueRows: string[] = [];

  for (const row of rawValues) {
    const rowPlaceholders: string[] = [];
    for (const k of keys) {
      let val = row[k];
      if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
        val = JSON.stringify(val);
      }
      params.push(val === undefined ? null : val);
      rowPlaceholders.push(`$${params.length}`);
    }
    valueRows.push(`(${rowPlaceholders.join(', ')})`);
  }

  let onConflictSql = '';
  if (Array.isArray(payload.onConflictCols) && payload.onConflictCols.length > 0) {
    const conflictCols = payload.onConflictCols.map(c => `"${sanitizeIdent(c)}"`).join(', ');
    onConflictSql = `ON CONFLICT (${conflictCols}) DO NOTHING`;
  }

  const insertSql = `
    INSERT INTO "${table}" (${colsSql})
    VALUES ${valueRows.join(', ')}
    ${onConflictSql}
    RETURNING *
  `;

  const result = await pool.query(insertSql, params);
  return { data: result.rows, error: null };
}

export async function executeUpdate(payload: QueryPayload) {
  const table = sanitizeIdent(payload.table);
  const values = payload.values || {};
  const keys = Object.keys(values).filter(k => values[k] !== undefined);
  if (keys.length === 0) return { data: [], error: null };

  const params: any[] = [];
  const setClauses: string[] = [];

  for (const k of keys) {
    let val = values[k];
    if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
      val = JSON.stringify(val);
    }
    params.push(val);
    setClauses.push(`"${sanitizeIdent(k)}" = $${params.length}`);
  }

  const whereClauses: string[] = [];
  if (Array.isArray(payload.filters)) {
    for (const f of payload.filters) {
      const col = sanitizeIdent(f.column);
      params.push(f.value);
      whereClauses.push(`"${col}" = $${params.length}`);
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const updateSql = `UPDATE "${table}" SET ${setClauses.join(', ')} ${whereSql} RETURNING *`;

  const result = await pool.query(updateSql, params);
  return { data: result.rows, error: null };
}

export async function executeDelete(payload: QueryPayload) {
  const table = sanitizeIdent(payload.table);
  const params: any[] = [];
  const whereClauses: string[] = [];

  if (Array.isArray(payload.filters)) {
    for (const f of payload.filters) {
      const col = sanitizeIdent(f.column);
      params.push(f.value);
      whereClauses.push(`"${col}" = $${params.length}`);
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const deleteSql = `DELETE FROM "${table}" ${whereSql} RETURNING *`;

  const result = await pool.query(deleteSql, params);
  return { data: result.rows, error: null };
}

export async function executeRpc(funcName: string, args: any) {
  const func = sanitizeIdent(funcName);
  try {
    if (args && typeof args === 'object' && !Array.isArray(args)) {
      const res = await pool.query(`SELECT * FROM "${func}"($1::jsonb)`, [JSON.stringify(args)]);
      return { data: res.rows, error: null };
    } else if (Array.isArray(args)) {
      const placeholders = args.map((_, i) => `$${i + 1}`).join(', ');
      const res = await pool.query(`SELECT * FROM "${func}"(${placeholders})`, args);
      return { data: res.rows, error: null };
    } else {
      const res = await pool.query(`SELECT * FROM "${func}"()`);
      return { data: res.rows, error: null };
    }
  } catch (err: any) {
    return { data: null, error: { message: err.message } };
  }
}

// Server-side query builder to replace @supabase/supabase-js in server.ts
class ServerDbQueryBuilder implements PromiseLike<{ data: any; error: any }> {
  private payload: QueryPayload;

  constructor(table: string) {
    this.payload = { table, filters: [] };
  }

  select(columns: string = '*') {
    this.payload.select = columns;
    return this;
  }

  eq(column: string, value: any) {
    this.payload.filters = this.payload.filters || [];
    this.payload.filters.push({ column, op: 'eq', value });
    return this;
  }

  or(filterStr: string) {
    this.payload.orFilters = this.payload.orFilters || [];
    this.payload.orFilters.push(filterStr);
    return this;
  }

  limit(count: number) {
    this.payload.limit = count;
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.payload.orders = this.payload.orders || [];
    this.payload.orders.push({ column, ascending: opts?.ascending !== false });
    return this;
  }

  async single() {
    const res = await executeSelect(this.payload);
    return { data: res.data?.[0] || null, error: res.error };
  }

  async maybeSingle() {
    const res = await executeSelect(this.payload);
    return { data: res.data?.[0] || null, error: null };
  }

  async insert(values: any) {
    this.payload.values = values;
    return executeInsert(this.payload);
  }

  async update(values: any) {
    this.payload.values = values;
    return executeUpdate(this.payload);
  }

  async delete() {
    return executeDelete(this.payload);
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return executeSelect(this.payload).then(onfulfilled as any, onrejected);
  }
}

export const serverLocalDb = {
  from(table: string) {
    return new ServerDbQueryBuilder(table);
  },
  rpc(func: string, args: any) {
    return executeRpc(func, args);
  }
};
