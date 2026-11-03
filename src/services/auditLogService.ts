/**
 * Universal System Audit and Change Log Service
 * 
 * Records all user modifications across all sections of the application:
 * - Module / Section (Satta Chart, Sauda Check Point, Mill Inspection, MR Settlement, etc.)
 * - Record ID / Reference
 * - Field changed
 * - Before change value (old_value)
 * - After change value (new_value)
 * - User name who made the change (user_name)
 * - Timestamp
 * 
 * Persisted in Supabase `app_audit_logs` table with offline-first localStorage backup.
 */

import { supabase } from '../lib/supabase';
import { getCurrentUserContext } from '../lib/permissions';

export interface AppAuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601 string
  created_at?: string;
  module: string; // e.g. "Satta Desk / Rate Chart", "Mill Inspection", "Sauda Check Point", "MR Settlement", "Weight Settlement", "Gate Operations"
  entity_name?: string; // e.g. "Satta Base Rate", "Satta Differential", "Inspection Deductions", "Contract Rate"
  record_id: string; // e.g. "2026-08-13", "PO-1042", "LOT-992", "MR-501"
  action: 'UPDATE' | 'CREATE' | 'DELETE';
  field_name: string; // e.g. "base_rate", "differential", "td6_rate", "moisture_deduction_qtl"
  field_label?: string; // Human-friendly field name e.g. "Satta Base Rate (₹/Qtl)", "PURNEA TD5 Differential"
  old_value: any; // Before change value
  new_value: any; // After change value
  user_name: string; // User who made the change
  user_role?: string; // Role
  remarks?: string; // Optional context
}

export interface AuditLogFilters {
  module?: string;
  recordId?: string;
  userName?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
}

const LOCAL_STORAGE_KEY = 'bjl_universal_audit_logs';
const MAX_LOCAL_LOGS = 2500;

// Read local cache safely
export function getLocalAuditLogs(): AppAuditLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse local audit logs:', e);
    return [];
  }
}

// Save local cache safely
function saveLocalAuditLogs(logs: AppAuditLogEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = logs.slice(0, MAX_LOCAL_LOGS);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save local audit logs to localStorage:', e);
  }
}

// Convert any value to clean human string representation
export function formatAuditValue(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'number') {
    return isNaN(val) ? '—' : String(val);
  }
  if (typeof val === 'boolean') {
    return val ? 'Yes' : 'No';
  }
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val).trim();
}

/**
 * Log a single change in the application
 */
export async function logChange(params: {
  module: string;
  entity_name?: string;
  record_id: string;
  action?: 'UPDATE' | 'CREATE' | 'DELETE';
  field_name: string;
  field_label?: string;
  old_value: any;
  new_value: any;
  user_name?: string;
  user_role?: string;
  remarks?: string;
}): Promise<AppAuditLogEntry | null> {
  const formattedOld = formatAuditValue(params.old_value);
  const formattedNew = formatAuditValue(params.new_value);

  // If no actual change occurred, skip logging to avoid spam
  if (formattedOld === formattedNew && params.action !== 'CREATE' && params.action !== 'DELETE') {
    return null;
  }

  const currentUser = getCurrentUserContext();
  const userName = params.user_name || currentUser.username || currentUser.userName || currentUser.userId || 'System User';
  const userRole = params.user_role || currentUser.userRole || currentUser.userLevel || 'User';
  const nowIso = new Date().toISOString();
  const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const logEntry: AppAuditLogEntry = {
    id,
    timestamp: nowIso,
    created_at: nowIso,
    module: params.module,
    entity_name: params.entity_name || params.module,
    record_id: String(params.record_id),
    action: params.action || 'UPDATE',
    field_name: params.field_name,
    field_label: params.field_label || params.field_name,
    old_value: formattedOld,
    new_value: formattedNew,
    user_name: userName,
    user_role: userRole,
    remarks: params.remarks || `${params.field_label || params.field_name} changed from "${formattedOld}" to "${formattedNew}" by ${userName}`
  };

  // 1. Immediately store in local cache
  const localLogs = getLocalAuditLogs();
  localLogs.unshift(logEntry);
  saveLocalAuditLogs(localLogs);

  // 2. Broadcast event across components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-audit-logged', { detail: logEntry }));
  }

  // 3. Persist to Supabase app_audit_logs & user_activity_logs tables asynchronously
  if (supabase) {
    try {
      supabase
        .from('app_audit_logs')
        .insert({
          id: logEntry.id,
          timestamp: logEntry.timestamp,
          created_at: logEntry.created_at,
          module: logEntry.module,
          entity_name: logEntry.entity_name,
          record_id: logEntry.record_id,
          action: logEntry.action,
          field_name: logEntry.field_name,
          field_label: logEntry.field_label,
          old_value: logEntry.old_value,
          new_value: logEntry.new_value,
          user_name: logEntry.user_name,
          user_role: logEntry.user_role,
          remarks: logEntry.remarks
        })
        .then(
          ({ error }) => {
            if (error) {
              console.warn('Could not insert to app_audit_logs (table may need creation):', error.message);
            }
          },
          err => {
            console.warn('Supabase audit log insert error:', err);
          }
        );

      supabase
        .from('user_activity_logs')
        .insert({
          username: logEntry.user_name,
          activity_type: logEntry.action || 'UPDATE',
          module_name: logEntry.module,
          action_details: logEntry.remarks || `${logEntry.field_label || logEntry.field_name} changed from "${formattedOld}" to "${formattedNew}"`,
          ip_address: 'Local',
          created_at: nowIso
        })
        .then(
          ({ error }) => {
            if (error) {
              console.warn('Could not insert to user_activity_logs:', error.message);
            }
          },
          err => {
            console.warn('user_activity_logs insert error:', err);
          }
        );
    } catch (e) {
      console.warn('Supabase audit call failed:', e);
    }
  }

  return logEntry;
}

/**
 * Log a batch of changes (e.g., when a form is submitted with multiple updated fields)
 */
export async function logBatchChanges(entries: Array<{
  module: string;
  entity_name?: string;
  record_id: string;
  action?: 'UPDATE' | 'CREATE' | 'DELETE';
  field_name: string;
  field_label?: string;
  old_value: any;
  new_value: any;
  user_name?: string;
  user_role?: string;
  remarks?: string;
}>): Promise<AppAuditLogEntry[]> {
  const recorded: AppAuditLogEntry[] = [];
  for (const entry of entries) {
    const res = await logChange(entry);
    if (res) recorded.push(res);
  }
  return recorded;
}

/**
 * Compare two objects and log all modified fields automatically
 */
export async function logObjectDiff(params: {
  module: string;
  entity_name?: string;
  record_id: string;
  oldObj: Record<string, any>;
  newObj: Record<string, any>;
  fieldLabels?: Record<string, string>;
  ignoredFields?: string[];
  user_name?: string;
  remarks?: string;
}): Promise<AppAuditLogEntry[]> {
  const { module, entity_name, record_id, oldObj, newObj, fieldLabels = {}, ignoredFields = ['updated_at', 'created_at', 'id'], user_name, remarks } = params;
  const entries: AppAuditLogEntry[] = [];
  const allKeys = Array.from(new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]));

  for (const key of allKeys) {
    if (ignoredFields.includes(key)) continue;
    const oldVal = oldObj ? oldObj[key] : undefined;
    const newVal = newObj ? newObj[key] : undefined;
    
    if (formatAuditValue(oldVal) !== formatAuditValue(newVal)) {
      const res = await logChange({
        module,
        entity_name,
        record_id,
        field_name: key,
        field_label: fieldLabels[key] || key.replace(/_/g, ' ').toUpperCase(),
        old_value: oldVal,
        new_value: newVal,
        user_name,
        remarks
      });
      if (res) entries.push(res);
    }
  }

  return entries;
}

/**
 * Fetch Universal Audit Logs with live merging of Supabase & LocalStorage
 */
export async function fetchAppAuditLogs(filters?: AuditLogFilters): Promise<AppAuditLogEntry[]> {
  let dbLogs: AppAuditLogEntry[] = [];

  if (supabase) {
    try {
      let query = supabase
        .from('app_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 500);

      if (filters?.module && filters.module !== 'ALL') {
        query = query.ilike('module', `%${filters.module}%`);
      }
      if (filters?.userName && filters.userName !== 'ALL') {
        query = query.ilike('user_name', `%${filters.userName}%`);
      }
      if (filters?.recordId) {
        const cleanRecId = String(filters.recordId).replace(/^0+/, '');
        const padRecId = cleanRecId ? cleanRecId.padStart(4, '0') : '';
        query = query.or(`record_id.ilike.%${filters.recordId}%,record_id.ilike.%${cleanRecId}%,record_id.ilike.%${padRecId}%`);
      }
      if (filters?.dateFrom) {
        query = query.gte('timestamp', `${filters.dateFrom}T00:00:00`);
      }
      if (filters?.dateTo) {
        query = query.lte('timestamp', `${filters.dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      if (!error && data && Array.isArray(data)) {
        dbLogs = data;
      }

      // Query sauda_approval_history to include all dedicated approval, rejection, and resubmission events
      try {
        let histQuery = supabase
          .from('sauda_approval_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(filters?.limit || 500);

        if (filters?.recordId) {
          const cleanRecId = String(filters.recordId).replace(/^0+/, '');
          const padRecId = cleanRecId ? cleanRecId.padStart(4, '0') : '';
          histQuery = histQuery.or(`sauda_no.ilike.%${filters.recordId}%,sauda_no.ilike.%${cleanRecId}%,sauda_no.ilike.%${padRecId}%,sauda_id.ilike.%${filters.recordId}%`);
        }
        if (filters?.userName && filters.userName !== 'ALL') {
          histQuery = histQuery.ilike('username', `%${filters.userName}%`);
        }
        if (filters?.dateFrom) {
          histQuery = histQuery.gte('created_at', `${filters.dateFrom}T00:00:00`);
        }
        if (filters?.dateTo) {
          histQuery = histQuery.lte('created_at', `${filters.dateTo}T23:59:59`);
        }

        const { data: histData, error: histErr } = await histQuery;
        if (!histErr && histData && Array.isArray(histData)) {
          for (const row of histData) {
            const rowId = `sah_${row.id || Math.random()}`;
            dbLogs.push({
              id: rowId,
              timestamp: row.created_at || new Date().toISOString(),
              created_at: row.created_at || new Date().toISOString(),
              module: 'Sauda Desk',
              entity_name: row.action_type === 'REJECTED' ? 'Sauda Contract Rejection' : (row.action_type === 'APPROVED' ? 'Sauda Contract Approval' : 'Sauda Contract Resubmission'),
              record_id: `#${row.sauda_no || row.sauda_id}`,
              action: 'UPDATE',
              field_name: 'status',
              field_label: 'Approval Status',
              old_value: row.action_type === 'REJECTED' ? 'PENDING' : (row.action_type === 'RESUBMITTED' ? 'REJECTED' : 'PENDING'),
              new_value: row.action_type,
              user_name: row.username || 'System User',
              user_role: row.user_id ? `User ${row.user_id}` : 'Approver',
              remarks: row.remarks || `${row.action_type} by ${row.username}`
            });
          }
        }
      } catch (e) {
        console.warn('Could not query sauda_approval_history:', e);
      }

      // Also query user_activity_logs table to combine ALL activity logs
      try {
        let actQuery = supabase
          .from('user_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(filters?.limit || 500);

        if (filters?.module && filters.module !== 'ALL') {
          actQuery = actQuery.ilike('module_name', `%${filters.module}%`);
        }
        if (filters?.userName && filters.userName !== 'ALL') {
          actQuery = actQuery.ilike('username', `%${filters.userName}%`);
        }
        if (filters?.dateFrom) {
          actQuery = actQuery.gte('created_at', `${filters.dateFrom}T00:00:00`);
        }
        if (filters?.dateTo) {
          actQuery = actQuery.lte('created_at', `${filters.dateTo}T23:59:59`);
        }

        const { data: actData, error: actErr } = await actQuery;
        if (!actErr && actData && Array.isArray(actData)) {
          for (const row of actData) {
            const rowId = `ual_${row.log_id || Math.random()}`;
            dbLogs.push({
              id: rowId,
              timestamp: row.created_at || new Date().toISOString(),
              created_at: row.created_at || new Date().toISOString(),
              module: row.module_name || 'System Activity',
              entity_name: row.activity_type || 'User Activity',
              record_id: `LOG-${row.log_id || 'REF'}`,
              action: (row.activity_type?.toUpperCase() as any) || 'UPDATE',
              field_name: row.activity_type || 'Activity',
              field_label: 'Activity Log Details',
              old_value: '—',
              new_value: row.action_details || 'Recorded',
              user_name: row.username || 'System User',
              user_role: 'User',
              remarks: row.action_details || 'Activity log'
            });
          }
        }
      } catch (e) {
        console.warn('Could not query user_activity_logs:', e);
      }
    } catch (e) {
      console.warn('Could not query app_audit_logs from Supabase:', e);
    }
  }

  // Merge with local logs to ensure 100% data visibility
  const localLogs = getLocalAuditLogs();
  const seenIds = new Set<string>();
  const combined: AppAuditLogEntry[] = [];

  // Add DB logs first
  for (const log of dbLogs) {
    if (log && log.id && !seenIds.has(log.id)) {
      seenIds.add(log.id);
      combined.push(log);
    }
  }

  // Add local logs that might not yet be synced or are recent
  for (const log of localLogs) {
    if (log && log.id && !seenIds.has(log.id)) {
      seenIds.add(log.id);
      combined.push(log);
    }
  }

  // Sort by timestamp descending
  combined.sort((a, b) => new Date(b.timestamp || b.created_at || 0).getTime() - new Date(a.timestamp || a.created_at || 0).getTime());

  // Apply client-side filters if needed
  let filtered = combined;
  if (filters?.module && filters.module !== 'ALL') {
    const modLower = filters.module.toLowerCase();
    filtered = filtered.filter(l => (l.module || '').toLowerCase().includes(modLower));
  }
  if (filters?.userName && filters.userName !== 'ALL') {
    const userLower = filters.userName.toLowerCase();
    filtered = filtered.filter(l => (l.user_name || '').toLowerCase().includes(userLower));
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    filtered = filtered.filter(l => 
      (l.module || '').toLowerCase().includes(s) ||
      (l.record_id || '').toLowerCase().includes(s) ||
      (l.field_label || l.field_name || '').toLowerCase().includes(s) ||
      (l.old_value || '').toLowerCase().includes(s) ||
      (l.new_value || '').toLowerCase().includes(s) ||
      (l.user_name || '').toLowerCase().includes(s) ||
      (l.remarks || '').toLowerCase().includes(s)
    );
  }

  return filtered;
}
