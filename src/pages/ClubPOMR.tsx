import React, { useState, useEffect } from 'react';
import { useLiveAutoRefresh } from '../hooks/useLiveAutoRefresh';
import { 
  Link, 
  Search, 
  CheckCircle2, 
  FileText, 
  RefreshCw, 
  Printer, 
  Trash2, 
  Download,
  X,
  Filter,
  Layers,
  ArrowRight,
  History,
  Truck,
  Package,
  Calendar
} from 'lucide-react';
import { cn } from '../lib/utils';
import { PaginationControls } from '../components/PaginationControls';
import { supabase } from '../lib/supabase';
import { dbModule, notifyDataChanged } from '../services/dbModule';
import LegacyLayout from '../components/LegacyLayout';
import PrintModal from '../components/PrintModal';
import { getCurrentUserContext } from '../lib/permissions';

import {
  ClubbingRecord,
  parseJsonArray,
  normalize,
  cleanAlnum,
  extractCanonicalPoSerial,
  getPoMatchKeys
} from "../types/clubPomr.types";
import { ClubbingHistoryModal } from "../components/club-pomr/ClubbingHistoryModal";
import { ManualClubbingBindModal } from "../components/club-pomr/ManualClubbingBindModal";

export type { ClubbingRecord };

export const getArrivalWeightMt = (a: any): number => {
  if (!a) return 0;
  const val = parseFloat(a.final_weight_mt || a.received_weight_mt || a.electronic_net_weight || a.supplier_net_weight || a.challan_material_weight || a.net_weight || a.weight || 0);
  if (val > 0) return val;
  if (a.weight_qtl && Number(a.weight_qtl) > 0) return Number(a.weight_qtl) / 10;
  return 0;
};

export const ensureClubbedPomrSchema = async () => {
  if (!supabase) return;
  try {
    // Basic table sanity check if needed
  } catch (_e) {}
};

export const mapDbRowToClubRecord = (
  row: any,
  allFinalArrivals: any[],
  allPos: any[],
  allSaudaCheck: any[]
): ClubbingRecord => {
  return {
    id: String(row.id || row.club_id || `CLUB-${row.id}`),
    clubbedAt: row.clubbed_at || row.created_at || new Date().toISOString(),
    mrNo: row.mr_no || row.final_arrival_no || '',
    finalArrivalNo: row.final_arrival_no || row.mr_no || '',
    tempArrivalNo: row.temp_arrival_no || row.temporary_arrival_no || row.amad_no || '',
    arrivalDate: row.arrival_date || row.date || '',
    poNo: row.po_no || row.primary_po_no || row.sauda_no || '',
    poDate: row.po_date || '',
    supplier: row.supplier || row.challan_supplier || '',
    broker: row.broker || '',
    area: row.area || '',
    lorryNumber: row.lorry_number || row.lorry_no || '',
    challanNo: row.challan_no || '',
    packets: Number(row.packets || row.total_packets || 0),
    poNos: parseJsonArray(row.po_nos || row.clubbed_po_nos, row.po_no),
    amadNos: parseJsonArray(row.amad_nos || row.clubbed_mr_nos, row.temp_arrival_no),
    totalPoLorries: Number(row.total_po_lorries || row.contract_lorries || 1),
    receivedLorriesCount: Number(row.received_lorries_count || row.received_lorries || 1),
    totalPoWeight: Number(row.total_po_weight || 0),
    totalReceivedWeight: Number(row.total_received_weight || row.total_weight_mt || 0),
    variancePct: Number(row.variance_pct || 0),
    recordedBy: row.recorded_by || row.clubbed_by || 'ADMIN',
    remarks: row.remarks || ''
  };
};

export default function ClubPOMR({ onClose }: { onClose?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Unbound Lists
  const [unboundFinalArrivals, setUnboundFinalArrivals] = useState<any[]>([]);
  const [unboundPOs, setUnboundPOs] = useState<any[]>([]);

  // Selection for Detail views and Binding Modal
  const [selectedArrivalForBind, setSelectedArrivalForBind] = useState<any | null>(null);
  const [chosenPoForBind, setChosenPoForBind] = useState<any | null>(null);
  const [selectedDetailMr, setSelectedDetailMr] = useState<any | null>(null);
  const [showAllPOsInModal, setShowAllPOsInModal] = useState(false);
  const [modalPoSearch, setModalPoSearch] = useState('');

  // Binding Form remarks & Deleting state
  const [clubbingRemarks, setClubbingRemarks] = useState('');
  const [deletingClubId, setDeletingClubId] = useState<string | null>(null);

  const handleDeleteClubbingRecord = async (record: ClubbingRecord) => {
    if (!record || !record.id) return;
    setDeletingClubId(record.id);
    try {
      await dbModule.delete('clubbed_pomr', 'club_id', record.id).catch(() => {});
      await dbModule.delete('clubbed_pomr', 'id', record.id).catch(() => {});
      if (supabase) {
        await supabase.from('clubbed_pomr').update({ status: 'DELETED' }).or(`id.eq.${record.id},club_id.eq.${record.id}`);
      }
      setClubbingHistory((prev) => prev.filter((item) => item.id !== record.id));
      notifyDataChanged('clubbed_pomr');
    } catch (err) {
      console.error('Failed to delete clubbing record:', err);
    } finally {
      setDeletingClubId(null);
    }
  };

  // Manual Clubbed History Modal & Data (strictly from clubbed_pomr table)
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [clubbingHistory, setClubbingHistory] = useState<ClubbingRecord[]>([]);

  // Pagination for History Modal
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(50);

  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [printingClub, setPrintingClub] = useState<ClubbingRecord | null>(null);

  useEffect(() => {
    ensureClubbedPomrSchema();
  }, []);

  useEffect(() => {
    setHistoryPage(1);
  }, [selectedSupplier, historySearch]);

  // Load all initial data & master entries
  const loadInitialData = async () => {
    setLoading(true);
    try {
      await ensureClubbedPomrSchema();

      const [
        allPos,
        allSaudaCheck,
        allSaudaMaster,
        allFinalArrivals,
        allTempArrivals,
        allClubbed
      ] = await Promise.all([
        dbModule.fetchAll('purchase_master', 'created_at', false).catch(() => []),
        dbModule.fetchAll('sauda_check_point', 'created_at', false).catch(() => []),
        dbModule.fetchAll('sauda_master', 'created_at', false).catch(() => []),
        dbModule.fetchAll('final_arrival', 'created_at', false).catch(() => []),
        dbModule.fetchAll('temporary_material_received', 'created_at', false).catch(() => []),
        dbModule.fetchAll('clubbed_pomr', 'created_at', false).catch(() => [])
      ]);

      // Build Supplier filter options
      const supplierSet = new Set<string>();
      (allPos || []).forEach((p: any) => { if (p.supplier) supplierSet.add(p.supplier); });
      (allSaudaCheck || []).forEach((s: any) => { if (s.supplier) supplierSet.add(s.supplier); });
      (allFinalArrivals || []).forEach((f: any) => {
        if (f.supplier) supplierSet.add(f.supplier);
        if (f.challan_supplier) supplierSet.add(f.challan_supplier);
      });

      const suppliersList = Array.from(supplierSet).filter(Boolean).sort();
      setSuppliers(suppliersList);

      // History ONLY includes records manually clubbed and stored in clubbed_pomr
      const manualHistory = (allClubbed || [])
        .filter((row: any) => String(row.status || 'ACTIVE').toUpperCase() !== 'DELETED')
        .map((row: any) => mapDbRowToClubRecord(row, allFinalArrivals, allPos, allSaudaCheck));

      setClubbingHistory(manualHistory);

      // Compute unbound Final Arrivals & Open Multi-Lorry P.Os
      computeOpenArrivalsAndPOs(
        selectedSupplier || 'ALL',
        allPos || [],
        allSaudaCheck || [],
        allSaudaMaster || [],
        allFinalArrivals || [],
        allTempArrivals || []
      );
    } catch (err) {
      console.error('Error loading Club P.O & Arrival data:', err);
    } finally {
      setLoading(false);
    }
  };

  const computeOpenArrivalsAndPOs = (
    supplierName: string,
    allPos: any[],
    allSaudaCheck: any[],
    allSaudaMaster: any[],
    allFinalArrivals: any[],
    allTempArrivals: any[]
  ) => {
    const isAll = !supplierName || supplierName === 'ALL';

    // Build index of Temporary Arrivals by temporary_arrival_no / amad_no / mr_no for enriching Final Arrivals
    const tempByNo = new Map<string, any>();
    (allTempArrivals || []).forEach((ta: any) => {
      [ta.temporary_arrival_no, ta.amad_no, ta.arrival_no, ta.mr_no].forEach((k) => {
        const nk = normalize(k);
        if (nk && !tempByNo.has(nk)) tempByNo.set(nk, ta);
      });
    });

    // 1. Untagged Final Arrivals: records in final_arrival where po_no is blank/empty/NO/N/A
    const filteredFinalArrivals = (allFinalArrivals || [])
      .filter((fa: any) => {
        const poNoStr = normalize(fa.po_no);
        const isPoBlank = !poNoStr || poNoStr === 'NO' || poNoStr === 'N/A' || poNoStr === 'NONE';
        if (!isPoBlank) return false;

        // Also check if linked temporary_arrival already has a valid PO or keep it untagged if final_arrival has no PO
        const matchesSupplier =
          isAll ||
          normalize(fa.supplier) === normalize(supplierName) ||
          normalize(fa.challan_supplier) === normalize(supplierName);
        return matchesSupplier;
      })
      .map((fa: any) => {
        const tempKey = normalize(fa.temporary_arrival_no || fa.arrival_no || fa.amad_no || fa.mr_no);
        const linkedTemp = tempKey ? tempByNo.get(tempKey) : null;
        return {
          ...fa,
          temporary_arrival_no:
            fa.temporary_arrival_no ||
            fa.arrival_no ||
            linkedTemp?.temporary_arrival_no ||
            linkedTemp?.amad_no ||
            fa.final_arrival_no ||
            fa.mr_no,
          supplier: fa.supplier || fa.challan_supplier || linkedTemp?.supplier || 'N/A',
          broker: fa.broker || linkedTemp?.broker || 'N/A',
          area:
            fa.area ||
            fa.arrival_area_name ||
            fa.arrival_area ||
            linkedTemp?.arrival_area_name ||
            linkedTemp?.arrival_area ||
            'N/A',
          lorry_number:
            fa.lorry_number ||
            fa.lorry_no ||
            fa.vehicle_no ||
            linkedTemp?.lorry_number ||
            'N/A',
          challan_rr_no:
            fa.challan_rr_no ||
            fa.challan_no ||
            linkedTemp?.challan_rr_no ||
            linkedTemp?.challan_railway_receipt_no ||
            'N/A'
        };
      });

    // 2. Build fast lookup indices for Final Arrivals & Temp Arrivals by PO keys (same logic as Sauda Check Point)
    const buildPoRecordIndex = (records: any[], getCands: (r: any) => any[]) => {
      const idx = new Map<string, any[]>();
      for (const r of records || []) {
        if (!r) continue;
        const keys = getPoMatchKeys(getCands(r));
        for (const k of keys) {
          let bucket = idx.get(k);
          if (!bucket) {
            bucket = [r];
            idx.set(k, bucket);
          } else if (!bucket.includes(r)) {
            bucket.push(r);
          }
        }
      }
      return idx;
    };

    const queryPoIndex = (idx: Map<string, any[]>, poKeys: string[]): any[] => {
      const res: any[] = [];
      const seen = new Set<any>();
      for (const k of poKeys) {
        const bucket = idx.get(k);
        if (!bucket) continue;
        for (const item of bucket) {
          if (!seen.has(item)) {
            seen.add(item);
            res.push(item);
          }
        }
      }
      return res;
    };

    const finalByPoIndex = buildPoRecordIndex(allFinalArrivals, (r) => [
      r.po_no,
      r.contract_no,
      r.contract_po_no,
      r.sauda_no,
      r.ptf_no
    ]);

    const tempByPoIndex = buildPoRecordIndex(allTempArrivals, (r) => [
      r.po_no,
      r.contract_po_no,
      r.sauda_no,
      r.contract_no,
      r.ptf_no
    ]);

    const saudaByKeyIndex = buildPoRecordIndex(allSaudaMaster, (s) => [
      s.sauda_no,
      s.po_no,
      s.contract_no
    ]);

    // 3. Process Open P.O / Sauda Check Point Contracts:
    // A P.O / Sauda with multiple lorries (e.g. 6 lorries on BJCL/2026-2027/0660) MUST remain available
    // until all contracted lorries have been received/tagged (receivedLorries < contractLorries) and it is not closed.
    const combinedPOsMap = new Map<string, any>();

    const processPo = (po: any) => {
      const poNo = po.po_no || po.ptf_no || po.po_ptf_no || po.sauda_no || po.contract_po_no || po.contract_no;
      if (!poNo) return;

      const normPoNo = normalize(poNo);
      if (combinedPOsMap.has(normPoNo)) return;

      const matchesSupplier = isAll || normalize(po.supplier) === normalize(supplierName);
      if (!matchesSupplier) return;

      const poKeys = getPoMatchKeys([
        po.po_no,
        po.contract_po_no,
        po.ptf_no,
        po.sauda_no,
        po.po_contract,
        po.contract_no
      ]);

      const matchedSaudas = queryPoIndex(saudaByKeyIndex, poKeys);
      const matchedSauda = matchedSaudas[0] || null;

      // Total Contract Lorries (e.g., 6 Lorries for BJCL/2026-2027/0660)
      const contractLorries = Math.max(
        1,
        parseInt(
          po.total_lorries ||
            po.total_no_of_lorries ||
            po.no_of_lorries ||
            po.lorries ||
            matchedSauda?.no_of_lorries ||
            matchedSauda?.total_lorries ||
            1,
          10
        ) || 1
      );

      // Match all Final Arrivals and Temporary Arrivals already tagged to this P.O
      const matchingFinal = queryPoIndex(finalByPoIndex, poKeys);
      const matchingTempArrivals = queryPoIndex(tempByPoIndex, poKeys);

      // Deduplicate Temp Arrivals that are already represented in Final Arrivals (1 Lorry = 1 MR)
      const matchingTempDeduped = matchingTempArrivals.filter(
        (ar: any) =>
          !matchingFinal.some(
            (f: any) =>
              (f.temporary_arrival_no &&
                (ar.temporary_arrival_no || ar.amad_no) &&
                normalize(f.temporary_arrival_no) === normalize(ar.temporary_arrival_no || ar.amad_no)) ||
              (f.arrival_no &&
                (ar.temporary_arrival_no || ar.amad_no) &&
                normalize(f.arrival_no) === normalize(ar.temporary_arrival_no || ar.amad_no)) ||
              (f.mr_no &&
                (ar.temporary_arrival_no || ar.amad_no) &&
                normalize(f.mr_no) === normalize(ar.temporary_arrival_no || ar.amad_no)) ||
              (f.final_arrival_no &&
                (ar.temporary_arrival_no || ar.amad_no || ar.mr_no) &&
                normalize(f.final_arrival_no) === normalize(ar.temporary_arrival_no || ar.amad_no || ar.mr_no)) ||
              (f.lorry_number &&
                ar.lorry_number &&
                normalize(f.lorry_number) === normalize(ar.lorry_number))
          )
      );

      const receivedLorries = Math.max(
        matchingTempArrivals.length,
        matchingFinal.length + matchingTempDeduped.length
      );

      const receivedWeightMt =
        matchingFinal.reduce((sum: number, r: any) => sum + getArrivalWeightMt(r), 0) +
        matchingTempDeduped.reduce((sum: number, r: any) => sum + getArrivalWeightMt(r), 0);

      const linkedMrNos = Array.from(
        new Set(
          [
            ...matchingFinal.map((r: any) => String(r.final_arrival_no || r.mr_no || '').trim()),
            ...matchingTempDeduped.map((r: any) => String(r.temporary_arrival_no || r.amad_no || r.mr_no || '').trim())
          ].filter(Boolean)
        )
      );

      // Check if explicitly closed or cancelled
      const statusLower = String(po.status || '').toLowerCase();
      const isExplicitClosed =
        !po.is_reopened &&
        (Boolean(po.is_closed) || statusLower === 'closed' || statusLower === 'cancelled');

      // Keep P.O visible as long as it is not explicitly closed and receivedLorries < contractLorries
      const hasOpenLorries = !isExplicitClosed && receivedLorries < contractLorries;

      if (hasOpenLorries) {
        const totalContractMt = Number(
          po.total_contract_mt ||
            po.quantity_mt ||
            po.total_qty_mt ||
            po.quantity ||
            matchedSauda?.total_wt_in_ton ||
            (po.qty_qtl ? Number(po.qty_qtl) / 10 : 0) ||
            0
        );

        combinedPOsMap.set(normPoNo, {
          ...po,
          po_no: poNo,
          po_date: po.po_date || po.date || po.s_date || matchedSauda?.date || '',
          broker: po.broker || po.broker_name || matchedSauda?.broker || 'N/A',
          area:
            po.area ||
            po.arrival_area_name ||
            po.arrival_yard ||
            po.area_name ||
            po.dispatch_place ||
            matchedSauda?.area ||
            'N/A',
          supplier: po.supplier || matchedSauda?.supplier || 'N/A',
          total_contract_mt: totalContractMt,
          received_weight_mt: Number(receivedWeightMt.toFixed(3)),
          contract_lorries: contractLorries,
          received_lorries: receivedLorries,
          remaining_lorries: Math.max(0, contractLorries - receivedLorries),
          linked_mr_nos: linkedMrNos
        });
      }
    };

    // Prioritize Sauda Check Point records, then Final P.O (purchase_master)
    (allSaudaCheck || []).forEach(processPo);
    (allPos || []).forEach(processPo);

    setUnboundFinalArrivals(filteredFinalArrivals);
    setUnboundPOs(Array.from(combinedPOsMap.values()));
  };

  useLiveAutoRefresh(loadInitialData, [selectedSupplier], {
    tables: [
      'purchase_master',
      'sauda_check_point',
      'sauda_master',
      'final_arrival',
      'temporary_material_received',
      'clubbed_pomr'
    ]
  });

  useEffect(() => {
    loadInitialData();
  }, [selectedSupplier]);

  // Execute Voucher Binding (Updates Final Arrival, Temporary Arrival based on Final Arrival, Mill Inspection, and saves to clubbed_pomr)
  const handleConfirmBinding = async () => {
    if (!selectedArrivalForBind || !chosenPoForBind) return;

    setLoading(true);
    try {
      await ensureClubbedPomrSchema();

      const faNo = String(
        selectedArrivalForBind.final_arrival_no || selectedArrivalForBind.mr_no || ''
      ).trim();
      const poNo = String(chosenPoForBind.po_no || chosenPoForBind.ptf_no || '').trim();
      const poDate = String(
        chosenPoForBind.po_date ||
          chosenPoForBind.ptf_date ||
          chosenPoForBind.date ||
          chosenPoForBind.sauda_date ||
          chosenPoForBind.s_date ||
          ''
      ).trim();

      if (!faNo || !poNo) {
        throw new Error('Missing Final Arrival MR No or P.O No for binding.');
      }

      // 1. Lookup exact Final Arrival record from `final_arrival` to get its `temporary_arrival_no`
      let exactFaRecord: any = selectedArrivalForBind;
      if (supabase) {
        const { data: faRows } = await supabase
          .from('final_arrival')
          .select('*')
          .or(`final_arrival_no.eq.${faNo},mr_no.eq.${faNo}`)
          .limit(1);
        if (faRows && faRows.length > 0) {
          exactFaRecord = { ...selectedArrivalForBind, ...faRows[0] };
        }
      }

      // Extract `temporary_arrival_no` from Final Arrival table (`final_arrival.temporary_arrival_no`)
      const tempArrivalNo = String(
        exactFaRecord.temporary_arrival_no ||
          exactFaRecord.arrival_no ||
          exactFaRecord.amad_no ||
          selectedArrivalForBind.temporary_arrival_no ||
          faNo
      ).trim();

      const faWeightMt = getArrivalWeightMt(exactFaRecord);
      const poWeightMt = Number(chosenPoForBind.total_contract_mt || 0);
      const variance =
        poWeightMt > 0
          ? Number((((faWeightMt - poWeightMt) / poWeightMt) * 100).toFixed(2))
          : 0;

      const contractLorries = Number(chosenPoForBind.contract_lorries || chosenPoForBind.total_lorries || 1);
      const newReceivedLorriesCount = Number(chosenPoForBind.received_lorries || 0) + 1;

      const clubId = `CLUB-${Date.now().toString().slice(-6)}`;
      const clubbedIso = new Date().toISOString();
      const clubbedDate = clubbedIso.split('T')[0];

      const supplierName =
        exactFaRecord.supplier ||
        exactFaRecord.challan_supplier ||
        chosenPoForBind.supplier ||
        'N/A';
      const brokerName = exactFaRecord.broker || chosenPoForBind.broker || 'N/A';
      const areaName =
        exactFaRecord.area ||
        exactFaRecord.arrival_area_name ||
        exactFaRecord.arrival_area ||
        chosenPoForBind.area ||
        'N/A';
      const lorryNo =
        exactFaRecord.lorry_number ||
        exactFaRecord.lorry_no ||
        exactFaRecord.vehicle_no ||
        'N/A';
      const challanNo =
        exactFaRecord.challan_rr_no || exactFaRecord.challan_no || 'N/A';
      const packetsCount = Number(
        exactFaRecord.total_packets || exactFaRecord.packets || 0
      );

      const userCtx = getCurrentUserContext();
      const currentUserName = userCtx?.username || 'ADMIN';

      const poUpdatePayload: Record<string, any> = { po_no: poNo };
      if (poDate) poUpdatePayload.po_date = poDate;

      // =========================================================================
      // STEP A: UPDATE FINAL ARRIVAL (`final_arrival`)
      // =========================================================================
      if (exactFaRecord.final_arrival_id) {
        await dbModule
          .update('final_arrival', 'final_arrival_id', exactFaRecord.final_arrival_id, {
            ...poUpdatePayload,
            contract_no: poNo
          })
          .catch(() => {});
      }
      await dbModule
        .update('final_arrival', 'final_arrival_no', faNo, {
          ...poUpdatePayload,
          contract_no: poNo
        })
        .catch(() => {});
      await dbModule
        .update('final_arrival', 'mr_no', faNo, {
          ...poUpdatePayload,
          contract_no: poNo
        })
        .catch(() => {});

      if (supabase) {
        await supabase
          .from('final_arrival')
          .update(poUpdatePayload)
          .or(`final_arrival_no.eq.${faNo},mr_no.eq.${faNo}`);
      }

      // =========================================================================
      // STEP B: BASED ON FINAL ARRIVAL (`temporary_arrival_no`), UPDATE TEMPORARY ARRIVAL (`temporary_material_received`)
      // =========================================================================
      const tempLookupKeys = Array.from(
        new Set([tempArrivalNo, faNo, exactFaRecord.arrival_no, exactFaRecord.amad_no].map(v => String(v || '').trim()).filter(Boolean))
      );

      for (const tKey of tempLookupKeys) {
        await dbModule
          .update('temporary_material_received', 'temporary_arrival_no', tKey, poUpdatePayload)
          .catch(() => {});
        await dbModule
          .update('temporary_material_received', 'amad_no', tKey, poUpdatePayload)
          .catch(() => {});
        await dbModule
          .update('temporary_material_received', 'mr_no', tKey, poUpdatePayload)
          .catch(() => {});
        await dbModule
          .update('temporary_material_received', 'arrival_no', tKey, poUpdatePayload)
          .catch(() => {});

        if (supabase) {
          await supabase
            .from('temporary_material_received')
            .update(poUpdatePayload)
            .eq('temporary_arrival_no', tKey);
          await supabase
            .from('temporary_material_received')
            .update(poUpdatePayload)
            .eq('amad_no', tKey);
        }
      }

      // =========================================================================
      // STEP C: UPDATE MILL INSPECTION (`material_inspection`, `mill_inspection_master`, `inspection_master`, `inspection_checklist`)
      // =========================================================================
      const inspectionPayloadWithMillPo: Record<string, any> = {
        ...poUpdatePayload,
        mill_po_no: poNo,
        ...(poDate ? { mill_po_date: poDate } : {})
      };

      for (const mrKey of tempLookupKeys) {
        // 1. material_inspection
        await dbModule.update('material_inspection', 'mr_no', mrKey, inspectionPayloadWithMillPo).catch(() => {});
        await dbModule.update('material_inspection', 'arrival_no', mrKey, inspectionPayloadWithMillPo).catch(() => {});
        await dbModule.update('material_inspection', 'temporary_arrival_no', mrKey, inspectionPayloadWithMillPo).catch(() => {});

        // 2. mill_inspection_master
        await dbModule.update('mill_inspection_master', 'mr_no', mrKey, poUpdatePayload).catch(() => {});
        await dbModule.update('mill_inspection_master', 'arrival_no', mrKey, poUpdatePayload).catch(() => {});

        // 3. inspection_master
        await dbModule.update('inspection_master', 'mr_no', mrKey, inspectionPayloadWithMillPo).catch(() => {});
        await dbModule.update('inspection_master', 'arrival_no', mrKey, inspectionPayloadWithMillPo).catch(() => {});

        // 4. inspection_checklist
        await dbModule.update('inspection_checklist', 'mr_no', mrKey, inspectionPayloadWithMillPo).catch(() => {});
        await dbModule.update('inspection_checklist', 'arrival_no', mrKey, inspectionPayloadWithMillPo).catch(() => {});

        if (supabase) {
          await supabase.from('material_inspection').update(poUpdatePayload).or(`mr_no.eq.${mrKey},arrival_no.eq.${mrKey}`);
          await supabase.from('mill_inspection_master').update(poUpdatePayload).or(`mr_no.eq.${mrKey},arrival_no.eq.${mrKey}`);
          await supabase.from('inspection_master').update(poUpdatePayload).or(`mr_no.eq.${mrKey},arrival_no.eq.${mrKey}`);
          await supabase.from('inspection_checklist').update(poUpdatePayload).or(`mr_no.eq.${mrKey},arrival_no.eq.${mrKey}`);
        }
      }

      // Sync cached Mill Inspection records in localStorage if present
      try {
        const cachedInsp = localStorage.getItem('inspection_master_records');
        if (cachedInsp) {
          const parsed = JSON.parse(cachedInsp);
          if (Array.isArray(parsed)) {
            const normSet = new Set(tempLookupKeys.map(normalize));
            const updated = parsed.map((item: any) => {
              if (
                normSet.has(normalize(item.mr_no)) ||
                normSet.has(normalize(item.arrival_no)) ||
                normSet.has(normalize(item.temporary_arrival_no))
              ) {
                return {
                  ...item,
                  po_no: poNo,
                  ...(poDate ? { po_date: poDate } : {}),
                  mill_po_no: poNo
                };
              }
              return item;
            });
            localStorage.setItem('inspection_master_records', JSON.stringify(updated));
          }
        }
      } catch (_e) {}

      // =========================================================================
      // STEP D: SAVE MANUAL CLUBBING RECORD TO SUPABASE (`clubbed_pomr`)
      // =========================================================================
      const arrivalDateStr = String(
        exactFaRecord.date || exactFaRecord.final_arrival_date || exactFaRecord.mr_date || ''
      );

      const newClubRecord: ClubbingRecord = {
        id: clubId,
        clubbedAt: clubbedDate,
        mrNo: faNo,
        finalArrivalNo: faNo,
        tempArrivalNo,
        arrivalDate: arrivalDateStr,
        poNo,
        poDate,
        supplier: supplierName,
        broker: brokerName,
        area: areaName,
        lorryNumber: lorryNo,
        challanNo,
        packets: packetsCount,
        poNos: [poNo],
        amadNos: [faNo],
        totalPoLorries: contractLorries,
        receivedLorriesCount: newReceivedLorriesCount,
        totalPoWeight: poWeightMt,
        totalReceivedWeight: faWeightMt,
        variancePct: variance,
        recordedBy: currentUserName,
        remarks:
          clubbingRemarks ||
          `Manually clubbed MR ${faNo} (Temp Arrival: ${tempArrivalNo}) with P.O ${poNo} (Lorry ${newReceivedLorriesCount}/${contractLorries})`
      };

      await dbModule.insert('clubbed_pomr', {
        club_id: clubId,
        primary_po_no: poNo,
        po_no: poNo,
        ptf_no: chosenPoForBind.ptf_no || poNo,
        po_date: poDate || null,
        clubbed_po_nos: [poNo],
        po_nos: JSON.stringify([poNo]),
        primary_mr_no: faNo,
        mr_no: faNo,
        final_arrival_no: faNo,
        temporary_arrival_no: tempArrivalNo,
        arrival_date: arrivalDateStr || null,
        clubbed_mr_nos: [faNo],
        amad_nos: JSON.stringify([faNo]),
        supplier: supplierName,
        challan_supplier: exactFaRecord.challan_supplier || supplierName,
        broker: brokerName,
        area: areaName,
        lorry_number: lorryNo,
        challan_no: challanNo,
        packets: packetsCount,
        total_po_lorries: contractLorries,
        received_lorries_count: newReceivedLorriesCount,
        total_weight_mt: faWeightMt,
        total_po_weight: poWeightMt,
        total_received_weight: faWeightMt,
        variance_pct: variance,
        recorded_by: currentUserName,
        clubbed_by: currentUserName,
        clubbed_at: clubbedIso,
        remarks: newClubRecord.remarks,
        status: 'ACTIVE'
      });

      // Invalidate caches and notify all modules
      notifyDataChanged('final_arrival');
      notifyDataChanged('temporary_material_received');
      notifyDataChanged('material_inspection');
      notifyDataChanged('mill_inspection_master');
      notifyDataChanged('clubbed_pomr');

      setSuccessToast(
        `Bound MR #${faNo} (Temp Arrival #${tempArrivalNo}) with P.O #${poNo} [Lorry ${newReceivedLorriesCount}/${contractLorries}]! Updated Final Arrival, Temporary Arrival & Mill Inspection.`
      );

      // Reset modal state
      setSelectedArrivalForBind(null);
      setChosenPoForBind(null);
      setClubbingRemarks('');
      setShowAllPOsInModal(false);
      setModalPoSearch('');

      // Reload data so multi-lorry P.O remains visible if newReceivedLorriesCount < contractLorries
      await loadInitialData();

      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      console.error('Error executing voucher binding:', err);
      alert(`Failed to execute binding: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete pairing record from database
  const deleteClubItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this manual clubbing record from history?')) return;
    try {
      await dbModule.delete('clubbed_pomr', 'club_id', id).catch(() => {});
      await dbModule.delete('clubbed_pomr', 'id', id).catch(() => {});
      setClubbingHistory(prev => prev.filter(c => c.id !== id));
      setSuccessToast(`History record #${id} removed.`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      console.error('Delete pairing error:', err);
      alert('Failed to delete pairing record: ' + (err.message || err));
    }
  };

  // Filtered list inside Binding Modal based on Broker, Area, and Modal Search
  const getMatchingPOsForModal = () => {
    if (!selectedArrivalForBind) return [];

    const arrBroker = normalize(selectedArrivalForBind.broker || selectedArrivalForBind.broker_name);
    const arrArea = normalize(
      selectedArrivalForBind.area ||
        selectedArrivalForBind.arrival_area_name ||
        selectedArrivalForBind.arrival_area ||
        selectedArrivalForBind.arrival_yard
    );

    const baseList = showAllPOsInModal
      ? unboundPOs
      : unboundPOs.filter(po => {
          const poBroker = normalize(po.broker || po.broker_name);
          const poArea = normalize(
            po.area || po.arrival_area_name || po.arrival_yard || po.area_name
          );

          const brokerMatch =
            !arrBroker || arrBroker === 'N/A' || !poBroker || poBroker === 'N/A' || poBroker === arrBroker;
          const areaMatch =
            !arrArea || arrArea === 'N/A' || !poArea || poArea === 'N/A' || poArea === arrArea;

          return brokerMatch && areaMatch;
        });

    if (!modalPoSearch.trim()) return baseList;
    const q = modalPoSearch.toLowerCase().trim();
    return baseList.filter(
      po =>
        String(po.po_no || '').toLowerCase().includes(q) ||
        String(po.supplier || '').toLowerCase().includes(q) ||
        String(po.broker || '').toLowerCase().includes(q) ||
        String(po.area || '').toLowerCase().includes(q)
    );
  };

  // Filtered UI Search for Untagged Final Arrivals
  const filteredArrivals = unboundFinalArrivals.filter(fa => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(fa.final_arrival_no || fa.mr_no || '').toLowerCase().includes(q) ||
      String(fa.temporary_arrival_no || '').toLowerCase().includes(q) ||
      String(fa.supplier || '').toLowerCase().includes(q) ||
      String(fa.broker || '').toLowerCase().includes(q) ||
      String(fa.area || fa.arrival_area_name || '').toLowerCase().includes(q) ||
      String(fa.lorry_number || '').toLowerCase().includes(q) ||
      String(fa.challan_rr_no || '').toLowerCase().includes(q)
    );
  });

  // Filtered History list inside History Modal
  const filteredHistory = clubbingHistory.filter(item => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase().trim();
    return (
      item.id.toLowerCase().includes(q) ||
      item.mrNo.toLowerCase().includes(q) ||
      item.tempArrivalNo.toLowerCase().includes(q) ||
      item.poNo.toLowerCase().includes(q) ||
      item.supplier.toLowerCase().includes(q) ||
      item.broker.toLowerCase().includes(q) ||
      item.lorryNumber.toLowerCase().includes(q)
    );
  });

  return (
    <LegacyLayout
      title="Club P.O & Arrival Section"
      subtitle="Match & Bind Open Final Arrivals with Multi-Lorry Sauda Check Point & P.O Contracts"
      onClose={onClose}
    >
      <div className="space-y-4 max-w-full px-1 sm:px-4 text-left font-sans">
        {/* Top Control Header */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    LEVEL 4 AUTHORIZED
                  </span>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Binding Console</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    <span>Untagged Arrivals & P.O Matching Console</span>
                  </h2>

                  {/* History Button Beside Console Heading */}
                  <button
                    onClick={() => setShowHistoryModal(true)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                    title="View Manually Clubbed P.O & MR History"
                  >
                    <History className="h-3.5 w-3.5 text-indigo-600" />
                    <span>History</span>
                    <span className="bg-indigo-700 text-white text-[9px] font-mono px-1.5 py-0.2 rounded-full">
                      {clubbingHistory.length}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Supplier Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Supplier:</span>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="bg-transparent text-[10.5px] font-black text-slate-800 uppercase focus:outline-none cursor-pointer"
                >
                  <option value="ALL">ALL SUPPLIERS</option>
                  {suppliers.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 md:w-64">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search MR No, Temp No, Lorry, Broker..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-[11px] font-semibold pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadInitialData}
                className="p-1.5 px-3 border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer flex items-center gap-1 text-[10px] font-extrabold uppercase text-slate-700 bg-slate-50"
                title="Refresh Master Documents"
              >
                <RefreshCw className={cn('h-3.5 w-3.5 text-indigo-700', loading && 'animate-spin')} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Success Alert Toast */}
        {successToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs font-bold text-emerald-900 animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Untagged Final Arrivals Workspace - SINGLE MR PER ROW */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-3">
          <div className="border-b border-slate-100 pb-2.5 flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Untagged Final Arrivals (Single MR View)
                </h3>
                <p className="text-[9.5px] font-semibold text-slate-400 uppercase">
                  Each lorry arrival (MR) is listed row-by-row • Bind with Open Multi-Lorry P.O / Sauda Contracts ({unboundPOs.length} Open P.Os Available)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {unboundPOs.length} Open P.Os
              </span>
              <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                {filteredArrivals.length} Untagged MRs
              </span>
            </div>
          </div>

          {/* Single-MR List Container */}
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {filteredArrivals.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  No Untagged Final Arrival Records Found
                </p>
                <p className="text-[9.5px] font-semibold text-slate-400 mt-1">
                  All lorry final arrivals are bound with P.O contracts
                </p>
              </div>
            ) : (
              filteredArrivals.map((mr, idx) => {
                const faNo = mr.final_arrival_no || mr.mr_no || `FA-${idx + 1}`;
                const tempNo = mr.temporary_arrival_no || mr.arrival_no || mr.amad_no || faNo;
                const weightMt = getArrivalWeightMt(mr).toFixed(3);
                const packets = mr.total_packets || mr.packets || '0';
                const arrivalDate = mr.date || mr.final_arrival_date || mr.mr_date || 'N/A';
                const lorryNo = mr.lorry_number || mr.lorry_no || mr.vehicle_no || 'N/A';
                const challanNo = mr.challan_rr_no || mr.challan_no || 'N/A';

                return (
                  <div
                    key={faNo || idx}
                    className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/15 hover:shadow-sm bg-white transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                  >
                    {/* Col 1: MR / Final Arrival No, Temp Arrival No & Date */}
                    <div className="flex flex-wrap items-center gap-2.5 min-w-[240px]">
                      <div className="bg-indigo-950 text-white px-3 py-1.5 rounded-lg text-center min-w-[105px]">
                        <span className="text-[8px] font-bold uppercase text-indigo-300 block leading-none">
                          Final MR No
                        </span>
                        <span className="text-xs font-black font-mono tracking-wider block mt-0.5">
                          {faNo}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9.5px] font-extrabold font-mono text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Temp MR: {tempNo}
                          </span>
                          <span className="text-[9.5px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {arrivalDate}
                          </span>
                        </div>
                        <div className="text-[11px] font-black text-slate-900 uppercase">
                          Supplier: <span className="text-indigo-950">{mr.supplier || mr.challan_supplier || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Broker & Arrival Yard */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex-1 max-w-md">
                      <div>
                        <span className="text-[8px] font-extrabold text-slate-400 uppercase block">
                          Broker Name
                        </span>
                        <span className="text-[10.5px] text-slate-900 uppercase font-black truncate block">
                          {mr.broker || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] font-extrabold text-slate-400 uppercase block">
                          Arrival Area / Yard
                        </span>
                        <span className="text-[10.5px] text-indigo-900 uppercase font-black truncate block">
                          {mr.area || mr.arrival_area_name || mr.arrival_area || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Col 3: Lorry, Challan & Weight */}
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-left">
                        <div className="text-[10px] font-black text-slate-800 uppercase flex items-center gap-1">
                          <Truck className="h-3.5 w-3.5 text-slate-500" />
                          <span>{lorryNo}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">
                          Challan: {challanNo}
                        </span>
                      </div>

                      <div className="text-right bg-emerald-50/70 border border-emerald-200 px-3 py-1 rounded-lg min-w-[100px]">
                        <span className="text-xs font-black text-emerald-950 block font-mono">
                          {weightMt} MT
                        </span>
                        <span className="text-[8.5px] font-bold text-emerald-700 uppercase flex items-center justify-end gap-1">
                          <Package className="h-2.5 w-2.5" />
                          {packets} Bales
                        </span>
                      </div>
                    </div>

                    {/* Col 4: Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <button
                        onClick={() => setSelectedDetailMr(mr)}
                        className="px-3 py-1.5 text-[9.5px] font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 uppercase transition cursor-pointer"
                      >
                        Details
                      </button>

                      <button
                        onClick={() => {
                          setSelectedArrivalForBind(mr);
                          setChosenPoForBind(null);
                          setShowAllPOsInModal(false);
                          setModalPoSearch('');
                        }}
                        className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-black text-[10px] uppercase tracking-wider rounded-lg shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Bind P.O / PTF</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

            <ClubbingHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        filteredHistory={filteredHistory}
        historySearch={historySearch}
        setHistorySearch={setHistorySearch}
        historyPage={historyPage}
        setHistoryPage={setHistoryPage}
        historyPageSize={historyPageSize}
        setHistoryPageSize={setHistoryPageSize}
        setPrintingClub={setPrintingClub}
        handleDeleteClubbingRecord={handleDeleteClubbingRecord}
        deletingClubId={deletingClubId}
      />

      <ManualClubbingBindModal
        selectedArrivalForBind={selectedArrivalForBind}
        onClose={() => {
          setSelectedArrivalForBind(null);
          setChosenPoForBind(null);
        }}
        chosenPoForBind={chosenPoForBind}
        setChosenPoForBind={setChosenPoForBind}
        showAllPOsInModal={showAllPOsInModal}
        setShowAllPOsInModal={setShowAllPOsInModal}
        modalPoSearch={modalPoSearch}
        setModalPoSearch={setModalPoSearch}
        getMatchingPOsForModal={getMatchingPOsForModal}
        handleConfirmBinding={handleConfirmBinding}
        loading={loading}
        clubbingRemarks={clubbingRemarks}
        setClubbingRemarks={setClubbingRemarks}
      />

      {/* Detail Modal for Selected Final Arrival */}
      {selectedDetailMr && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-300 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col font-sans overflow-hidden max-h-[92vh] animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center px-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-[18px] w-[18px] text-teal-400" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Final Arrival Details</h3>
                  <p className="text-[9px] font-mono opacity-65 uppercase mt-0.5">
                    Final MR No: {selectedDetailMr.final_arrival_no || selectedDetailMr.mr_no} • Temp Arrival No:{' '}
                    {selectedDetailMr.temporary_arrival_no || selectedDetailMr.arrival_no || 'N/A'}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedDetailMr(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-800 bg-slate-50/50">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-center">
                  <span className="text-[8px] font-extrabold uppercase text-slate-400 block">Final Arrival No</span>
                  <span className="font-mono font-black text-sm text-slate-900">
                    {selectedDetailMr.final_arrival_no || selectedDetailMr.mr_no || 'N/A'}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-center">
                  <span className="text-[8px] font-extrabold uppercase text-slate-400 block">Temp Arrival No</span>
                  <span className="font-mono font-black text-xs text-amber-800">
                    {selectedDetailMr.temporary_arrival_no || selectedDetailMr.arrival_no || 'N/A'}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-center">
                  <span className="text-[8px] font-extrabold uppercase text-slate-400 block">Net Weight</span>
                  <span className="font-mono font-black text-xs text-indigo-700">
                    {getArrivalWeightMt(selectedDetailMr).toFixed(3)} MT
                  </span>
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-center">
                  <span className="text-[8px] font-extrabold uppercase text-slate-400 block">Packets / Bales</span>
                  <span className="font-mono font-black text-xs text-emerald-700">
                    {selectedDetailMr.total_packets || selectedDetailMr.packets || '0'}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
                <h4 className="text-[9px] font-black uppercase text-slate-400 border-b border-slate-100 pb-1">
                  Supplier & Logistics Identification
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[8.5px] font-extrabold text-slate-400 uppercase block">Supplier Name</span>
                    <strong className="uppercase text-slate-900 text-xs block">
                      {selectedDetailMr.supplier || selectedDetailMr.challan_supplier || 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-extrabold text-slate-400 uppercase block">Broker Name</span>
                    <strong className="uppercase text-slate-900 text-xs block">
                      {selectedDetailMr.broker || 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-extrabold text-slate-400 uppercase block">Arrival Yard</span>
                    <strong className="uppercase text-indigo-900 text-xs block">
                      {selectedDetailMr.area || selectedDetailMr.arrival_area_name || 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-extrabold text-slate-400 uppercase block">Vehicle / Lorry</span>
                    <strong className="uppercase text-slate-900 text-xs block">
                      {selectedDetailMr.lorry_number || selectedDetailMr.lorry_no || selectedDetailMr.vehicle_no || 'N/A'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 px-5 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedArrivalForBind(selectedDetailMr);
                  setSelectedDetailMr(null);
                }}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-black uppercase text-[10px] tracking-wider rounded-lg transition cursor-pointer"
              >
                Bind This Arrival
              </button>
              <button
                onClick={() => setSelectedDetailMr(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold uppercase text-[10px] tracking-wider rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Audit Modal */}
      {printingClub && (
        <PrintModal
          isOpen={!!printingClub}
          onClose={() => setPrintingClub(null)}
          title={`Binding Statement: ${printingClub.id}`}
        >
          <div className="p-5 space-y-4 text-xs" id="printable-binding-receipt">
            <div className="text-center border-b border-slate-200 pb-3">
              <h2 className="text-sm font-black uppercase text-slate-900">BALLY JUTE COMPANY LIMITED</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                MANUAL P.O & MR ASSOCIATION REPORT
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3 text-slate-700">
              <div>
                <p>
                  <span className="font-extrabold uppercase text-[9px] text-slate-400 block tracking-wider">
                    BINDING REFERENCE ID
                  </span>{' '}
                  <strong>{printingClub.id}</strong>
                </p>
                <p className="mt-2">
                  <span className="font-extrabold uppercase text-[9px] text-slate-400 block tracking-wider">
                    DATE ESTABLISHED
                  </span>{' '}
                  {printingClub.clubbedAt}
                </p>
              </div>
              <div className="text-right">
                <p>
                  <span className="font-extrabold uppercase text-[9px] text-slate-400 block tracking-wider">
                    SUPPLIER ACCOUNT
                  </span>{' '}
                  <strong className="uppercase text-[11px] text-slate-900">{printingClub.supplier}</strong>
                </p>
                <p className="mt-2">
                  <span className="font-extrabold uppercase text-[9px] text-slate-400 block tracking-wider">
                    AUDITED BY
                  </span>{' '}
                  {printingClub.recordedBy}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-extrabold uppercase text-[9px] text-slate-400 tracking-wider mb-2">
                Mapped Vouchers Inventory
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
                  <span className="font-bold text-[9px] text-slate-450 block uppercase">P.O / Sauda Contract</span>
                  <p className="font-mono mt-1 font-semibold text-slate-800">{printingClub.poNo}</p>
                </div>
                <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
                  <span className="font-bold text-[9px] text-slate-450 block uppercase">Final Arrival MR</span>
                  <p className="font-mono mt-1 font-semibold text-slate-800">{printingClub.finalArrivalNo}</p>
                </div>
                <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
                  <span className="font-bold text-[9px] text-slate-450 block uppercase">Temporary Arrival MR</span>
                  <p className="font-mono mt-1 font-semibold text-slate-800">{printingClub.tempArrivalNo}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-b border-slate-200 py-3 mt-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block">PO Contract WT</span>
                  <span className="text-xs font-black text-slate-800 block mt-0.5">
                    {printingClub.totalPoWeight.toFixed(2)} MT
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Arrival Gate WT</span>
                  <span className="text-xs font-black text-slate-800 block mt-0.5">
                    {printingClub.totalReceivedWeight.toFixed(2)} MT
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Lorry Progress</span>
                  <span className="text-xs font-black text-indigo-700 block mt-0.5">
                    {printingClub.receivedLorriesCount}/{printingClub.totalPoLorries} Lorries
                  </span>
                </div>
              </div>
            </div>

            {printingClub.remarks && (
              <div className="bg-slate-50 p-2.5 border border-slate-150 rounded">
                <span className="font-extrabold text-[8.5px] text-slate-400 block uppercase">Remarks</span>
                <p className="italic text-slate-600 mt-1 font-semibold">"{printingClub.remarks}"</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-8 text-[9px] text-slate-400 uppercase font-bold tracking-widest">
              <span>Sign (Authorized Jute Mill Executive)</span>
              <span>Sign (Audit Desk)</span>
            </div>
          </div>
        </PrintModal>
      )}
    </LegacyLayout>
  );
}
