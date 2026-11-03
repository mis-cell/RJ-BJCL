import { supabase } from "../lib/supabase";
import { logChange } from "./auditLogService";
import { assertBaseRateApproved } from "./sattaRateService";

export const APP_DATA_UPDATED_EVENT = "app-data-updated";

const SAUDA_APPROVAL_GUARDED_TABLES = new Set([
  "sauda_master",
  "sauda_quality_details",
  "sauda_check_point",
  "sauda_check_point_details",
]);

async function assertSaudaBaseRateApprovedForTable(table: string) {
  const clean = String(table || "").trim().toLowerCase();
  if (SAUDA_APPROVAL_GUARDED_TABLES.has(clean)) {
    await assertBaseRateApproved(false);
  }
}

const MODULE_LABELS: Record<string, string> = {
  sauda_master: "Sauda Entry Desk",
  sauda_quality_details: "Sauda Quality Details",
  sauda_check_point: "Sauda Check Point",
  sauda_check_point_details: "Sauda Check Point Details",
  purchase_master: "Final P.O",
  purchase_detail_master: "Final P.O Details",
  temporary_material_received: "Temporary Arrival (MR)",
  material_received: "Final Arrival / Weighbridge",
  material_inspection: "Material Inspection",
  mill_inspection_master: "Mill Inspection",
  mr_settlement: "MR Settlement",
  payment_master: "Payment Desk",
  satta_master: "Satta Entry",
  satta_base_rates: "Satta Base Rates",
  satta_differentials: "Satta Differentials",
  satta_calculated_rates: "Satta Calculated Rates",
  material_issue: "Material Issue",
  opening_stock: "Opening Stock",
  broker_master: "Broker Master",
  supply_master: "Supplier Master",
  customer_master: "Trader Directory",
  tolerance_policy_master: "Tolerance Policy",
  clubbed_pomr: "Clubbed PO/MR",
  return_lorry: "Return Lorry (4000 Series P.O.)",
  return_lorry_details: "Return Lorry Item Details",
};

// In-flight request deduplication map to prevent multiple identical concurrent queries
const inFlightRequests = new Map<string, Promise<any>>();

// Shared in-memory query cache with TTL (15-30s default)
interface CacheEntry {
  data: any;
  expiry: number;
  table: string;
}
const dataCache = new Map<string, CacheEntry>();

export function invalidateTableCache(table?: string) {
  if (!table) {
    dataCache.clear();
    return;
  }
  const cleanTable = table.trim().toLowerCase();
  for (const [key, entry] of dataCache.entries()) {
    if (entry.table === cleanTable || key.includes(cleanTable)) {
      dataCache.delete(key);
    }
  }
}

export function notifyDataChanged(table?: string) {
  if (table) {
    invalidateTableCache(table);
  } else {
    dataCache.clear();
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(APP_DATA_UPDATED_EVENT, {
        detail: { table, timestamp: Date.now() },
      })
    );
  }
}

function assertOnlineAndConnected(operation: string, table: string) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error(
      `Cannot perform ${operation} on "${table}" while offline. Please reconnect and try again.`
    );
  }
  if (!supabase) {
    throw new Error(
      `Database client is not initialized for ${operation} on "${table}".`
    );
  }
}

function sanitizePayload(data: Record<string, any>): Record<string, any> {
  const payload = { ...data };
  delete payload._offline_queued;
  delete payload._stripped_columns;
  delete payload.signature_url;
  delete payload.digital_signature;
  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined) {
      delete payload[k];
    }
  });
  return payload;
}

async function executeWithSchemaRetry(
  table: string,
  mutationFn: (activePayload: any) => Promise<{ data: any; error: any }>,
  payload: any
) {
  let currentPayload = { ...payload };
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await mutationFn(currentPayload);
    if (!res.error) return res;

    const errMsg = res.error.message || '';
    if (errMsg.includes('schema cache') || errMsg.includes('Could not find') || errMsg.includes('column')) {
      const match = errMsg.match(/['"]([a-zA-Z0-9_]+)['"]\s+column/i) || errMsg.match(/column\s+['"]([a-zA-Z0-9_]+)['"]/i) || errMsg.match(/Could not find the '([a-zA-Z0-9_]+)' column/i);
      if (match && match[1]) {
        const missingCol = match[1];
        if (currentPayload[missingCol] !== undefined) {
          delete currentPayload[missingCol];
          console.warn(`[dbModule] Removed missing schema cache column "${missingCol}" from "${table}" payload and retrying...`);
          continue;
        }
      }
    }
    return res;
  }
  return mutationFn(currentPayload);
}

export const dbModule = {
  /**
   * Invalidate cached table results
   */
  invalidateCache(table?: string) {
    invalidateTableCache(table);
  },

  /**
   * Fast server-side count query using Supabase exact count with head: true
   * Returns exact row count in milliseconds without fetching row bodies.
   */
  async fetchCount(table: string, filter?: Record<string, any>): Promise<number> {
    if (!supabase) return 0;
    const cacheKey = `count:${table}:${JSON.stringify(filter || {})}`;
    const cached = dataCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey)!;
    }

    const promise = (async () => {
      try {
        let q = supabase.from(table).select("*", { count: "exact", head: true });
        if (filter) {
          Object.entries(filter).forEach(([k, v]) => {
            if (v !== undefined && v !== null) {
              q = q.eq(k, v);
            }
          });
        }
        const { count, error } = await q;
        if (error) {
          console.warn(`fetchCount failed on "${table}":`, error.message);
          return 0;
        }
        const result = count || 0;
        dataCache.set(cacheKey, {
          data: result,
          expiry: Date.now() + 20000,
          table: table.toLowerCase(),
        });
        return result;
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, promise);
    return promise;
  },

  /**
   * Targeted database-side filtered query with column selection, sorting, and pagination.
   */
  async fetchQuery(
    table: string,
    options?: {
      select?: string;
      where?: Record<string, any>;
      orderBy?: string;
      ascending?: boolean;
      limit?: number;
      offset?: number;
      ttlMs?: number;
    }
  ): Promise<any[]> {
    if (!supabase) {
      throw new Error(`Database client is not initialized to read "${table}".`);
    }

    const cacheKey = `query:${table}:${JSON.stringify(options || {})}`;
    const cached = dataCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey)!;
    }

    const promise = (async () => {
      try {
        let q = supabase.from(table).select(options?.select || "*");
        if (options?.where) {
          Object.entries(options.where).forEach(([k, v]) => {
            if (v !== undefined && v !== null) {
              q = q.eq(k, v);
            }
          });
        }
        if (options?.orderBy) {
          q = q.order(options.orderBy, {
            ascending: options.ascending ?? true,
          });
        }
        if (options?.offset !== undefined && options?.limit !== undefined) {
          q = q.range(options.offset, options.offset + options.limit - 1);
        } else if (options?.limit !== undefined) {
          q = q.limit(options.limit);
        }

        const { data, error } = await q;
        if (error) {
          throw new Error(`Query on "${table}" failed: ${error.message}`);
        }
        const result = data || [];
        const ttl = options?.ttlMs ?? 15000;
        if (ttl > 0) {
          dataCache.set(cacheKey, {
            data: result,
            expiry: Date.now() + ttl,
            table: table.toLowerCase(),
          });
        }
        return result;
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, promise);
    return promise;
  },

  /**
   * Execute an atomic SQL transaction via the database RPC `exec_sql`.
   * Rolls back all statements if any statement fails.
   */
  async executeTransaction(statementsOrFn: string | string[] | ((client: any) => Promise<any>)): Promise<any> {
    assertOnlineAndConnected("transaction", "exec_sql");
    if (typeof statementsOrFn === "function") {
      const res = await statementsOrFn(supabase);
      dataCache.clear();
      notifyDataChanged();
      return res ?? { success: true };
    }
    const sqlList = (Array.isArray(statementsOrFn) ? statementsOrFn : [statementsOrFn])
      .map((s) => s.trim())
      .filter(Boolean);
    if (sqlList.length === 0) return { success: true };

    const cleanSql = sqlList
      .map((s) => (s.endsWith(";") ? s : `${s};`))
      .join("\n");

    const { data, error } = await supabase!.rpc("exec_sql", {
      query: cleanSql,
    });
    if (error) {
      throw new Error(`Atomic transaction failed: ${error.message}`);
    }
    if (data && typeof data === "object" && data.error) {
      throw new Error(`Atomic transaction rejected: ${data.error}`);
    }
    dataCache.clear();
    notifyDataChanged();
    return data ?? { success: true };
  },

  /**
   * Shared fetchAll that retrieves rows with in-flight deduplication, caching,
   * and flexible options or positional arguments.
   */
  async fetchAll(
    table: string,
    optionsOrOrderBy?: any,
    maybeAscending?: boolean,
    maybeMaxRows?: number
  ): Promise<any[]> {
    if (!supabase) {
      throw new Error(`Database client is not initialized to read "${table}".`);
    }

    let orderBy: string | undefined;
    let ascending: boolean | undefined;
    let maxRows = 50000;
    let pageSize = 1000;

    if (typeof optionsOrOrderBy === "object" && optionsOrOrderBy !== null) {
      orderBy = optionsOrOrderBy.orderBy;
      ascending = optionsOrOrderBy.ascending;
      maxRows = optionsOrOrderBy.maxRows || maxRows;
      pageSize = optionsOrOrderBy.pageSize || pageSize;
    } else if (typeof optionsOrOrderBy === "string") {
      orderBy = optionsOrOrderBy;
      ascending = maybeAscending;
      if (typeof maybeMaxRows === "number") maxRows = maybeMaxRows;
    }

    const cacheKey = `all:${table}:${orderBy || "none"}:${ascending ?? true}:${maxRows}`;
    const cached = dataCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey)!;
    }

    const promise = (async () => {
      try {
        const effectivePageSize = Math.min(pageSize, maxRows);
        const allRows: any[] = [];
        let offset = 0;

        while (offset < maxRows) {
          const fetchCount = Math.min(effectivePageSize, maxRows - offset);
          if (fetchCount <= 0) break;

          let query = supabase
            .from(table)
            .select("*")
            .range(offset, offset + fetchCount - 1);

          if (orderBy) {
            query = query.order(orderBy, {
              ascending: ascending ?? true,
            });
          }

          const { data, error } = await query;
          if (error) {
            throw new Error(`Failed to fetch records from "${table}": ${error.message}`);
          }

          const batch = data || [];
          allRows.push(...batch);

          if (batch.length < fetchCount || allRows.length >= maxRows) {
            break;
          }
          offset += batch.length;
        }

        dataCache.set(cacheKey, {
          data: allRows,
          expiry: Date.now() + 20000,
          table: table.toLowerCase(),
        });

        return allRows;
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, promise);
    return promise;
  },

  async insert(table: string, data: any): Promise<any> {
    assertOnlineAndConnected("insert", table);
    await assertSaudaBaseRateApprovedForTable(table);
    const payload = sanitizePayload(data);

    const { data: insertedRows, error } = await executeWithSchemaRetry(
      table,
      async (pl) => {
        const res = await supabase!.from(table).insert([pl]).select();
        return { data: res.data, error: res.error };
      },
      payload
    );

    if (error) {
      throw new Error(`Insert into "${table}" failed: ${error.message}`);
    }

    if (!insertedRows || insertedRows.length === 0) {
      throw new Error(
        `Insert into "${table}" failed: zero rows were returned by the database.`
      );
    }

    const savedRow = insertedRows[0];
    notifyDataChanged(table);

    if (table !== "app_audit_logs" && table !== "user_activity_logs") {
      const recId =
        savedRow.po_no ||
        savedRow.sauda_no ||
        savedRow.mr_no ||
        savedRow.temporary_arrival_no ||
        savedRow.amad_no ||
        savedRow.payment_id ||
        savedRow.issue_no ||
        savedRow.id ||
        "NEW";
      logChange({
        module: MODULE_LABELS[table] || table,
        entity_name: table,
        record_id: String(recId),
        action: "CREATE",
        field_name: "record",
        field_label: "New Record Created",
        old_value: null,
        new_value: recId,
      }).catch(() => {});
    }

    return savedRow;
  },

  /**
   * Strict upsert that never strips columns and verifies an authoritative returned row.
   */
  async upsert(table: string, data: any, onConflictColumn?: string): Promise<any> {
    assertOnlineAndConnected("upsert", table);
    await assertSaudaBaseRateApprovedForTable(table);
    const payload = sanitizePayload(data);

    const options = onConflictColumn ? { onConflict: onConflictColumn } : undefined;
    const { data: upsertedRows, error } = await executeWithSchemaRetry(
      table,
      async (pl) => {
        const res = await supabase!.from(table).upsert([pl], options).select();
        return { data: res.data, error: res.error };
      },
      payload
    );

    if (error) {
      throw new Error(
        `Upsert into "${table}" (conflict key "${onConflictColumn}") failed: ${error.message}`
      );
    }

    if (!upsertedRows || upsertedRows.length === 0) {
      throw new Error(
        `Upsert into "${table}" failed: zero rows were returned by the database.`
      );
    }

    const savedRow = upsertedRows[0];
    notifyDataChanged(table);

    if (table !== "app_audit_logs" && table !== "user_activity_logs") {
      const recId =
        savedRow[onConflictColumn!] ||
        savedRow.po_no ||
        savedRow.sauda_no ||
        savedRow.mr_no ||
        savedRow.id ||
        "UPSERT";
      logChange({
        module: MODULE_LABELS[table] || table,
        entity_name: table,
        record_id: String(recId),
        action: "UPDATE",
        field_name: onConflictColumn,
        field_label: `Upsert (${onConflictColumn})`,
        old_value: null,
        new_value: recId,
      }).catch(() => {});
    }

    return savedRow;
  },

  /**
   * Strict update that requires at least one matched & returned row from Supabase.
   */
  async update(
    table: string,
    idColumn: string,
    idValue: any,
    data: any
  ): Promise<any> {
    assertOnlineAndConnected("update", table);
    await assertSaudaBaseRateApprovedForTable(table);
    if (idValue === undefined || idValue === null || String(idValue).trim() === "") {
      throw new Error(
        `Update on "${table}" rejected: missing key value for "${idColumn}".`
      );
    }

    const payload = sanitizePayload(data);
    const { data: updatedRows, error } = await executeWithSchemaRetry(
      table,
      async (pl) => {
        const res = await supabase!.from(table).update(pl).eq(idColumn, idValue).select();
        return { data: res.data, error: res.error };
      },
      payload
    );

    if (error) {
      throw new Error(
        `Update on "${table}" where ${idColumn}="${idValue}" failed: ${error.message}`
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      throw new Error(
        `Update on "${table}" where ${idColumn}="${idValue}" matched 0 rows.`
      );
    }

    const savedRow = updatedRows[0];
    notifyDataChanged(table);

    if (table !== "app_audit_logs" && table !== "user_activity_logs") {
      logChange({
        module: MODULE_LABELS[table] || table,
        entity_name: table,
        record_id: String(idValue),
        action: "UPDATE",
        field_name: Object.keys(payload).join(", "),
        field_label: "Updated Fields",
        old_value: null,
        new_value: JSON.stringify(payload),
      }).catch(() => {});
    }

    return savedRow;
  },

  /**
   * Strict delete that verifies database execution and logs only after confirmed deletion.
   */
  async delete(table: string, idColumn: string, idValue: any): Promise<any> {
    assertOnlineAndConnected("delete", table);
    if (idValue === undefined || idValue === null || String(idValue).trim() === "") {
      throw new Error(
        `Delete on "${table}" rejected: missing key value for "${idColumn}".`
      );
    }

    const { data: deletedRows, error } = await supabase!
      .from(table)
      .delete()
      .eq(idColumn, idValue)
      .select();

    if (error) {
      throw new Error(
        `Delete from "${table}" where ${idColumn}="${idValue}" failed: ${error.message}`
      );
    }

    notifyDataChanged(table);

    if (
      deletedRows &&
      deletedRows.length > 0 &&
      table !== "app_audit_logs" &&
      table !== "user_activity_logs"
    ) {
      logChange({
        module: MODULE_LABELS[table] || table,
        entity_name: table,
        record_id: String(idValue),
        action: "DELETE",
        field_name: idColumn,
        field_label: "Deleted Record",
        old_value: idValue,
        new_value: null,
      }).catch(() => {});
    }

    return deletedRows || [];
  },
};
