/**
 * Local PostgreSQL Query Client for Bally Jute ERP
 * Directly replaces @supabase/supabase-js with a lightweight, 100% local client.
 * Dispatches queries to Express backend /api/db which executes parameterized SQL on PostgreSQL.
 */

export interface FilterCondition {
  column: string;
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in';
  value: any;
}

export interface QueryOrder {
  column: string;
  ascending: boolean;
  nullsFirst?: boolean;
}

export class LocalQueryBuilder<T = any> implements PromiseLike<{ data: T[] | null; error: any; count?: number | null }> {
  private tableName: string;
  private selectColumns: string = '*';
  private filters: FilterCondition[] = [];
  private orFilters: string[] = [];
  private orders: QueryOrder[] = [];
  private limitCount?: number;
  private offsetCount?: number;
  private isCountQuery: boolean = false;
  private countType?: 'exact' | 'planned' | 'estimated';
  private isSingleMode: boolean = false;
  private isMaybeSingleMode: boolean = false;

  // Mutation states
  private mutationType?: 'insert' | 'update' | 'delete' | 'upsert';
  private mutationValues?: any;
  private onConflictCols?: string[];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): this {
    this.selectColumns = columns;
    if (options?.count) {
      this.isCountQuery = true;
      this.countType = options.count;
    }
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push({ column, op: 'eq', value });
    return this;
  }

  neq(column: string, value: any): this {
    this.filters.push({ column, op: 'neq', value });
    return this;
  }

  gt(column: string, value: any): this {
    this.filters.push({ column, op: 'gt', value });
    return this;
  }

  gte(column: string, value: any): this {
    this.filters.push({ column, op: 'gte', value });
    return this;
  }

  lt(column: string, value: any): this {
    this.filters.push({ column, op: 'lt', value });
    return this;
  }

  lte(column: string, value: any): this {
    this.filters.push({ column, op: 'lte', value });
    return this;
  }

  like(column: string, value: any): this {
    this.filters.push({ column, op: 'like', value });
    return this;
  }

  ilike(column: string, value: any): this {
    this.filters.push({ column, op: 'ilike', value });
    return this;
  }

  is(column: string, value: any): this {
    this.filters.push({ column, op: 'is', value });
    return this;
  }

  in(column: string, values: any[]): this {
    this.filters.push({ column, op: 'in', value: values });
    return this;
  }

  or(filterString: string): this {
    if (filterString) {
      this.orFilters.push(filterString);
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): this {
    this.orders.push({
      column,
      ascending: options?.ascending !== false,
      nullsFirst: options?.nullsFirst
    });
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number): this {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  single(): Promise<{ data: any; error: any }> {
    this.isSingleMode = true;
    return this.execute() as any;
  }

  maybeSingle(): Promise<{ data: any | null; error: any }> {
    this.isMaybeSingleMode = true;
    return this.execute() as any;
  }

  insert(values: any | any[], _options?: { onConflict?: string }): this {
    this.mutationType = 'insert';
    this.mutationValues = values;
    return this;
  }

  upsert(values: any | any[], options?: { onConflict?: string }): this {
    this.mutationType = 'upsert';
    this.mutationValues = values;
    if (options?.onConflict) {
      this.onConflictCols = options.onConflict.split(',').map(s => s.trim());
    }
    return this;
  }

  update(values: any): this {
    this.mutationType = 'update';
    this.mutationValues = values;
    return this;
  }

  delete(): this {
    this.mutationType = 'delete';
    return this;
  }

  private async execute(): Promise<any> {
    try {
      const endpoint = this.mutationType 
        ? `/api/db/${this.mutationType}` 
        : `/api/db/query`;

      const payload = {
        table: this.tableName,
        select: this.selectColumns,
        filters: this.filters,
        orFilters: this.orFilters,
        orders: this.orders,
        limit: this.limitCount,
        offset: this.offsetCount,
        count: this.isCountQuery ? this.countType : undefined,
        values: this.mutationValues,
        onConflictCols: this.onConflictCols
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: res.statusText }));
        return { data: null, error: errJson?.error || errJson || { message: 'Database query failed' }, count: null };
      }

      const result = await res.json();
      let data = result.data;

      if (this.isSingleMode) {
        if (!data || data.length === 0) {
          return { data: null, error: { message: 'Row not found' }, count: result.count };
        }
        return { data: data[0], error: null, count: result.count };
      }

      if (this.isMaybeSingleMode) {
        if (!data || data.length === 0) {
          return { data: null, error: null, count: result.count };
        }
        return { data: data[0], error: null, count: result.count };
      }

      return { data, error: null, count: result.count };
    } catch (err: any) {
      return { data: null, error: { message: err?.message || 'Network error connecting to local database' }, count: null };
    }
  }

  then<TResult1 = { data: T[] | null; error: any; count?: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T[] | null; error: any; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected);
  }
}

export class LocalPostgresClient {
  from<T = any>(table: string): LocalQueryBuilder<T> {
    return new LocalQueryBuilder<T>(table);
  }

  async rpc(funcName: string, args: Record<string, any> = {}): Promise<{ data: any; error: any }> {
    try {
      const res = await fetch('/api/db/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ func: funcName, args })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        return { data: null, error: err };
      }
      const json = await res.json();
      return { data: json.data, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  }
}

export const localPostgresClient = new LocalPostgresClient();
