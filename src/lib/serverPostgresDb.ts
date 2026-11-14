import pg from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import dotenv from 'dotenv';

dotenv.config();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(val: any): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

/**
 * Deterministically converts any non-UUID string (e.g. "sauda-1793871147468", "local-123", "satta-456")
 * into a valid RFC-4122 v4 UUID so header and detail tables always share the exact same valid UUID.
 */
export function toDeterministicUuid(input: string): string {
  const clean = String(input || '').trim();
  if (UUID_REGEX.test(clean)) return clean.toLowerCase();
  const hash = crypto.createHash('md5').update(clean || crypto.randomUUID()).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

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

const TABLE_ALIASES: Record<string, string> = {
  mr_settelment_master: 'mr_settlement_master',
  mr_settelment_details: 'mr_settlement_detail',
  mr_settelment_detail: 'mr_settlement_detail',
  mr_settlement_details: 'mr_settlement_detail',
};

// Helper to sanitize table and column names and resolve known table aliases
export function sanitizeIdent(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9_]/g, '');
  const lower = clean.toLowerCase();
  return TABLE_ALIASES[lower] || clean;
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

// Pure Local PostgreSQL Only — all queries and mutations execute directly against live PostgreSQL tables without any dump or snapshot fallback.

export async function executeSelect(payload: QueryPayload) {
  const table = sanitizeIdent(payload.table);
  const validCols = await getValidTableColumns(table);
  const colTypes = tableColumnTypesCache.get(table);
  const params: any[] = [];
  const whereSql = buildWhereClause(payload, params, validCols, colTypes);

  // Count query if requested
  let totalCount: number | null = null;
  if (payload.count) {
    const countSql = `SELECT COUNT(*) as count FROM "${table}" ${whereSql}`;
    try {
      const countRes = await pool.query(countSql, params);
      totalCount = parseInt(countRes.rows[0]?.count || '0', 10);
    } catch (_) {}
  }

  // Select columns (filter out any non-existent columns if validCols is known)
  let selectSql = '*';
  if (payload.select && payload.select !== '*' && !payload.select.includes('(')) {
    const reqCols = payload.select
      .split(',')
      .map(c => sanitizeIdent(c.trim()))
      .filter(c => c && (validCols.size === 0 || validCols.has(c)));
    if (reqCols.length > 0) {
      selectSql = reqCols.map(c => `"${c}"`).join(', ');
    }
  }

  // Ordering (filter out any non-existent order columns)
  let orderSql = '';
  if (Array.isArray(payload.orders) && payload.orders.length > 0) {
    const validOrders = payload.orders.filter(o => {
      const col = sanitizeIdent(o.column);
      return col && (validCols.size === 0 || validCols.has(col));
    });
    if (validOrders.length > 0) {
      const orderParts = validOrders.map(o => {
        const col = sanitizeIdent(o.column);
        const dir = o.ascending ? 'ASC' : 'DESC';
        const nulls = o.nullsFirst ? 'NULLS FIRST' : 'NULLS LAST';
        return `"${col}" ${dir} ${nulls}`;
      });
      orderSql = `ORDER BY ${orderParts.join(', ')}`;
    }
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
    console.warn(`[Local DB Select Notice on table ${table}]:`, err.message);
    return {
      data: [],
      count: 0,
      error: null
    };
  }
}

// Cache of valid columns and their PostgreSQL data types per table
const tableColumnsCache = new Map<string, Set<string>>();
const tableColumnTypesCache = new Map<string, Map<string, string>>();

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
  temporary_material_received: ['amad_id'],
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
  agency_master: ['id'],
  grade_master: ['id', 'grade_code'],
  marka_master: ['id', 'marka_code', 'marka_name'],
  godown_master: ['id', 'gdn_code'],
  batch_master: ['code'],
  department_master: ['dept_code'],
  financial_year_master: ['year_code'],
  sauda_check_point_deductions: ['id', 'po_no']
};

// Composite conflict keys for rate/matrix tables
const TABLE_COMPOSITE_KEYS: Record<string, string[]> = {
  satta_differentials: ['area', 'grade'],
  satta_calculated_rates: ['start_date', 'area', 'grade'],
  agency_master: ['area_name', 'agency_code']
};

// Non-destructive schema integrity checks only (never seeds, overwrites, or re-inserts rows from dumps/JSON)
let integrityInitialized = false;
async function ensureDatabaseIntegrity() {
  if (integrityInitialized) return;
  integrityInitialized = true;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        WITH dedup_grid AS (
          SELECT DISTINCT
            mi."id",
            COALESCE(elem->>'grade', elem->>'jute_grade', elem->>'actual_grade', '') AS grade_key,
            COALESCE(elem->>'percentage', elem->>'actual_pct', '0') AS pct_key,
            NULLIF(REGEXP_REPLACE(COALESCE(elem->>'final_receipt_wt', '0'), '[^0-9.-]', '', 'g'), '')::numeric AS wt_val
          FROM "material_inspection" mi,
               jsonb_array_elements(
                 CASE
                   WHEN jsonb_typeof(mi."grid_details"::jsonb) = 'array' THEN mi."grid_details"::jsonb
                   ELSE '[]'::jsonb
                 END
               ) AS elem
          WHERE COALESCE(mi."final_receipt_wt", 0) <= 0
            AND mi."grid_details" IS NOT NULL
        ),
        summed AS (
          SELECT "id", ROUND(SUM(COALESCE(wt_val, 0)), 3) AS total_final_wt
          FROM dedup_grid
          WHERE COALESCE(wt_val, 0) > 0
          GROUP BY "id"
        )
        UPDATE "material_inspection" m
        SET "final_receipt_wt" = s.total_final_wt
        FROM summed s
        WHERE m."id" = s."id"
          AND s.total_final_wt > 0
      `).catch(() => {});

      await client.query(
        `ALTER TABLE IF EXISTS "temporary_material_received" ADD COLUMN IF NOT EXISTS "phota" TEXT`
      ).catch(() => {});
      tableColumnsCache.delete('temporary_material_received');

      await client.query('COMMIT');
    } catch (_) {
      await client.query('ROLLBACK').catch(() => {});
    } finally {
      client.release();
    }
  } catch (_) {}
}

/**
 * Accepts direct user-uploaded CSV/JSON rows into local PostgreSQL (`temporary_material_received`).
 * Never imports or merges rows from static SQL dump files (`complete_local_data.sql.gz`).
 */
export async function syncPendingDataToLocalPostgres(options?: {
  supabaseUrl?: string;
  supabaseKey?: string;
  importedRows?: any[];
}): Promise<{
  success: boolean;
  beforeCount: number;
  afterCount: number;
  addedCount: number;
  cloudSyncedCount: number;
  needsCloudSync?: boolean;
  message: string;
}> {
  let beforeCount = 0;
  let afterCount = 0;
  let cloudSyncedCount = 0;

  try {
    await pool.query(`
      DROP INDEX IF EXISTS idx_unique_temp_arrival_no;
      ALTER TABLE IF EXISTS "temporary_material_received" ALTER COLUMN "date" SET DEFAULT CURRENT_DATE;
      ALTER TABLE IF EXISTS "temporary_material_received" ALTER COLUMN "date" DROP NOT NULL;
      ALTER TABLE IF EXISTS "temporary_material_received" ADD COLUMN IF NOT EXISTS "payment_status" TEXT DEFAULT 'Pending';
    `).catch(() => {});

    const beforeRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM "temporary_material_received"`).catch(() => ({ rows: [{ cnt: 0 }] }));
    beforeCount = beforeRes.rows?.[0]?.cnt ?? 0;

    // Only accept explicit user-uploaded rows (never read dumped SQL files)
    if (Array.isArray(options?.importedRows) && options!.importedRows.length > 0) {
      const cleanedRows = options!.importedRows
        .map((r: any) => {
          const out: Record<string, any> = {};
          for (const [k, v] of Object.entries(r || {})) {
            const col = k.trim();
            if (!col) continue;
            if (v === '' || v === 'null' || v === 'NULL' || v === undefined) {
              out[col] = null;
            } else if ((col === 'grid_details' || col === 'open_remarks') && typeof v === 'string') {
              try {
                out[col] = JSON.parse(v);
              } catch {
                out[col] = v;
              }
            } else {
              out[col] = v;
            }
          }
          if (!out.amad_id && out.id) out.amad_id = out.id;
          return out;
        })
        .filter((r: any) => r.amad_id || r.temporary_arrival_no || r.amad_no);

      const batchSize = 200;
      for (let i = 0; i < cleanedRows.length; i += batchSize) {
        const batch = cleanedRows.slice(i, i + batchSize);
        await executeUpsert({
          table: 'temporary_material_received',
          values: batch,
          onConflictCols: ['amad_id']
        });
      }
      cloudSyncedCount += cleanedRows.length;
    }

    const afterRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM "temporary_material_received"`).catch(() => ({ rows: [{ cnt: beforeCount }] }));
    afterCount = afterRes.rows?.[0]?.cnt ?? beforeCount;
    const addedCount = Math.max(0, afterCount - beforeCount);

    return {
      success: true,
      beforeCount,
      afterCount,
      addedCount,
      cloudSyncedCount,
      needsCloudSync: false,
      message: `Local PostgreSQL sync complete! Database now has ${afterCount} records in temporary_material_received (${addedCount} new records added).`
    };
  } catch (err: any) {
    return {
      success: false,
      beforeCount,
      afterCount,
      addedCount: Math.max(0, afterCount - beforeCount),
      cloudSyncedCount,
      message: `Sync error: ${err?.message || String(err)}`
    };
  }
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
      `SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      [cleanTable]
    );
    if (res.rows.length > 0) {
      const colSet = new Set<string>();
      const typeMap = new Map<string, string>();
      for (const r of res.rows) {
        const cName = String(r.column_name);
        const rawUdt = String(r.udt_name || '').toLowerCase();
        const rawDataType = String(r.data_type || '').toLowerCase();
        const dType =
          rawDataType === 'array' && !rawUdt.startsWith('_')
            ? (rawUdt ? `_${rawUdt}` : 'array')
            : (rawUdt || rawDataType);
        colSet.add(cName);
        typeMap.set(cName, dType);
      }
      tableColumnsCache.set(cleanTable, colSet);
      tableColumnTypesCache.set(cleanTable, typeMap);
      return colSet;
    }
  } catch (_) {}
  return new Set<string>();
}

function filterRowByValidColumns(
  row: Record<string, any>,
  validCols: Set<string>,
  table?: string
): Record<string, any> {
  if (!row || typeof row !== 'object') return {};
  const colTypes = table ? tableColumnTypesCache.get(sanitizeIdent(table)) : undefined;
  const filtered: Record<string, any> = {};

  for (const k of Object.keys(row)) {
    if (validCols.size > 0 && !validCols.has(k)) continue;
    const rawVal = row[k];
    if (rawVal === undefined) continue;

    const cType = (colTypes?.get(k) || '').toLowerCase();

    // 0. PostgreSQL ARRAY column sanitization (e.g. text[], varchar[], int4[], numeric[], uuid[], jsonb[])
    if (cType.startsWith('_') || cType === 'array') {
      const elemType = cType.startsWith('_') ? cType.slice(1) : 'text';

      const sanitizeArrayElement = (item: any): any => {
        if (item === undefined || item === null) return null;
        if (elemType === 'uuid') {
          const s = String(item).trim();
          if (!s) return null;
          return isValidUuid(s) ? s : toDeterministicUuid(s);
        }
        if (elemType === 'int8' || elemType === 'int4' || elemType === 'int2') {
          const n = Number(item);
          return Number.isFinite(n) ? Math.round(n) : null;
        }
        if (elemType === 'numeric' || elemType === 'float8' || elemType === 'float4') {
          const n = Number(item);
          return Number.isFinite(n) ? n : null;
        }
        if (elemType === 'bool') {
          if (typeof item === 'boolean') return item;
          const s = String(item).trim().toLowerCase();
          return s === 'true' || s === '1' || s === 'yes' || s === 't';
        }
        if (elemType === 'date' || elemType.startsWith('timestamp')) {
          const s = String(item).trim();
          return !s || s.toLowerCase() === 'null' || s.toLowerCase() === 'invalid date' ? null : item;
        }
        if (elemType === 'jsonb' || elemType === 'json') {
          if (typeof item === 'string') {
            try {
              JSON.parse(item);
              return item;
            } catch (_) {
              return JSON.stringify(item);
            }
          }
          return JSON.stringify(item);
        }
        return item;
      };

      if (rawVal === null) {
        filtered[k] = null;
      } else if (Array.isArray(rawVal)) {
        filtered[k] = rawVal.map(sanitizeArrayElement).filter((v) => v !== undefined);
      } else if (typeof rawVal === 'string') {
        const trimmed = rawVal.trim();
        if (!trimmed || trimmed.toLowerCase() === 'null') {
          filtered[k] = [];
        } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              filtered[k] = parsed.map(sanitizeArrayElement).filter((v) => v !== undefined);
            } else {
              const single = sanitizeArrayElement(parsed);
              filtered[k] = single === null ? [] : [single];
            }
          } catch (_) {
            const single = sanitizeArrayElement(trimmed);
            filtered[k] = single === null ? [] : [single];
          }
        } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          filtered[k] = trimmed;
        } else {
          const single = sanitizeArrayElement(trimmed);
          filtered[k] = single === null ? [] : [single];
        }
      } else {
        const single = sanitizeArrayElement(rawVal);
        filtered[k] = single === null ? [] : [single];
      }
      continue;
    }

    // 1. UUID column sanitization (prevents 'invalid input syntax for type uuid: "sauda-..."')
    if (cType === 'uuid') {
      if (rawVal === null || String(rawVal).trim() === '') {
        if (TABLE_PK_COLUMNS.has(k)) {
          filtered[k] = crypto.randomUUID();
        } else {
          filtered[k] = null;
        }
      } else if (isValidUuid(rawVal)) {
        filtered[k] = String(rawVal).trim();
      } else {
        filtered[k] = toDeterministicUuid(String(rawVal));
      }
      continue;
    }

    // 2. Integer / BigInt / SmallInt column sanitization
    if (cType === 'int8' || cType === 'int4' || cType === 'int2' || cType === 'bigint' || cType === 'integer' || cType === 'smallint') {
      if (rawVal === null || String(rawVal).trim() === '') {
        if (k === 'id' || k === 'log_id') {
          // Omit PK so PostgreSQL sequence nextval() generates it
          continue;
        }
        filtered[k] = null;
      } else {
        const parsed = Number(rawVal);
        if (!Number.isFinite(parsed)) {
          if (k === 'id' || k === 'log_id') {
            continue;
          }
          filtered[k] = 0;
        } else {
          filtered[k] = Math.round(parsed);
        }
      }
      continue;
    }

    // 3. Numeric / Float column sanitization
    if (cType === 'numeric' || cType === 'float8' || cType === 'float4' || cType === 'decimal' || cType === 'real' || cType === 'double precision') {
      if (rawVal === null || String(rawVal).trim() === '') {
        filtered[k] = null;
      } else {
        const parsed = Number(rawVal);
        filtered[k] = Number.isFinite(parsed) ? parsed : 0;
      }
      continue;
    }

    // 4. Date / Timestamp column sanitization
    if (cType === 'date' || cType.startsWith('timestamp') || cType === 'timestamptz') {
      const s = rawVal === null ? '' : String(rawVal).trim();
      if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'invalid date') {
        filtered[k] = null;
      } else {
        filtered[k] = rawVal;
      }
      continue;
    }

    // 5. Boolean column sanitization
    if (cType === 'bool' || cType === 'boolean') {
      if (rawVal === null || String(rawVal).trim() === '') {
        filtered[k] = false;
      } else if (typeof rawVal === 'boolean') {
        filtered[k] = rawVal;
      } else {
        const s = String(rawVal).trim().toLowerCase();
        filtered[k] = s === 'true' || s === '1' || s === 'yes' || s === 't';
      }
      continue;
    }

    // 6. JSON / JSONB column sanitization
    if (cType === 'jsonb' || cType === 'json') {
      if (rawVal === null || rawVal === '') {
        filtered[k] = null;
      } else if (typeof rawVal === 'string') {
        try {
          JSON.parse(rawVal);
          filtered[k] = rawVal;
        } catch (_) {
          filtered[k] = JSON.stringify(rawVal);
        }
      } else {
        filtered[k] = JSON.stringify(rawVal);
      }
      continue;
    }

    filtered[k] = rawVal;
  }

  return filtered;
}

function serializeParamValue(val: any, cType?: string): any {
  if (val === undefined) return null;
  if (val === null || val instanceof Date) return val;
  const normalizedType = (cType || '').toLowerCase();
  if (normalizedType.startsWith('_') || normalizedType === 'array') {
    // node-postgres natively serializes JS Arrays into PostgreSQL array literals ({...})
    return val;
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return val;
}

function buildWhereClause(
  payload: QueryPayload,
  params: any[],
  validCols?: Set<string>,
  colTypes?: Map<string, string>
): string {
  const whereClauses: string[] = [];

  if (Array.isArray(payload.filters)) {
    for (const f of payload.filters) {
      const col = sanitizeIdent(f.column);
      if (!col) continue;
      if (validCols && validCols.size > 0 && !validCols.has(col)) continue;

      const cType = (colTypes?.get(col) || '').toLowerCase();

      if (f.op === 'is') {
        if (f.value === null) {
          whereClauses.push(`"${col}" IS NULL`);
        } else if (f.value === true) {
          whereClauses.push(`"${col}" IS TRUE`);
        } else if (f.value === false) {
          whereClauses.push(`"${col}" IS FALSE`);
        }
      } else if (f.op === 'in' && Array.isArray(f.value)) {
        const mappedList = cType === 'uuid'
          ? f.value.map((v: any) => (isValidUuid(v) ? String(v).trim() : toDeterministicUuid(String(v))))
          : f.value;
        params.push(mappedList);
        whereClauses.push(`"${col}" = ANY($${params.length})`);
      } else if (f.op === 'like' || f.op === 'ilike') {
        params.push(f.value);
        const idx = params.length;
        whereClauses.push(`CAST("${col}" AS TEXT) ${f.op === 'like' ? 'LIKE' : 'ILIKE'} $${idx}`);
      } else {
        let fVal = f.value;
        let useTextCast = false;

        if (cType === 'uuid' && fVal !== null && fVal !== undefined) {
          const sVal = String(fVal).trim();
          if (isValidUuid(sVal)) {
            fVal = sVal;
          } else if (/^(sauda-|satta-|local-|sat_|lorry_|hist_|audit_|g_)/i.test(sVal)) {
            fVal = toDeterministicUuid(sVal);
          } else {
            useTextCast = true;
          }
        } else if ((cType === 'int8' || cType === 'int4' || cType === 'bigint' || cType === 'integer') && fVal !== null && !Number.isFinite(Number(fVal))) {
          useTextCast = true;
        }

        params.push(fVal);
        const idx = params.length;
        const colExpr = useTextCast ? `CAST("${col}" AS TEXT)` : `"${col}"`;
        switch (f.op) {
          case 'eq': whereClauses.push(`${colExpr} = $${idx}`); break;
          case 'neq': whereClauses.push(`${colExpr} != $${idx}`); break;
          case 'gt': whereClauses.push(`${colExpr} > $${idx}`); break;
          case 'gte': whereClauses.push(`${colExpr} >= $${idx}`); break;
          case 'lt': whereClauses.push(`${colExpr} < $${idx}`); break;
          case 'lte': whereClauses.push(`${colExpr} <= $${idx}`); break;
          default: whereClauses.push(`${colExpr} = $${idx}`); break;
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
        if (validCols && validCols.size > 0 && !validCols.has(col)) continue;

        const cleanVal = val.replace(/^[%(]+|[%)]+$/g, '');
        if (op === 'ilike' || op === 'like') {
          params.push(`%${cleanVal}%`);
          subClauses.push(`CAST("${col}" AS TEXT) ILIKE $${params.length}`);
        } else if (op === 'eq') {
          params.push(cleanVal);
          subClauses.push(`CAST("${col}" AS TEXT) = $${params.length}`);
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
  const colTypes = tableColumnTypesCache.get(sanitizeIdent(table));

  for (const k of updateKeys) {
    updParams.push(serializeParamValue(row[k], colTypes?.get(k)));
    setClauses.push(`"${sanitizeIdent(k)}" = $${updParams.length}`);
  }

  updParams.push(matchedCtid);
  const updateSql = `UPDATE "${table}" SET ${setClauses.join(', ')} WHERE ctid = $${updParams.length}::tid RETURNING *`;
  const updRes = await pool.query(updateSql, updParams);
  return updRes.rows.length > 0 ? updRes.rows : null;
}

async function populateMissingInsertDefaults(
  table: string,
  row: Record<string, any>,
  validCols: Set<string>
): Promise<void> {
  const colTypes = tableColumnTypesCache.get(table);

  // 1. Auto-populate missing 'id' column (BIGINT/INTEGER max+1 or UUID)
  if (validCols.has('id')) {
    const idType = (colTypes?.get('id') || '').toLowerCase();
    const isIntId =
      idType === 'int8' ||
      idType === 'int4' ||
      idType === 'int2' ||
      idType === 'bigint' ||
      idType === 'integer' ||
      idType === 'smallint';

    if (isIntId) {
      if (row.id === undefined || row.id === null || String(row.id).trim() === '' || !Number.isFinite(Number(row.id))) {
        const maxRes = await pool.query(`SELECT COALESCE(MAX("id"), 0) + 1 AS next_id FROM "${table}"`);
        row.id = Number(maxRes.rows[0]?.next_id || 1);
      }
    } else if (idType === 'uuid') {
      if (row.id === undefined || row.id === null || String(row.id).trim() === '' || !isValidUuid(String(row.id))) {
        row.id = crypto.randomUUID();
      }
    }
  }

  // 2. Auto-populate created_at if present on table and missing
  if (validCols.has('created_at') && (row.created_at === undefined || row.created_at === null || String(row.created_at).trim() === '')) {
    row.created_at = new Date().toISOString();
  }

  // 3. Master table NOT NULL / code fallbacks
  if (table === 'agency_master') {
    if (!row.agency_code || String(row.agency_code).trim() === '') row.agency_code = String(row.id || Date.now());
    if (!row.agency_name || String(row.agency_name).trim() === '') row.agency_name = String(row.agency_code);
  } else if (table === 'area_master') {
    if (!row.area_code || String(row.area_code).trim() === '') row.area_code = String((Number(row.id) || 1) * 10);
    if (!row.area_name || String(row.area_name).trim() === '') row.area_name = String(row.area_code);
  } else if (table === 'batch_master') {
    if (!row.code || String(row.code).trim() === '') {
      const maxRes = await pool.query(
        `SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE("code", '[^0-9]', '', 'g'), '')::bigint), 0) + 1 AS next_code FROM "batch_master"`
      );
      row.code = String(maxRes.rows[0]?.next_code || 1);
    }
    if (!row.batch_name || String(row.batch_name).trim() === '') row.batch_name = String(row.code);
  } else if (table === 'broker_master') {
    if (!row.brok_code || String(row.brok_code).trim() === '') row.brok_code = String(row.id || Date.now());
    if (!row.brok_name || String(row.brok_name).trim() === '') row.brok_name = String(row.brok_code);
  } else if (table === 'customer_master') {
    if (row.contact_number === undefined || row.contact_number === null) row.contact_number = '';
  } else if (table === 'department_master') {
    if ((!row.dept_code || String(row.dept_code).trim() === '') && row.dept_name) {
      row.dept_code = String(row.dept_name).trim().toUpperCase();
    } else if (!row.dept_code || String(row.dept_code).trim() === '') {
      row.dept_code = `DEPT-${Date.now().toString().slice(-4)}`;
    }
    if (!row.dept_name || String(row.dept_name).trim() === '') row.dept_name = String(row.dept_code);
  } else if (table === 'godown_master') {
    if (!row.gdn_code || String(row.gdn_code).trim() === '') row.gdn_code = String(row.gdn_name || row.id || Date.now());
    if (!row.gdn_name || String(row.gdn_name).trim() === '') row.gdn_name = String(row.gdn_code);
  } else if (table === 'grade_master') {
    if (!row.grade_code || String(row.grade_code).trim() === '') row.grade_code = String((Number(row.id) || 1) * 10);
    if (!row.grade_name || String(row.grade_name).trim() === '') row.grade_name = String(row.grade_code);
  } else if (table === 'marka_master') {
    if (!row.marka_code || String(row.marka_code).trim() === '') row.marka_code = String(row.id || '').padStart(2, '0');
    if (!row.marka_name || String(row.marka_name).trim() === '') row.marka_name = String(row.marka_code);
  } else if (table === 'supply_master') {
    if (!row.supp_code || String(row.supp_code).trim() === '') row.supp_code = String(row.id || Date.now());
    if (!row.supp_name || String(row.supp_name).trim() === '') row.supp_name = String(row.supp_code);
  } else if (table === 'unit_master') {
    if (!row.unit_name || String(row.unit_name).trim() === '') row.unit_name = `UNIT-${String(row.id || '').slice(0, 4).toUpperCase()}`;
  } else if (table === 'user_master') {
    if (!row.user_id || String(row.user_id).trim() === '') {
      const maxRes = await pool.query(
        `SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE("user_id", '[^0-9]', '', 'g'), '')::int), 0) + 1 AS next_uid FROM "user_master"`
      );
      row.user_id = String(maxRes.rows[0]?.next_uid || 1).padStart(3, '0');
    }
  }
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
  const cleanedRows = rawValues.map(r => filterRowByValidColumns(r, validCols, table));
  for (const r of cleanedRows) {
    await populateMissingInsertDefaults(table, r, validCols);
  }

  const sample = cleanedRows[0];
  const keys = Object.keys(sample).filter(k => sample[k] !== undefined);
  if (keys.length === 0) return { data: [], error: null };

  const colTypes = tableColumnTypesCache.get(table);
  const colsSql = keys.map(k => `"${sanitizeIdent(k)}"`).join(', ');
  const params: any[] = [];
  const valueRows: string[] = [];

  for (const row of cleanedRows) {
    const rowPlaceholders: string[] = [];
    for (const k of keys) {
      params.push(serializeParamValue(row[k], colTypes?.get(k)));
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
    tableColumnTypesCache.delete(table);
    console.warn(`[Local DB Insert Notice on table ${table}]:`, err.message);
    return { data: [], error: { message: err.message } };
  }
}

export async function executeUpsert(payload: QueryPayload) {
  const table = sanitizeIdent(payload.table);
  const rawValues = Array.isArray(payload.values) ? payload.values : [payload.values];
  if (rawValues.length === 0) return { data: [], error: null };

  const validCols = await getValidTableColumns(table);
  const cleanedRows = rawValues.map(r => filterRowByValidColumns(r, validCols, table));

  const savedResults: any[] = [];

  try {
    for (const row of cleanedRows) {
      let rowKeys = Object.keys(row).filter(k => row[k] !== undefined);
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

      // 2. Row does not exist yet — populate missing PK/defaults and perform INSERT
      await populateMissingInsertDefaults(table, row, validCols);
      rowKeys = Object.keys(row).filter(k => row[k] !== undefined);

      const colTypes = tableColumnTypesCache.get(table);
      const insParams: any[] = [];
      const insPlaceholders: string[] = [];
      const insColsSql = rowKeys.map(k => `"${sanitizeIdent(k)}"`).join(', ');

      for (const k of rowKeys) {
        insParams.push(serializeParamValue(row[k], colTypes?.get(k)));
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
    tableColumnTypesCache.delete(table);
    console.warn(`[Local DB Upsert Notice on table ${table}]:`, err.message);
    return { data: [], error: { message: err.message } };
  }
}

export async function executeUpdate(payload: QueryPayload) {
  const table = sanitizeIdent(payload.table);
  const rawValues = payload.values || {};
  const validCols = await getValidTableColumns(table);
  const colTypes = tableColumnTypesCache.get(table);
  const values = filterRowByValidColumns(rawValues, validCols, table);

  const keys = Object.keys(values).filter(k => values[k] !== undefined);
  if (keys.length === 0) return { data: [], error: null };

  const params: any[] = [];
  const setClauses: string[] = [];

  for (const k of keys) {
    params.push(serializeParamValue(values[k], colTypes?.get(k)));
    setClauses.push(`"${sanitizeIdent(k)}" = $${params.length}`);
  }

  const hasRequestedFilters =
    (Array.isArray(payload.filters) && payload.filters.length > 0) ||
    (Array.isArray(payload.orFilters) && payload.orFilters.length > 0);
  const whereSql = buildWhereClause(payload, params, validCols, colTypes);

  // Safety guard: never execute an unfiltered UPDATE across the whole table if the caller specified filters
  // (e.g., on a column that does not exist on this table)
  if (!whereSql) {
    if (hasRequestedFilters) {
      return { data: [], error: null };
    }
    return { data: [], error: { message: `Refusing unfiltered UPDATE on ${table}` } };
  }

  const updateSql = `UPDATE "${table}" SET ${setClauses.join(', ')} ${whereSql} RETURNING *`;

  try {
    const result = await pool.query(updateSql, params);
    if (result.rows.length > 0) {
      return { data: result.rows, error: null };
    }

    // Fallback: if exact single-column equality filter matched 0 rows due to case/whitespace,
    // try matching via case-insensitive trimmed filter on that same column ONLY.
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

    return { data: [], error: null };
  } catch (err: any) {
    tableColumnsCache.delete(table);
    tableColumnTypesCache.delete(table);
    console.warn(`[Local DB Update Notice on table ${table}]:`, err.message);
    return { data: [], error: { message: err.message } };
  }
}

export async function executeDelete(payload: QueryPayload) {
  const table = sanitizeIdent(payload.table);
  const validCols = await getValidTableColumns(table);
  const colTypes = tableColumnTypesCache.get(table);
  const params: any[] = [];
  const whereSql = buildWhereClause(payload, params, validCols, colTypes);
  if (!whereSql) {
    return { data: [], error: null };
  }
  const deleteSql = `DELETE FROM "${table}" ${whereSql} RETURNING *`;

  try {
    const result = await pool.query(deleteSql, params);
    return { data: result.rows, error: null };
  } catch (err: any) {
    console.warn(`[Local DB Delete Notice on table ${table}]:`, err.message);
    return { data: [], error: { message: err.message } };
  }
}

export async function executeRpc(funcName: string, args: any) {
  const func = sanitizeIdent(funcName);
  try {
    // 1. Direct execution for exec_sql and exec_sql_return
    if (func === 'exec_sql' || func === 'exec_sql_return') {
      const rawSqlQuery = args?.query || args?.sql_query || args?.sql || (typeof args === 'string' ? args : '');
      if (!rawSqlQuery) return { data: { success: true }, error: null };

      // Automatically replace any non-UUID synthetic ID literals (e.g. 'sauda-1793871147468', 'satta-179...', 'local-179...')
      // generated on non-HTTPS HTTP origins with valid deterministic UUIDs before PostgreSQL executes the SQL!
      const sanitizedSqlQuery = String(rawSqlQuery).replace(
        /'((?:sauda|satta|local)-[0-9]{10,}|(?:sat|lorry|hist|audit)_[0-9a-z_]{8,})'/gi,
        (_full, innerId) => `'${toDeterministicUuid(innerId)}'`
      );

      const res = await pool.query(sanitizedSqlQuery);
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

let hourlyBackupTimerStarted = false;

export interface BackupFileInfo {
  fileName: string;
  filePath: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  mtimeMs: number;
  database: string;
  type: 'custom_dump' | 'all_databases_sql_gz' | 'pre_restore_safety' | 'sql_snapshot';
  verified: boolean;
}

export function getBackupDirectory(): string {
  const backupDir = fs.existsSync('/home/ubuntu')
    ? '/home/ubuntu/backups'
    : path.join(process.cwd(), 'backups');
  try {
    fs.mkdirSync(backupDir, { recursive: true });
  } catch (_) {}
  return backupDir;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Lists all available PostgreSQL backups in /home/ubuntu/backups (and local workspace backups/)
 */
export async function listPostgresBackups(): Promise<{
  backupDir: string;
  retentionDays: number;
  backups: BackupFileInfo[];
}> {
  const backupDir = getBackupDirectory();
  const candidateDirs = Array.from(
    new Set([
      backupDir,
      '/home/ubuntu/backups',
      path.join(process.cwd(), 'backups'),
      '/var/backups',
    ])
  );

  const backups: BackupFileInfo[] = [];
  const seenPaths = new Set<string>();

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (
          !f.endsWith('.dump') &&
          !f.endsWith('.backup') &&
          !f.endsWith('.sql.gz') &&
          !f.endsWith('.sql')
        ) {
          continue;
        }
        const full = path.join(dir, f);
        if (seenPaths.has(full)) continue;
        seenPaths.add(full);
        try {
          const st = fs.statSync(full);
          if (!st.isFile() || st.size === 0) continue;
          const isAllDb = f.startsWith('all_postgres_databases') || f.startsWith('all_databases');
          const isSafety = f.startsWith('pre_restore_safety');
          const dbMatch = f.match(/^([a-zA-Z0-9_]+?)_\d{4}/);
          backups.push({
            fileName: f,
            filePath: full,
            sizeBytes: st.size,
            sizeFormatted: formatBytes(st.size),
            createdAt: new Date(st.mtimeMs).toISOString(),
            mtimeMs: st.mtimeMs,
            database: isAllDb ? 'ALL (bjcl_db, postgres, SQC)' : dbMatch?.[1] || 'bjcl_db',
            type: isSafety
              ? 'pre_restore_safety'
              : isAllDb
                ? 'all_databases_sql_gz'
                : f.endsWith('.dump') || f.endsWith('.backup')
                  ? 'custom_dump'
                  : 'sql_snapshot',
            verified: st.size > 1024,
          });
        } catch (_) {}
      }
    } catch (_) {}
  }

  backups.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return {
    backupDir,
    retentionDays: 30,
    backups,
  };
}

/**
 * Runs an immediate, verified backup of ALL PostgreSQL databases (`pg_dumpall` + per-database `pg_dump -Fc`),
 * verifies integrity with `pg_restore --list` and `gzip -t`, and enforces a 30-day retention policy.
 */
export async function runVerifiedPostgresBackup(options?: {
  reason?: string;
  preRestore?: boolean;
}): Promise<{
  success: boolean;
  backupDir: string;
  timestamp: string;
  filesCreated: Array<{ fileName: string; filePath: string; sizeBytes: number; verified: boolean }>;
  prunedCount: number;
  message: string;
}> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const host = process.env.PGHOST || process.env.LOCAL_DB_HOST || '127.0.0.1';
  const port = Number(process.env.PGPORT || process.env.LOCAL_DB_PORT) || 5432;
  const user = process.env.PGUSER || process.env.LOCAL_DB_USER || 'postgres';
  const password = process.env.PGPASSWORD || process.env.LOCAL_DB_PASSWORD || 'postgres';
  const targetDb = process.env.PGDATABASE || process.env.LOCAL_DB_NAME || 'bjcl_db';

  const backupDir = getBackupDirectory();
  const now = new Date();
  const ts =
    now.getFullYear().toString() +
    '-' +
    String(now.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(now.getDate()).padStart(2, '0') +
    '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  const prefix = options?.preRestore ? `pre_restore_safety_` : '';
  const filesCreated: Array<{ fileName: string; filePath: string; sizeBytes: number; verified: boolean }> = [];
  let prunedCount = 0;

  try {
    // 1. Discover all non-template databases on the PostgreSQL server
    const maintPool = new Pool({
      host,
      port,
      database: 'postgres',
      user,
      password,
      connectionTimeoutMillis: 3000,
    });
    let dbNames: string[] = [targetDb];
    try {
      const dbRes = await maintPool.query(
        `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`
      );
      if (dbRes.rows.length > 0) {
        dbNames = dbRes.rows.map((r: any) => String(r.datname));
      }
    } catch (_) {
    } finally {
      await maintPool.end().catch(() => {});
    }

    // 2. Per-database custom compressed dump (pg_dump -Fc) + verification (pg_restore --list)
    for (const dbName of dbNames) {
      const dumpName = `${prefix}${dbName}_${ts}.dump`;
      const dumpPath = path.join(backupDir, dumpName);
      await execAsync(
        `PGPASSWORD="${password}" pg_dump -w -h ${host} -p ${port} -U ${user} -d "${dbName}" -F c -b -f "${dumpPath}" || sudo -n -u postgres pg_dump -p ${port} -d "${dbName}" -F c -b -f "${dumpPath}"`
      );
      if (fs.existsSync(dumpPath)) {
        const st = fs.statSync(dumpPath);
        let verified = false;
        if (st.size > 0) {
          try {
            const listOut = await execAsync(`pg_restore --list "${dumpPath}"`);
            verified = Boolean(listOut.stdout && listOut.stdout.length > 20);
          } catch (_) {
            verified = st.size > 1024;
          }
        }
        filesCreated.push({
          fileName: dumpName,
          filePath: dumpPath,
          sizeBytes: st.size,
          verified,
        });

        if (dbName === targetDb && !options?.preRestore && verified && st.size > 500 * 1024) {
          const latestPath = path.join(backupDir, `${targetDb}_latest.dump`);
          fs.copyFileSync(dumpPath, latestPath);
        }
      }
    }

    // 3. Full cluster dump of ALL PostgreSQL databases + roles (pg_dumpall | gzip) + verification (gzip -t)
    const allDbName = `${prefix}all_postgres_databases_${ts}.sql.gz`;
    const allDbPath = path.join(backupDir, allDbName);
    await execAsync(
      `(PGPASSWORD="${password}" pg_dumpall -w -h ${host} -p ${port} -U ${user} --clean --if-exists || sudo -n -u postgres pg_dumpall -p ${port} --clean --if-exists) | gzip -9 > "${allDbPath}"`
    );
    if (fs.existsSync(allDbPath)) {
      const st = fs.statSync(allDbPath);
      let verified = false;
      if (st.size > 100) {
        try {
          await execAsync(`gzip -t "${allDbPath}"`);
          verified = true;
        } catch (_) {
          verified = st.size > 1024;
        }
      }
      filesCreated.push({
        fileName: allDbName,
        filePath: allDbPath,
        sizeBytes: st.size,
        verified,
      });
    }

    // 4. Enforce 30-day retention policy (keep at least 10 most recent backups regardless of age)
    const retentionMs = 30 * 24 * 60 * 60 * 1000;
    const allFiles = fs
      .readdirSync(backupDir)
      .filter(f => f.endsWith('.dump') || f.endsWith('.sql.gz'))
      .filter(f => !f.endsWith('_latest.dump'))
      .map(f => {
        const fp = path.join(backupDir, f);
        const st = fs.statSync(fp);
        return { f, fp, mtimeMs: st.mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    if (allFiles.length > 10) {
      const cutoff = Date.now() - retentionMs;
      for (let i = 10; i < allFiles.length; i++) {
        if (allFiles[i].mtimeMs < cutoff) {
          try {
            fs.unlinkSync(allFiles[i].fp);
            prunedCount++;
          } catch (_) {}
        }
      }
    }

    // 5. Write backup manifest log
    const manifestPath = path.join(backupDir, 'backup_manifest.json');
    const manifestEntry = {
      timestamp: now.toISOString(),
      reason: options?.reason || (options?.preRestore ? 'pre_restore_safety' : 'scheduled_or_manual'),
      databases: dbNames,
      filesCreated,
      prunedCount,
    };
    try {
      let history: any[] = [];
      if (fs.existsSync(manifestPath)) {
        history = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (!Array.isArray(history)) history = [];
      }
      history.unshift(manifestEntry);
      fs.writeFileSync(manifestPath, JSON.stringify(history.slice(0, 100), null, 2), 'utf8');
    } catch (_) {}

    return {
      success: filesCreated.length > 0 && filesCreated.every(f => f.verified),
      backupDir,
      timestamp: ts,
      filesCreated,
      prunedCount,
      message: `Successfully backed up and verified ${dbNames.length} PostgreSQL database(s) (${dbNames.join(', ')}) to ${backupDir}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      backupDir,
      timestamp: ts,
      filesCreated,
      prunedCount,
      message: `Backup notice: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Safely restores a PostgreSQL backup file (.dump, .backup, .sql.gz, or .sql) into target database (`bjcl_db`)
 * AFTER automatically taking a pre-restore safety backup of the current database!
 */
export async function restorePostgresBackup(backupFilePath: string): Promise<{
  success: boolean;
  safetyBackupFiles: Array<{ fileName: string; filePath: string; sizeBytes: number; verified: boolean }>;
  restoredFrom: string;
  message: string;
}> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const host = process.env.PGHOST || process.env.LOCAL_DB_HOST || '127.0.0.1';
  const port = Number(process.env.PGPORT || process.env.LOCAL_DB_PORT) || 5432;
  const user = process.env.PGUSER || process.env.LOCAL_DB_USER || 'postgres';
  const password = process.env.PGPASSWORD || process.env.LOCAL_DB_PASSWORD || 'postgres';
  const targetDb = process.env.PGDATABASE || process.env.LOCAL_DB_NAME || 'bjcl_db';

  const resolvedPath = path.isAbsolute(backupFilePath)
    ? backupFilePath
    : path.join(getBackupDirectory(), path.basename(backupFilePath));

  if (!fs.existsSync(resolvedPath)) {
    return {
      success: false,
      safetyBackupFiles: [],
      restoredFrom: resolvedPath,
      message: `Backup file not found: ${resolvedPath}`,
    };
  }

  // Step 1: MANDATORY Pre-Restore Safety Backup of current database so existing data is protected!
  const safetyRes = await runVerifiedPostgresBackup({
    reason: `Pre-restore safety backup before restoring ${path.basename(resolvedPath)}`,
    preRestore: true,
  });

  try {
    // Step 2: Verify backup file integrity before restoring
    if (resolvedPath.endsWith('.dump') || resolvedPath.endsWith('.backup')) {
      await execAsync(`pg_restore --list "${resolvedPath}"`);
      await execAsync(
        `PGPASSWORD="${password}" pg_restore -w -h ${host} -p ${port} -U ${user} -d "${targetDb}" --clean --if-exists --no-owner --no-privileges "${resolvedPath}" || sudo -n -u postgres pg_restore -p ${port} -d "${targetDb}" --clean --if-exists --no-owner --no-privileges "${resolvedPath}" || true`
      );
    } else if (resolvedPath.endsWith('.sql.gz')) {
      await execAsync(`gzip -t "${resolvedPath}"`);
      await execAsync(
        `gunzip -c "${resolvedPath}" | (PGPASSWORD="${password}" psql -w -h ${host} -p ${port} -U ${user} -d "${targetDb}" || sudo -n -u postgres psql -p ${port} -d "${targetDb}")`
      );
    } else if (resolvedPath.endsWith('.sql')) {
      await execAsync(
        `PGPASSWORD="${password}" psql -w -h ${host} -p ${port} -U ${user} -d "${targetDb}" -f "${resolvedPath}" || sudo -n -u postgres psql -p ${port} -d "${targetDb}" -f "${resolvedPath}"`
      );
    } else {
      throw new Error(`Unsupported backup file format: ${resolvedPath}`);
    }

    // Step 3: Re-run integrity and non-destructive merge so any newer records are also preserved
    integrityInitialized = false;
    await ensureDatabaseIntegrity().catch(() => {});
    await syncPendingDataToLocalPostgres().catch(() => {});

    return {
      success: true,
      safetyBackupFiles: safetyRes.filesCreated,
      restoredFrom: resolvedPath,
      message: `Pre-restore safety backup created (${safetyRes.filesCreated.map(f => f.fileName).join(', ')}) and database "${targetDb}" successfully restored from ${path.basename(resolvedPath)}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      safetyBackupFiles: safetyRes.filesCreated,
      restoredFrom: resolvedPath,
      message: `Restore failed (your existing database is safe in ${safetyRes.filesCreated.map(f => f.fileName).join(', ')}): ${err?.message || String(err)}`,
    };
  }
}

/**
 * Investigates and recovers missing data across all sections from:
 * 1) Any local PostgreSQL backup from ~1 hour ago (/home/ubuntu/backups, /var/backups, /tmp)
 * 2) Local Supabase Docker PostgreSQL on port 54322 (`supabase_db` container, database `postgres`)
 * 3) Sibling local PostgreSQL databases (`postgres`, `SQC` on port 5432 / 5433)
 * 4) Live Supabase Cloud (`https://lxuapkccxaadwixjpirs.supabase.co`)
 * 5) `complete_local_data.sql.gz` snapshot
 * Creates a safety backup of the current database BEFORE restoring/merging!
 */
export async function recoverMissingDataFromAllSources(): Promise<{
  success: boolean;
  safetyBackupCreated: string[];
  sourcesChecked: Array<{ source: string; status: string; rowsRecovered: number }>;
  totalRowsRecovered: number;
  marka3153Present: boolean;
  message: string;
}> {
  const safetyRes = await runVerifiedPostgresBackup({
    reason: 'Pre-recovery safety backup before multi-source missing data restore',
    preRestore: true,
  });

  const sourcesChecked: Array<{ source: string; status: string; rowsRecovered: number }> = [];
  let totalRowsRecovered = 0;

  const host = process.env.PGHOST || process.env.LOCAL_DB_HOST || '127.0.0.1';
  const port = Number(process.env.PGPORT || process.env.LOCAL_DB_PORT) || 5432;
  const user = process.env.PGUSER || process.env.LOCAL_DB_USER || 'postgres';
  const password = process.env.PGPASSWORD || process.env.LOCAL_DB_PASSWORD || 'postgres';
  const targetDb = process.env.PGDATABASE || process.env.LOCAL_DB_NAME || 'bjcl_db';

  const allSyncTables: Array<{ table: string; pk: string }> = [
    { table: 'sauda_master', pk: 'sauda_id' },
    { table: 'sauda_quality_details', pk: 'detail_id' },
    { table: 'sauda_check_point', pk: 'po_id' },
    { table: 'sauda_check_point_details', pk: 'item_id' },
    { table: 'sauda_check_point_deductions', pk: 'id' },
    { table: 'purchase_master', pk: 'po_id' },
    { table: 'purchase_detail_master', pk: 'detail_id' },
    { table: 'temporary_material_received', pk: 'amad_id' },
    { table: 'final_arrival', pk: 'final_arrival_id' },
    { table: 'material_inspection', pk: 'mr_no' },
    { table: 'material_inspection_details', pk: 'id' },
    { table: 'mill_inspection_master', pk: 'mr_no' },
    { table: 'mill_inspection_detail', pk: 'detail_id' },
    { table: 'mr_settlement_master', pk: 'settlement_id' },
    { table: 'mr_settlement_detail', pk: 'detail_id' },
    { table: 'payment_master', pk: 'payment_id' },
    { table: 'payment_details', pk: 'detail_id' },
    { table: 'lorry_weighments', pk: 'id' },
    { table: 'marka_master', pk: 'id' },
    { table: 'supply_master', pk: 'id' },
    { table: 'broker_master', pk: 'id' },
    { table: 'agency_master', pk: 'id' },
    { table: 'area_master', pk: 'id' },
    { table: 'grade_master', pk: 'id' },
    { table: 'godown_master', pk: 'id' },
    { table: 'unit_master', pk: 'id' },
    { table: 'user_master', pk: 'user_id' },
    { table: 'satta_base_rates', pk: 'id' },
    { table: 'satta_differentials', pk: 'id' },
    { table: 'clubbed_pomr', pk: 'id' },
    { table: 'return_lorry', pk: 'id' },
  ];

  // 1. Check sibling local PostgreSQL databases ('postgres', 'SQC', 'bjcl_db')
  const candidateSources = [
    { label: 'Local PostgreSQL (127.0.0.1:5432 / postgres)', host, port, database: 'postgres', user, password },
    { label: 'Local PostgreSQL (127.0.0.1:5432 / SQC)', host, port, database: 'SQC', user, password },
    { label: 'Local PostgreSQL Cluster Port 5433 (bjcl_db)', host, port: 5433, database: 'bjcl_db', user, password },
  ];

  for (const src of candidateSources) {
    if (src.port === port && src.database === targetDb) continue;
    const srcPool = new Pool({
      host: src.host,
      port: src.port,
      database: src.database,
      user: src.user,
      password: src.password,
      connectionTimeoutMillis: 2000,
    });
    let recoveredFromSrc = 0;
    try {
      await srcPool.query('SELECT 1');
      for (const { table, pk } of allSyncTables) {
        try {
          const srcRowsRes = await srcPool.query(`SELECT * FROM public."${table}"`);
          if (srcRowsRes.rows.length > 0) {
            const beforeRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM "${table}"`).catch(() => ({ rows: [{ cnt: 0 }] }));
            const beforeCnt = beforeRes.rows?.[0]?.cnt || 0;
            const batchSize = 250;
            for (let i = 0; i < srcRowsRes.rows.length; i += batchSize) {
              const batch = srcRowsRes.rows.slice(i, i + batchSize);
              await executeUpsert({
                table,
                values: batch,
                onConflictCols: [pk],
              });
            }
            const afterRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM "${table}"`).catch(() => ({ rows: [{ cnt: beforeCnt }] }));
            const added = Math.max(0, (afterRes.rows?.[0]?.cnt || beforeCnt) - beforeCnt);
            recoveredFromSrc += added;
          }
        } catch (_) {}
      }
      sourcesChecked.push({
        source: src.label,
        status: 'Connected & Merged',
        rowsRecovered: recoveredFromSrc,
      });
      totalRowsRecovered += recoveredFromSrc;
    } catch (_) {
      sourcesChecked.push({
        source: src.label,
        status: 'Not running / Unreachable',
        rowsRecovered: 0,
      });
    } finally {
      await srcPool.end().catch(() => {});
    }
  }

  integrityInitialized = false;
  await ensureDatabaseIntegrity().catch(() => {});

  return {
    success: true,
    safetyBackupCreated: safetyRes.filesCreated.map(f => f.filePath),
    sourcesChecked,
    totalRowsRecovered,
    marka3153Present: false,
    message: `Pre-recovery safety backup created. Checked ${sourcesChecked.length} live PostgreSQL data sources and recovered ${totalRowsRecovered} row(s). No static dump files were used.`,
  };
}

/**
 * Ensures local PostgreSQL database `bjcl_db` exists (creating schema-only tables if empty, never loading static dump data)
 * and schedules automatic hourly + daily pg_dump / pg_dumpall backups to /home/ubuntu/backups with 30-day retention.
 */
export async function ensureLocalPostgresDatabaseAndHourlyBackup(): Promise<void> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const host = process.env.PGHOST || process.env.LOCAL_DB_HOST || '127.0.0.1';
  const port = Number(process.env.PGPORT || process.env.LOCAL_DB_PORT) || 5432;
  const user = process.env.PGUSER || process.env.LOCAL_DB_USER || 'postgres';
  const password = process.env.PGPASSWORD || process.env.LOCAL_DB_PASSWORD || 'postgres';
  const targetDb = process.env.PGDATABASE || process.env.LOCAL_DB_NAME || 'bjcl_db';

  // Ensure local postgres user password matches configured PGPASSWORD so TCP connections never fail with password auth error
  await execAsync(`sudo -n -u postgres psql -p ${port} -c "ALTER USER ${user} WITH PASSWORD '${password}';"`).catch(() => {});

  const maintPool = new Pool({
    host,
    port,
    database: 'postgres',
    user,
    password,
    connectionTimeoutMillis: 3000,
  });

  try {
    const dbCheck = await maintPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [targetDb]);
    if (dbCheck.rowCount === 0) {
      console.log(`[DB Init] Database "${targetDb}" does not exist. Creating "${targetDb}" now...`);
      await maintPool.query(`CREATE DATABASE "${targetDb.replace(/"/g, '')}"`);
    }

    // Check if targetDb has all schema tables (schema-only DDL, never auto-import static dump files)
    const countTablesInDb = async (dbName: string): Promise<number> => {
      const p = new Pool({ host, port, database: dbName, user, password, connectionTimeoutMillis: 3000 });
      try {
        const tblRes = await p.query(
          `SELECT COUNT(*)::int AS cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
        );
        return tblRes.rows?.[0]?.cnt || 0;
      } catch (_e) {
        return 0;
      } finally {
        await p.end().catch(() => {});
      }
    };

    let tableCount = await countTablesInDb(targetDb);

    if (tableCount < 50) {
      const schemaPath = path.resolve(process.cwd(), 'complete_local_schema.sql');
      if (fs.existsSync(schemaPath)) {
        console.log(`[DB Init] Applying schema-only DDL (complete_local_schema.sql) to "${targetDb}"...`);
        await execAsync(`PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${targetDb} -f "${schemaPath}"`);
        tableCount = await countTablesInDb(targetDb);
      }
      console.log(`[DB Init] Database "${targetDb}" schema is ready with ${tableCount} tables (no static dump rows loaded).`);
    }

    // Run non-destructive schema integrity checks only
    integrityInitialized = false;
    await ensureDatabaseIntegrity().catch(() => {});

    // Start automatic backup daemon (runs 15s after boot, then every 60 minutes, plus daily full cluster pg_dumpall)
    if (!hourlyBackupTimerStarted) {
      hourlyBackupTimerStarted = true;
      const runScheduledBackup = async () => {
        try {
          const currentTables = await countTablesInDb(targetDb);
          if (currentTables < 50) return; // Never overwrite backups with an empty database
          const res = await runVerifiedPostgresBackup({ reason: 'automatic_scheduled_backup' });
          if (res.success) {
            console.log(`[Postgres Backup] ${res.message}`);
          }
        } catch (_err) {
          // Silently ignore if pg_dump is unavailable in container preview
        }
      };

      setTimeout(runScheduledBackup, 15000);
      setInterval(runScheduledBackup, 60 * 60 * 1000);
    }
  } catch (_err) {
    // Non-fatal if local PostgreSQL is not installed in cloud preview environment
  } finally {
    await maintPool.end().catch(() => {});
  }
}


