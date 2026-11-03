import { useState, useEffect, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import { dbModule } from '../../services/dbModule';
import { supabase } from '../../lib/supabase';
import { sanitizeCsvData } from '../../lib/utils';
import { calculateWeightTolerance } from '../../lib/weightTolerance';
import { comparePoInspection, compareSaudaTempArrival, PoMatchResult } from '../../lib/poMatch';
import { useLiveAutoRefresh } from '../../hooks/useLiveAutoRefresh';
import { isInvalidAgency } from '../../services/systemReportEngine';
import { MASTER_MARKAS } from '../../data/masterData';

interface UsePurchaseOrderDataOptions {
  isTempPo: boolean;
  isArchiveView: boolean;
  selectedYear?: string;
}

export function usePurchaseOrderData({
  isTempPo,
  isArchiveView,
  selectedYear
}: UsePurchaseOrderDataOptions) {
  const MASTER_TABLE = isArchiveView ? 'p.o_archive' : (isTempPo ? 'sauda_check_point' : 'purchase_master');
  const DETAIL_TABLE = isArchiveView ? 'po_archive' : (isTempPo ? 'sauda_check_point_details' : 'purchase_detail_master');

  const [loading, setLoading] = useState(false);
  const [poList, setPoList] = useState<any[]>([]);
  const [brokerList, setBrokerList] = useState<any[]>([]);
  const [supplierList, setSupplierList] = useState<any[]>([]);
  const [areaList, setAreaList] = useState<any[]>([]);
  const [saudaList, setSaudaList] = useState<any[]>([]);
  const [gradeList, setGradeList] = useState<any[]>([]);
  const [markaList, setMarkaList] = useState<any[]>([]);
  const [agencyList, setAgencyList] = useState<any[]>([]);
  const [unitList, setUnitList] = useState<string[]>(['DRUMS', 'BALES', 'LOOSE', 'P.BALES', 'H.BALES']);

  // Satta Chart Cache States
  const [sattaBaseRates, setSattaBaseRates] = useState<any[]>([]);
  const [sattaCalculatedRates, setSattaCalculatedRates] = useState<any[]>([]);
  const [sattaDifferentials, setSattaDifferentials] = useState<any[]>([]);

  // Cross-table linked operational data
  const [allScpDetails, setAllScpDetails] = useState<any[]>([]);
  const [sattaCalcs, setSattaCalcs] = useState<any[]>([]);
  const [sattaBases, setSattaBases] = useState<any[]>([]);
  const [allTempArrivals, setAllTempArrivals] = useState<any[]>([]);
  const [allFinalArrivals, setAllFinalArrivals] = useState<any[]>([]);
  const [allInspections, setAllInspections] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [allSettlements, setAllSettlements] = useState<any[]>([]);
  const [settledDeductions, setSettledDeductions] = useState<Record<string, any>>({});

  // Match results & DB mismatch cache
  const [matchResults, setMatchResults] = useState<Record<string, PoMatchResult>>({});
  const [dbMaterialMismatches, setDbMaterialMismatches] = useState<any[]>([]);
  const [dbSattaMismatches, setDbSattaMismatches] = useState<any[]>([]);

  // Filter temp POs from Final view
  const [tempPoNoSet, setTempPoNoSet] = useState<Set<string>>(new Set());

  // Load Unit master
  useEffect(() => {
    async function loadUnits() {
      try {
        if (supabase) {
          const { data } = await supabase.from('unit_master').select('unit_name').order('unit_name');
          if (data && data.length > 0) {
            const fetched = data.map((u: any) => u.unit_name).filter(Boolean);
            setUnitList(prev => Array.from(new Set([...fetched, ...prev])));
          }
        }
      } catch (err) {
        console.warn('Failed to load unit_master in PurchaseOrder', err);
      }
    }
    loadUnits();
  }, []);

  // Sync tempPoNoSet
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isTempPo || !supabase) { setTempPoNoSet(new Set()); return; }
      try {
        const { data } = await supabase.from('sauda_check_point').select('po_no');
        if (!cancelled) setTempPoNoSet(new Set((data || []).map((r: any) => String(r.po_no || '').trim().toUpperCase())));
      } catch (_e) { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, [isTempPo]);

  // Pre-index resolved mismatch tokens for O(1) lookup
  const resolvedDbMismatchTokens = useMemo(() => {
    const tokenSet = new Set<string>();
    const addToken = (val: any) => {
      const s = String(val || '').trim().toUpperCase();
      if (!s || s === 'N/A' || s === 'UNDEFINED') return;
      tokenSet.add(s);
      const suffix = s.split('/').pop();
      if (suffix) tokenSet.add(suffix);
      const stripped = s.replace(/^(MIS-|SAT-)/i, '');
      if (stripped) tokenSet.add(stripped);
    };

    for (let i = 0; i < dbMaterialMismatches.length; i++) {
      const m = dbMaterialMismatches[i];
      if (!m) continue;
      const st = String(m.status || m.resolution_status || '').toLowerCase();
      const isResolvedStatus = st === 'resolved' || st === 'approved' || st === 'cleared' || Boolean(m.approved_by) || String(m.remarks || '').toUpperCase().includes('APPROVED');
      if (isResolvedStatus) {
        addToken(m.po_no);
        addToken(m.mismatch_id || m.id);
      }
    }

    for (let i = 0; i < dbSattaMismatches.length; i++) {
      const s = dbSattaMismatches[i];
      if (!s) continue;
      const st = String(s.status || s.resolution_status || '').toLowerCase();
      const isResolvedStatus = st === 'resolved' || st === 'approved' || st === 'cleared' || Boolean(s.approved_by) || String(s.remarks || '').toUpperCase().includes('APPROVED');
      if (isResolvedStatus) {
        addToken(s.po_no);
        addToken(s.sauda_no);
        addToken(s.mismatch_id || s.id);
      }
    }

    return tokenSet;
  }, [dbMaterialMismatches, dbSattaMismatches]);

  const checkPoMismatchResolvedInternal = useCallback((item: any, resolvedTokens: Set<string>): boolean => {
    if (!item) return false;
    if (item._isMismatchResolved === true) return true;

    // 1. Direct record flags on item
    if (
      item.pass_status === 'pass' ||
      item.is_pass === true ||
      item.mismatch_cleared === true ||
      item.mismatch_cleared === 'true' ||
      item.satta_dispute_approved === true ||
      item.satta_dispute_approved === 'true' ||
      item.status === 'resolved' ||
      item.status === 'cleared' ||
      item.status === 'final' ||
      item.status === 'approved' ||
      item.status === 'moved_to_final' ||
      item.is_resolved === true ||
      item.is_mismatch_resolved === true
    ) {
      return true;
    }

    const poNo = String(item.po_no || '').trim().toUpperCase();
    const contractPoNo = String(item.contract_po_no || '').trim().toUpperCase();
    const saudaNo = String(item.sauda_no || item.po_contract || item.contract_no || '').trim().toUpperCase();
    const ptfNo = String(item.ptf_no || '').trim().toUpperCase();

    const poSuffix = poNo.split('/').pop() || '';
    const saudaSuffix = saudaNo.split('/').pop() || '';
    const tokens = [poNo, contractPoNo, saudaNo, ptfNo, poSuffix, saudaSuffix].filter(t => t && t !== 'N/A' && t !== 'UNDEFINED');

    for (let i = 0; i < tokens.length; i++) {
      const tu = tokens[i].toUpperCase();
      if (resolvedTokens.has(tu)) return true;
      if (
        localStorage.getItem(`material_resolved_${tu}`) ||
        localStorage.getItem(`satta_resolved_${tu}`) ||
        localStorage.getItem(`material_resolved_MIS-${tu}`) ||
        localStorage.getItem(`mismatch_resolved_${tu}`) ||
        localStorage.getItem(`mismatch_cleared_${tu}`) ||
        localStorage.getItem(`pass_status_${tu}`) ||
        localStorage.getItem(`sauda_resolved_${tu}`)
      ) {
        return true;
      }
    }

    return false;
  }, []);

  function isPoMismatchResolved(poOrItem: any): boolean {
    if (!poOrItem) return false;
    if (typeof poOrItem === 'object') {
      if (typeof poOrItem._isMismatchResolved === 'boolean') {
        if (poOrItem._isMismatchResolved) return true;
      }
      return checkPoMismatchResolvedInternal(poOrItem, resolvedDbMismatchTokens);
    }
    const target = String(poOrItem).trim().toUpperCase();
    const item = poList.find((p: any) => String(p.po_no || p.contract_po_no || '').trim().toUpperCase() === target) || { po_no: target };
    return checkPoMismatchResolvedInternal(item, resolvedDbMismatchTokens);
  }

  // Fetch all registered records and masters
  const fetchPosAndMasters = useCallback(async () => {
    setLoading(true);
    const safeFetch = (table: string, orderBy?: string, ascending = false) => {
      return dbModule.fetchAll(table, orderBy, ascending).catch(err => {
        console.warn(`Failed to fetch ${table}:`, err);
        return [];
      });
    };

    const safeSupabaseSelect = async (table: string, orderCol?: string, ascending = false) => {
      if (!supabase) return { data: [] };
      try {
        let q = supabase.from(table).select('*');
        if (orderCol) {
          q = q.order(orderCol, { ascending });
        }
        const res = await q;
        if (res.error) {
          console.warn(`Supabase error on ${table}:`, res.error);
          return { data: [] };
        }
        return res || { data: [] };
      } catch (err) {
        console.warn(`Supabase failed on ${table}:`, err);
        return { data: [] };
      }
    };

    try {
      let initialPos = await safeFetch(MASTER_TABLE, 'created_at', false);
      if (isArchiveView && (!initialPos || initialPos.length === 0)) {
        const altPos = await safeFetch('po_archive', 'created_at', false);
        if (altPos && altPos.length > 0) {
          initialPos = altPos;
        } else {
          const rawActive = await safeFetch('purchase_master', 'created_at', false);
          initialPos = (rawActive || []).filter((r: any) => r.status === 'settled' || !!r.archived_at);
        }
      }

      const [
        brokers,
        suppliers,
        areas,
        saudas,
        grades,
        markas,
        agencies,
        arrivals,
        finalArrivals,
        inspections,
        matInspections,
        sattaBasesRes,
        sattaCalculatedRes,
        sattaDiffsRes,
        dbMatMismatches,
        dbSatMismatches,
        scpDeductions,
        payments,
        mrSettlementsRes,
        mrSettlementAltRes,
        scpDetailsFetched
      ] = await Promise.all([
        safeFetch('broker_master'),
        safeFetch('supply_master'),
        safeFetch('area_master'),
        safeFetch('sauda_master', 'created_at', false),
        safeFetch('grade_master'),
        safeFetch('marka_master'),
        safeFetch('agency_master'),
        safeFetch('temporary_material_received', 'created_at', false),
        safeFetch('final_arrival', 'created_at', false),
        safeFetch('mill_inspection_master', 'created_at', false),
        safeFetch('material_inspection', 'created_at', false),
        safeFetch('satta_base_rates', 'start_date', false),
        safeFetch('satta_calculated_rates'),
        safeFetch('satta_differentials'),
        safeFetch('material_mismatch'),
        safeFetch('satta_mismatch'),
        safeFetch('sauda_check_point_deductions'),
        safeFetch('payment_master', 'created_at', false),
        safeFetch('mr_settlement_master', 'created_at', false),
        safeFetch('m_r_settlement', 'created_at', false),
        safeFetch('sauda_check_point_details')
      ]);

      const combinedMatMismatches = dbMatMismatches || [];
      const combinedSatMismatches = dbSatMismatches || [];
      const combinedSettlements = [...(mrSettlementsRes || []), ...(mrSettlementAltRes || [])];
      const scpDetailsList = scpDetailsFetched || [];

      setDbMaterialMismatches(combinedMatMismatches);
      setDbSattaMismatches(combinedSatMismatches);
      const sBasesList = Array.isArray(sattaBasesRes) ? sattaBasesRes : ((sattaBasesRes as any)?.data || []);
      const sCalculatedList = Array.isArray(sattaCalculatedRes) ? sattaCalculatedRes : ((sattaCalculatedRes as any)?.data || []);
      const sDiffsList = Array.isArray(sattaDiffsRes) ? sattaDiffsRes : ((sattaDiffsRes as any)?.data || []);
      setSattaBases(sBasesList);
      setSattaCalcs(sCalculatedList);
      setAllPayments(payments || []);
      setAllSettlements(combinedSettlements);
      setAllScpDetails(scpDetailsList);

      const dedMap: Record<string, any> = {};
      const cleanKeyFormat = (v: any) => String(v || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      (scpDeductions || []).forEach((d: any) => {
        if (d?.po_no) {
          dedMap[String(d.po_no).trim().toUpperCase()] = d;
          dedMap[cleanKeyFormat(d.po_no)] = d;
        }
        if (d?.sauda_no) {
          dedMap[String(d.sauda_no).trim().toUpperCase()] = d;
          dedMap[cleanKeyFormat(d.sauda_no)] = d;
        }
      });

      const normalizeDateYMD = (d: any) => {
        if (!d) return '';
        const str = String(d).trim();
        if (str.length >= 10 && str[4] === '-' && str[7] === '-') return str.slice(0, 10);
        const parsed = new Date(d);
        if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
        return str.slice(0, 10);
      };

      // Pre-sort Satta Base Rates once for O(1)/fast lookup
      const sortedBaseRates = (Array.isArray(sBasesList) ? sBasesList : [])
        .map((b: any) => ({
          ymd: normalizeDateYMD(b.start_date || b.effective_date || b.satta_date || b.start || b.date || ''),
          rate: Number(b.base_rate || b.rate || b.b_rate || 0)
        }))
        .filter(b => b.ymd && b.rate > 0)
        .sort((a, b) => b.ymd.localeCompare(a.ymd));
      const fallbackBaseRate = sortedBaseRates[0]?.rate || 13500;

      const getTd5BaseRateForDate = (dateStr: string): number => {
        const targetYmd = normalizeDateYMD(dateStr);
        if (targetYmd) {
          for (let i = 0; i < sortedBaseRates.length; i++) {
            if (sortedBaseRates[i].ymd <= targetYmd) {
              return sortedBaseRates[i].rate;
            }
          }
        }
        return fallbackBaseRate;
      };

      const nowIso = new Date().toISOString();
      const allMergedInspections = [...(matInspections || []), ...(inspections || [])];
      const pos = initialPos || [];
      setAllTempArrivals(arrivals || []);
      setAllFinalArrivals(finalArrivals || []);
      setAllInspections(allMergedInspections);

      const cleanVal = (v: any) => String(v || '').trim().replace(/[^a-z0-9]/gi, '').toLowerCase();

      const NON_PO_TOKENS = new Set([
        '', '20262027', '20252026', '202627', '202526', 'normal', 'special',
        'pending', 'temp', 'final', 'finalpo', 'direct', 'no', 'yes', 'mr', 'bales', 'loose'
      ]);

      // Memoized canonical PO serial extractor
      const canonicalSerialCache = new Map<string, string>();
      const extractCanonicalPoSerial = (raw: any): string => {
        const str = String(raw || '').trim().toUpperCase();
        if (!str) return '';
        const cached = canonicalSerialCache.get(str);
        if (cached !== undefined) return cached;

        const isPtf = str.includes('PTF');
        const withoutPrefix = str
          .replace(/^BJCL\//i, '')
          .replace(/^BJC\//i, '')
          .replace(/^BJC/i, '')
          .replace(/^PO[-/]/i, '')
          .replace(/^PTF[-/]/i, '')
          .replace(/\(PTF\)/gi, '');
        const withoutYear = withoutPrefix
          .replace(/20\d{2}-20\d{2}/g, '')
          .replace(/20\d{2}\/20\d{2}/g, '')
          .replace(/20\d{2}20\d{2}/g, '')
          .replace(/\/\d{2}-\d{2}$/g, '')
          .replace(/^\d{2}-\d{2}\//g, '')
          .replace(/[^0-9A-Z]/g, '');
        if (!withoutYear) {
          canonicalSerialCache.set(str, '');
          return '';
        }
        const strippedZeros = withoutYear.replace(/^0+/, '') || '0';
        const res = isPtf ? `PTF_${strippedZeros}` : strippedZeros;
        canonicalSerialCache.set(str, res);
        return res;
      };

      const getIdentifierIndexKeys = (candidates: any[]): string[] => {
        const keys: string[] = [];
        for (let i = 0; i < candidates.length; i++) {
          const raw = String(candidates[i] || '').trim().toUpperCase();
          if (!raw || raw === 'N/A' || raw === 'UNDEFINED') continue;
          const clean = cleanVal(raw);
          if (NON_PO_TOKENS.has(clean)) continue;
          keys.push(`R:${raw}`);
          if (clean) keys.push(`C:${clean}`);
          const serial = extractCanonicalPoSerial(raw);
          if (serial && !NON_PO_TOKENS.has(serial.toLowerCase())) {
            keys.push(`S:${serial}`);
          }
        }
        return keys;
      };

      const defaultRecCandidates = (rec: any) => [
        rec.po_no,
        rec.mill_po_no,
        rec.contract_po_no,
        rec.sauda_no,
        rec.po_contract,
        rec.contract_no,
        rec.ptf_no
      ];

      const buildRecordIndex = (
        records: any[],
        getCandidates: (rec: any) => any[] = defaultRecCandidates
      ): Map<string, any[]> => {
        const index = new Map<string, any[]>();
        const list = records || [];
        for (let i = 0; i < list.length; i++) {
          const rec = list[i];
          if (!rec) continue;
          const keys = getIdentifierIndexKeys(getCandidates(rec));
          for (let k = 0; k < keys.length; k++) {
            const key = keys[k];
            let bucket = index.get(key);
            if (!bucket) {
              bucket = [rec];
              index.set(key, bucket);
            } else if (bucket[bucket.length - 1] !== rec && !bucket.includes(rec)) {
              bucket.push(rec);
            }
          }
        }
        return index;
      };

      const queryRecordIndex = (index: Map<string, any[]>, poKeys: string[]): any[] => {
        if (poKeys.length === 0 || index.size === 0) return [];
        let result: any[] | null = null;
        let seen: Set<any> | null = null;
        for (let k = 0; k < poKeys.length; k++) {
          const bucket = index.get(poKeys[k]);
          if (!bucket) continue;
          if (!result) result = [];
          for (let j = 0; j < bucket.length; j++) {
            const item = bucket[j];
            if (!seen) {
              if (result.length === 0) {
                result.push(item);
              } else if (result.length < 4) {
                if (!result.includes(item)) result.push(item);
              } else {
                seen = new Set(result);
                if (!seen.has(item)) {
                  seen.add(item);
                  result.push(item);
                }
              }
            } else if (!seen.has(item)) {
              seen.add(item);
              result.push(item);
            }
          }
        }
        return result || [];
      };

      // Build O(1) lookup indices once across all collections
      const finalArrivalsIndex = buildRecordIndex(finalArrivals || []);
      const tempArrivalsIndex = buildRecordIndex(arrivals || [], (ar: any) => [
        ar.po_no,
        ar.mill_po_no,
        ar.contract_po_no,
        ar.sauda_no,
        ar.po_contract,
        ar.contract_no,
        ar.ptf_no,
        ar.temporary_arrival_no
      ]);
      const mergedInspectionsIndex = buildRecordIndex(allMergedInspections);
      const matInspectionsIndex = buildRecordIndex(matInspections || []);
      const scpDetailsIndex = buildRecordIndex(scpDetailsList);
      const paymentsIndex = buildRecordIndex(payments || []);
      const settlementsIndex = buildRecordIndex(combinedSettlements);

      // Build resolved & unresolved mismatch lookup sets
      const localResolvedTokens = new Set<string>();
      const addResolvedToken = (val: any) => {
        const s = String(val || '').trim().toUpperCase();
        if (!s || s === 'N/A' || s === 'UNDEFINED') return;
        localResolvedTokens.add(s);
        const suffix = s.split('/').pop();
        if (suffix) localResolvedTokens.add(suffix);
        const stripped = s.replace(/^(MIS-|SAT-)/i, '');
        if (stripped) localResolvedTokens.add(stripped);
      };

      const unresolvedMatMismatches: any[] = [];
      for (let i = 0; i < combinedMatMismatches.length; i++) {
        const m = combinedMatMismatches[i];
        if (!m) continue;
        const st = String(m.status || m.resolution_status || '').toLowerCase();
        const isResolved = st === 'resolved' || st === 'approved' || st === 'cleared' || Boolean(m.approved_by) || String(m.remarks || '').toUpperCase().includes('APPROVED');
        if (isResolved) {
          addResolvedToken(m.po_no);
          addResolvedToken(m.mismatch_id || m.id);
        } else {
          unresolvedMatMismatches.push(m);
        }
      }

      const unresolvedSatMismatches: any[] = [];
      for (let i = 0; i < combinedSatMismatches.length; i++) {
        const s = combinedSatMismatches[i];
        if (!s) continue;
        const st = String(s.status || s.resolution_status || '').toLowerCase();
        const isResolved = st === 'resolved' || st === 'approved' || st === 'cleared' || Boolean(s.approved_by) || String(s.remarks || '').toUpperCase().includes('APPROVED');
        if (isResolved) {
          addResolvedToken(s.po_no);
          addResolvedToken(s.sauda_no);
          addResolvedToken(s.mismatch_id || s.id);
        } else {
          unresolvedSatMismatches.push(s);
        }
      }

      const unresolvedMatIndex = buildRecordIndex(unresolvedMatMismatches);
      const unresolvedSatIndex = buildRecordIndex(unresolvedSatMismatches);

      const tempWeightOf = (ar: any) => {
        if (ar.challan_material_weight && Number(ar.challan_material_weight) > 0) return Number(ar.challan_material_weight);
        if (ar.weight_reduced && Number(ar.weight_reduced) > 0) return Number(ar.weight_reduced);
        if (ar.weight_qtl && Number(ar.weight_qtl) > 0) return Number(ar.weight_qtl) / 10;
        if (ar.weight && Number(ar.weight) > 0) return Number(ar.weight) / 10;
        if (ar.electronic_net_weight && Number(ar.electronic_net_weight) > 0) {
          return Number(ar.electronic_net_weight) > 50 ? Number(ar.electronic_net_weight) / 10 : Number(ar.electronic_net_weight);
        }
        return 0;
      };
      const finalWeightOf = (ar: any) => {
        if (ar.weight_qtl && Number(ar.weight_qtl) > 0) return Number(ar.weight_qtl) / 10;
        if (ar.weight && Number(ar.weight) > 0) return Number(ar.weight) / 10;
        if (ar.electronic_net_weight && Number(ar.electronic_net_weight) > 0) {
          return Number(ar.electronic_net_weight) > 50 ? Number(ar.electronic_net_weight) / 10 : Number(ar.electronic_net_weight);
        }
        if (ar.challan_material_weight && Number(ar.challan_material_weight) > 0) return Number(ar.challan_material_weight);
        return 0;
      };

      const nextMatchResults: Record<string, PoMatchResult> = {};

      const mappedPoList = pos.map((p: any) => {
        const poKeys = getIdentifierIndexKeys([
          p.po_no,
          p.contract_po_no,
          p.ptf_no,
          p.sauda_no,
          p.po_contract,
          p.contract_no
        ]);

        const contractWeight = parseFloat(p.total_contract_mt) || 0;
        const matchingFinal = queryRecordIndex(finalArrivalsIndex, poKeys);
        const matchingTempArrivals = queryRecordIndex(tempArrivalsIndex, poKeys);
        const matchingTemp = matchingTempArrivals.filter((ar: any) =>
          !matchingFinal.some(f =>
            (f.temporary_arrival_no && (ar.temporary_arrival_no || ar.amad_no) && String(f.temporary_arrival_no).trim().toUpperCase() === String(ar.temporary_arrival_no || ar.amad_no).trim().toUpperCase()) ||
            (f.arrival_no && (ar.temporary_arrival_no || ar.amad_no) && String(f.arrival_no).trim().toUpperCase() === String(ar.temporary_arrival_no || ar.amad_no).trim().toUpperCase()) ||
            (f.mr_no && (ar.temporary_arrival_no || ar.amad_no) && String(f.mr_no).trim().toUpperCase() === String(ar.temporary_arrival_no || ar.amad_no).trim().toUpperCase()) ||
            (f.lorry_number && ar.lorry_number && String(f.lorry_number).trim().toUpperCase() === String(ar.lorry_number).trim().toUpperCase())
          )
        );

        const totalFinalMt = matchingFinal.reduce((sum: number, ar: any) => sum + finalWeightOf(ar), 0);
        const totalTempMt = matchingTemp.reduce((sum: number, ar: any) => sum + tempWeightOf(ar), 0);
        const totalReceivedMt = totalFinalMt + totalTempMt;

        const unit = p.purchase_unit_name || p.unit_type || p.unit || 'BALES';
        const tol = calculateWeightTolerance(contractWeight, totalReceivedMt, unit);
        const isExplicitCompleted = p.status === 'completed' || p.status === 'settled';
        const isWeightCompleted = tol.isCompleted;

        const poNoStr = String(p.po_no || p.contract_po_no || '').trim();
        const saudaNoStr = String(p.sauda_no || p.sauda_ref || p.contract_po_no || p.po_no || '').trim();
        const allMatchedArrivalsSorted = [...matchingFinal, ...matchingTempArrivals].sort((a: any, b: any) => {
          const dA = normalizeDateYMD(a?.date || a?.arrival_date || a?.created_at || '');
          const dB = normalizeDateYMD(b?.date || b?.arrival_date || b?.created_at || '');
          return dB.localeCompare(dA);
        });
        const matchedArrivalForWt = allMatchedArrivalsSorted[0] || matchingTempArrivals[0] || matchingTemp[0] || matchingFinal[0];
        const saudaDateStr = p.s_date || p.po_date || p.date || p.contract_date || (p.created_at ? p.created_at.slice(0, 10) : '');
        const arrivalDateStr = matchedArrivalForWt?.date || matchedArrivalForWt?.arrival_date || p.last_arrival_date || p.arrival_date || saudaDateStr;
        const normalizedArrivalDate = normalizeDateYMD(arrivalDateStr) || null;

        if (poNoStr && contractWeight > 0) {
          const targetPoClean = cleanKeyFormat(poNoStr);
          const targetSaudaClean = cleanKeyFormat(saudaNoStr);

          const saudaTd5Rate = parseFloat(p.b_rate || 0) > 0 ? parseFloat(p.b_rate) : getTd5BaseRateForDate(saudaDateStr);
          const arrivalTd5Rate = getTd5BaseRateForDate(arrivalDateStr);
          const shortRateDiff = Math.abs((arrivalTd5Rate || 0) - (saudaTd5Rate || 0));
          // For Excess: If Last MR Date Rate >= Sauda Date Rate, do NOT deduct (Applicable for Sauda)
          const excessRateDiff = (saudaTd5Rate || 0) > (arrivalTd5Rate || 0) ? ((saudaTd5Rate || 0) - (arrivalTd5Rate || 0)) : 0;

          let variationType = 'pending_arrival';
          let deductionQtyMt = 0;
          let deductionQtyQtl = 0;
          let penaltyAmount = 0;
          let effectiveRateDiff = shortRateDiff;
          let wtStatusRemarks = 'Pending Arrival';

          if (totalReceivedMt > 0) {
            if (tol.isWithinTolerance) {
              variationType = 'within_tolerance';
              wtStatusRemarks = `✓ TOLERABLE (±${tol.toleranceMt.toFixed(2)} MT) | Diff: ${tol.diffMt >= 0 ? `+${tol.diffMt.toFixed(3)}` : tol.diffMt.toFixed(3)} MT`;
            } else if (tol.isOverDelivery) {
              variationType = 'excess';
              effectiveRateDiff = excessRateDiff;
              const excessMt = Math.max(0, tol.excessOverToleranceMt || 0);
              const excessQtl = Math.max(0, tol.excessOverToleranceQtl || 0);
              const rawPenalty = excessRateDiff * excessQtl;
              penaltyAmount = isNaN(rawPenalty) || rawPenalty < 0 ? 0 : Math.round(rawPenalty * 100) / 100;
              deductionQtyMt = Number(excessMt.toFixed(3));
              deductionQtyQtl = Number(excessQtl.toFixed(2));
              wtStatusRemarks = penaltyAmount > 0
                ? `+${excessMt.toFixed(3)} MT Excess | Penalty: ₹${penaltyAmount}`
                : `+${excessMt.toFixed(3)} MT Excess | Applicable for Sauda (₹0 Deduction)`;
            } else if (tol.isUnderDelivery) {
              variationType = 'short';
              effectiveRateDiff = shortRateDiff;
              const shortMt = Math.max(0, tol.shortUnderToleranceMt || 0);
              const shortQtl = Math.max(0, tol.shortUnderToleranceQtl || 0);
              const rawPenalty = shortRateDiff * shortQtl;
              penaltyAmount = isNaN(rawPenalty) || rawPenalty < 0 ? 0 : Math.round(rawPenalty * 100) / 100;
              deductionQtyMt = Number(shortMt.toFixed(3));
              deductionQtyQtl = Number(shortQtl.toFixed(2));
              wtStatusRemarks = `-${shortMt.toFixed(3)} MT Short | Beyond Tol. | Penalty: ₹${penaltyAmount}`;
            } else {
              variationType = 'within_tolerance';
              wtStatusRemarks = 'Exact (0.00 MT)';
            }
          }

          const linkedMrs = Array.from(new Set([
            ...matchingFinal.map((ar: any) => String(ar.final_arrival_no || ar.mr_no || ar.arrival_no || '').trim()),
            ...matchingTemp.map((ar: any) => String(ar.temporary_arrival_no || ar.amad_no || ar.mr_no || '').trim())
          ].filter(Boolean)));
          const lastMrNo = linkedMrs[0] || String(p.last_arrival_mr_no || p.mr_no || 'MR-001').trim();
          const arrivalNumbersStr = linkedMrs.length > 0 ? linkedMrs.join(', ') : lastMrNo;

          const dedPayload: Record<string, any> = {
            po_no: poNoStr,
            sauda_no: saudaNoStr || poNoStr,
            supplier: String(p.supplier || p.supplier_name || p.supp_name || '').trim(),
            broker: String(p.broker || p.broker_name || '').trim(),
            contract_weight_mt: Number(contractWeight.toFixed(3)),
            tolerance_pct: 3.0,
            tolerance_mt: Number(tol.toleranceMt.toFixed(3)),
            tolerance_type: '3% Sauda Total Contract Execution Exemption',
            min_acceptable_mt: Number(tol.minAcceptableMt.toFixed(3)),
            max_acceptable_mt: Number(tol.maxAcceptableMt.toFixed(3)),
            total_received_mt: Number(totalReceivedMt.toFixed(3)),
            variation_type: variationType,
            variation_mt: Number((contractWeight - totalReceivedMt).toFixed(3)),
            selected_grade: p.selected_grade || p.grade || 'TD6',
            sauda_rate: Number(saudaTd5Rate),
            satta_rate: Number(arrivalTd5Rate),
            last_arrival_date: normalizedArrivalDate,
            last_mr_no: lastMrNo,
            applicable_rate: Number(effectiveRateDiff),
            rate_basis: 'rate_difference',
            rate_difference: Number(effectiveRateDiff),
            deduction_qty_mt: deductionQtyMt,
            deduction_qty_qtl: deductionQtyQtl,
            deduction_amount: penaltyAmount,
            status: totalReceivedMt > 0 ? 'approved' : 'pending',
            remarks: wtStatusRemarks,
            arrival_numbers: arrivalNumbersStr,
            approved_by: 'System Auto-Calculated',
            approval_level: 'ADMIN',
            updated_at: nowIso
          };

          const existingDed = dedMap[poNoStr.toUpperCase()] ||
                              dedMap[targetPoClean] ||
                              (saudaNoStr ? (dedMap[saudaNoStr.toUpperCase()] || dedMap[targetSaudaClean]) : null);

          dedMap[poNoStr.toUpperCase()] = existingDed ? { ...existingDed, ...dedPayload } : dedPayload;
          dedMap[targetPoClean] = dedMap[poNoStr.toUpperCase()];
        }

        // 1. Check Temporary Arrival Dashboard
        const hasTempArrival = matchingTempArrivals.length > 0 ||
                               matchingFinal.length > 0 ||
                               totalReceivedMt > 0;

        // 2. Check Final Arrival Dashboard
        const hasFinalArrival = matchingFinal.length > 0 || totalReceivedMt > 0;

        // 3. Check Mill Inspection
        const matchingInspList = queryRecordIndex(mergedInspectionsIndex, poKeys);
        const matchingInsp = matchingInspList[0];
        const hasInspection = Boolean(matchingInsp);

        // 4. Check Mismatch
        const isCleared = checkPoMismatchResolvedInternal(p, localResolvedTokens);

        const hasDbMismatch = !isCleared && (
          queryRecordIndex(unresolvedMatIndex, poKeys).length > 0 ||
          queryRecordIndex(unresolvedSatIndex, poKeys).length > 0
        );

        const poDetails = queryRecordIndex(scpDetailsIndex, poKeys);
        const mismatchFields: string[] = [];
        if (!isCleared) {
          const activeArrival = matchingTemp[0] || matchingTempArrivals[0];
          if (activeArrival || matchingInsp) {
            const tempMatchRes = compareSaudaTempArrival(p, poDetails, activeArrival || matchingInsp, matchingInsp ? [matchingInsp] : []);
            if (tempMatchRes.hasInspection && tempMatchRes.status === 'mismatch') {
              tempMatchRes.mismatches.forEach(m => mismatchFields.push(m.mismatchLabel || m.field));
            }
          }
        }

        // Compute header-level inspection match result in the same pass
        const allMatReceipts = queryRecordIndex(matInspectionsIndex, poKeys);
        const headerMatchRes = comparePoInspection(p, poDetails, allMatReceipts[0] || null, allMatReceipts);
        if (isCleared) {
          headerMatchRes.status = 'match';
          headerMatchRes.mismatches = [];
        }
        if (p.po_no) nextMatchResults[p.po_no] = headerMatchRes;
        if (p.contract_po_no) nextMatchResults[p.contract_po_no] = headerMatchRes;
        if (p.ptf_no) nextMatchResults[p.ptf_no] = headerMatchRes;

        const isMismatch = !isCleared && (hasDbMismatch || mismatchFields.length > 0 || (p.pass_status === 'mismatch' && !isCleared));

        const receivedLorries = Math.max(matchingTempArrivals.length, matchingFinal.length + matchingTemp.length);
        const contractLorries = Math.max(1, parseInt(p.total_lorries || p.total_no_of_lorries || p.no_of_lorries || p.lorries || 1, 10) || 1);

        const cleanPoKey = String(p.po_no || '').trim().toUpperCase();
        const cleanSaudaKey = String(p.sauda_no || p.contract_po_no || '').trim().toUpperCase();
        let parsedOpenRemarks = p.open_remarks;
        if (typeof parsedOpenRemarks === 'string') {
          try { parsedOpenRemarks = JSON.parse(parsedOpenRemarks); } catch (_e) { parsedOpenRemarks = null; }
        }
        if (!parsedOpenRemarks) {
          try {
            const localRemarks = localStorage.getItem(`sauda_open_remarks_${cleanPoKey}`) || (cleanSaudaKey ? localStorage.getItem(`sauda_open_remarks_${cleanSaudaKey}`) : null);
            if (localRemarks) parsedOpenRemarks = JSON.parse(localRemarks);
          } catch (_e) {}
        }

        let cachedDeliveryDates: any = null;
        try {
          const rawDates = localStorage.getItem(`sauda_delivery_dates_${cleanPoKey}`) || (cleanSaudaKey ? localStorage.getItem(`sauda_delivery_dates_${cleanSaudaKey}`) : null);
          if (rawDates) cachedDeliveryDates = JSON.parse(rawDates);
        } catch (_e) {}

        const statusLower = String(p.status || '').trim().toLowerCase();
        const isCancelledLocal = statusLower === 'cancelled' ||
                                 p.is_cancelled === true ||
                                 localStorage.getItem(`sauda_cancelled_${cleanPoKey}`) === 'true' ||
                                 (cleanSaudaKey ? localStorage.getItem(`sauda_cancelled_${cleanSaudaKey}`) === 'true' : false);

        const isForceClosedLocal = localStorage.getItem(`sauda_closed_${cleanPoKey}`) === 'true' ||
                                   (cleanSaudaKey ? localStorage.getItem(`sauda_closed_${cleanSaudaKey}`) === 'true' : false);
        const isReopenedLocal = localStorage.getItem(`sauda_reopened_${cleanPoKey}`) === 'true' ||
                                (cleanSaudaKey ? localStorage.getItem(`sauda_reopened_${cleanSaudaKey}`) === 'true' : false);

        const isExplicitReopened = !isCancelledLocal && !isForceClosedLocal && statusLower !== 'closed' && (
                                   p.is_reopened === true ||
                                   p.reopened === true ||
                                   statusLower === 'open' ||
                                   Boolean(parsedOpenRemarks && typeof parsedOpenRemarks === 'object' && Object.keys(parsedOpenRemarks).length > 0) ||
                                   isReopenedLocal
        );

        const isExplicitClosed = !isExplicitReopened && (
                                 p.is_closed === true ||
                                 p.sauda_closed === true ||
                                 statusLower === 'closed' ||
                                 isForceClosedLocal
        );

        const isLorryClosed = contractLorries > 0 && receivedLorries >= contractLorries;
        const isClosed = !isExplicitReopened && (isExplicitClosed || isLorryClosed);

        // Payment status in payment_master via O(1) index
        const matchingPayments = queryRecordIndex(paymentsIndex, poKeys);
        const hasPaymentDone = matchingPayments.some((pay: any) => {
          const advDone = String(pay.advance_payment_done || pay.advance_done || '').trim().toLowerCase();
          const paid = Number(pay.paid_amount || 0);
          const pStatus = String(pay.payment_status || pay.status || '').toLowerCase().trim();

          if (advDone === 'yes' || advDone === 'y' || advDone === 'true') return true;
          if (paid > 0) return true;
          if (pStatus === 'paid' || pStatus === 'completed' || pStatus === 'settled' || pStatus === 'partially settled') return true;
          return false;
        }) || Boolean(p.has_payment_done || (p.advance_payment_done && String(p.advance_payment_done).toLowerCase() === 'yes'));

        // Settlement status in mr_settlement_master / m_r_settlement via O(1) index
        const matchingSettlements = queryRecordIndex(settlementsIndex, poKeys);
        const hasSettlementDone = matchingSettlements.length > 0 || p.status === 'settled';

        let workflowStage: 'temp_arrival_pending' | 'final_arrival_pending' | 'mismatch' | 'inspection_pending' | 'adv_payment_not_done' | 'settlement_pending' | 'final_po' = 'temp_arrival_pending';

        if (!hasTempArrival && !hasFinalArrival) {
          workflowStage = 'temp_arrival_pending';
        } else if (hasTempArrival && !hasFinalArrival) {
          workflowStage = 'final_arrival_pending';
        } else if (isMismatch) {
          workflowStage = 'mismatch';
        } else if (!hasInspection) {
          workflowStage = 'inspection_pending';
        } else if (!hasPaymentDone) {
          workflowStage = 'adv_payment_not_done';
        } else if (!hasSettlementDone) {
          workflowStage = 'settlement_pending';
        } else {
          workflowStage = 'final_po';
        }

        const isPass = isCleared || (workflowStage === 'final_po');
        const isWeightFulfilled = !isExplicitReopened && (isExplicitCompleted || isWeightCompleted || isClosed);
        const isFullyComplete = isTempPo
          ? (isWeightFulfilled && isPass)
          : isWeightFulfilled;
        const computedPending = !isFullyComplete;

        const effectiveDeliveryFrom = cachedDeliveryDates?.delivery_from || p.delivery_from || p.shipment_date || null;
        const effectiveDeliveryTo = cachedDeliveryDates?.delivery_to || p.delivery_to || p.shipment_date || effectiveDeliveryFrom || null;
        const effectiveGraceDays = cachedDeliveryDates?.grace_days !== undefined ? cachedDeliveryDates.grace_days : (p.grace_days ?? p.shipment_days ?? 0);

        return {
          ...p,
          status: isCancelledLocal ? 'cancelled' : (isExplicitReopened ? 'open' : p.status),
          date: p.date || p.po_date || (p.created_at ? p.created_at.slice(0, 10) : ''),
          last_arrival_date: normalizedArrivalDate || p.last_arrival_date || null,
          delivery_from: effectiveDeliveryFrom,
          delivery_to: effectiveDeliveryTo,
          shipment_date: effectiveDeliveryTo || p.shipment_date,
          grace_days: effectiveGraceDays,
          broker: (p.broker || '').toUpperCase(),
          supplier: (p.supplier || '').toUpperCase(),
          challan_supplier: (p.challan_supplier || p.supplier || '').toUpperCase(),
          pending: computedPending,
          received_weight_mt: totalReceivedMt,
          weight_tolerance: tol,
          contract_lorries: contractLorries,
          received_lorries: receivedLorries,
          is_closed: isClosed,
          is_reopened: isExplicitReopened,
          open_remarks: parsedOpenRemarks,
          has_settlement_done: hasSettlementDone,
          workflow_stage: workflowStage,
          stage: workflowStage,
          has_temp_arrival: hasTempArrival,
          has_final_arrival: hasFinalArrival,
          has_inspection: hasInspection,
          pass_status: isCleared ? 'pass' : (workflowStage === 'final_po' ? 'pass' : (isMismatch ? 'mismatch' : workflowStage)),
          mismatch_fields: isCleared ? [] : mismatchFields,
          has_payment_done: hasPaymentDone,
          is_fully_completed: isFullyComplete,
          _isMismatchResolved: isCleared
        };
      });

      setPoList(mappedPoList);
      setMatchResults(nextMatchResults);
      setSettledDeductions(dedMap);

      setBrokerList((brokers || []).map((b: any) => ({
        ...b,
        brok_name: (b.brok_name || '').toUpperCase()
      })));
      setSupplierList((suppliers || []).map((s: any) => ({
        ...s,
        supp_name: (s.supp_name || '').toUpperCase()
      })));
      setAreaList(areas || []);
      setSaudaList((saudas || []).map((s: any) => ({
        ...s,
        broker: (s.broker || '').toUpperCase(),
        supplier: (s.supplier || '').toUpperCase(),
        challan_supplier: (s.challan_supplier || '').toUpperCase()
      })));
      setGradeList(grades || []);
      const markaMap = new Map<string, any>();
      MASTER_MARKAS.forEach((m, idx) => {
        const u = m.toUpperCase();
        markaMap.set(u, {
          marka_name: m,
          marka_code: u === 'DAKALIA' ? 'M201' : (u === 'NR' ? 'M202' : `M${idx + 1}`),
          area_name: u === 'DAKALIA' ? 'BIHAR' : (u === 'NR' ? 'DAISEE' : '')
        });
      });
      (markas || []).forEach((m: any) => {
        const name = typeof m === 'string' ? m.trim() : String(m.marka_name || m.name || m.code || '').trim();
        if (!name) return;
        const u = name.toUpperCase();
        const code = typeof m === 'object' ? (m.marka_code || m.code || u) : u;
        const area = typeof m === 'object' ? (m.area_name || m.area || '') : '';
        markaMap.set(u, {
          marka_name: name,
          marka_code: code,
          area_name: area || (u === 'DAKALIA' ? 'BIHAR' : (u === 'NR' ? 'DAISEE' : ''))
        });
      });
      setMarkaList(Array.from(markaMap.values()));
      const validAgencies = (agencies || []).filter((a: any) => {
        const name = String(a.agency_name || a.name || '').trim();
        return name && !isInvalidAgency(name);
      });
      setAgencyList(validAgencies);

      setSattaBaseRates(sBasesList);
      setSattaCalculatedRates(sCalculatedList);
      setSattaDifferentials(sDiffsList);
    } catch (err) {
      console.error('Failed to load masters data:', err);
    } finally {
      setLoading(false);
    }
  }, [MASTER_TABLE, isArchiveView, isTempPo, checkPoMismatchResolvedInternal]);

  // Live Auto Refresh hook
  useLiveAutoRefresh(fetchPosAndMasters, [isArchiveView, isTempPo], {
    tables: [
      'purchase_master',
      'purchase_detail_master',
      'sauda_check_point',
      'sauda_check_point_details',
      'p.o_archive',
      'po_archive',
      'temporary_material_received',
      'final_arrival',
      'material_inspection',
      'mill_inspection_master',
      'material_mismatch',
      'satta_mismatch',
      'payment_master'
    ]
  });

  // Custom event listener for explicit mismatch resolution
  useEffect(() => {
    const handleMismatchResolved = () => {
      fetchPosAndMasters();
    };

    window.addEventListener('mismatch_resolved', handleMismatchResolved);
    return () => {
      window.removeEventListener('mismatch_resolved', handleMismatchResolved);
    };
  }, [fetchPosAndMasters]);

  // CSV Export Handler
  const handleCsvDownload = async (listToExport: any[]) => {
    try {
      if (!supabase) {
        alert("Database connection client is not loaded.");
        return;
      }
      setLoading(true);

      let detailData: any[] = [];
      try {
        const { data } = await supabase.from(DETAIL_TABLE).select('*');
        detailData = data || [];
      } catch (e) {
        console.warn("Failed to fetch detail table for CSV:", e);
      }

      const detailsByPo: Record<string, any[]> = {};
      detailData.forEach((d: any) => {
        const key = String(d.po_no || '').trim().toUpperCase();
        if (!key) return;
        if (!detailsByPo[key]) detailsByPo[key] = [];
        detailsByPo[key].push(d);
      });

      if (!listToExport || listToExport.length === 0) {
        alert("No Purchase Orders found matching current view to export.");
        return;
      }

      const dataToExport = listToExport.map((row: any) => {
        const poKey = String(row.po_no || '').trim().toUpperCase();
        const poDetails = detailsByPo[poKey] || [];

        const gradeItemDetails = poDetails.map((d: any) => {
          const gName = gradeList.find((g: any) => g.grade_code === d.grade_code)?.grade_name || d.grade_name || d.grade_code || '';
          const qty = d.quantity ? `${d.quantity} Units` : '';
          const wt = d.weight_mt ? `${Number(d.weight_mt).toFixed(3)} MT` : '';
          const rate = d.rate_qntl ? `@ Rs.${d.rate_qntl}` : '';
          return [gName, qty, wt, rate].filter(Boolean).join(' ');
        }).join(' | ');

        const rawPoDate = row.po_date || row.date;
        const formattedPoDate = rawPoDate ? new Date(rawPoDate).toLocaleDateString('en-GB') : '';
        const rawSaudaDate = row.s_date || row.contract_date;
        const formattedSaudaDate = rawSaudaDate ? new Date(rawSaudaDate).toLocaleDateString('en-GB') : '';

        const contractMt = parseFloat(row.total_contract_mt) || parseFloat(row.quantity) || 0;
        const rcvdMt = parseFloat(row.received_weight_mt) || 0;
        const unit = row.purchase_unit_name || row.po_type || 'BALES';
        const tol = calculateWeightTolerance(contractMt, rcvdMt, unit);
        const pStatus = row.status ? String(row.status).toUpperCase() : (tol.isCompleted || row.pending === false ? 'COMPLETED' : 'PENDING');

        return {
          "PO / PTF No": row.po_no || row.ptf_no || '',
          "PO Date": formattedPoDate,
          "Sauda Contract No": row.sauda_no || row.contract_po_no || '',
          "Sauda Date": formattedSaudaDate,
          "Broker": row.broker || '',
          "Merchant / Supplier": row.supplier || row.merchant || '',
          "Challan Supplier": row.challan_supplier || '',
          "Area / Station": row.area || row.dispatch_station || '',
          "B. Rate (Rs/MT)": row.b_rate || 0,
          "Unit / Lorry": row.purchase_unit_name || row.po_type || 'BALES',
          "Total Lorries": row.total_lorries || 0,
          "Total Units / Bales": row.total_units || 0,
          "Total Contract Wt (MT)": contractMt,
          "Received Weight (MT)": rcvdMt,
          "Weight Tolerance": tol.formattedTolerance,
          "Acceptable Range (MT)": tol.formattedRange,
          "Status": pStatus,
          "Session / Year": row.session || row.financial_year || '',
          "Crop Year": row.crop_year || '',
          "Transport Paid By": row.trans_paid_by || row.transport_type || '',
          "Delivery From": row.delivery_from || '',
          "Delivery To": row.delivery_to || '',
          "Grace Days": row.grace_days || 0,
          "Moisture Limit %": row.moisture || 0,
          "Moisture Penalty %": row.moisture_penalty || 0,
          "Dust Limit %": row.dust || 0,
          "Dust Penalty %": row.dust_penalty || 0,
          "NCV Limit %": row.ncv || 0,
          "NCV Penalty %": row.ncv_penalty || 0,
          "Grade & Item Breakdown": gradeItemDetails || 'N/A',
          "Remarks": row.remarks || '',
          "Financial Year": row.financial_year || '',
          "Created At": row.created_at || ''
        };
      });

      const sanitizedData = sanitizeCsvData(dataToExport);
      const csv = Papa.unparse(sanitizedData);
      const csvContent = "\uFEFF" + csv;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const exportType = isTempPo ? 'Temporary_PO' : 'Final_PO';
      link.setAttribute('download', `${exportType}_Full_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("PO CSV Export failed:", err);
      alert("Failed to export: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    MASTER_TABLE,
    DETAIL_TABLE,
    loading,
    setLoading,
    poList,
    setPoList,
    brokerList,
    supplierList,
    areaList,
    saudaList,
    gradeList,
    markaList,
    agencyList,
    unitList,
    sattaBaseRates,
    sattaCalculatedRates,
    sattaDifferentials,
    allScpDetails,
    sattaCalcs,
    sattaBases,
    allTempArrivals,
    allFinalArrivals,
    allInspections,
    allPayments,
    allSettlements,
    settledDeductions,
    matchResults,
    dbMaterialMismatches,
    dbSattaMismatches,
    tempPoNoSet,
    fetchPosAndMasters,
    handleCsvDownload,
    isPoMismatchResolved
  };
}
