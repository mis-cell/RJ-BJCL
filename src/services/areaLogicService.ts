import { supabase } from '../lib/supabase';

export interface AreaLogicRecord {
  AREA_CODE: string;
  AREA_NAME: string;
  AGENCY_CODE: string;
  AGENCY_NAME: string;
}

let inMemoryAreaLogic: AreaLogicRecord[] = [];
let isLoadedFromPostgres = false;

/**
 * Fetch Area-Agency mapping records exclusively from live PostgreSQL `agency_master` table
 * (no dumped `area_logic` table and no static JSON fallback).
 */
export async function fetchAreaLogic(): Promise<AreaLogicRecord[]> {
  if (!supabase) return [];

  try {
    const [{ data: agMasterData, error: agErr }, { data: areaMasterData }] = await Promise.all([
      supabase
        .from('agency_master')
        .select('id, area_code, area_name, agency_code, agency_name')
        .order('id', { ascending: true }),
      supabase
        .from('area_master')
        .select('area_code, area_name')
    ]);

    if (agErr || !Array.isArray(agMasterData)) {
      return inMemoryAreaLogic;
    }

    const areaNameByCode = new Map<string, string>();
    if (Array.isArray(areaMasterData)) {
      areaMasterData.forEach((a: any) => {
        const code = String(a.area_code || a.AREA_CODE || '').trim().toUpperCase();
        const name = String(a.area_name || a.AREA_NAME || '').trim();
        if (code && name) areaNameByCode.set(code, name);
      });
    }

    const masterMap = new Map<string, AreaLogicRecord>();
    agMasterData.forEach((r: any) => {
      const areaCode = String(r.area_code || r.AREA_CODE || '').trim();
      const rawAreaName = String(r.area_name || r.AREA_NAME || '').trim();
      const areaName = rawAreaName || (areaCode ? areaNameByCode.get(areaCode.toUpperCase()) || '' : '');
      const agencyCode = String(r.agency_code || r.AGENCY_CODE || '').trim();
      const agencyName = String(r.agency_name || r.AGENCY_NAME || '').trim();

      if ((areaName || areaCode) && agencyName) {
        const key = `${(areaName || areaCode).toUpperCase()}__${agencyName.toUpperCase()}__${agencyCode.toUpperCase()}`;
        if (!masterMap.has(key)) {
          masterMap.set(key, {
            AREA_CODE: areaCode,
            AREA_NAME: areaName,
            AGENCY_CODE: agencyCode,
            AGENCY_NAME: agencyName
          });
        }
      }
    });

    inMemoryAreaLogic = Array.from(masterMap.values());
    isLoadedFromPostgres = true;
  } catch (err) {
    console.warn('[areaLogicService] Failed to query PostgreSQL agency_master:', err);
  }

  return inMemoryAreaLogic;
}

export async function seedAreaLogicToSupabase(): Promise<boolean> {
  return false;
}

export interface MappedAgency {
  AREA_CODE: string;
  AREA_NAME: string;
  AGENCY_CODE: string;
  AGENCY_NAME: string;
  agency_code: string;
  agency_name: string;
  id: string;
  name: string;
}

/**
 * Main Dropdown Functionality:
 * Retrieves ALL and ONLY agencies mapped to the given AREA_CODE or AREA_NAME from live PostgreSQL `agency_master`.
 */
export function getAgenciesForArea(selectedAreaCodeOrName: string | null | undefined): MappedAgency[] {
  if (!selectedAreaCodeOrName) return [];

  const searchTarget = String(selectedAreaCodeOrName).trim().toUpperCase();
  if (!searchTarget) return [];

  const filtered = inMemoryAreaLogic.filter(r => {
    const codeMatch = String(r.AREA_CODE || '').trim().toUpperCase() === searchTarget;
    const nameMatch = String(r.AREA_NAME || '').trim().toUpperCase() === searchTarget;
    return codeMatch || nameMatch;
  });

  return filtered.map(r => {
    const agencyCode = String(r.AGENCY_CODE || '').trim();
    const agencyName = String(r.AGENCY_NAME || '').trim();
    const areaCode = String(r.AREA_CODE || '').trim();
    const areaName = String(r.AREA_NAME || '').trim();

    return {
      AREA_CODE: areaCode,
      AREA_NAME: areaName,
      AGENCY_CODE: agencyCode,
      AGENCY_NAME: agencyName,
      agency_code: agencyCode,
      agency_name: agencyName,
      id: `${areaCode}-${agencyCode}`,
      name: agencyName
    };
  });
}

/**
 * Returns deduplicated agencies for an area by unique AGENCY_NAME without codes.
 */
export function getUniqueAgenciesForArea(selectedAreaCodeOrName: string | null | undefined): MappedAgency[] {
  const all = getAgenciesForArea(selectedAreaCodeOrName);
  const uniqueMap = new Map<string, MappedAgency>();

  all.forEach(item => {
    let name = String(item.AGENCY_NAME || item.agency_name || item.name || '').trim();
    name = name.replace(/\s*\(Code\s*\d+\)$/i, '').replace(/\s*Code\s*\d+$/i, '').trim();
    if (name) {
      const norm = name.toUpperCase();
      if (!uniqueMap.has(norm)) {
        uniqueMap.set(norm, { ...item, AGENCY_NAME: name, agency_name: name, name: name });
      }
    }
  });

  return Array.from(uniqueMap.values()).sort((a, b) => a.AGENCY_NAME.localeCompare(b.AGENCY_NAME));
}

/**
 * Validates whether an AREA_CODE / AREA_NAME and AGENCY_CODE / AGENCY_NAME combination exists in `agency_master`.
 */
export function validateAreaAgencyCombination(
  areaCodeOrName: string | null | undefined,
  agencyCodeOrName: string | null | undefined
): { isValid: boolean; message?: string } {
  if (!areaCodeOrName || !agencyCodeOrName) {
    return { isValid: true };
  }

  const normArea = String(areaCodeOrName).trim().toUpperCase();
  const normAgency = String(agencyCodeOrName).trim().toUpperCase();

  const mappedAgencies = getAgenciesForArea(normArea);
  if (mappedAgencies.length === 0) {
    return {
      isValid: false,
      message: `No Agencies mapped for Area "${areaCodeOrName}" in agency_master table.`
    };
  }

  const match = mappedAgencies.some(a =>
    a.AGENCY_CODE.toUpperCase() === normAgency ||
    a.AGENCY_NAME.toUpperCase() === normAgency ||
    a.agency_code.toUpperCase() === normAgency ||
    a.agency_name.toUpperCase() === normAgency
  );

  if (!match) {
    return {
      isValid: false,
      message: `Agency "${agencyCodeOrName}" is NOT mapped to Area "${areaCodeOrName}". Please select an agency from the Area's mapped dropdown.`
    };
  }

  return { isValid: true };
}

// Initial async fetch on load from PostgreSQL agency_master
fetchAreaLogic().catch(() => {});

// Refresh in-memory mapping whenever agency_master or area_master is mutated
if (typeof window !== 'undefined') {
  window.addEventListener('app-data-updated', (ev: any) => {
    const tbl = String(ev?.detail?.table || '').toLowerCase();
    if (!tbl || tbl === 'agency_master' || tbl === 'area_master') {
      fetchAreaLogic().catch(() => {});
    }
  });
}

export function hasLoadedAreaLogic(): boolean {
  return isLoadedFromPostgres;
}

