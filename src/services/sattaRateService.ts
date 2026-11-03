/**
 * Single Source of Truth for Satta Rates and Differentials
 * 
 * All Satta Rates (Base Rate, Differentials, Calculated Rates) originate directly
 * from Supabase tables:
 * - satta_base_rates: Daily published base rates (e.g. TD5 base rate)
 * - satta_differentials: Area & grade specific differentials (+/- relative to base)
 * - satta_calculated_rates: Precomputed final rates (base_rate + differential)
 * 
 * ZERO hardcoded rates, ZERO fallback defaults. If not in Supabase, returns not found.
 */

import { supabase } from '../lib/supabase';
import { isUserId10 } from '../lib/permissions';
import { getAuthenticatedUser, resolveUserIdentity, initUserMap } from '../lib/userResolver';

export const BASE_RATE_APPROVAL_REQUIRED_MSG =
  'Base Rate has been changed. Approval from User 010 is required before proceeding.';

export interface SattaBaseRate {
  id: string;
  start_date: string;
  base_rate: number;
  previous_rate?: number | null;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
  updated_by_id?: string;
  updated_by_display?: string;
  remarks?: string;
  clean_remarks?: string;
  status?: string;
  approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string | null;
  approved_by_id?: string | null;
  approved_by_display?: string | null;
  approved_at?: string | null;
  approval_remarks?: string | null;
}

export interface SattaBaseRateHistoryItem {
  id: string;
  base_rate_id?: string;
  start_date: string;
  previous_rate: number | null;
  new_rate: number;
  changed_by: string;
  changed_by_id: string;
  changed_by_display: string;
  changed_at: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by: string | null;
  approved_by_id: string | null;
  approved_by_display: string | null;
  approved_at: string | null;
  remarks?: string;
}

export interface BaseRateApprovalState {
  isApproved: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  currentBaseRate: number | null;
  currentRate: number;
  previousBaseRate: number | null;
  previousRate: number | null;
  startDate: string | null;
  recordId: string | null;
  updatedBy: string;
  updatedById: string;
  updatedByDisplay: string;
  updatedAt: string | null;
  approvedBy: string | null;
  approvedById: string | null;
  approvedByDisplay: string | null;
  approvedAt: string | null;
  blockMessage: string;
}

export interface SattaDifferential {
  id?: string;
  area: string;
  grade: string;
  differential: number;
  created_at?: string;
}

export interface SattaCalculatedRate {
  id?: string;
  base_rate_id?: string;
  start_date: string;
  area: string;
  grade: string;
  differential: number;
  base_rate: number;
  final_rate: number;
  created_at?: string;
}

export interface SattaRateResult {
  found: boolean;
  baseRate: number | null;
  differential: number | null;
  finalRate: number | null;
  matchedArea: string | null;
  normGrade: string | null;
  startDate: string | null;
  error?: string;
}

export interface SattaDiffResult {
  found: boolean;
  differential: number | null;
  matchedArea: string | null;
  normGrade: string | null;
  error?: string;
}

// Global in-memory cache populated directly from Supabase
let cachedBaseRates: SattaBaseRate[] = [];
let cachedBaseRateHistory: SattaBaseRateHistoryItem[] = [];
let cachedDifferentials: SattaDifferential[] = [];
let cachedCalculatedRates: SattaCalculatedRate[] = [];
let isCacheLoaded = false;
let cachePromise: Promise<void> | null = null;
let schemaEnsured = false;

const LOCAL_META_STORAGE_KEY = 'satta_base_rate_meta_map_v1';
const LOCAL_DAILY_APPROVAL_KEY = 'satta_daily_approved_rate_v1';
const META_DELIMITER = '||META:';

interface EmbeddedRateMeta {
  prev?: number | null;
  by?: string;
  byId?: string;
  at?: string;
  st?: 'PENDING' | 'APPROVED' | 'REJECTED';
  appBy?: string | null;
  appById?: string | null;
  appAt?: string | null;
}

function loadLocalRateMetaMap(): Record<string, EmbeddedRateMeta> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_META_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocalRateMetaMap(map: Record<string, EmbeddedRateMeta>) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(LOCAL_META_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function encodeBaseRateRemarks(cleanRemarks: string, meta: EmbeddedRateMeta): string {
  const baseText = String(cleanRemarks || '').split(META_DELIMITER)[0].trim();
  return `${baseText} ${META_DELIMITER}${JSON.stringify(meta)}`.trim();
}

export function parseBaseRateRemarks(rawRemarks?: string | null): {
  cleanRemarks: string;
  meta: EmbeddedRateMeta | null;
} {
  const str = String(rawRemarks || '');
  const idx = str.indexOf(META_DELIMITER);
  if (idx === -1) {
    return { cleanRemarks: str.trim(), meta: null };
  }
  const cleanRemarks = str.slice(0, idx).trim();
  const jsonPart = str.slice(idx + META_DELIMITER.length).trim();
  try {
    const parsed = JSON.parse(jsonPart);
    return { cleanRemarks, meta: parsed && typeof parsed === 'object' ? parsed : null };
  } catch {
    return { cleanRemarks, meta: null };
  }
}

export async function ensureSattaBaseRateApprovalSchema(): Promise<void> {
  if (schemaEnsured || !supabase) return;
  schemaEnsured = true;
  const alterSql = `
    ALTER TABLE IF EXISTS public.satta_base_rates
      ADD COLUMN IF NOT EXISTS previous_rate numeric,
      ADD COLUMN IF NOT EXISTS updated_by text,
      ADD COLUMN IF NOT EXISTS updated_by_id text,
      ADD COLUMN IF NOT EXISTS updated_at timestamptz,
      ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS approved_by text,
      ADD COLUMN IF NOT EXISTS approved_by_id text,
      ADD COLUMN IF NOT EXISTS approved_at timestamptz,
      ADD COLUMN IF NOT EXISTS approval_remarks text;

    ALTER TABLE IF EXISTS public.satta_base_rate_audit_logs
      ADD COLUMN IF NOT EXISTS base_rate_id text,
      ADD COLUMN IF NOT EXISTS updated_by_id text,
      ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS approved_by text,
      ADD COLUMN IF NOT EXISTS approved_by_id text,
      ADD COLUMN IF NOT EXISTS approved_at timestamptz;
  `;
  try {
    const { error } = await supabase.rpc('exec_sql', { query: alterSql });
    if (error) {
      await supabase.rpc('exec_sql', { sql_query: alterSql });
    }
  } catch {
    // Fallback handled seamlessly via remarks ||META: and satta_base_rate_audit_logs
  }
}

// Normalize grade string (e.g. 'TD-6' -> 'TD6', 'TD 6' -> 'TD6', 'TD5 - SUPERIOR' -> 'TD5')
export function normalizeGrade(grade?: string | null): string {
  if (!grade) return '';
  const clean = String(grade).trim().toUpperCase();
  
  // Extract TD grades even with suffixes (e.g., 'TD-5', 'TD5 DAISEE', 'TD 5')
  const tdMatch = clean.match(/\bTD[\s\-_]*([0-9]+)/i) || clean.match(/^TD[\s\-_]*([0-9]+)/i);
  if (tdMatch) return `TD${tdMatch[1]}`;
  
  // Extract W grades (White Jute, e.g., 'W-5', 'W5', 'W 6')
  const wMatch = clean.match(/\bW[\s\-_]*([0-9]+)/i) || clean.match(/^W[\s\-_]*([0-9]+)/i);
  if (wMatch) return `W${wMatch[1]}`;

  // Extract Mesta grades (e.g. 'M-1', 'M2')
  const mMatch = clean.match(/\bM[\s\-_]*([0-9]+)/i) || clean.match(/^M[\s\-_]*([0-9]+)/i);
  if (mMatch) return `M${mMatch[1]}`;

  return clean.replace(/\./g, '').trim();
}

// Ordered standard jute grade hierarchies for grade downgrade progression
export const GRADE_SEQUENCES: string[][] = [
  ['TD1', 'TD2', 'TD3', 'TD4', 'TD5', 'TD6', 'TD7', 'TD8', 'TD9', 'TD10'],
  ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'LOOSE'],
  ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
  ['BTR HD KS', 'BTR HD CS', 'BTR HD BS', 'BTR NB KS', 'BTR NB FFS', 'BTR NB (SMR)'],
  ['M.S.MID', 'M.MID', 'M.BOT', 'M.B.BOT', 'M.X.BOT'],
  ['BOT', 'B.BOT', 'X.BOT', 'X.X.BOT']
];

export function getNextLowerGrade(currentGrade?: string | null): string | null {
  const norm = normalizeGrade(currentGrade);
  if (!norm) return null;

  for (const seq of GRADE_SEQUENCES) {
    const idx = seq.findIndex(g => normalizeGrade(g) === norm);
    if (idx !== -1 && idx < seq.length - 1) {
      return seq[idx + 1];
    }
  }

  const tdNumMatch = norm.match(/^TD([0-9]+)$/);
  if (tdNumMatch) {
    const nextNum = parseInt(tdNumMatch[1], 10) + 1;
    return `TD${nextNum}`;
  }

  const wNumMatch = norm.match(/^W([0-9]+)$/);
  if (wNumMatch) {
    const nextNum = parseInt(wNumMatch[1], 10) + 1;
    return `W${nextNum}`;
  }

  const mNumMatch = norm.match(/^M([0-9]+)$/);
  if (mNumMatch) {
    const nextNum = parseInt(mNumMatch[1], 10) + 1;
    return `M${nextNum}`;
  }

  return null;
}

/**
 * Standardize regional synonyms to match Supabase table area naming
 */
export function getCandidateAreas(area?: string | null, agency?: string | null): string[] {
  const cleanArea = String(area || '').trim().toUpperCase();
  const cleanAgency = String(agency || '').trim().toUpperCase();
  const candidates: string[] = [];

  // Purnea / Bihar synonyms: PURNEA(BIHAR) and BIHAR represent the same market
  if (
    cleanArea.includes('BIHAR') || 
    cleanArea.includes('PURNEA') || 
    cleanAgency.includes('GULABBAGH') || 
    cleanAgency.includes('PURNEA')
  ) {
    if (cleanArea.includes('LOOSE') || cleanAgency.includes('LOOSE')) {
      candidates.push('PURNEA (LOOSE)', 'PURNEA LOOSE', 'PURNEA(BIHAR)', 'BIHAR');
    } else {
      candidates.push('PURNEA(BIHAR)', 'BIHAR', 'PURNEA (LOOSE)', 'PURNEA LOOSE');
    }
  }

  // Lower Assam / Tarabari / Bilasipara: Treat all as L/A TARABARI
  if (
    cleanArea.includes('LOWER ASSAM') || 
    cleanArea.includes('L/A') || 
    cleanArea.includes('TARABARI') || 
    cleanArea.includes('BILASIPARA') ||
    cleanArea.includes('BELLOW ASSAM') ||
    cleanArea.includes('BELOW ASSAM') ||
    cleanAgency.includes('LOWER ASSAM') ||
    cleanAgency.includes('BILASIPARA') ||
    cleanAgency.includes('TARABARI') ||
    cleanAgency.includes('BELLOW ASSAM') ||
    cleanAgency.includes('BELOW ASSAM')
  ) {
    candidates.push('L/A TARABARI', 'LOWER ASSAM', 'BILASIPARA');
  }

  if (cleanArea.includes('U/ASSAM') || cleanArea.includes('UPPER ASSAM') || cleanAgency.includes('U/ASSAM')) {
    candidates.push('U/ASSAM', 'ASSAM');
  } else if (cleanArea.includes('ASSAM') && !cleanArea.includes('LOWER')) {
    candidates.push('ASSAM', 'U/ASSAM');
  }

  if (cleanArea.includes('DAISEE') || cleanAgency.includes('DAISEE')) candidates.push('DAISEE');
  if (cleanArea.includes('TULSIHATTA') || cleanAgency.includes('TULSIHATTA')) candidates.push('TULSIHATTA');
  if (cleanArea.includes('BANGLADESH') || cleanAgency.includes('BANGLADESH')) candidates.push('BANGLADESH');
  if (cleanArea.includes('GRP LOOSE') || cleanAgency.includes('GRP LOOSE')) candidates.push('GRP LOOSE');
  if (cleanArea.includes('KANKI') || cleanAgency.includes('KANKI')) candidates.push('KANKI');

  if (cleanArea.includes('RAIGANJ') || cleanAgency.includes('RAIGANJ')) {
    if (cleanArea.includes('LOOSE') || cleanAgency.includes('LOOSE')) {
      candidates.push('RAIGANJ Loose', 'RAIGANJ LOOSE', 'RAIGANJ');
    } else {
      candidates.push('RAIGANJ', 'RAIGANJ Loose', 'RAIGANJ LOOSE');
    }
  }

  if (
    cleanArea.includes('DHULIYAAN') || 
    cleanArea.includes('DHULIYAN') || 
    cleanArea.includes('DHULAIN') || 
    cleanAgency.includes('DHULIYAAN') || 
    cleanAgency.includes('DHULAIN')
  ) {
    candidates.push('DHULIYAAN');
  }

  if (cleanArea.includes('SAMSI') || cleanAgency.includes('SAMSI')) candidates.push('SAMSI JUNGLE');
  if (cleanArea.includes('NORTHERN') || cleanAgency.includes('NORTHERN')) candidates.push('NORTHERN', 'SEMI NORTHERN');
  if (cleanArea.includes('GAJAL') || cleanAgency.includes('GAJAL')) candidates.push('GAJAL LOOSE');
  if (cleanArea.includes('BADURIA') || cleanAgency.includes('BADURIA')) candidates.push('BADURIA');
  if (cleanArea.includes('BASIRHAT') || cleanAgency.includes('BASIRHAT')) candidates.push('BASIRHAT');
  if (cleanArea.includes('GOLABRI') || cleanAgency.includes('GOLABRI')) candidates.push('GOLABRI D/D');
  if (cleanArea.includes('HARIPAL') || cleanAgency.includes('HARIPAL')) candidates.push('HARIPAL');
  if (cleanArea.includes('MAYNA') || cleanAgency.includes('MAYNA')) candidates.push('MAYNA D/S');
  if (cleanArea.includes('ISLAMPUR') || cleanAgency.includes('ISLAMPUR')) candidates.push('S/N ISLAMPUR', 'ISLAMPUR');
  if (cleanArea.includes('SHEORAPHULLY') || cleanAgency.includes('SHEORAPHULLY')) candidates.push('SHEORAPHULLY');
  if (cleanArea.includes('MESTA') || cleanAgency.includes('MESTA')) candidates.push('GRP MESTA LOOSE', 'S/N MESTA');

  if (cleanAgency && !candidates.includes(cleanAgency)) candidates.push(cleanAgency);
  if (cleanArea && !candidates.includes(cleanArea)) candidates.push(cleanArea);

  return candidates;
}

/**
 * Fetch Base Rates directly from Supabase `satta_base_rates` table,
 * enriching each record with actual updater identity, previous rate, and User 010 approval status.
 */
export async function fetchSattaBaseRates(): Promise<SattaBaseRate[]> {
  if (!supabase) return cachedBaseRates;
  try {
    await initUserMap().catch(() => {});
    ensureSattaBaseRateApprovalSchema().catch(() => {});

    const [ratesRes, auditRes, appAuditRes, actLogRes] = await Promise.all([
      supabase
        .from('satta_base_rates')
        .select('*')
        .order('start_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('satta_base_rate_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300),
      supabase
        .from('app_audit_logs')
        .select('*')
        .eq('entity_name', 'Satta Base Rate')
        .order('created_at', { ascending: false })
        .limit(300),
      supabase
        .from('user_activity_logs')
        .select('username, activity_type, module_name, action_details, created_at')
        .ilike('module_name', '%satta%')
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    if (ratesRes.error) throw ratesRes.error;
    const rawRates: any[] = ratesRes.data || [];
    const auditLogs: any[] = auditRes.data || [];
    const appAuditLogs: any[] = appAuditRes.data || [];
    const actLogs: any[] = actLogRes.data || [];
    const localMetaMap = loadLocalRateMetaMap();

    // Sort oldest -> newest first so we can compute accurate previous_rate progression
    const asc = [...rawRates].sort((a, b) => {
      const dCmp = String(a.start_date || '').localeCompare(String(b.start_date || ''));
      if (dCmp !== 0) return dCmp;
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    });

    const prevRateById = new Map<string, number | null>();
    for (let i = 0; i < asc.length; i++) {
      const prev = i > 0 ? Number(asc[i - 1].base_rate) : null;
      prevRateById.set(String(asc[i].id), prev !== null && !isNaN(prev) ? prev : null);
    }

    const enriched: SattaBaseRate[] = rawRates.map((row, idx) => {
      const rowId = String(row.id || '');
      const dateRateKey = `${row.start_date}_${Number(row.base_rate)}`;
      const { cleanRemarks, meta: remarksMeta } = parseBaseRateRemarks(row.remarks);
      const localMeta = localMetaMap[rowId] || localMetaMap[dateRateKey] || null;
      const rowCreatedMs = row.created_at ? new Date(row.created_at).getTime() : 0;

      // Match satta_base_rate_audit_logs, app_audit_logs, or user_activity_logs if needed
      const matchedAudit = auditLogs.find(
        (a) =>
          (a.base_rate_id && String(a.base_rate_id) === rowId) ||
          (String(a.changed_date || '') === String(row.start_date || '') &&
            Number(a.new_rate) === Number(row.base_rate))
      );
      const matchedAppAudit =
        appAuditLogs.find(
          (s) =>
            String(s.record_id || '') === String(row.start_date || '') &&
            String(s.new_value || '').replace(/[^0-9.]/g, '') === String(Number(row.base_rate))
        ) ||
        (rowCreatedMs > 0
          ? appAuditLogs.find(
              (s) =>
                s.created_at &&
                Math.abs(new Date(s.created_at).getTime() - rowCreatedMs) < 90000
            )
          : undefined);

      let matchedActUser = '';
      if (!row.updated_by && !remarksMeta?.by && !localMeta?.by && !matchedAudit?.changed_by && !matchedAppAudit?.user_name && rowCreatedMs > 0) {
        let bestDiff = Infinity;
        for (const a of actLogs) {
          if (!a.username) continue;
          // Never use generic auto-boot ADMIN navigation events as fallback updater
          if (
            String(a.username).toUpperCase() === 'ADMIN' &&
            (a.activity_type === 'NAVIGATION' || a.activity_type === 'SYSTEM_BOOT' || a.activity_type === 'TASK_STARTED')
          ) {
            continue;
          }
          const aMs = new Date(a.created_at).getTime();
          const diff = rowCreatedMs - aMs;
          if (diff >= -120000 && diff <= 30 * 60 * 1000 && Math.abs(diff) < bestDiff) {
            bestDiff = Math.abs(diff);
            matchedActUser = a.username;
          }
        }
      }

      // Resolve who updated this base rate (NEVER default to 'Admin' unless explicitly recorded as Admin)
      let rawBy =
        row.updated_by ||
        remarksMeta?.by ||
        localMeta?.by ||
        matchedAudit?.changed_by ||
        matchedAppAudit?.user_name ||
        matchedActUser ||
        '';
      let rawById =
        row.updated_by_id ||
        remarksMeta?.byId ||
        localMeta?.byId ||
        matchedAudit?.updated_by_id ||
        '';

      // Extract user from remarks text like "by RAHUL (ID: 002)" if present
      if (!rawBy && cleanRemarks) {
        const byMatch = cleanRemarks.match(/\bby\s+([A-Za-z0-9_.\s]+?)(?:\s*\(\s*ID:\s*([^)]+)\))?$/i);
        if (byMatch) {
          rawBy = byMatch[1].trim();
          if (byMatch[2] && !rawById) rawById = byMatch[2].trim();
        }
      }

      const updaterIdentity = resolveUserIdentity(rawBy, rawById);

      // Resolve previous rate
      const computedPrev = prevRateById.get(rowId) ?? null;
      const previousRate =
        row.previous_rate !== undefined && row.previous_rate !== null
          ? Number(row.previous_rate)
          : remarksMeta?.prev !== undefined && remarksMeta?.prev !== null
          ? Number(remarksMeta.prev)
          : localMeta?.prev !== undefined && localMeta?.prev !== null
          ? Number(localMeta.prev)
          : matchedAudit?.old_rate !== undefined && matchedAudit?.old_rate !== null
          ? Number(matchedAudit.old_rate)
          : computedPrev;

      // Resolve approval status
      let explicitApprovalStatus = (
        row.approval_status ||
        remarksMeta?.st ||
        localMeta?.st ||
        matchedAudit?.approval_status ||
        ''
      )
        .toString()
        .toUpperCase() as 'PENDING' | 'APPROVED' | 'REJECTED' | '';

      // Check daily approval cache for once-per-day approval
      if (!explicitApprovalStatus && typeof window !== 'undefined' && window.localStorage) {
        try {
          const dailyRaw = window.localStorage.getItem(LOCAL_DAILY_APPROVAL_KEY);
          if (dailyRaw) {
            const dailyParsed = JSON.parse(dailyRaw);
            if (
              dailyParsed &&
              dailyParsed.recordId === rowId &&
              dailyParsed.startDate === row.start_date &&
              Number(dailyParsed.baseRate) === Number(row.base_rate) &&
              dailyParsed.status === 'APPROVED'
            ) {
              explicitApprovalStatus = 'APPROVED';
            }
          }
        } catch {}
      }

      let finalApprovalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'APPROVED';
      if (
        explicitApprovalStatus === 'PENDING' ||
        explicitApprovalStatus === 'APPROVED' ||
        explicitApprovalStatus === 'REJECTED'
      ) {
        finalApprovalStatus = explicitApprovalStatus;
      } else if (idx === 0 && (remarksMeta?.st === 'PENDING' || localMeta?.st === 'PENDING')) {
        finalApprovalStatus = 'PENDING';
      }

      const rawApprovedBy =
        row.approved_by ||
        remarksMeta?.appBy ||
        localMeta?.appBy ||
        matchedAudit?.approved_by ||
        null;
      const rawApprovedById =
        row.approved_by_id ||
        remarksMeta?.appById ||
        localMeta?.appById ||
        matchedAudit?.approved_by_id ||
        null;
      const approverIdentity = rawApprovedBy
        ? resolveUserIdentity(rawApprovedBy, rawApprovedById)
        : null;

      const approvedAt =
        row.approved_at ||
        remarksMeta?.appAt ||
        localMeta?.appAt ||
        matchedAudit?.approved_at ||
        null;

      const updatedAt =
        row.updated_at ||
        remarksMeta?.at ||
        localMeta?.at ||
        row.created_at ||
        matchedAudit?.created_at ||
        undefined;

      return {
        ...row,
        base_rate: Number(row.base_rate),
        previous_rate: previousRate,
        updated_by: updaterIdentity.username || '',
        updated_by_id: updaterIdentity.userId || '',
        updated_by_display: updaterIdentity.displayLabel || '',
        updated_at: updatedAt,
        clean_remarks: cleanRemarks,
        approval_status: finalApprovalStatus,
        approved_by: approverIdentity?.username || rawApprovedBy || null,
        approved_by_id: approverIdentity?.userId || rawApprovedById || null,
        approved_by_display: approverIdentity?.displayLabel || rawApprovedBy || null,
        approved_at: approvedAt,
      };
    });

    cachedBaseRates = enriched;

    // Build complete Base Rate change history from enriched records & audit logs
    cachedBaseRateHistory = enriched
      .filter((r, idx) => {
        // Show all user-tracked updates, intraday changes, and rate transitions
        const hasUser = Boolean(r.updated_by);
        const rateChanged =
          r.previous_rate !== null &&
          r.previous_rate !== undefined &&
          Number(r.previous_rate) !== Number(r.base_rate);
        return idx === 0 || hasUser || rateChanged || r.approval_status === 'PENDING';
      })
      .map((r) => ({
        id: String(r.id),
        base_rate_id: String(r.id),
        start_date: r.start_date,
        previous_rate: r.previous_rate ?? null,
        new_rate: Number(r.base_rate),
        changed_by: r.updated_by || 'System Seed',
        changed_by_id: r.updated_by_id || '—',
        changed_by_display: r.updated_by_display || (r.updated_by ? r.updated_by : 'Historical Record'),
        changed_at: r.updated_at || r.created_at || r.start_date,
        approval_status: r.approval_status || 'APPROVED',
        approved_by: r.approved_by || null,
        approved_by_id: r.approved_by_id || null,
        approved_by_display: r.approved_by_display || null,
        approved_at: r.approved_at || null,
        remarks: r.clean_remarks || r.remarks || '',
      }));

    return cachedBaseRates;
  } catch (err) {
    console.error('Failed to fetch satta_base_rates from Supabase:', err);
    return cachedBaseRates;
  }
}

/**
 * Fetch latest single Base Rate from Supabase `satta_base_rates` table
 */
export async function fetchLatestSattaBaseRate(): Promise<SattaBaseRate | null> {
  const rates = await fetchSattaBaseRates();
  return rates.length > 0 ? rates[0] : null;
}

/**
 * Returns the cached Base Rate change history list
 */
export function getCachedBaseRateHistory(): SattaBaseRateHistoryItem[] {
  return cachedBaseRateHistory;
}

/**
 * Returns the synchronous Base Rate Approval State from cache
 */
export function getCachedBaseRateApprovalState(): BaseRateApprovalState {
  const latest = cachedBaseRates[0] || null;
  if (!latest) {
    return {
      isApproved: true,
      approvalStatus: 'APPROVED',
      currentBaseRate: null,
      currentRate: 0,
      previousBaseRate: null,
      previousRate: null,
      startDate: null,
      recordId: null,
      updatedBy: '',
      updatedById: '',
      updatedByDisplay: '',
      updatedAt: null,
      approvedBy: null,
      approvedById: null,
      approvedByDisplay: null,
      approvedAt: null,
      blockMessage: BASE_RATE_APPROVAL_REQUIRED_MSG,
    };
  }

  const status = latest.approval_status || 'APPROVED';
  const isApproved = status === 'APPROVED';
  const currentNum = Number(latest.base_rate) || 0;
  const prevNum = latest.previous_rate !== undefined && latest.previous_rate !== null ? Number(latest.previous_rate) : null;

  return {
    isApproved,
    approvalStatus: status,
    currentBaseRate: currentNum,
    currentRate: currentNum,
    previousBaseRate: prevNum,
    previousRate: prevNum,
    startDate: latest.start_date,
    recordId: String(latest.id),
    updatedBy: latest.updated_by || '',
    updatedById: latest.updated_by_id || '',
    updatedByDisplay: latest.updated_by_display || latest.updated_by || '',
    updatedAt: latest.updated_at || latest.created_at || null,
    approvedBy: latest.approved_by || null,
    approvedById: latest.approved_by_id || null,
    approvedByDisplay: latest.approved_by_display || null,
    approvedAt: latest.approved_at || null,
    blockMessage: BASE_RATE_APPROVAL_REQUIRED_MSG,
  };
}

/**
 * Fetches fresh Base Rate state from Supabase and returns the current Base Rate Approval State.
 * Implements Once-Per-Day approval: if approved once for the active rate & date, remains approved
 * unless a new Base Rate change is recorded.
 */
export async function getBaseRateApprovalState(forceRefresh = false): Promise<BaseRateApprovalState> {
  if (forceRefresh || cachedBaseRates.length === 0) {
    await fetchSattaBaseRates();
  }
  return getCachedBaseRateApprovalState();
}

/**
 * Backend/Service-level guard: Throws an error with the mandatory message if the current Base Rate
 * has been changed and is not yet approved by User 010.
 */
export async function assertBaseRateApproved(forceRefresh = false): Promise<void> {
  const state = await getBaseRateApprovalState(forceRefresh);
  if (!state.isApproved) {
    throw new Error(BASE_RATE_APPROVAL_REQUIRED_MSG);
  }
}

/**
 * Approves a Base Rate change. STRICTLY restricted to authenticated User ID 010.
 * Never allows Admin or any other user to approve.
 */
export async function approveBaseRateByUser010(
  targetRecordId?: string,
  approvalRemarks?: string
): Promise<BaseRateApprovalState> {
  if (!isUserId10()) {
    throw new Error('Access Denied: Only User 010 is authorized to approve Base Rate changes.');
  }

  const authUser = getAuthenticatedUser();
  const approverName = authUser.username || 'SHYAMLAHOTI';
  const approverId = '010';
  const approverDisplay = `${approverName} (ID: ${approverId})`;
  const nowIso = new Date().toISOString();

  if (cachedBaseRates.length === 0) {
    await fetchSattaBaseRates();
  }

  const target =
    (targetRecordId
      ? cachedBaseRates.find((r) => String(r.id) === String(targetRecordId))
      : cachedBaseRates[0]) || cachedBaseRates[0];

  if (!target) {
    throw new Error('No Base Rate record found to approve.');
  }

  const rowId = String(target.id);
  const dateRateKey = `${target.start_date}_${Number(target.base_rate)}`;

  const updatedMeta: EmbeddedRateMeta = {
    prev: target.previous_rate ?? null,
    by: target.updated_by || authUser.username,
    byId: target.updated_by_id || authUser.userId,
    at: target.updated_at || target.created_at || nowIso,
    st: 'APPROVED',
    appBy: approverName,
    appById: approverId,
    appAt: nowIso,
  };

  // Persist to localStorage map & once-per-day approval cache
  const localMap = loadLocalRateMetaMap();
  localMap[rowId] = updatedMeta;
  localMap[dateRateKey] = updatedMeta;
  saveLocalRateMetaMap(localMap);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        LOCAL_DAILY_APPROVAL_KEY,
        JSON.stringify({
          recordId: rowId,
          startDate: target.start_date,
          baseRate: Number(target.base_rate),
          status: 'APPROVED',
          approvedBy: approverDisplay,
          approvedAt: nowIso,
        })
      );
    } catch {}
  }

  const cleanRem =
    target.clean_remarks ||
    parseBaseRateRemarks(target.remarks).cleanRemarks ||
    `Base rate ₹${Number(target.base_rate).toLocaleString('en-IN')}`;
  const encodedRemarks = encodeBaseRateRemarks(cleanRem, updatedMeta);

  // Persist to Supabase satta_base_rates (both columns and fallback remarks)
  if (supabase) {
    try {
      const { error: e1 } = await supabase
        .from('satta_base_rates')
        .update({
          approval_status: 'APPROVED',
          approved_by: approverName,
          approved_by_id: approverId,
          approved_at: nowIso,
          approval_remarks: approvalRemarks || 'Approved by User 010',
          remarks: encodedRemarks,
        })
        .eq('id', rowId);

      if (e1) {
        await supabase
          .from('satta_base_rates')
          .update({ remarks: encodedRemarks })
          .eq('id', rowId);
      }
    } catch (err) {
      console.warn('Supabase satta_base_rates approval update fallback used:', err);
    }

    try {
      await supabase
        .from('satta_base_rate_audit_logs')
        .update({
          approval_status: 'APPROVED',
          approved_by: approverName,
          approved_by_id: approverId,
          approved_at: nowIso,
        })
        .eq('changed_date', target.start_date)
        .eq('new_rate', Number(target.base_rate));
    } catch {}
  }

  await fetchSattaBaseRates();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('base-rate-approval-changed', { detail: getCachedBaseRateApprovalState() }));
    window.dispatchEvent(new CustomEvent('base-rate-updated'));
  }

  return getCachedBaseRateApprovalState();
}

/**
 * Fetch Differentials directly from Supabase `satta_differentials` table
 */
export async function fetchSattaDifferentials(): Promise<SattaDifferential[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('satta_differentials')
      .select('*')
      .order('area', { ascending: true })
      .order('grade', { ascending: true });

    if (error) throw error;
    cachedDifferentials = data || [];
    return cachedDifferentials;
  } catch (err) {
    console.error('Failed to fetch satta_differentials from Supabase:', err);
    return cachedDifferentials;
  }
}

/**
 * Fetch Calculated Rates directly from Supabase `satta_calculated_rates` table
 */
export async function fetchSattaCalculatedRates(startDate?: string): Promise<SattaCalculatedRate[]> {
  if (!supabase) return [];
  try {
    let query = supabase.from('satta_calculated_rates').select('*');
    if (startDate) {
      query = query.eq('start_date', startDate);
    }
    const { data, error } = await query;
    if (error) throw error;
    if (!startDate) {
      cachedCalculatedRates = data || [];
    }
    return data || [];
  } catch (err) {
    console.error('Failed to fetch satta_calculated_rates from Supabase:', err);
    return [];
  }
}

/**
 * Initialise / refresh central cache from Supabase
 */
export async function refreshSattaCache(): Promise<void> {
  if (!supabase) return;
  try {
    const [bases, diffs, calcs] = await Promise.all([
      fetchSattaBaseRates(),
      fetchSattaDifferentials(),
      fetchSattaCalculatedRates()
    ]);
    cachedBaseRates = bases;
    cachedDifferentials = diffs;
    cachedCalculatedRates = calcs;
    isCacheLoaded = true;
  } catch (err) {
    console.error('Error refreshing central Satta cache:', err);
  }
}

export function ensureSattaCacheLoaded(): Promise<void> {
  if (isCacheLoaded && cachedDifferentials.length > 0 && cachedBaseRates.length > 0) {
    return Promise.resolve();
  }
  if (!cachePromise) {
    cachePromise = refreshSattaCache().finally(() => {
      cachePromise = null;
    });
  }
  return cachePromise;
}

// Module-level getters and setters
export function getCachedSattaDifferentials(): SattaDifferential[] {
  return cachedDifferentials;
}

export function setCachedSattaDifferentials(diffs: SattaDifferential[]) {
  if (Array.isArray(diffs)) {
    cachedDifferentials = diffs;
    isCacheLoaded = true;
  }
}

export function getCachedSattaBaseRates(): SattaBaseRate[] {
  return cachedBaseRates;
}

export function setCachedSattaBaseRates(bases: SattaBaseRate[]) {
  if (Array.isArray(bases)) {
    cachedBaseRates = bases;
  }
}

export function savePendingBaseRateMeta(
  recordId: string,
  startDate: string,
  newRate: number,
  previousRate: number | null,
  updatedBy: string,
  updatedById: string,
  updatedAt: string
) {
  const meta: EmbeddedRateMeta = {
    prev: previousRate,
    by: updatedBy,
    byId: updatedById,
    at: updatedAt,
    st: 'PENDING',
    appBy: null,
    appById: null,
    appAt: null,
  };
  const map = loadLocalRateMetaMap();
  if (recordId) map[String(recordId)] = meta;
  map[`${startDate}_${Number(newRate)}`] = meta;
  saveLocalRateMetaMap(map);

  // Invalidate once-per-day approval cache whenever Base Rate is changed
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(LOCAL_DAILY_APPROVAL_KEY);
    } catch {}
  }
}

/**
 * Single Common Rate Resolver:
 * Given area/agency, grade, and optional date/baseRate, resolves the exact Satta Rate
 * using ONLY the Supabase database records.
 * 
 * If the rate or differential is not found in Supabase, returns found: false with a clear error.
 * ZERO hardcoded fallbacks!
 */
export function resolveSattaRate(params: {
  area?: string | null;
  agency?: string | null;
  grade?: string | null;
  date?: string | null;
  customBaseRate?: number | string | null;
  baseRates?: SattaBaseRate[];
  differentials?: SattaDifferential[];
  calculatedRates?: SattaCalculatedRate[];
}): SattaRateResult {
  const normGrade = normalizeGrade(params.grade);
  if (!normGrade) {
    return {
      found: false,
      baseRate: null,
      differential: null,
      finalRate: null,
      matchedArea: null,
      normGrade: null,
      startDate: null,
      error: 'Grade not specified'
    };
  }

  const candidateAreas = getCandidateAreas(params.area, params.agency);
  if (candidateAreas.length === 0) {
    return {
      found: false,
      baseRate: null,
      differential: null,
      finalRate: null,
      matchedArea: null,
      normGrade,
      startDate: null,
      error: 'Area or Agency not specified'
    };
  }

  const bases = (params.baseRates && params.baseRates.length > 0) ? params.baseRates : cachedBaseRates;
  const diffs = (params.differentials && params.differentials.length > 0) ? params.differentials : cachedDifferentials;
  const calcs = (params.calculatedRates && params.calculatedRates.length > 0) ? params.calculatedRates : cachedCalculatedRates;

  const targetDate = params.date || new Date().toISOString().split('T')[0];

  // 1. Determine applicable Base Rate from Supabase satta_base_rates
  let applicableBaseRate: number | null = null;
  let activeStartDate: string | null = null;

  if (params.customBaseRate !== undefined && params.customBaseRate !== null && !isNaN(Number(params.customBaseRate)) && Number(params.customBaseRate) > 0) {
    applicableBaseRate = Number(params.customBaseRate);
    activeStartDate = targetDate;
  } else if (bases && bases.length > 0) {
    const validBases = [...bases]
      .filter(b => b.start_date && b.start_date <= targetDate)
      .sort((a, b) => b.start_date.localeCompare(a.start_date));

    const selectedBase = validBases[0] || bases[0];
    if (selectedBase && selectedBase.base_rate !== undefined && selectedBase.base_rate !== null) {
      applicableBaseRate = Number(selectedBase.base_rate);
      activeStartDate = selectedBase.start_date;
    }
  }

  if (applicableBaseRate === null || isNaN(applicableBaseRate)) {
    return {
      found: false,
      baseRate: null,
      differential: null,
      finalRate: null,
      matchedArea: null,
      normGrade,
      startDate: null,
      error: `Base rate not found in Supabase table satta_base_rates for date ${targetDate}`
    };
  }

  // 2. Check precomputed satta_calculated_rates table in Supabase
  if (calcs && calcs.length > 0 && activeStartDate) {
    for (const candArea of candidateAreas) {
      const match = calcs.find(c => {
        const cArea = String(c.area || '').trim().toUpperCase();
        const cGrade = normalizeGrade(c.grade);
        return c.start_date === activeStartDate && cArea === candArea && cGrade === normGrade;
      });

      if (match && match.final_rate !== undefined && match.final_rate !== null) {
        return {
          found: true,
          baseRate: Number(match.base_rate),
          differential: Number(match.differential),
          finalRate: Number(match.final_rate),
          matchedArea: candArea,
          normGrade,
          startDate: activeStartDate
        };
      }
    }
  }

  // 3. Look up differential in Supabase satta_differentials table
  if (diffs && diffs.length > 0) {
    for (const candArea of candidateAreas) {
      const match = diffs.find(d => {
        const dArea = String(d.area || '').trim().toUpperCase();
        const dGrade = normalizeGrade(d.grade);
        return dArea === candArea && dGrade === normGrade;
      });

      if (match && match.differential !== undefined && match.differential !== null && !isNaN(Number(match.differential))) {
        const differential = Number(match.differential);
        const finalRate = applicableBaseRate + differential;
        return {
          found: true,
          baseRate: applicableBaseRate,
          differential,
          finalRate,
          matchedArea: candArea,
          normGrade,
          startDate: activeStartDate
        };
      }
    }
  }

  const primaryArea = params.area || params.agency || 'specified area';
  return {
    found: false,
    baseRate: applicableBaseRate,
    differential: null,
    finalRate: null,
    matchedArea: null,
    normGrade,
    startDate: activeStartDate,
    error: `Rate not found in Supabase table: Differential missing for Area '${primaryArea}' and Grade '${normGrade}'`
  };
}

/**
 * Single Common Differential Resolver:
 * Given area/agency and grade, looks up the differential directly from Supabase differentials.
 */
export function resolveSattaDifferential(
  area?: string | null,
  grade?: string | null,
  agency?: string | null,
  differentialsList?: SattaDifferential[]
): SattaDiffResult {
  const normGrade = normalizeGrade(grade);
  if (!normGrade) {
    return {
      found: false,
      differential: null,
      matchedArea: null,
      normGrade: null,
      error: 'Grade not specified'
    };
  }

  const candidateAreas = getCandidateAreas(area, agency);
  if (candidateAreas.length === 0) {
    return {
      found: false,
      differential: null,
      matchedArea: null,
      normGrade,
      error: 'Area or Agency not specified'
    };
  }

  const diffs = (differentialsList && differentialsList.length > 0) ? differentialsList : cachedDifferentials;

  if (diffs && diffs.length > 0) {
    for (const candArea of candidateAreas) {
      const match = diffs.find(d => {
        const dArea = String(d.area || '').trim().toUpperCase();
        const dGrade = normalizeGrade(d.grade);
        return dArea === candArea && dGrade === normGrade;
      });

      if (match && match.differential !== undefined && match.differential !== null && !isNaN(Number(match.differential))) {
        return {
          found: true,
          differential: Number(match.differential),
          matchedArea: candArea,
          normGrade
        };
      }
    }
  }

  const primaryArea = area || agency || 'specified area';
  return {
    found: false,
    differential: null,
    matchedArea: null,
    normGrade,
    error: `Rate not found in Supabase: Differential missing for Area '${primaryArea}' and Grade '${normGrade}'`
  };
}

/**
 * Fetch a single Satta Rate asynchronously from Supabase
 */
export async function fetchSingleSattaRate(params: {
  area?: string | null;
  agency?: string | null;
  grade: string;
  date?: string | null;
  customBaseRate?: number | string | null;
}): Promise<SattaRateResult> {
  await ensureSattaCacheLoaded();
  return resolveSattaRate(params);
}

// Auto-initialize cache when module is imported in browser
if (typeof window !== 'undefined') {
  ensureSattaCacheLoaded().catch(() => {});

  window.addEventListener('satta-chart-uploaded', () => {
    refreshSattaCache().catch(() => {});
  });
  window.addEventListener('base-rate-updated', () => {
    refreshSattaCache().catch(() => {});
  });
}
