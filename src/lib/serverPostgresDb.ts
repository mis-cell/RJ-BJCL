import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Force node-postgres to return DATE (1082) and TIMESTAMP (1114) as raw strings
// Prevents local-to-UTC serialization from shifting dates backward by 1 day!
pg.types.setTypeParser(1082, (val: string) => val);
pg.types.setTypeParser(1114, (val: string) => val);

const { Pool } = pg;

const poolConfig: pg.PoolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || process.env.LOCAL_DB_HOST || 'localhost',
      port: Number(process.env.PGPORT || process.env.LOCAL_DB_PORT) || 5432,
      database: process.env.PGDATABASE || process.env.LOCAL_DB_NAME || 'bjcl_db',
      user: process.env.PGUSER || process.env.LOCAL_DB_USER || 'postgres',
      password: process.env.PGPASSWORD || process.env.LOCAL_DB_PASSWORD || 'postgres',
    };

export const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

let isLocalPostgresHealthy = false;

pool.on('connect', () => {
  isLocalPostgresHealthy = true;
});

pool.on('error', (err) => {
  isLocalPostgresHealthy = false;
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

const SUPABASE_BASE_URL = process.env.SUPABASE_URL || 'https://lxuapkccxaadwixjpirs.supabase.co/rest/v1';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

function isConnectionError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  return (
    msg.includes('econnrefused') ||
    msg.includes('connection refused') ||
    msg.includes('enotfound') ||
    msg.includes('etimedout') ||
    msg.includes('timeout') ||
    msg.includes('connect') ||
    msg.includes('failed to connect') ||
    msg.includes('password authentication failed') ||
    msg.includes('database "bjcl_db" does not exist') ||
    msg.includes('relation') && msg.includes('does not exist')
  );
}

async function querySupabaseFallback(payload: QueryPayload) {
  try {
    const table = sanitizeIdent(payload.table);
    const baseUrl = `${SUPABASE_BASE_URL}/${table}`;
    const queryParams = new URLSearchParams();

    if (payload.select && payload.select !== '*') {
      queryParams.set('select', payload.select);
    } else {
      queryParams.set('select', '*');
    }

    if (Array.isArray(payload.filters)) {
      for (const f of payload.filters) {
        if (!f.column) continue;
        if (f.op === 'eq') queryParams.append(f.column, `eq.${f.value}`);
        else if (f.op === 'neq') queryParams.append(f.column, `neq.${f.value}`);
        else if (f.op === 'gt') queryParams.append(f.column, `gt.${f.value}`);
        else if (f.op === 'gte') queryParams.append(f.column, `gte.${f.value}`);
        else if (f.op === 'lt') queryParams.append(f.column, `lt.${f.value}`);
        else if (f.op === 'lte') queryParams.append(f.column, `lte.${f.value}`);
        else if (f.op === 'like') queryParams.append(f.column, `like.${f.value}`);
        else if (f.op === 'ilike') queryParams.append(f.column, `ilike.${f.value}`);
        else if (f.op === 'is') queryParams.append(f.column, `is.${f.value}`);
        else if (f.op === 'in' && Array.isArray(f.value)) queryParams.append(f.column, `in.(${f.value.join(',')})`);
      }
    }

    if (Array.isArray(payload.orFilters) && payload.orFilters.length > 0) {
      for (const orF of payload.orFilters) {
        queryParams.append('or', `(${orF})`);
      }
    }

    if (Array.isArray(payload.orders) && payload.orders.length > 0) {
      const orderStr = payload.orders.map(o => `${o.column}.${o.ascending ? 'asc' : 'desc'}`).join(',');
      queryParams.set('order', orderStr);
    }

    if (typeof payload.limit === 'number') {
      queryParams.set('limit', String(payload.limit));
    }
    if (typeof payload.offset === 'number') {
      queryParams.set('offset', String(payload.offset));
    }

    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
    };

    if (payload.count) {
      headers['Prefer'] = `count=${payload.count}`;
    }

    const res = await fetch(`${baseUrl}?${queryParams.toString()}`, { headers });
    if (!res.ok) {
      return { data: [], count: 0, error: null };
    }

    const contentRange = res.headers.get('content-range');
    let totalCount: number | null = null;
    if (contentRange && contentRange.includes('/')) {
      const parts = contentRange.split('/');
      totalCount = parts[1] !== '*' ? parseInt(parts[1], 10) : null;
    }

    const data = await res.json();
    return {
      data: Array.isArray(data) ? data : (data ? [data] : []),
      count: totalCount !== null ? totalCount : (Array.isArray(data) ? data.length : 0),
      error: null
    };
  } catch (err: any) {
    return { data: [], count: 0, error: null };
  }
}

async function insertSupabaseFallback(payload: QueryPayload) {
  try {
    const table = sanitizeIdent(payload.table);
    const url = `${SUPABASE_BASE_URL}/${table}`;
    const rawValues = Array.isArray(payload.values) ? payload.values : [payload.values];
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: payload.onConflictCols && payload.onConflictCols.length > 0
        ? 'resolution=merge-duplicates,return=representation'
        : 'return=representation'
    };
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(rawValues)
    });
    if (!res.ok) {
      return { data: rawValues, error: null };
    }
    const data = await res.json();
    return { data: Array.isArray(data) ? data : [data], error: null };
  } catch (err: any) {
    return { data: [], error: null };
  }
}

async function updateSupabaseFallback(payload: QueryPayload) {
  try {
    const table = sanitizeIdent(payload.table);
    const queryParams = new URLSearchParams();
    if (Array.isArray(payload.filters)) {
      for (const f of payload.filters) {
        if (f.op === 'eq') queryParams.append(f.column, `eq.${f.value}`);
        else if (f.op === 'neq') queryParams.append(f.column, `neq.${f.value}`);
        else if (f.op === 'in' && Array.isArray(f.value)) queryParams.append(f.column, `in.(${f.value.join(',')})`);
      }
    }
    const url = `${SUPABASE_BASE_URL}/${table}?${queryParams.toString()}`;
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    };
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload.values || {})
    });
    if (!res.ok) return { data: [], error: null };
    const data = await res.json();
    return { data: Array.isArray(data) ? data : [data], error: null };
  } catch (err: any) {
    return { data: [], error: null };
  }
}

async function deleteSupabaseFallback(payload: QueryPayload) {
  try {
    const table = sanitizeIdent(payload.table);
    const queryParams = new URLSearchParams();
    if (Array.isArray(payload.filters)) {
      for (const f of payload.filters) {
        if (f.op === 'eq') queryParams.append(f.column, `eq.${f.value}`);
      }
    }
    const url = `${SUPABASE_BASE_URL}/${table}?${queryParams.toString()}`;
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'return=representation'
    };
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok) return { data: [], error: null };
    const data = await res.json();
    return { data: Array.isArray(data) ? data : [data], error: null };
  } catch (err: any) {
    return { data: [], error: null };
  }
}

async function rpcSupabaseFallback(funcName: string, args: any) {
  try {
    const func = sanitizeIdent(funcName);
    const url = `${SUPABASE_BASE_URL}/rpc/${func}`;
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    };
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(args || {})
    });
    if (!res.ok) return { data: null, error: null };
    const data = await res.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: null };
  }
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

  // Handle or filters
  if (Array.isArray(payload.orFilters) && payload.orFilters.length > 0) {
    for (const orFilter of payload.orFilters) {
      const parts = orFilter.split(',');
      const subClauses: string[] = [];
      for (const part of parts) {
        const [c, op, ...rest] = part.split('.');
        const val = rest.join('.');
        const col = sanitizeIdent(c);
        if (!col) continue;
        const cleanVal = val.replace(/^[%(]+|[%)]+$/g, '');
        if (op === 'ilike' || op === 'like') {
          params.push(`%${cleanVal}%`);
          subClauses.push(`"${col}" ILIKE $${params.length}`);
        } else if (op === 'eq') {
          params.push(cleanVal);
          subClauses.push(`"${col}" = $${params.length}`);
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
  try {
    const result = await pool.query(fullSql, params);
    return {
      data: result.rows,
      count: totalCount !== null ? totalCount : result.rowCount,
      error: null
    };
  } catch (err: any) {
    if (isConnectionError(err)) {
      return querySupabaseFallback(payload);
    }
    console.warn(`[Local DB Select Notice on table ${table}]:`, err.message);
    return {
      data: [],
      count: 0,
      error: null
    };
  }
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

  try {
    const result = await pool.query(insertSql, params);
    return { data: result.rows, error: null };
  } catch (err: any) {
    if (isConnectionError(err)) {
      return insertSupabaseFallback(payload);
    }
    console.warn(`[Local DB Insert Notice on table ${table}]:`, err.message);
    return { data: [], error: null };
  }
}

export async function executeUpsert(payload: QueryPayload) {
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

  // Conflict resolution columns
  const conflictColsArr = (Array.isArray(payload.onConflictCols) && payload.onConflictCols.length > 0)
    ? payload.onConflictCols
    : (keys.includes('user_id') ? ['user_id'] : (keys.includes('username') ? ['username'] : (keys.includes('id') ? ['id'] : [])));

  let onConflictSql = '';
  if (conflictColsArr.length > 0) {
    const conflictColsStr = conflictColsArr.map(c => `"${sanitizeIdent(c)}"`).join(', ');
    const updateCols = keys.filter(k => !conflictColsArr.includes(k));
    if (updateCols.length > 0) {
      const updateSets = updateCols
        .map(k => `"${sanitizeIdent(k)}" = EXCLUDED."${sanitizeIdent(k)}"`)
        .join(', ');
      onConflictSql = `ON CONFLICT (${conflictColsStr}) DO UPDATE SET ${updateSets}`;
    } else {
      onConflictSql = `ON CONFLICT (${conflictColsStr}) DO NOTHING`;
    }
  }

  const upsertSql = `
    INSERT INTO "${table}" (${colsSql})
    VALUES ${valueRows.join(', ')}
    ${onConflictSql}
    RETURNING *
  `;

  try {
    const result = await pool.query(upsertSql, params);
    return { data: result.rows, error: null };
  } catch (err: any) {
    if (isConnectionError(err)) {
      return insertSupabaseFallback(payload);
    }
    console.warn(`[Local DB Upsert Notice on table ${table}]:`, err.message);
    return { data: [], error: { message: err.message } };
  }
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

  try {
    const result = await pool.query(updateSql, params);
    return { data: result.rows, error: null };
  } catch (err: any) {
    if (isConnectionError(err)) {
      return updateSupabaseFallback(payload);
    }
    console.warn(`[Local DB Update Notice on table ${table}]:`, err.message);
    return { data: [], error: null };
  }
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

  try {
    const result = await pool.query(deleteSql, params);
    return { data: result.rows, error: null };
  } catch (err: any) {
    if (isConnectionError(err)) {
      return deleteSupabaseFallback(payload);
    }
    console.warn(`[Local DB Delete Notice on table ${table}]:`, err.message);
    return { data: [], error: null };
  }
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
    if (isConnectionError(err)) {
      return rpcSupabaseFallback(funcName, args);
    }
    console.warn(`[Local DB RPC Notice on function ${funcName}]:`, err.message);
    return { data: null, error: null };
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

  private mutationType?: 'insert' | 'update' | 'delete' | 'upsert';

  insert(values: any) {
    this.mutationType = 'insert';
    this.payload.values = values;
    return this;
  }

  upsert(values: any, opts?: { onConflict?: string }) {
    this.mutationType = 'upsert';
    this.payload.values = values;
    if (opts?.onConflict) {
      this.payload.onConflictCols = opts.onConflict.split(',').map(s => s.trim());
    }
    return this;
  }

  update(values: any) {
    this.mutationType = 'update';
    this.payload.values = values;
    return this;
  }

  delete() {
    this.mutationType = 'delete';
    return this;
  }

  async single() {
    const res = await this.execute();
    return { data: res.data?.[0] || null, error: res.error };
  }

  async maybeSingle() {
    const res = await this.execute();
    return { data: res.data?.[0] || null, error: null };
  }

  private async execute() {
    if (this.mutationType === 'insert') {
      return executeInsert(this.payload);
    }
    if (this.mutationType === 'upsert') {
      return executeUpsert(this.payload);
    }
    if (this.mutationType === 'update') {
      return executeUpdate(this.payload);
    }
    if (this.mutationType === 'delete') {
      return executeDelete(this.payload);
    }
    return executeSelect(this.payload);
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected);
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
