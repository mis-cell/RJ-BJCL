import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

let notifyTimeout: any = null;
const pendingChangedTables = new Set<string>();

/**
 * Batched data change notification to prevent event-burst storms
 */
export function notifyDataChanged(tableName?: string) {
  if (typeof window === 'undefined') return;
  if (tableName) pendingChangedTables.add(tableName.toLowerCase());

  if (notifyTimeout) clearTimeout(notifyTimeout);
  notifyTimeout = setTimeout(() => {
    const tablesList = Array.from(pendingChangedTables);
    pendingChangedTables.clear();
    const detail = tablesList.length === 1 ? { table: tablesList[0], tables: tablesList } : { tables: tablesList };
    window.dispatchEvent(new CustomEvent('app-data-updated', { detail }));
    window.dispatchEvent(new CustomEvent('app:data-updated', { detail }));
  }, 250);
}

// Global Singleton Realtime Channel to prevent hundreds of duplicate websocket connections
let globalRealtimeChannel: any = null;
let globalSubscriptionActive = false;

function initGlobalRealtimeMultiplexer() {
  if (globalSubscriptionActive || !supabase || typeof window === 'undefined') return;
  globalSubscriptionActive = true;

  try {
    globalRealtimeChannel = supabase
      .channel('app_global_realtime_events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload: any) => {
          const changedTable = payload?.table;
          if (changedTable) {
            notifyDataChanged(changedTable);
          } else {
            notifyDataChanged();
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'TIMED_OUT' || status === 'CLOSED') {
          globalSubscriptionActive = false;
        }
      });
  } catch (err) {
    console.warn('[Realtime Multiplexer] Global channel setup failed:', err);
    globalSubscriptionActive = false;
  }
}

export interface UseLiveAutoRefreshOptions {
  tables?: string[];        // Specific Supabase tables to listen for
  enabled?: boolean;        // Conditionally enable/disable (default true)
  debounceMs?: number;      // Custom debounce in ms (default 350)
  skipInitialLoad?: boolean; // Skip duplicate initial load if parent already loads on mount
}

/**
 * High-performance, debounced Supabase Realtime auto-refresh hook.
 * Eliminates lag, thread congestion, and cascading parallel query bursts on every save/edit/delete.
 */
export function useLiveAutoRefresh(
  refreshCallback: (payload?: any) => void | Promise<void>,
  deps: any[] = [],
  options: UseLiveAutoRefreshOptions | string[] = {}
) {
  // Support passing tables array directly as 3rd arg OR options object
  const normalizedOptions: UseLiveAutoRefreshOptions = Array.isArray(options)
    ? { tables: options }
    : options;

  const { tables = [], enabled = true, debounceMs = 350, skipInitialLoad = false } = normalizedOptions;
  const callbackRef = useRef(refreshCallback);
  const debounceTimerRef = useRef<any>(null);
  const isExecutingRef = useRef<boolean>(false);
  const hasPendingExecutionRef = useRef<boolean>(false);
  const generationRef = useRef<number>(0);

  useEffect(() => {
    callbackRef.current = refreshCallback;
  }, [refreshCallback]);

  useEffect(() => {
    if (!enabled) return;

    // Initialize global realtime multiplexer once
    initGlobalRealtimeMultiplexer();

    let isSubscribed = true;
    generationRef.current += 1;
    const currentGen = generationRef.current;

    const executeCallback = async (payload?: any) => {
      if (!isSubscribed || currentGen !== generationRef.current) return;
      if (isExecutingRef.current) {
        hasPendingExecutionRef.current = true;
        return;
      }

      isExecutingRef.current = true;
      hasPendingExecutionRef.current = false;
      try {
        await callbackRef.current(payload);
      } catch (e) {
        console.warn('[Realtime Auto Refresh] Error executing callback:', e);
      } finally {
        isExecutingRef.current = false;
        if (isSubscribed && currentGen === generationRef.current && hasPendingExecutionRef.current) {
          hasPendingExecutionRef.current = false;
          executeCallback();
        }
      }
    };

    const triggerDebounced = (payload?: any) => {
      if (!isSubscribed || currentGen !== generationRef.current) return;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        executeCallback(payload);
      }, debounceMs);
    };

    // 1. Initial execution on component mount (unless skipInitialLoad is set)
    if (!skipInitialLoad) {
      executeCallback();
    }

    // 2. Custom Event Listener for local table updates & broadcasted realtime events
    const normalizedTables = tables.map(t => t.toLowerCase());

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const changedTable = customEvent.detail?.table ? String(customEvent.detail.table).toLowerCase() : null;
      const changedTables: string[] = (customEvent.detail?.tables || (changedTable ? [changedTable] : [])).map((t: string) => String(t).toLowerCase());

      // If specific tables changed:
      if (changedTables.length > 0) {
        if (normalizedTables.length > 0) {
          // Only refresh if this hook listens to one of the tables that changed
          const hasMatch = changedTables.some(t => normalizedTables.includes(t));
          if (hasMatch) {
            triggerDebounced();
          }
        }
        // If this hook has no tables specified, DO NOT trigger on specific table updates of other modules!
        return;
      }

      // If global broadcast with no specific tables mentioned, trigger if hook is also global or all-tables
      if (normalizedTables.length === 0) {
        triggerDebounced();
      }
    };

    window.addEventListener('app-data-updated', handleCustomEvent);
    window.addEventListener('app:data-updated', handleCustomEvent);

    return () => {
      isSubscribed = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      window.removeEventListener('app-data-updated', handleCustomEvent);
      window.removeEventListener('app:data-updated', handleCustomEvent);
    };
  }, [enabled, JSON.stringify(tables), debounceMs, ...deps]);
}

