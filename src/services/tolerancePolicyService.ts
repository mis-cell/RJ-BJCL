import { supabase } from '../lib/supabase';

export interface TolerancePolicyItem {
  id: string;
  unit_type: string;
  label: string;
  tolerance_pct: number;
  tolerance_mt: number;
  min_lorries: number;
  max_lorries: number;
  is_active: boolean;
  remarks: string;
  updated_at?: string;
  policy_name?: string;
  max_weight_limit_kg?: number;
  max_weight_limit_mt?: number;
  applicable_unit?: string;
  description?: string;
}

export type TolerancePolicy = TolerancePolicyItem;

export const DEFAULT_TOLERANCE_POLICIES: TolerancePolicyItem[] = [
  {
    id: 'pol_bales',
    unit_type: 'BALES',
    label: 'Bales Contract (Standard)',
    tolerance_pct: 5,
    tolerance_mt: 1.5,
    min_lorries: 1,
    max_lorries: 50,
    is_active: true,
    remarks: '±5% or ±1.500 MT weight tolerance for Bales contracts'
  },
  {
    id: 'pol_loose',
    unit_type: 'LOOSE',
    label: 'Loose Jute Contract',
    tolerance_pct: 5,
    tolerance_mt: 1.5,
    min_lorries: 1,
    max_lorries: 50,
    is_active: true,
    remarks: '±5% or ±1.500 MT weight tolerance for Loose contracts'
  },
  {
    id: 'pol_pbales',
    unit_type: 'P.BALES',
    label: 'Pucca Bales (P.Bales)',
    tolerance_pct: 5,
    tolerance_mt: 1.0,
    min_lorries: 1,
    max_lorries: 50,
    is_active: true,
    remarks: '±5% or ±1.000 MT weight tolerance for P.Bales'
  },
  {
    id: 'pol_hbales',
    unit_type: 'H.BALES',
    label: 'Half Bales (H.Bales)',
    tolerance_pct: 5,
    tolerance_mt: 1.0,
    min_lorries: 1,
    max_lorries: 50,
    is_active: true,
    remarks: '±5% or ±1.000 MT weight tolerance for H.Bales'
  },
  {
    id: 'pol_drums',
    unit_type: 'DRUMS',
    label: 'Drums / Other Units',
    tolerance_pct: 5,
    tolerance_mt: 1.0,
    min_lorries: 1,
    max_lorries: 50,
    is_active: true,
    remarks: '±5% weight tolerance for Drum units'
  }
];

const LOCAL_STORAGE_KEY = 'bally_tolerance_policies_v1';

let cachedPolicies: TolerancePolicyItem[] | null = null;

function parseNonNegativeNum(val: any, fallback: number): number {
  if (val === undefined || val === null || String(val).trim() === '') return fallback;
  const n = Number(val);
  return !isNaN(n) && n >= 0 ? n : fallback;
}

function normalizePolicyRow(d: any): TolerancePolicyItem {
  const label = String(d.label || d.policy_name || d.unit_type || 'Standard');
  const unit_type = String(d.unit_type || d.applicable_unit || 'BALES').toUpperCase();
  const tolerance_mt = parseNonNegativeNum(d.tolerance_mt ?? d.max_weight_limit_mt, 1.5);
  const remarks = String(d.remarks || d.description || '');

  return {
    id: String(d.id || `pol_${unit_type.toLowerCase()}`),
    unit_type,
    label,
    tolerance_pct: parseNonNegativeNum(d.tolerance_pct, 5),
    tolerance_mt,
    min_lorries: parseNonNegativeNum(d.min_lorries, 1),
    max_lorries: parseNonNegativeNum(d.max_lorries, 50),
    is_active: d.is_active !== false,
    remarks,
    updated_at: d.updated_at,
    policy_name: label,
    applicable_unit: unit_type,
    max_weight_limit_mt: tolerance_mt,
    max_weight_limit_kg: tolerance_mt * 1000,
    description: remarks
  };
}

export function getTolerancePoliciesSync(): TolerancePolicyItem[] {
  if (cachedPolicies && cachedPolicies.length > 0) {
    return cachedPolicies;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedPolicies = parsed.map(normalizePolicyRow);
          return cachedPolicies;
        }
      }
    } catch (_e) {}
  }
  return DEFAULT_TOLERANCE_POLICIES;
}

export async function fetchTolerancePolicies(): Promise<TolerancePolicyItem[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('tolerance_policy_master')
      .select('*')
      .order('unit_type', { ascending: true });

    if (!error && data && data.length > 0) {
      const normalized = data.map(normalizePolicyRow);
      cachedPolicies = normalized;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
        } catch (_e) {}
      }
      return normalized;
    }
  }
  return getTolerancePoliciesSync();
}

export async function saveTolerancePolicies(policies: TolerancePolicyItem[]): Promise<boolean> {
  if (!supabase) {
    throw new Error('Database client is not initialized; cannot save tolerance policies.');
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Cannot save tolerance policies while offline.');
  }

  const nowIso = new Date().toISOString();
  const rows = policies.map(p => ({
    ...normalizePolicyRow(p),
    updated_at: nowIso
  }));

  const { data: savedRows, error } = await supabase
    .from('tolerance_policy_master')
    .upsert(rows, { onConflict: 'id' })
    .select();

  if (error) {
    throw new Error(`Failed to save tolerance policies to database: ${error.message}`);
  }
  if (!savedRows || savedRows.length !== rows.length) {
    throw new Error(
      `Incomplete tolerance policy save: expected ${rows.length} rows, database returned ${savedRows?.length || 0}.`
    );
  }

  const confirmedPolicies = savedRows.map(normalizePolicyRow);
  cachedPolicies = confirmedPolicies;

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(confirmedPolicies));
    window.dispatchEvent(new CustomEvent('tolerance-policy-updated', { detail: confirmedPolicies }));
  }

  return true;
}

export const DEFAULT_TOLERANCE_POLICY = DEFAULT_TOLERANCE_POLICIES[0];

export function getCachedTolerancePolicy(): TolerancePolicy {
  const policies = getTolerancePoliciesSync();
  return policies.find(p => p.is_active) || policies[0] || DEFAULT_TOLERANCE_POLICY;
}

export async function getActiveTolerancePolicy(): Promise<TolerancePolicy> {
  const policies = await fetchTolerancePolicies();
  return policies.find(p => p.is_active) || policies[0] || DEFAULT_TOLERANCE_POLICY;
}

export const getAllTolerancePolicies = fetchTolerancePolicies;

export async function saveTolerancePolicy(policy: Partial<TolerancePolicy>): Promise<boolean> {
  const current = await fetchTolerancePolicies();
  const id = policy.id || `pol_${String(policy.unit_type || 'custom').toLowerCase()}`;
  const existingIdx = current.findIndex(p => p.id === id);
  const updatedItem: TolerancePolicy = normalizePolicyRow({
    ...(existingIdx >= 0 ? current[existingIdx] : DEFAULT_TOLERANCE_POLICY),
    ...policy,
    id,
  });

  const nextList = [...current];
  if (existingIdx >= 0) {
    nextList[existingIdx] = updatedItem;
  } else {
    nextList.push(updatedItem);
  }
  return saveTolerancePolicies(nextList);
}

export async function toggleTolerancePolicyActive(id: string, isActive: boolean): Promise<boolean> {
  const current = await fetchTolerancePolicies();
  const nextList = current.map(p => p.id === id ? { ...p, is_active: isActive } : p);
  return saveTolerancePolicies(nextList);
}

export async function deleteTolerancePolicy(id: string): Promise<boolean> {
  const current = await fetchTolerancePolicies();
  const nextList = current.filter(p => p.id !== id);
  if (supabase) {
    await supabase.from('tolerance_policy_master').delete().eq('id', id);
  }
  cachedPolicies = nextList;
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextList));
    window.dispatchEvent(new CustomEvent('tolerance-policy-updated', { detail: nextList }));
  }
  return true;
}

export function getPolicyForUnit(unitType: string): TolerancePolicyItem {
  const policies = getTolerancePoliciesSync();
  const clean = String(unitType || 'BALES').trim().toUpperCase();
  const exact = policies.find(p => p.unit_type.toUpperCase() === clean && p.is_active);
  if (exact) return exact;

  if (clean.includes('LOOSE') || clean === 'LOS') {
    return policies.find(p => p.unit_type === 'LOOSE') || DEFAULT_TOLERANCE_POLICIES[1];
  }
  if (clean.includes('P.BALE') || clean.includes('PBALE') || clean === 'PB') {
    return policies.find(p => p.unit_type === 'P.BALES') || DEFAULT_TOLERANCE_POLICIES[2];
  }
  if (clean.includes('H.BALE') || clean.includes('HBALE') || clean === 'HB') {
    return policies.find(p => p.unit_type === 'H.BALES') || DEFAULT_TOLERANCE_POLICIES[3];
  }
  if (clean.includes('DRUM')) {
    return policies.find(p => p.unit_type === 'DRUMS') || DEFAULT_TOLERANCE_POLICIES[4];
  }
  return policies.find(p => p.unit_type === 'BALES') || DEFAULT_TOLERANCE_POLICIES[0];
}

export function calculateWeightTolerance(
  contractWeightMt: number,
  receivedWeightMt: number,
  unitType: string = 'BALES'
) {
  const policy = getPolicyForUnit(unitType);
  const cWt = Number(contractWeightMt) || 0;
  const rWt = Number(receivedWeightMt) || 0;
  const diffMt = Number((rWt - cWt).toFixed(3));
  const absDiffMt = Math.abs(diffMt);
  const diffPct = cWt > 0 ? Number(((absDiffMt / cWt) * 100).toFixed(2)) : 0;

  const pctLimitMt = cWt > 0 ? (cWt * policy.tolerance_pct) / 100 : 0;
  const allowedMarginMt =
    policy.tolerance_pct === 0 && policy.tolerance_mt === 0
      ? 0
      : Math.max(pctLimitMt, policy.tolerance_mt);

  const isWithinTolerance = cWt > 0 && rWt > 0 && absDiffMt <= allowedMarginMt;
  const isCompleted = cWt > 0 && (rWt >= cWt - allowedMarginMt);
  const isShort = cWt > 0 && rWt > 0 && rWt < cWt - allowedMarginMt;
  const isExcess = cWt > 0 && rWt > cWt + allowedMarginMt;

  return {
    policy,
    contractWeightMt: cWt,
    receivedWeightMt: rWt,
    diffMt,
    diffPct,
    allowedMarginMt: Number(allowedMarginMt.toFixed(3)),
    isWithinTolerance,
    isCompleted,
    isShort,
    isExcess
  };
}
