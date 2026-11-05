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

// Cache of valid columns per table in local PostgreSQL to automatically strip extra non-existent columns
const tableColumnsCache = new Map<string, Set<string>>();

// Primary key columns that identify a row uniquely and should never be overwritten by a newly generated ID when updating via business key
const TABLE_PK_COLUMNS = new Set<string>([
  'id',
  'po_id',
  'amad_id',
  'final_arrival_id',
  'sauda_id',
  'settlement_id',
  'payment_id',
  'satta_id',
  'issue_id',
  'detail_id',
  'item_id',
  'ledger_id',
  'report_id',
  'log_id',
  'user_id'
]);

// Authoritative lookup keys (Primary Key first, then Natural Business Key) for master/header tables
const TABLE_UNIQUE_KEYS: Record<string, string[]> = {
  sauda_master: ['sauda_id', 'sauda_no'],
  sauda_check_point: ['po_id', 'po_no'],
  purchase_master: ['po_id', 'po_no'],
  po_archive: ['po_id', 'po_no'],
  temporary_material_received: ['amad_id', 'temporary_arrival_no'],
  issue_master: ['amad_id', 'amad_no'],
  final_arrival: ['final_arrival_id', 'final_arrival_no', 'mr_no'],
  mr_archive: ['final_arrival_id', 'final_arrival_no', 'mr_no'],
  material_inspection: ['mr_no'],
  mill_inspection_master: ['mr_no'],
  inspection_master: ['mr_no'],
  mr_settlement_master: ['settlement_id', 'mr_no'],
  m_r_settlement: ['id', 'po_no'],
  payment_master: ['payment_id', 'voucher_no'],
  user_master: ['user_id', 'username'],
  return_lorry: ['id', 'new_po_no'],
  clubbed_pomr: ['id', 'club_id'],
  satta_master: ['satta_id', 'satta_no'],
  mill_issue_master: ['issue_id', 'issue_no'],
  godown_to_factory_master: ['issue_id', 'issue_no'],
  godown_entry: ['id', 'voucher_no'],
  lorry_weighments: ['id', 'gate_pass'],
  deduction_master: ['id', 'deduction'],
  unit_master: ['id', 'unit_name'],
  supply_master: ['id', 'supp_code'],
  broker_master: ['id', 'brok_code'],
  area_master: ['id', 'area_code'],
  agency_master: ['id', 'agency_code'],
  grade_master: ['id', 'grade_code'],
  marka_master: ['id', 'marka_name'],
  godown_master: ['id', 'gdn_code'],
  batch_master: ['code'],
  department_master: ['dept_code'],
  financial_year_master: ['year_code'],
  sauda_check_point_deductions: ['id', 'po_no']
};

// Composite conflict keys for rate/matrix tables
const TABLE_COMPOSITE_KEYS: Record<string, string[]> = {
  satta_differentials: ['area', 'grade'],
  satta_calculated_rates: ['start_date', 'area', 'grade']
};

// Automatic startup maintenance: ensure BIGINT PK sequences exist and deduplicate any accidental duplicate master rows
let integrityInitialized = false;
async function ensureDatabaseIntegrity() {
  if (integrityInitialized) return;
  integrityInitialized = true;
  try {
    // 1. Ensure BIGINT id columns have auto-incrementing sequences so detail inserts never fail
    const bigintTables: Array<{ table: string; pk: string }> = [
      { table: 'material_inspection_details', pk: 'id' },
      { table: 'material_inspection_deductions', pk: 'id' },
      { table: 'mill_inspection_detail', pk: 'id' },
      { table: 'mill_inspection_print_logs', pk: 'id' },
      { table: 'inspection_details', pk: 'id' },
      { table: 'inspection_checklist_details', pk: 'id' },
      { table: 'satta_quality_details', pk: 'id' },
      { table: 'agency_master', pk: 'id' },
      { table: 'area_master', pk: 'id' },
      { table: 'broker_master', pk: 'id' },
      { table: 'godown_master', pk: 'id' },
      { table: 'grade_master', pk: 'id' },
      { table: 'marka_master', pk: 'id' },
      { table: 'supply_master', pk: 'id' },
      { table: 'user_activity_logs', pk: 'log_id' }
    ];

    for (const { table, pk } of bigintTables) {
      const seqName = `${table}_${pk}_auto_seq`;
      await pool.query(`
        DO $$
        DECLARE
          max_val BIGINT;
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${pk}') THEN
            EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I', '${seqName}');
            EXECUTE format('SELECT COALESCE(MAX(%I), 0) + 1 FROM %I', '${pk}', '${table}') INTO max_val;
            PERFORM setval('${seqName}', GREATEST(max_val, 1), false);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET DEFAULT nextval(%L)', '${table}', '${pk}', '${seqName}');
          END IF;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END $$;
      `).catch(() => {});
    }

    // 2. Clean up any duplicate rows on master tables (keeping the latest row by ctid)
    const dedupTargets: Array<{ table: string; keyExpr: string }> = [
      { table: 'sauda_check_point', keyExpr: `TRIM(UPPER(po_no))` },
      { table: 'purchase_master', keyExpr: `TRIM(UPPER(po_no))` },
      { table: 'temporary_material_received', keyExpr: `TRIM(UPPER(temporary_arrival_no))` },
      { table: 'final_arrival', keyExpr: `TRIM(UPPER(COALESCE(NULLIF(final_arrival_no, ''), mr_no)))` },
      { table: 'mr_settlement_master', keyExpr: `TRIM(UPPER(mr_no))` },
      { table: 'payment_master', keyExpr: `TRIM(UPPER(voucher_no))` },
      { table: 'sauda_master', keyExpr: `TRIM(UPPER(sauda_no))` },
      { table: 'lorry_weighments', keyExpr: `TRIM(UPPER(gate_pass))` },
      { table: 'satta_differentials', keyExpr: `TRIM(UPPER(area)) || '||' || TRIM(UPPER(grade))` }
    ];

    for (const { table, keyExpr } of dedupTargets) {
      await pool.query(`
        DELETE FROM "${table}" a
        USING "${table}" b
        WHERE a.ctid < b.ctid
          AND (${keyExpr.replace(/\b([a-z_]+)\b/g, (m) => ['TRIM', 'UPPER', 'COALESCE', 'NULLIF'].includes(m) ? m : `a.${m}`)}) =
              (${keyExpr.replace(/\b([a-z_]+)\b/g, (m) => ['TRIM', 'UPPER', 'COALESCE', 'NULLIF'].includes(m) ? m : `b.${m}`)})
          AND (${keyExpr.replace(/\b([a-z_]+)\b/g, (m) => ['TRIM', 'UPPER', 'COALESCE', 'NULLIF'].includes(m) ? m : `a.${m}`)}) IS NOT NULL
          AND (${keyExpr.replace(/\b([a-z_]+)\b/g, (m) => ['TRIM', 'UPPER', 'COALESCE', 'NULLIF'].includes(m) ? m : `a.${m}`)}) <> '';
      `).catch(() => {});
    }

    // 3. Ensure lorry_weighments columns & defaults for Android Gate/Weighbridge App compatibility
    await pool.query(`
      ALTER TABLE IF EXISTS "lorry_weighments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
      ALTER TABLE IF EXISTS "lorry_weighments" ALTER COLUMN "chalan_no" SET DEFAULT '';
      ALTER TABLE IF EXISTS "lorry_weighments" ALTER COLUMN "chalan_no" DROP NOT NULL;
      ALTER TABLE IF EXISTS "lorry_weighments" ALTER COLUMN "in_time" SET DEFAULT '';
      ALTER TABLE IF EXISTS "lorry_weighments" ALTER COLUMN "in_time" DROP NOT NULL;
      ALTER TABLE IF EXISTS "lorry_weighments" ALTER COLUMN "party_name" SET DEFAULT '';
      ALTER TABLE IF EXISTS "lorry_weighments" ALTER COLUMN "party_name" DROP NOT NULL;
      ALTER TABLE IF EXISTS "lorry_weighments" ALTER COLUMN "description" SET DEFAULT '';
      ALTER TABLE IF EXISTS "lorry_weighments" ALTER COLUMN "description" DROP NOT NULL;
      ALTER TABLE IF EXISTS "lorry_weighments" ALTER COLUMN "entry_date" SET DEFAULT '';
      ALTER TABLE IF EXISTS "lorry_weighments" ALTER COLUMN "entry_date" DROP NOT NULL;
      ALTER TABLE IF EXISTS "lorry_weighments" ALTER COLUMN "lorry_no" SET DEFAULT '';
      ALTER TABLE IF EXISTS "lorry_weighments" ALTER COLUMN "lorry_no" DROP NOT NULL;
      ALTER TABLE IF EXISTS "lorry_weighments" ADD COLUMN IF NOT EXISTS "driver_number" TEXT;
      ALTER TABLE IF EXISTS "lorry_weighments" ADD COLUMN IF NOT EXISTS "driver_name" TEXT;
      ALTER TABLE IF EXISTS "lorry_weighments" ADD COLUMN IF NOT EXISTS "department" TEXT DEFAULT 'Jute';
      ALTER TABLE IF EXISTS "lorry_weighments" ADD COLUMN IF NOT EXISTS "mokam" VARCHAR(100);
      ALTER TABLE IF EXISTS "lorry_weighments" ADD COLUMN IF NOT EXISTS "marka" VARCHAR(100);
      ALTER TABLE IF EXISTS "lorry_weighments" ADD COLUMN IF NOT EXISTS "grade" TEXT;
      ALTER TABLE IF EXISTS "lorry_weighments" ADD COLUMN IF NOT EXISTS "grade_details" JSONB;
      ALTER TABLE IF EXISTS "lorry_weighments" ADD COLUMN IF NOT EXISTS "electric_gross_weight" NUMERIC(12, 2) DEFAULT 0.0;
      ALTER TABLE IF EXISTS "lorry_weighments" ADD COLUMN IF NOT EXISTS "electric_tare_weight" NUMERIC(12, 2) DEFAULT 0.0;
      ALTER TABLE IF EXISTS "lorry_weighments" ADD COLUMN IF NOT EXISTS "unload_status" VARCHAR(50) DEFAULT 'Pending';
    `).catch(() => {});
  } catch (_) {}
}

// Trigger startup integrity check asynchronously when module loads
setTimeout(() => {
  ensureDatabaseIntegrity().catch(() => {});
}, 500);

async function getValidTableColumns(table: string): Promise<Set<string>> {
  const cleanTable = sanitizeIdent(table);
  if (tableColumnsCache.has(cleanTable)) {
    return tableColumnsCache.get(cleanTable)!;
  }
  try {
    const res = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      [cleanTable]
    );
    if (res.rows.length > 0) {
      const colSet = new Set<string>(res.rows.map((r: any) => String(r.column_name)));
      tableColumnsCache.set(cleanTable, colSet);
      return colSet;
    }
  } catch (_) {}
  return new Set<string>();
}

function filterRowByValidColumns(row: Record<string, any>, validCols: Set<string>): Record<string, any> {
  if (!row || typeof row !== 'object') return {};
  if (validCols.size === 0) return row;
  const filtered: Record<string, any> = {};
  for (const k of Object.keys(row)) {
    if (validCols.has(k) && row[k] !== undefined) {
      filtered[k] = row[k];
    }
  }
  return filtered;
}

function buildWhereClause(payload: QueryPayload, params: any[]): string {
  const whereClauses: string[] = [];

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

  return whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
}

/**
 * Helper to find an existing row in a table by composite conflict columns or single unique/business keys,
 * and if found, update it in place (preserving its original primary key) instead of inserting a duplicate row.
 */
async function tryUpdateExistingRowInPlace(
  table: string,
  row: Record<string, any>,
  validCols: Set<string>,
  explicitConflictCols?: string[]
): Promise<any[] | null> {
  const rowKeys = Object.keys(row).filter(k => row[k] !== undefined);
  if (rowKeys.length === 0) return null;

  // 1. Check composite conflict keys first (e.g., satta_differentials: ['area', 'grade'])
  const compositeCols = (explicitConflictCols && explicitConflictCols.length > 1)
    ? explicitConflictCols.filter(c => validCols.size === 0 || validCols.has(c))
    : (TABLE_COMPOSITE_KEYS[table] || []).filter(c => validCols.size === 0 || validCols.has(c));

  let matchedCtid: string | null = null;
  let matchedByKey: string | null = null;

  if (compositeCols.length > 1 && compositeCols.every(c => row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '')) {
    const selParams = compositeCols.map(c => String(row[c]).trim());
    const whereParts = compositeCols.map((c, idx) => `TRIM(UPPER(CAST("${sanitizeIdent(c)}" AS TEXT))) = TRIM(UPPER($${idx + 1}))`);
    const selRes = await pool.query(
      `SELECT ctid::text as _ctid, * FROM "${table}" WHERE ${whereParts.join(' AND ')} ORDER BY ctid DESC LIMIT 1`,
      selParams
    );
    if (selRes.rows.length > 0) {
      matchedCtid = selRes.rows[0]._ctid;
      matchedByKey = compositeCols.join(',');
    }
  }

  // 2. Check single-column unique / business keys in priority order (Primary Key first, then Business Key)
  if (!matchedCtid) {
    const singleCandidates = Array.from(new Set([
      ...(explicitConflictCols && explicitConflictCols.length === 1 ? explicitConflictCols : []),
      ...(TABLE_UNIQUE_KEYS[table] || [])
    ])).filter(c => validCols.size === 0 || validCols.has(c));

    for (const cand of singleCandidates) {
      const rawVal = row[cand];
      if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') continue;

      const selRes = await pool.query(
        `SELECT ctid::text as _ctid, * FROM "${table}" WHERE TRIM(UPPER(CAST("${sanitizeIdent(cand)}" AS TEXT))) = TRIM(UPPER($1)) ORDER BY ctid DESC LIMIT 1`,
        [String(rawVal).trim()]
      );
      if (selRes.rows.length > 0) {
        matchedCtid = selRes.rows[0]._ctid;
        matchedByKey = cand;
        break;
      }
    }
  }

  if (!matchedCtid) {
    return null;
  }

  // 3. We found an existing row! Update it in place using its exact ctid,
  // while preserving its primary key if we matched via a natural business key.
  const updateKeys = rowKeys.filter(k => {
    if (k === matchedByKey) return false;
    // Never overwrite an existing row's primary key with a newly generated UUID when matched by business key
    if (TABLE_PK_COLUMNS.has(k) && k !== matchedByKey) return false;
    return true;
  });

  if (updateKeys.length === 0) {
    const existingRes = await pool.query(`SELECT * FROM "${table}" WHERE ctid = $1::tid`, [matchedCtid]);
    return existingRes.rows;
  }

  const updParams: any[] = [];
  const setClauses: string[] = [];

  for (const k of updateKeys) {
    let val = row[k];
    if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
      val = JSON.stringify(val);
    } else if (val === '') {
      val = null;
    }
    updParams.push(val);
    setClauses.push(`"${sanitizeIdent(k)}" = $${updParams.length}`);
  }

  updParams.push(matchedCtid);
  const updateSql = `UPDATE "${table}" SET ${setClauses.join(', ')} WHERE ctid = $${updParams.length}::tid RETURNING *`;
  const updRes = await pool.query(updateSql, updParams);
  return updRes.rows.length > 0 ? updRes.rows : null;
}

export async function executeInsert(payload: QueryPayload) {
  const table = sanitizeIdent(payload.table);
  const rawValues = Array.isArray(payload.values) ? payload.values : [payload.values];
  if (rawValues.length === 0) return { data: [], error: null };

  // If this table is a master/header table with unique business keys (or conflict cols were provided),
  // route through executeUpsert so editing/re-saving never creates a duplicate row!
  if (
    (Array.isArray(payload.onConflictCols) && payload.onConflictCols.length > 0) ||
    TABLE_UNIQUE_KEYS[table] ||
    TABLE_COMPOSITE_KEYS[table]
  ) {
    return executeUpsert(payload);
  }

  const validCols = await getValidTableColumns(table);
  const cleanedRows = rawValues.map(r => filterRowByValidColumns(r, validCols));

  const sample = cleanedRows[0];
  const keys = Object.keys(sample).filter(k => sample[k] !== undefined);
  if (keys.length === 0) return { data: [], error: null };

  const colsSql = keys.map(k => `"${sanitizeIdent(k)}"`).join(', ');
  const params: any[] = [];
  const valueRows: string[] = [];

  for (const row of cleanedRows) {
    const rowPlaceholders: string[] = [];
    for (const k of keys) {
      let val = row[k];
      if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
        val = JSON.stringify(val);
      } else if (val === '') {
        val = null;
      }
      params.push(val === undefined ? null : val);
      rowPlaceholders.push(`$${params.length}`);
    }
    valueRows.push(`(${rowPlaceholders.join(', ')})`);
  }

  const insertSql = `
    INSERT INTO "${table}" (${colsSql})
    VALUES ${valueRows.join(', ')}
    RETURNING *
  `;

  try {
    const result = await pool.query(insertSql, params);
    return { data: result.rows, error: null };
  } catch (err: any) {
    tableColumnsCache.delete(table);
    if (isConnectionError(err)) {
      return insertSupabaseFallback(payload);
    }
    console.warn(`[Local DB Insert Notice on table ${table}]:`, err.message);
    return { data: [], error: { message: err.message } };
  }
}

export async function executeUpsert(payload: QueryPayload) {
  const table = sanitizeIdent(payload.table);
  const rawValues = Array.isArray(payload.values) ? payload.values : [payload.values];
  if (rawValues.length === 0) return { data: [], error: null };

  const validCols = await getValidTableColumns(table);
  const cleanedRows = rawValues.map(r => filterRowByValidColumns(r, validCols));

  const savedResults: any[] = [];

  try {
    for (const row of cleanedRows) {
      const rowKeys = Object.keys(row).filter(k => row[k] !== undefined);
      if (rowKeys.length === 0) continue;

      // 1. Check if an existing row already matches by PK or Business Key and update in place
      const updatedInPlace = await tryUpdateExistingRowInPlace(
        table,
        row,
        validCols,
        payload.onConflictCols
      );

      if (updatedInPlace && updatedInPlace.length > 0) {
        savedResults.push(...updatedInPlace);
        continue;
      }

      // 2. Row does not exist yet — perform INSERT
      const insParams: any[] = [];
      const insPlaceholders: string[] = [];
      const insColsSql = rowKeys.map(k => `"${sanitizeIdent(k)}"`).join(', ');

      for (const k of rowKeys) {
        let val = row[k];
        if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
          val = JSON.stringify(val);
        } else if (val === '') {
          val = null;
        }
        insParams.push(val);
        insPlaceholders.push(`$${insParams.length}`);
      }

      const insSql = `INSERT INTO "${table}" (${insColsSql}) VALUES (${insPlaceholders.join(', ')}) RETURNING *`;
      const insRes = await pool.query(insSql, insParams);
      if (insRes.rows.length > 0) {
        savedResults.push(...insRes.rows);
      }
    }

    return { data: savedResults, error: null };
  } catch (err: any) {
    tableColumnsCache.delete(table);
    if (isConnectionError(err)) {
      return insertSupabaseFallback(payload);
    }
    console.warn(`[Local DB Upsert Notice on table ${table}]:`, err.message);
    return { data: [], error: { message: err.message } };
  }
}

export async function executeUpdate(payload: QueryPayload) {
  const table = sanitizeIdent(payload.table);
  const rawValues = payload.values || {};
  const validCols = await getValidTableColumns(table);
  const values = filterRowByValidColumns(rawValues, validCols);

  const keys = Object.keys(values).filter(k => values[k] !== undefined);
  if (keys.length === 0) return { data: [], error: null };

  const params: any[] = [];
  const setClauses: string[] = [];

  for (const k of keys) {
    let val = values[k];
    if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
      val = JSON.stringify(val);
    } else if (val === '') {
      val = null;
    }
    params.push(val);
    setClauses.push(`"${sanitizeIdent(k)}" = $${params.length}`);
  }

  const whereSql = buildWhereClause(payload, params);
  const updateSql = `UPDATE "${table}" SET ${setClauses.join(', ')} ${whereSql} RETURNING *`;

  try {
    const result = await pool.query(updateSql, params);
    if (result.rows.length > 0) {
      return { data: result.rows, error: null };
    }

    // Fallback: if exact filter matched 0 rows (e.g., due to case/whitespace or wrong PK column name in Admin Desk),
    // try matching via case-insensitive trimmed filter or via the row's unique keys!
    if (Array.isArray(payload.filters) && payload.filters.length === 1 && payload.filters[0].op === 'eq') {
      const fCol = sanitizeIdent(payload.filters[0].column);
      const fVal = payload.filters[0].value;
      if (fCol && validCols.has(fCol) && fVal !== undefined && fVal !== null && String(fVal).trim() !== '') {
        const trimParams = params.slice(0, keys.length);
        trimParams.push(String(fVal).trim());
        const trimSql = `UPDATE "${table}" SET ${setClauses.join(', ')} WHERE TRIM(UPPER(CAST("${fCol}" AS TEXT))) = TRIM(UPPER($${trimParams.length})) RETURNING *`;
        const trimRes = await pool.query(trimSql, trimParams);
        if (trimRes.rows.length > 0) {
          return { data: trimRes.rows, error: null };
        }
      }
    }

    const fallbackUpdated = await tryUpdateExistingRowInPlace(table, values, validCols);
    if (fallbackUpdated && fallbackUpdated.length > 0) {
      return { data: fallbackUpdated, error: null };
    }

    return { data: [], error: null };
  } catch (err: any) {
    tableColumnsCache.delete(table);
    if (isConnectionError(err)) {
      return updateSupabaseFallback(payload);
    }
    console.warn(`[Local DB Update Notice on table ${table}]:`, err.message);
    return { data: [], error: { message: err.message } };
  }
}

export async function executeDelete(payload: QueryPayload) {
  const table = sanitizeIdent(payload.table);
  const params: any[] = [];
  const whereSql = buildWhereClause(payload, params);
  const deleteSql = `DELETE FROM "${table}" ${whereSql} RETURNING *`;

  try {
    const result = await pool.query(deleteSql, params);
    return { data: result.rows, error: null };
  } catch (err: any) {
    if (isConnectionError(err)) {
      return deleteSupabaseFallback(payload);
    }
    console.warn(`[Local DB Delete Notice on table ${table}]:`, err.message);
    return { data: [], error: { message: err.message } };
  }
}

export async function executeRpc(funcName: string, args: any) {
  const func = sanitizeIdent(funcName);
  try {
    // 1. Direct execution for exec_sql and exec_sql_return
    if (func === 'exec_sql' || func === 'exec_sql_return') {
      const sqlQuery = args?.query || args?.sql_query || args?.sql || (typeof args === 'string' ? args : '');
      if (!sqlQuery) return { data: { success: true }, error: null };
      const res = await pool.query(sqlQuery);
      if (func === 'exec_sql_return') {
        return { data: res.rows || [], error: null };
      }
      return { data: { success: true }, error: null };
    }

    // 2. Direct execution for get_all_tables
    if (func === 'get_all_tables') {
      const res = await pool.query(
        `SELECT table_name::text FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`
      );
      return { data: res.rows, error: null };
    }

    // 3. Direct execution for search_all_tables
    if (func === 'search_all_tables') {
      const searchText = args?.search_text || args?.query || '';
      const res = await pool.query(`SELECT * FROM public.search_all_tables($1::text)`, [String(searchText)]);
      return { data: res.rows, error: null };
    }

    // 4. Generic stored function call
    if (args && typeof args === 'object' && !Array.isArray(args)) {
      const argKeys = Object.keys(args);
      if (argKeys.length === 1 && typeof args[argKeys[0]] === 'string') {
        const res = await pool.query(`SELECT * FROM "${func}"($1)`, [args[argKeys[0]]]);
        return { data: res.rows, error: null };
      }
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
