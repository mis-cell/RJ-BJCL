import { getPaddedDetails, calculateProportionalNetto } from "../utils/temporaryArrivalCalculations";
import { TemporaryArrivalGrid } from "../components/temporary-arrival/TemporaryArrivalGrid";
import { TemporaryArrivalWeightCard } from "../components/temporary-arrival/TemporaryArrivalWeightCard";
import { ReceiptVoucherInfoCard } from "../components/temporary-arrival/ReceiptVoucherInfoCard";
import { TransportDocInfoCard } from "../components/temporary-arrival/TransportDocInfoCard";
import { saveTemporaryArrivalRecord } from "../components/temporary-arrival/temporaryArrivalSaveService";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveAutoRefresh, notifyDataChanged } from '../hooks/useLiveAutoRefresh';
import { getAgenciesForArea, getUniqueAgenciesForArea, validateAreaAgencyCombination } from '../services/areaLogicService';
import { 
  Save, 
  X, 
  Plus, 
  Trash2,
  RefreshCw,
  Archive,
  ChevronDown,
  ArrowLeft,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';
import { cn, sanitizeDate } from '../lib/utils';
import { Amad, ArrivalDetailRow } from '../types';
import { dbModule } from '../services/dbModule';
import LegacyLayout, { LegacyFieldset, LegacyButton } from '../components/LegacyLayout';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { supabase } from '../lib/supabase';
import { enforceEditOrDeletePermission, getCurrentUserContext } from '../lib/permissions';
import { screenDraftService } from '../services/screenDraftService';

export default function TemporaryArrival({ onSave, onCancel, initialData }: { onSave?: (d: any) => void; onCancel?: () => void; initialData?: Amad }) {
  const [loading, setLoading] = useState(false);
  const [showPoDropdown, setShowPoDropdown] = useState(false);
  const [closedSaudaMap, setClosedSaudaMap] = useState<Map<string, { po_no: string; sauda_no?: string; contractLorries: number; receivedLorries: number; isClosed: boolean }>>(new Map());

  const amadContainerRef = useRef<HTMLDivElement>(null);
  useKeyboardNavigation(amadContainerRef, () => {
    handleSave();
  });
  const [brokers, setBrokers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [markas, setMarkas] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  const [details, setDetails] = useState<ArrivalDetailRow[]>(() => {
    if (initialData) return getPaddedDetails(initialData);
    return screenDraftService.getDraft('amad_entry_details', getPaddedDetails(initialData));
  });
  const [unitList, setUnitList] = useState<string[]>(['BALES', 'DRUMS', 'LOOSE', 'P.BALES', 'H.BALES']);

  const emptyDetailRow = (): ArrivalDetailRow => ({
    quality: '',
    agency: '',
    marka: '',
    bales: 0,
    wt: 0,
    phota: ''
  } as any);

  const handleAddRow = () => {
    setDetails(prev => [
      ...prev,
      {
        srl_no: prev.length + 1,
        receipt_grade_code: '',
        receipt_grade_name: '',
        crop_year: '2026-27',
        challan_grade_name: '',
        agency_code: '',
        agency_name: '',
        challan_marka_code: '',
        challan_marka_name: '',
        netto_pnto: 0,
        quantity_chln: 0,
        quantity_rcpt: 0,
        phota: '',
        remarks: ''
      }
    ]);
  };

  const handleDeleteRow = () => {
    setDetails(prev => {
      if (prev.length <= 1) return prev;
      const copy = prev.slice(0, -1);
      return copy.map((row, idx) => ({ ...row, srl_no: idx + 1 }));
    });
  };

  const handleDeleteRowAt = (index: number) => {
    setDetails(prev => {
      if (prev.length <= 1) {
        return [{
          srl_no: 1,
          receipt_grade_code: '',
          receipt_grade_name: '',
          crop_year: '2026-27',
          challan_grade_name: '',
          agency_code: '',
          agency_name: '',
          challan_marka_code: '',
          challan_marka_name: '',
          netto_pnto: 0,
          quantity_chln: 0,
          quantity_rcpt: 0,
          phota: '',
          remarks: ''
        }];
      }
      const copy = prev.filter((_, idx) => idx !== index);
      return copy.map((row, idx) => ({ ...row, srl_no: idx + 1 }));
    });
  };

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
        console.warn("Failed to fetch unit_master in AmadEntry", err);
      }
    }
    loadUnits();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const parseLorry = (lorry?: string) => {
    let prefix = '';
    let suffix = '';
    if (lorry) {
      const parts = lorry.split('-');
      if (parts.length > 1) {
        prefix = parts[0];
        suffix = parts.slice(1).join('-');
      } else {
        prefix = lorry;
      }
    }
    return { prefix, suffix };
  };

  const createDefaultFormData = (data?: any) => {
    const lorryInfo = parseLorry(data?.lorry_number || (data as any)?.lorry_no || (data as any)?.vehicle_no);
    return {
      financial_year: data?.financial_year || '2026-2027',
      arrival_no: data?.temporary_arrival_no || data?.amad_no || 'AR0',
      po_no: data?.po_no || '',
      date: data?.date || '',
      jci: data?.jci || 'No',
      challan_supplier: (data?.challan_supplier || '').toUpperCase(),
      supplier: (data?.supplier || '').toUpperCase(),
      broker: (data?.broker || '').toUpperCase(),
      transporter_name: data?.transporter_name || '',
      challan_rr_no: data?.challan_rr_no || data?.challan_railway_receipt_no || '',
      challan_railway_receipt_no: data?.challan_railway_receipt_no || data?.challan_rr_no || '',
      lorry_prefix: lorryInfo.prefix,
      lorry_suffix: lorryInfo.suffix,
      pan_no: data?.pan_no || '',
      lorry_date: data?.lorry_date || '',
      consignment_note: data?.consignment_note || data?.consignment_note_no || '',
      consignment_note_no: data?.consignment_note || data?.consignment_note_no || '',
      di_no: data?.di_no || '',
      di_date: data?.di_date || '',
      invoice_no: data?.invoice_no || '',
      invoice_date: data?.invoice_date || '',
      ptf: data?.ptf || 'No',
      lorry_returned: data?.lorry_returned || 'No',
      lorry_returned_other_mill: data?.lorry_returned_other_mill || 'No',
      arrival_area_code: data?.arrival_area_code || '',
      arrival_area_name: (data?.arrival_area_name || '').toUpperCase(),
      unit_code: data?.unit_code || 'I',
      unit_name: data?.unit_name || 'BALES',
      way_bill_no: data?.way_bill_no || '',
      way_bill_date: data?.way_bill_date || '',
      apmc_fees: Number(data?.apmc_fees ?? (data as any)?.arival_apmc_fees ?? 0),
      remarks: data?.remarks || '',

      // Bottom weights
      challan_material_weight: data?.challan_material_weight || 0,
      actual_gross_weight: data?.actual_gross_weight || 0,
      actual_tare_weight: data?.actual_tare_weight || 0,
      supplier_net_weight: data?.supplier_net_weight || 0,
      supplier_challan_gross: data?.supplier_challan_gross || 0,
      supplier_tare_weight: data?.supplier_tare_weight || 0,
      electronic_net_weight: data?.electronic_net_weight || 0,
      electronic_gross_weight: data?.electronic_gross_weight || 0,
      electronic_tare_weight: data?.electronic_tare_weight || 0,
      weight_reduced: data?.weight_reduced || 0
    };
  };



  const [formData, setFormData] = useState(() => {
    const defaultData = createDefaultFormData(initialData);
    if (initialData) return defaultData;
    const draft = screenDraftService.getDraft('amad_entry_form', defaultData);
    if (!draft.arrival_no || draft.arrival_no === 'MR') {
      draft.arrival_no = 'AR0';
    }
    return draft;
  });

  const filteredArrivalAgencies = useMemo(() => {
    const currentArea = (formData.arrival_area_name || formData.arrival_area_code || '').trim();
    if (!currentArea) return [];
    const mapped = getUniqueAgenciesForArea(currentArea);
    const normArea = currentArea.toUpperCase();
    const extraFromDb = (agencies || []).filter(a => {
      const aAreaName = String(a.area_name || a.AREA_NAME || '').trim().toUpperCase();
      const aAreaCode = String(a.area_code || a.AREA_CODE || '').trim().toUpperCase();
      return aAreaName === normArea || aAreaCode === normArea;
    });
    if (extraFromDb.length === 0) return mapped;
    const uniqueMap = new Map<string, any>();
    mapped.forEach(item => {
      const name = String(item.agency_name || item.AGENCY_NAME || item.name || '').trim();
      if (name) uniqueMap.set(name.toUpperCase(), item);
    });
    extraFromDb.forEach(item => {
      const name = String(item.agency_name || item.AGENCY_NAME || item.name || '').trim().replace(/\s*\(Code\s*\d+\)$/i, '').replace(/\s*Code\s*\d+$/i, '').trim();
      if (name && !uniqueMap.has(name.toUpperCase())) {
        uniqueMap.set(name.toUpperCase(), {
          ...item,
          AGENCY_NAME: name,
          agency_name: name,
          name
        });
      }
    });
    return Array.from(uniqueMap.values()).sort((a, b) =>
      String(a.agency_name || a.AGENCY_NAME || '').localeCompare(String(b.agency_name || b.AGENCY_NAME || ''))
    );
  }, [formData.arrival_area_name, formData.arrival_area_code, agencies]);

  useEffect(() => {
    if (initialData) {
      setFormData(createDefaultFormData(initialData));
    } else {
      screenDraftService.clearDraft('amad_entry_form');
      screenDraftService.clearDraft('amad_entry_details');
      setFormData(createDefaultFormData());
      setDetails([emptyDetailRow()]);
    }
  }, [initialData]);

  useEffect(() => {
    if (!initialData && formData) {
      screenDraftService.saveDraft('amad_entry_form', formData);
      screenDraftService.saveDraft('amad_entry_details', details);
    }
  }, [formData, details, initialData]);

  const fetchPurchaseOrders = async () => {
    try {
      const [scpRes, amadRes, faRes] = await Promise.all([
        supabase ? supabase.from('sauda_check_point').select('*').order('created_at', { ascending: false }) : dbModule.fetchAll('sauda_check_point', 'created_at', false).then(d => ({ data: d, error: null })),
        supabase ? supabase.from('temporary_material_received').select('*') : dbModule.fetchAll('temporary_material_received').then(d => ({ data: d, error: null })),
        supabase ? supabase.from('final_arrival').select('*') : dbModule.fetchAll('final_arrival').then(d => ({ data: d, error: null }))
      ]);

      const amadList = amadRes?.data || [];
      const faList = faRes?.data || [];
      const tempPoData = (scpRes?.data || []).map((po: any) => ({ ...po, status: po.status || 'temp', sourceTable: 'sauda_check_point' }));

      // Deduplicate by po_no from sauda_check_point
      const uniqueMap = new Map<string, any>();
      tempPoData.forEach((po: any) => {
        if (po && po.po_no) {
          const key = String(po.po_no).trim().toUpperCase();
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, po);
          }
        }
      });

      const cleanVal = (v: any) => String(v || '').trim().replace(/[^a-z0-9]/gi, '').toLowerCase();
      const NON_PO_TOKENS = new Set([
        '', '20262027', '20252026', '202627', '202526', 'normal', 'special',
        'pending', 'temp', 'final', 'finalpo', 'direct', 'no', 'yes', 'mr', 'bales', 'loose'
      ]);

      const extractCanonicalPoSerial = (raw: any): string => {
        const str = String(raw || '').trim().toUpperCase();
        if (!str) return '';
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
        if (!withoutYear) return '';
        const strippedZeros = withoutYear.replace(/^0+/, '') || '0';
        return isPtf ? `PTF_${strippedZeros}` : strippedZeros;
      };

      const isSamePoIdentifier = (a: any, b: any): boolean => {
        const rawA = String(a || '').trim().toUpperCase();
        const rawB = String(b || '').trim().toUpperCase();
        if (!rawA || !rawB) return false;
        const cleanA = cleanVal(rawA);
        const cleanB = cleanVal(rawB);
        if (NON_PO_TOKENS.has(cleanA) || NON_PO_TOKENS.has(cleanB)) return false;
        if (rawA === rawB || cleanA === cleanB) return true;
        const serialA = extractCanonicalPoSerial(rawA);
        const serialB = extractCanonicalPoSerial(rawB);
        if (serialA && serialB && !NON_PO_TOKENS.has(serialA.toLowerCase()) && serialA === serialB) {
          return true;
        }
        return false;
      };

      const getCandidateTokens = (vals: any[]): string[] => {
        const tokens = new Set<string>();
        for (const v of vals) {
          const raw = String(v || '').trim().toUpperCase();
          if (!raw) continue;
          const clean = cleanVal(raw);
          if (!NON_PO_TOKENS.has(clean)) {
            tokens.add(`RAW:${raw}`);
            if (clean) tokens.add(`CLEAN:${clean}`);
          }
          const serial = extractCanonicalPoSerial(raw);
          if (serial && !NON_PO_TOKENS.has(serial.toLowerCase())) {
            tokens.add(`SER:${serial}`);
          }
        }
        return Array.from(tokens);
      };

      const buildRecordIndex = (records: any[]): Map<string, any[]> => {
        const index = new Map<string, any[]>();
        for (const rec of records) {
          if (!rec) continue;
          const tokens = getCandidateTokens([
            rec.po_no,
            rec.mill_po_no,
            rec.contract_po_no,
            rec.sauda_no,
            rec.contract_no,
            rec.ptf_no
          ]);
          for (const t of tokens) {
            let bucket = index.get(t);
            if (!bucket) {
              bucket = [];
              index.set(t, bucket);
            }
            bucket.push(rec);
          }
        }
        return index;
      };

      const queryRecordIndex = (po: any, index: Map<string, any[]>): any[] => {
        if (!po) return [];
        const tokens = getCandidateTokens([
          po.po_no,
          po.contract_po_no,
          po.ptf_no,
          po.sauda_no,
          po.contract_no
        ]);
        const matchedSet = new Set<any>();
        for (const t of tokens) {
          const bucket = index.get(t);
          if (bucket) {
            for (const r of bucket) matchedSet.add(r);
          }
        }
        return Array.from(matchedSet);
      };

      const faIndex = buildRecordIndex(faList || []);
      const amadIndex = buildRecordIndex(amadList || []);

      const allPromotedTempTokens = new Set<string>();
      const addPromotedTempToken = (val: any) => {
        const s = String(val || '').trim().toUpperCase();
        if (!s || s === 'N/A' || s === 'UNDEFINED') return;
        allPromotedTempTokens.add(s);
      };
      (faList || []).forEach((f: any) => {
        if (!f) return;
        addPromotedTempToken(f.temporary_arrival_no);
        addPromotedTempToken(f.arrival_no);
        addPromotedTempToken(f.mr_no);
        addPromotedTempToken(f.final_arrival_no);
      });

      const tempWeightOf = (ar: any) => {
        if (ar.challan_material_weight && Number(ar.challan_material_weight) > 0) return Number(ar.challan_material_weight);
        if (ar.weight_reduced && Number(ar.weight_reduced) > 0) return Number(ar.weight_reduced);
        if (ar.weight_qtl && Number(ar.weight_qtl) > 0) return Number(ar.weight_qtl) / 10;
        if (ar.weight && Number(ar.weight) > 0) return Number(ar.weight) / 10;
        return 0;
      };
      const finalWeightOf = (ar: any) => {
        if (ar.weight_qtl && Number(ar.weight_qtl) > 0) return Number(ar.weight_qtl) / 10;
        if (ar.weight && Number(ar.weight) > 0) return Number(ar.weight) / 10;
        if (ar.challan_material_weight && Number(ar.challan_material_weight) > 0) return Number(ar.challan_material_weight);
        return 0;
      };

      const uniquePos = Array.from(uniqueMap.values());
      const nextClosedMap = new Map<string, { po_no: string; sauda_no?: string; contractLorries: number; receivedLorries: number; isClosed: boolean }>();
      const filtered: any[] = [];

      for (const po of uniquePos) {
        if (!po.po_no) continue;
        const poKey = String(po.po_no).trim().toUpperCase();
        const saudaKey = String(po.sauda_no || po.contract_po_no || '').trim().toUpperCase();
        const statusLower = String(po.status || '').trim().toLowerCase();

        const isCancelled = statusLower === 'cancelled' || po.is_cancelled === true;
        if (isCancelled) continue;

        const isCurrentMatch = initialData && initialData.po_no && (
          isSamePoIdentifier(initialData.po_no, po.po_no) ||
          (saudaKey && isSamePoIdentifier(initialData.po_no, saudaKey))
        );

        let parsedOpenRemarks = po.open_remarks;
        if (typeof parsedOpenRemarks === 'string') {
          try { parsedOpenRemarks = JSON.parse(parsedOpenRemarks); } catch (e) { parsedOpenRemarks = null; }
        }

        const isExplicitReopened = !isCancelled && statusLower !== 'closed' && (
                                   po.is_reopened === true || 
                                   po.reopened === true || 
                                   statusLower === 'open' ||
                                   Boolean(parsedOpenRemarks && typeof parsedOpenRemarks === 'object' && Object.keys(parsedOpenRemarks).length > 0)
        );

        const isExplicitClosed = !isExplicitReopened && (
                                 po.is_closed === true || 
                                 po.sauda_closed === true || 
                                 statusLower === 'closed'
        );

        const contractLorries = Math.max(1, parseInt(po.total_lorries || po.total_no_of_lorries || po.no_of_lorries || po.lorries || 1, 10) || 1);

        const rawFaMatches = queryRecordIndex(po, faIndex);
        const seenFaKeys = new Set<string>();
        const faMatches = rawFaMatches.filter((f: any) => {
          const key = String(f.final_arrival_no || f.arrival_no || f.mr_no || f.temporary_arrival_no || f.id || '').trim().toUpperCase();
          if (!key) return true;
          if (seenFaKeys.has(key)) return false;
          seenFaKeys.add(key);
          return true;
        });

        const amadMatches = queryRecordIndex(po, amadIndex);

        const seenAmadKeys = new Set<string>();
        const unpromotedAmad = amadMatches.filter((ar: any) => {
          const matchedInThisPoFa = faMatches.some((f: any) =>
            (f.temporary_arrival_no && (ar.temporary_arrival_no || ar.amad_no) && String(f.temporary_arrival_no).trim().toUpperCase() === String(ar.temporary_arrival_no || ar.amad_no).trim().toUpperCase()) ||
            (f.arrival_no && (ar.temporary_arrival_no || ar.amad_no) && String(f.arrival_no).trim().toUpperCase() === String(ar.temporary_arrival_no || ar.amad_no).trim().toUpperCase()) ||
            (f.mr_no && (ar.temporary_arrival_no || ar.amad_no) && String(f.mr_no).trim().toUpperCase() === String(ar.temporary_arrival_no || ar.amad_no).trim().toUpperCase()) ||
            (f.final_arrival_no && (ar.temporary_arrival_no || ar.amad_no || ar.mr_no) && String(f.final_arrival_no).trim().toUpperCase() === String(ar.temporary_arrival_no || ar.amad_no || ar.mr_no).trim().toUpperCase()) ||
            (f.lorry_number && ar.lorry_number && String(f.lorry_number).trim().toUpperCase() === String(ar.lorry_number).trim().toUpperCase())
          );
          if (matchedInThisPoFa) return false;

          const tempId = String(ar.temporary_arrival_no || ar.amad_no || '').trim().toUpperCase();
          const mrId = String(ar.mr_no || ar.arrival_no || '').trim().toUpperCase();
          if ((tempId && allPromotedTempTokens.has(tempId)) || (mrId && allPromotedTempTokens.has(mrId))) {
            return false;
          }

          const key = String(ar.temporary_arrival_no || ar.amad_no || ar.mr_no || ar.id || '').trim().toUpperCase();
          if (key) {
            if (seenAmadKeys.has(key)) return false;
            seenAmadKeys.add(key);
          }
          return true;
        });

        const receivedLorries = faMatches.length + unpromotedAmad.length;

        const totalReceivedMt = faMatches.reduce((sum: number, f: any) => sum + finalWeightOf(f), 0) +
                                unpromotedAmad.reduce((sum: number, a: any) => sum + tempWeightOf(a), 0);

        const contractWeight = parseFloat(po.total_contract_mt) || 0;

        const isLorryClosed = contractLorries > 0 && receivedLorries >= contractLorries;
        const isClosed = !isExplicitReopened && (isExplicitClosed || isLorryClosed);

        if (isClosed) {
          const closedEntry = {
            po_no: String(po.po_no).trim(),
            sauda_no: (po.sauda_no || po.contract_po_no) ? String(po.sauda_no || po.contract_po_no).trim() : undefined,
            contractLorries,
            receivedLorries,
            contractWeight,
            receivedWeight: totalReceivedMt,
            isClosed: true
          };
          nextClosedMap.set(poKey, closedEntry);
          if (saudaKey) nextClosedMap.set(saudaKey, closedEntry);
        }

        if (isClosed && !isCurrentMatch) {
          continue;
        }

        filtered.push({
          ...po,
          po_no: String(po.po_no).trim(),
          broker: (po.broker || '').toUpperCase(),
          supplier: (po.supplier || po.party_name || po.merchant || '').toUpperCase(),
          challan_supplier: (po.challan_supplier || po.supplier || po.party_name || po.merchant || '').toUpperCase(),
          area: (po.area || '').toUpperCase(),
          contract_lorries: contractLorries,
          received_lorries: receivedLorries,
          is_reopened: isExplicitReopened
        });
      }

      setClosedSaudaMap(nextClosedMap);
      setPurchaseOrders(filtered);
    } catch (err) {
      console.warn("Error in fetchPurchaseOrders from sauda_check_point:", err);
    }
  };

  useLiveAutoRefresh(fetchPurchaseOrders, [], { tables: ['temporary_material_received', 'sauda_check_point', 'sauda_check_point_details', 'purchase_master', 'purchase_detail_master', 'lorry_weighments', 'final_arrival'] });

  useEffect(() => {
    const handleSaudaStatusChange = () => {
      fetchPurchaseOrders();
    };
    window.addEventListener('storage', handleSaudaStatusChange);
    window.addEventListener('sauda_status_changed', handleSaudaStatusChange);
    return () => {
      window.removeEventListener('storage', handleSaudaStatusChange);
      window.removeEventListener('sauda_status_changed', handleSaudaStatusChange);
    };
  }, []);

  // Load master records and set up real-time PO query subscription
  useEffect(() => {
    async function loadMastersAndIncrement() {
      try {
        const [brokData, suppData, areaData, agcData, gradeData, markaData, allAmads] = await Promise.all([
          dbModule.fetchAll('broker_master').catch(() => []),
          dbModule.fetchAll('supply_master').catch(() => []),
          dbModule.fetchAll('area_master').catch(() => []),
          dbModule.fetchAll('agency_master').catch(() => []),
          dbModule.fetchAll('grade_master').catch(() => []),
          dbModule.fetchAll('marka_master').catch(() => []),
          dbModule.fetchAll('temporary_material_received').catch(() => [])
        ]);

        setBrokers((brokData || []).map((b: any) => ({ ...b, brok_name: (b.brok_name || '').toUpperCase() })));
        setSuppliers((suppData || []).map((s: any) => ({ ...s, supp_name: (s.supp_name || '').toUpperCase() })));

        const defaultAreasList = [
          { area_code: '10', area_name: 'BANGLADESH' },
          { area_code: '20', area_name: 'BIHAR' },
          { area_code: '30', area_name: 'DAISEE' },
          { area_code: '40', area_name: 'JUNGLE' },
          { area_code: '50', area_name: 'LOWER ASSAM' },
          { area_code: '60', area_name: 'NORTHERN' },
          { area_code: '70', area_name: 'ORISSA' },
          { area_code: '80', area_name: 'OTHERS' },
          { area_code: '90', area_name: 'SEMI NORTHERN' },
          { area_code: '100', area_name: 'UPPER ASSAM' }
        ];

        const mergedAreasMap = new Map<string, any>();
        defaultAreasList.forEach(a => mergedAreasMap.set(a.area_name, a));
        (areaData || []).forEach((a: any) => {
          const name = String(a.area_name || '').trim().toUpperCase();
          if (name) {
            mergedAreasMap.set(name, {
              id: a.id,
              area_code: String(a.area_code || a.code || '').trim(),
              area_name: name
            });
          }
        });
        setAreas(Array.from(mergedAreasMap.values()).sort((a, b) => a.area_name.localeCompare(b.area_name)));

        setAgencies(agcData || []);
        setGrades(gradeData || []);

        let finalMarkas = markaData || [];
        if (finalMarkas.length === 0) {
          const fallbackNames = ["NO MARK", "SH", "CHANGE", "MJ", "BSP", "RT", "PUROHIT", "DB", "KK", "C.M", "BS", "IM", "NI", "RIEEM", "MAA", "V VISHNU", "KR", "SUNIL", "SARTAJ", "J.S.J", "PK", "ANAND", "RR", "HARI", "PS", "RS", "MR", "GOPAL", "A.P.J.S", "SUN", "SAHEB", "C.R.D", "SM", "SA", "AM", "RABI", "AD", "ML", "RK", "MUBIN", "AMAN", "SKB", "ANTIMA", "SHM", "JMP", "HM", "SN", "KT", "LN", "RAJU", "RA", "SS", "SR", "RAHA", "TT", "USHA", "OP", "ST", "PB", "SK", "BAHETI", "DR", "ROHIT", "BK", "KAMAL", "JM", "CHAIN", "SSB", "SANVI", "BR", "UDM", "JAYA", "MM", "SANGITA", "S", "HBGM", "DHRUV", "SD", "AS", "BALAJI", "AJAY", "SG", "GS", "SB", "RE", "JS", "RM", "RBT", "BD", "MS", "RAEEM", "TS", "TOSH", "LC", "SUMAN", "VANSH", "DK", "BHAWANI", "BP", "SHIV", "SHREE HARI", "A", "KS", "KJ", "VK", "JK", "ARHAM", "SOVA", "KM", "PRAMOD", "PUJA", "DURGA", "JSB", "NS", "JAY HANUMAN", "MB", "MANOJ", "SHUBHAM", "KISHAN", "JAY", "AX", "SKC", "YUNUS", "BIJOY", "BN", "A.J.P", "J/MU/DK", "J/MU/HP", "AP", "ANISH", "RISHAV", "SKS", "BUL BUL", "KEDIA", "SMB", "NAIZA", "MH", "BULBUL", "RAKHECHA", "R.JAIN", "MKC", "NC", "MRR", "P", "J.A.K.", "JAK", "GOBINDA", "RAM", "TULSI G", "PP", "HARI OM", "MOTI", "GK", "KRISHNA", "SANJOY", "AA", "MP", "TANU", "ASHA", "DNJ(BHOWMICK)", "SUMIT", "TULSI/H", "KP", "K.L.K", "SWASTIK", "JC", "PM", "BB", "GM", "SHREE"];
          finalMarkas = fallbackNames.map((name, i) => ({
            id: i + 1,
            marka_code: String(i + 1).padStart(2, '0'),
            marka_name: name
          }));
        }
        setMarkas(finalMarkas);

        if (!initialData) {
          // Dynamic auto-increment to establish a clean reference voucher serial
          let nextNum = 168; // default base starting number
          if (allAmads && allAmads.length > 0) {
            let lastNum = 167;
            allAmads.forEach((a: any) => {
              const an = String(a.temporary_arrival_no || a.amad_no || '');
              const num = parseInt(an.replace(/[^0-9]/g, ''), 10);
              if (!isNaN(num) && num > lastNum) {
                lastNum = num;
              }
            });
            nextNum = lastNum + 1;
          }
          
          setFormData(prev => ({
            ...prev,
            arrival_no: initialData?.temporary_arrival_no || initialData?.amad_no || 'AR0',
            challan_supplier: '',
            supplier: '',
            agency_name: '',
            broker: '',
            arrival_area_name: '',
            arrival_area_code: ''
          }));
        }
      } catch (e) {
        console.error("Error loading master templates:", e);
      }
    }
    loadMastersAndIncrement();
  }, [initialData]);

  // Draft features disabled to ensure form is always a fresh blank form on click, per user request
  useEffect(() => {
    // Left empty intentionally to prevent restoring old drafts
  }, [initialData]);

  // Auto-match and pull weights and party info from lorry_weighments table based on Lorry Arrival Date & Lorry Number
  useEffect(() => {
    const lorryDateStr = (formData.lorry_date || '').trim();
    const lorryPrefix = (formData.lorry_prefix || '').trim();
    const lorrySuffix = (formData.lorry_suffix || '').trim();
    const combinedLorryClean = `${lorryPrefix}${lorrySuffix}`.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // BOTH Lorry Arrival Date AND Full Lorry Number (Prefix & Suffix) are MANDATORY before pulling data
    if (!lorryDateStr || !lorryPrefix || !lorrySuffix || !combinedLorryClean) return;

    let isMounted = true;

    const syncFromLorryWeighments = async () => {
      try {
        let rows: any[] = [];
        if (supabase) {
          const { data } = await supabase.from('lorry_weighments').select('*');
          rows = data || [];
        } else {
          rows = await dbModule.fetchAll('lorry_weighments').catch(() => []);
        }

        if (!rows || rows.length === 0 || !isMounted) return;

        // Exact match by entry_date (or date) and lorry_no (or lorry_number / vehicle_no)
        const matched = rows.find((r: any) => {
          const rDate = String(r.entry_date || r.date || r.created_at || '').split('T')[0].trim();
          const rLorryClean = String(r.lorry_no || r.lorry_number || r.vehicle_no || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

          const dateMatch = rDate === lorryDateStr;
          const lorryMatch = rLorryClean === combinedLorryClean;

          return dateMatch && lorryMatch;
        });

        if (matched && isMounted) {
          const formatToMT = (val: any): number => {
            if (val === null || val === undefined || val === '') return 0;
            const num = Number(val);
            if (isNaN(num) || num <= 0) return 0;
            return num > 200 ? Number((num / 1000).toFixed(3)) : Number(num.toFixed(3));
          };

          const gateNet = formatToMT(matched.gate_net_weight ?? matched.stage1_net_weight);
          const gateGross = formatToMT(matched.gate_gross_weight ?? matched.stage1_gross_weight);
          const gateTare = formatToMT(matched.gate_tare_weight ?? matched.stage1_tare_weight);

          const millGrossNum = Number(matched.mill_gross_weight ?? matched.stage2_gross_weight ?? 0);
          const millTareNum = Number(matched.mill_tare_weight ?? matched.stage2_tare_weight ?? 0);
          const millGross = formatToMT(millGrossNum);
          const millTare = formatToMT(millTareNum);

          let millNet = 0;
          if (millGrossNum > 0 && millTareNum > 0) {
            millNet = formatToMT(millGrossNum - millTareNum);
          } else {
            millNet = formatToMT(matched.mill_net_weight ?? matched.stage2_net_weight);
          }

          const elecGrossNum = Number(matched.electric_gross_weight ?? matched.stage3_gross_weight ?? 0);
          const elecTareNum = Number(matched.electric_tare_weight ?? matched.stage3_tare_weight ?? 0);
          const elecGross = formatToMT(elecGrossNum);
          const elecTare = formatToMT(elecTareNum);

          let elecNet = 0;
          if (elecGrossNum > 0 && elecTareNum > 0) {
            elecNet = formatToMT(elecGrossNum - elecTareNum);
          } else {
            elecNet = formatToMT(matched.electric_net_weight ?? matched.stage3_net_weight);
          }

          setFormData(prev => {
            const updated = { ...prev };

            // Weight fields
            if (gateNet > 0) updated.challan_material_weight = gateNet;
            if (millNet > 0) updated.supplier_net_weight = millNet;
            if (elecNet > 0) updated.electronic_net_weight = elecNet;

            if (gateGross > 0) updated.actual_gross_weight = gateGross;
            if (millGross > 0) updated.supplier_challan_gross = millGross;
            if (elecGross > 0) updated.electronic_gross_weight = elecGross;

            if (gateTare > 0) updated.actual_tare_weight = gateTare;
            if (millTare > 0) updated.supplier_tare_weight = millTare;
            if (elecTare > 0) updated.electronic_tare_weight = elecTare;

            // Auto-fill party_name if P.O. Number is BLANK
            if (!prev.po_no || !prev.po_no.trim()) {
              const party = (matched.party_name || matched.broker || matched.supplier || '').toUpperCase();
              if (party) {
                updated.broker = party;
                updated.challan_supplier = party;
                updated.supplier = party;
              }
            }

            return updated;
          });
        }
      } catch (err) {
        console.warn("Error matching with lorry_weighments:", err);
      }
    };

    syncFromLorryWeighments();

    return () => {
      isMounted = false;
    };
  }, [formData.lorry_date, formData.lorry_prefix, formData.lorry_suffix, formData.po_no]);

  
  // Sync and dynamically calculate net weights based on scale inputs and determine Final Weight (lowest Net Weight)
  useEffect(() => {
    setFormData(prev => {
      const grossChln = Number(prev.actual_gross_weight) || 0;
      const tareChln = Number(prev.actual_tare_weight) || 0;
      const grossMill = Number(prev.supplier_challan_gross) || 0;
      const tareMill = Number(prev.supplier_tare_weight) || 0;
      const grossElec = Number(prev.electronic_gross_weight) || 0;
      const tareElec = Number(prev.electronic_tare_weight) || 0;

      const calculatedChallanNet = grossChln > 0 ? Math.round(Math.max(0, grossChln - tareChln) * 1000) / 1000 : (Number(prev.challan_material_weight) || 0);
      const calculatedSupplierNet = grossMill > 0 ? Math.round(Math.max(0, grossMill - tareMill) * 1000) / 1000 : (Number(prev.supplier_net_weight) || 0);
      const calculatedElectronicNet = grossElec > 0 ? Math.round(Math.max(0, grossElec - tareElec) * 1000) / 1000 : (Number(prev.electronic_net_weight) || 0);

      // Final Weight is lowest value among the Net Weight section (CHALLAN WT, MILL NET, ELECTRONIC NET)
      const validNetWeights = [
        calculatedChallanNet,
        calculatedSupplierNet,
        calculatedElectronicNet
      ].filter(v => v > 0);

      const minNetWeight = validNetWeights.length > 0 ? Math.round(Math.min(...validNetWeights) * 1000) / 1000 : (Number(prev.weight_reduced) || 0);

      if (
        calculatedChallanNet === prev.challan_material_weight &&
        calculatedSupplierNet === prev.supplier_net_weight &&
        calculatedElectronicNet === prev.electronic_net_weight &&
        minNetWeight === prev.weight_reduced
      ) {
        return prev;
      }

      return {
        ...prev,
        challan_material_weight: calculatedChallanNet,
        supplier_net_weight: calculatedSupplierNet,
        electronic_net_weight: calculatedElectronicNet,
        weight_reduced: minNetWeight
      };
    });
  }, [
    formData.actual_gross_weight,
    formData.actual_tare_weight,
    formData.supplier_challan_gross,
    formData.supplier_tare_weight,
    formData.electronic_gross_weight,
    formData.electronic_tare_weight,
    formData.challan_material_weight,
    formData.supplier_net_weight,
    formData.electronic_net_weight
  ]);

  // Recalculate Receipt Grade Details Netto (M.T) whenever Final Weight or quantity_rcpt/quantity_chln changes (non-LOOSE only)
  useEffect(() => {
    const isLoose = (formData.unit_name || '').toUpperCase().includes('LOOSE');
    if (isLoose) return; // Strictly not applicable for LOOSE

    const finalWeight = Number(formData.weight_reduced) || 0;
    setDetails(prev => {
      const recalculated = calculateProportionalNetto(finalWeight, prev, formData.unit_name);
      const isDifferent = recalculated.some((r, i) => r.netto_pnto !== prev[i]?.netto_pnto);
      return isDifferent ? recalculated : prev;
    });
  }, [
    formData.weight_reduced,
    formData.unit_name,
    details.map(d => `${d.quantity_rcpt}_${d.quantity_chln}_${d.unit}`).join(',')
  ]);

  const loadDetailsFromPo = async (poNo: string) => {
    if (!poNo || !poNo.trim()) return;
    try {
      const poNoUpper = poNo.trim().toUpperCase();
      let filteredDetails: any[] = [];

      // 1. Query Supabase directly if available
      if (supabase) {
        const [scpRes, pdmRes] = await Promise.all([
          supabase.from('sauda_check_point_details').select('*').eq('po_no', poNo.trim()),
          supabase.from('purchase_detail_master').select('*').eq('po_no', poNo.trim())
        ]);
        const scp = scpRes.data || [];
        const pdm = pdmRes.data || [];

        if (scp.length > 0) {
          filteredDetails = scp;
        } else if (pdm.length > 0) {
          filteredDetails = pdm;
        } else {
          // Case insensitive fallback
          const [scpIns, pdmIns] = await Promise.all([
            supabase.from('sauda_check_point_details').select('*').ilike('po_no', poNoUpper),
            supabase.from('purchase_detail_master').select('*').ilike('po_no', poNoUpper)
          ]);
          filteredDetails = (scpIns.data && scpIns.data.length > 0) ? scpIns.data : (pdmIns.data || []);
        }
      }

      // 2. Query dbModule fallback if still empty
      if (!filteredDetails || filteredDetails.length === 0) {
        const [allScp, allPdm] = await Promise.all([
          dbModule.fetchAll('sauda_check_point_details').catch(() => []),
          dbModule.fetchAll('purchase_detail_master').catch(() => [])
        ]);
        const scp = (allScp || []).filter((d: any) => String(d.po_no).trim().toUpperCase() === poNoUpper);
        const pdm = (allPdm || []).filter((d: any) => String(d.po_no).trim().toUpperCase() === poNoUpper);
        filteredDetails = scp.length > 0 ? scp : pdm;
      }

      // 3. Fallback to embedded items in purchaseOrders list
      if (!filteredDetails || filteredDetails.length === 0) {
        const matchedPo = purchaseOrders.find((p: any) => String(p.po_no).trim().toUpperCase() === poNoUpper);
        if (matchedPo) {
          if (Array.isArray(matchedPo.items) && matchedPo.items.length > 0) {
            filteredDetails = matchedPo.items;
          } else if (Array.isArray(matchedPo.details) && matchedPo.details.length > 0) {
            filteredDetails = matchedPo.details;
          }
        }
      }

      if (filteredDetails && filteredDetails.length > 0) {
        const newDetails: ArrivalDetailRow[] = filteredDetails.map((fd: any, index: number) => {
          const rawGrade = String(fd.grade_code || fd.grade_name || fd.grade || '').trim();
          const matchingGrade = grades.find(g => 
            String(g.grade_code || '').trim().toUpperCase() === rawGrade.toUpperCase() || 
            String(g.grade_name || '').trim().toUpperCase() === rawGrade.toUpperCase()
          );
          const gradeName = matchingGrade ? matchingGrade.grade_name : rawGrade;
          const gradeCode = matchingGrade ? matchingGrade.grade_code : rawGrade;

          const rawMarka = String(fd.marka_code || fd.marka_name || fd.marka || fd.challan_marka_name || fd.challan_marka_code || '').trim();
          const matchingMarka = markas.find(m => 
            String(m.marka_code || '').trim().toUpperCase() === rawMarka.toUpperCase() || 
            String(m.marka_name || '').trim().toUpperCase() === rawMarka.toUpperCase()
          );
          const markaName = matchingMarka ? matchingMarka.marka_name : (rawMarka || 'NO MARK');
          const markaCode = matchingMarka ? matchingMarka.marka_code : (rawMarka || '01');

          const rawAgency = String(fd.agency_name || fd.agency || fd.agency_code || '').trim().replace(/\s*\(Code\s*\d+\)$/i, '').replace(/\s*Code\s*\d+$/i, '').trim();
          const matchingAgency = agencies.find(a =>
            String(a.agency_code || a.AGENCY_CODE || '').trim().toUpperCase() === rawAgency.toUpperCase() ||
            String(a.agency_name || a.AGENCY_NAME || '').trim().replace(/\s*\(Code\s*\d+\)$/i, '').toUpperCase() === rawAgency.toUpperCase()
          );
          const agencyName = matchingAgency ? (matchingAgency.agency_name || matchingAgency.AGENCY_NAME) : rawAgency;
          const agencyCode = matchingAgency ? (matchingAgency.agency_code || matchingAgency.AGENCY_CODE) : (fd.agency_code || rawAgency);

          const weightVal = parseFloat(fd.weight_mt || fd.netto_pnto || fd.weight || fd.weight_reduced || (fd.weight_qtl ? (parseFloat(fd.weight_qtl) / 10) : 0) || 0) || 0;
          const qtyVal = parseInt(fd.quantity || fd.quantity_rcpt || fd.quantity_chln || 0, 10) || 0;

          return {
            srl_no: index + 1,
            receipt_grade_code: gradeCode,
            receipt_grade_name: gradeName,
            crop_year: fd.crop_year || '2026-27',
            challan_grade_name: gradeName,
            agency_code: agencyCode,
            agency_name: agencyName,
            challan_marka_code: markaCode,
            challan_marka_name: markaName,
            netto_pnto: weightVal,
            quantity_chln: qtyVal,
            quantity_rcpt: qtyVal,
            phota: fd.phota || '',
            remarks: fd.remarks || ''
          };
        });
        setDetails(newDetails);
      }
    } catch (e) {
      console.warn("Error loading details from PO:", e);
    }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'arrival_no') {
      const upper = String(value || '').toUpperCase();
      if (upper.startsWith('AR0')) {
        finalValue = 'AR0' + upper.slice(3);
      } else if (upper === 'AR' || upper === 'A' || upper === '') {
        finalValue = 'AR0';
      } else {
        const suffix = upper.replace(/^(AR0?|MR0?)/i, '');
        finalValue = 'AR0' + suffix;
      }
    } else if (name === 'broker' || name === 'supplier' || name === 'challan_supplier' || name === 'arrival_area_name') {
      finalValue = (value || '').toUpperCase();
    }
    if (name === 'date' ) {
      formData.lorry_date = value;
    }
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: name.includes('weight') || name.includes('fees') ? (finalValue === '' ? '' : Number(finalValue)) : finalValue
      };
      if (name === 'challan_rr_no') {
        updated.challan_railway_receipt_no = finalValue;
      }

      if (name === 'po_no' && finalValue) {
        const matched = purchaseOrders.find((po: any) => String(po.po_no).trim().toUpperCase() === String(finalValue).trim().toUpperCase());
        if (matched) {
          updated.supplier = (matched.supplier || prev.supplier || '').toUpperCase();
          updated.challan_supplier = (matched.challan_supplier || matched.supplier || prev.challan_supplier || '').toUpperCase();
          updated.broker = (matched.broker || prev.broker || '').toUpperCase();
          updated.arrival_area_name = (matched.area || prev.arrival_area_name || '').toUpperCase();
          const matchedArea = areas.find((a: any) => String(a.area_name).trim().toUpperCase() === String(matched.area).trim().toUpperCase());
          if (matchedArea) {
            updated.arrival_area_code = matchedArea.area_code;
          }
          const matchedUnit = matched.purchase_unit_name || matched.unit_name || matched.unit || prev.unit_name || 'BALES';
          updated.unit_name = matchedUnit;
          const codeMap: Record<string, string> = {
            BALES: 'I',
            LOOSE: 'II',
            DRUMS: '2',
            'P.BALES': '4',
            'H.BALES': '5',
          };
          updated.unit_code = matched.purchase_unit_code || matched.unit_code || codeMap[matchedUnit] || prev.unit_code || 'I';
          updated.ptf = (matched.ptf_no || matched.is_ptf) ? 'Yes' : 'No';
        }
        
        // Pull details from purchase_detail_master / sauda_check_point_details
        loadDetailsFromPo(finalValue);
      }

      return updated;
    });
  };

  const handleDetailChange = (index: number, field: keyof ArrivalDetailRow, value: any) => {
    setDetails(prev => {
      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        [field]: value
      };

      // Auto-update grade labels and code when selected by Name or Code
      if (field === 'receipt_grade_code') {
        const inputCode = (value || '').trim().toUpperCase();
        const foundGrade = grades.find(g => String(g.grade_code || '').trim().toUpperCase() === inputCode);
        if (foundGrade) {
          updated[index].receipt_grade_code = foundGrade.grade_code || inputCode;
          updated[index].receipt_grade_name = foundGrade.grade_name || updated[index].receipt_grade_name;
          updated[index].challan_grade_name = foundGrade.grade_name || updated[index].challan_grade_name;
        } else {
          updated[index].receipt_grade_code = inputCode;
        }
      }

      if (field === 'receipt_grade_name') {
        const inputVal = (value || '').trim().toUpperCase();
        const foundGrade = grades.find(g =>
          String(g.grade_name || '').trim().toUpperCase() === inputVal ||
          String(g.grade_code || '').trim().toUpperCase() === inputVal
        );
        if (foundGrade) {
          updated[index].receipt_grade_code = foundGrade.grade_code || '';
          updated[index].receipt_grade_name = foundGrade.grade_name || inputVal;
          updated[index].challan_grade_name = foundGrade.grade_name || updated[index].challan_grade_name;
        } else {
          updated[index].receipt_grade_code = updated[index].receipt_grade_code || '';
          updated[index].receipt_grade_name = value ? inputVal : '';
        }
      }

      if (field === 'quantity_rcpt') {
        updated[index].quantity_rcpt = Number(value) || 0;
      }

      if (field === 'quantity_chln') {
        updated[index].quantity_chln = Number(value) || 0;
      }

      // Auto-update marka labels and code when selected by Name or Code
      if (field === 'challan_marka_code') {
        const inputCode = (value || '').trim().toUpperCase();
        const foundMarka = markas.find(m => String(m.marka_code || m.code || '').trim().toUpperCase() === inputCode);
        if (foundMarka) {
          updated[index].challan_marka_code = foundMarka.marka_code || inputCode;
          updated[index].challan_marka_name = foundMarka.marka_name || updated[index].challan_marka_name;
        } else {
          updated[index].challan_marka_code = inputCode;
        }
      }

      if (field === 'challan_marka_name') {
        const inputVal = (value || '').trim().toUpperCase();
        const foundMarka = markas.find(m =>
          String(m.marka_name || '').trim().toUpperCase() === inputVal ||
          String(m.marka_code || '').trim().toUpperCase() === inputVal
        );
        if (foundMarka) {
          updated[index].challan_marka_code = foundMarka.marka_code || '';
          updated[index].challan_marka_name = foundMarka.marka_name;
        } else {
          updated[index].challan_marka_code = updated[index].challan_marka_code || '';
          updated[index].challan_marka_name = value ? inputVal : '';
        }
      }

      if (field === 'agency_name') {
        const inputVal = (value || '').trim().replace(/\s*\(Code\s*\d+\)$/i, '').replace(/\s*Code\s*\d+$/i, '').trim().toUpperCase();
        const activeAgencies = filteredArrivalAgencies.length > 0 ? filteredArrivalAgencies : agencies;
        const foundAgency = activeAgencies.find(a =>
          String(a.agency_name || a.AGENCY_NAME || a.name || '').trim().replace(/\s*\(Code\s*\d+\)$/i, '').toUpperCase() === inputVal ||
          String(a.agency_code || a.AGENCY_CODE || a.code || '').trim().toUpperCase() === inputVal
        );
        if (foundAgency) {
          updated[index].agency_code = foundAgency.agency_code || foundAgency.AGENCY_CODE || foundAgency.code || '';
          updated[index].agency_name = foundAgency.agency_name || foundAgency.AGENCY_NAME || foundAgency.name || inputVal;
        } else {
          updated[index].agency_code = updated[index].agency_code || '';
          updated[index].agency_name = value ? inputVal : '';
        }
      }

      if (field === 'agency_code') {
        const inputCode = (value || '').trim().toUpperCase();
        const activeAgencies = filteredArrivalAgencies.length > 0 ? filteredArrivalAgencies : agencies;
        const foundAgency = activeAgencies.find(a =>
          String(a.agency_code || a.AGENCY_CODE || a.code || '').trim().toUpperCase() === inputCode
        );
        if (foundAgency) {
          updated[index].agency_code = foundAgency.agency_code || foundAgency.AGENCY_CODE || foundAgency.code || inputCode;
          updated[index].agency_name = foundAgency.agency_name || foundAgency.AGENCY_NAME || foundAgency.name || updated[index].agency_name;
        } else {
          updated[index].agency_code = inputCode;
        }
      }

      if (field === 'netto_pnto') {
        updated[index].netto_pnto = Number(value) || 0;
      }

      return updated;
    });
  };

  const clearForm = () => {
    setDetails([{
      srl_no: 1,
      receipt_grade_code: '',
      receipt_grade_name: '',
      crop_year: '2026-27',
      challan_grade_name: '',
      agency_code: '',
      agency_name: '',
      challan_marka_code: '',
      challan_marka_name: '',
      netto_pnto: 0,
      quantity_chln: 0,
      quantity_rcpt: 0,
      phota: '',
      remarks: ''
    }]);
    setFormData(prev => ({
      ...prev,
      po_no: '',
      transporter_name: '',
      challan_rr_no: '',
      lorry_prefix: '',
      lorry_suffix: '',
      pan_no: '',
      lorry_date: '',
      consignment_note_no: '',
      di_no: '',
      di_date: '',
      invoice_no: '',
      invoice_date: '',
      ptf: 'No',
      lorry_returned: 'No',
      lorry_returned_other_mill: 'No',
      way_bill_no: '',
      way_bill_date: '',
      apmc_fees: 0,
      remarks: '',
      challan_material_weight: 0,
      actual_gross_weight: 0,
      actual_tare_weight: 0,
      supplier_net_weight: 0,
      supplier_challan_gross: 0,
      supplier_tare_weight: 0,
      electronic_net_weight: 0,
      electronic_gross_weight: 0,
      electronic_tare_weight: 0,
      weight_reduced: 0
    }));
    localStorage.removeItem('amad_draft_form');
    localStorage.removeItem('amad_draft_details');
  };

  const handleSave = async () => {
    if (initialData && !enforceEditOrDeletePermission("Edit")) {
      return;
    }
    
    if(formData.arrival_no==='' || formData.arrival_no===null){
       alert('Please enter Arrival No.');
      return
    }
    if(formData.arrival_no!='' || formData.arrival_no!=null){
      const hasArrivalNo = String(formData.arrival_no || '').trim().replace(/^(MR0?|AR0?)/i, '').trim().length > 0;
      if (!hasArrivalNo) {
        alert('Please enter Arrival No.');
        return;
      }
    } 
    if(formData.date==='' || formData.date===null){
       alert('Please Enter The Arrival Date.');
      return
    }
    if(formData.challan_supplier==='' || formData.challan_supplier===null){
       alert('Please Select Challan Supplier.');
      return
    }
    if(formData.supplier==='' || formData.supplier===null){
       alert('Please Select Supplier.');
      return
    }
    if(formData.broker==='' || formData.broker===null){
       alert('Please Select Broker.');
      return
    }
    if(formData.challan_rr_no==='' || formData.challan_rr_no===null){
       alert('Please Enter The Challan No & Date.');
      return
    }
    if(formData.lorry_suffix==='' || formData.lorry_suffix===null){
       alert('Please Enter Lorry No.');
      return
    }
    if(formData.unit_name==='' || formData.unit_name===null){
       alert('Please Select Unit.');
      return
    }
    if(formData.arrival_area_name==='' || formData.arrival_area_name===null){
       alert('Please Select Area.');
      return
    }

    // Row-wise validation
    for (let i = 0; i < details.length; i++) {
      const row12 = details[i];
      if (!row12.receipt_grade_name || !String(row12.receipt_grade_name).trim() ) {
        alert(`Row ${i + 1}: Receipt Grade Name is required.`);
        return;
      }
      /* if (!row12.crop_year || !String(row12.crop_year || "").trim()) {
        alert(`Row ${i + 1}: Crop Year is required.`);
        return;
      } */
      if (!row12.agency_name || !String(row12.agency_name || "").trim()) {
        alert(`Row ${i + 1}: Agency Name is required.`);
        return;
      }
      if (!row12.netto_pnto || !String(row12.netto_pnto || "").trim()) {
        alert(`Row ${i + 1}: Net WT is required.`);
        return;
      }
    }
    
    if(formData.challan_material_weight==='' || formData.challan_material_weight===null || Number(formData.supplier_net_weight) <= 0){
       alert('Please Enter The Challan Net Weight.');
      return
    }
    if(formData.supplier_net_weight==='' || formData.supplier_net_weight===null || Number(formData.supplier_net_weight) <= 0){
       alert('Please Enter The Mill Net Weight.');
      return
    }
    if (formData.electronic_net_weight === "" || formData.electronic_net_weight == null || Number(formData.electronic_net_weight) <= 0 ) {
      alert("Please Enter The Electronic Net Weight.");
      return;
    }
    
    

    // Guard: Prohibit creating new temporary arrivals against cancelled or closed saudas
    const cleanEnteredPo = String(formData.po_no || '').trim().toUpperCase();
    const poObj = purchaseOrders.find((p: any) => String(p.po_no || '').trim().toUpperCase() === cleanEnteredPo);
    const poStatusLower = String(poObj?.status || '').trim().toLowerCase();
    const isExplicitReopened = poStatusLower !== 'closed' && poStatusLower !== 'cancelled' && (
      poObj?.is_reopened === true ||
      poObj?.reopened === true ||
      poStatusLower === 'open' ||
      Boolean(poObj?.open_remarks)
    );
    const isPoCancelled = Boolean(poObj && (poStatusLower === 'cancelled' || poObj.is_cancelled === true));
    const isPoObjClosed = Boolean(poObj && !isExplicitReopened && (poObj.is_closed === true || poStatusLower === 'closed'));
    const isPoClosed = !isExplicitReopened && (closedSaudaMap.has(cleanEnteredPo) || isPoObjClosed);

    if (!initialData && cleanEnteredPo && (isPoCancelled || isPoClosed)) {
      if (isPoCancelled) {
        alert(`🚫 Action Prohibited: Sauda / Purchase Order ${cleanEnteredPo} is CANCELLED (VOID).\n\nCancelled Saudas cannot accept any Material Receipts (MR) or Temporary Arrivals. It must first be Restored by a Level 4 user or Admin from Sauda Check Point.`);
      } else {
        alert(`🔒 Action Prohibited: Purchase Order ${cleanEnteredPo} is CLOSED.\n\nClosed P.O.s are not accepted in Temporary Arrival. It must first be Reopened by a Level 4 user or Admin from Sauda Check Point.`);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await saveTemporaryArrivalRecord({
        formData,
        details,
        initialData,
        purchaseOrders,
        closedSaudaMap,
        markas
      });

      if (!res.success) {
        alert(res.error || "Failed to save arrival record.");
        return;
      }

      if (initialData && initialData.amad_id) {
        alert(`Arrival Register Voucher ${formData.arrival_no} updated successfully!`);
      } else {
        alert(`Arrival Register Saved successfully!\nAdded under Arrival Voucher ${formData.arrival_no}`);
      }

      localStorage.removeItem('amad_draft_form');
      localStorage.removeItem('amad_draft_details');
      screenDraftService.clearDraft('amad_entry_form');
      screenDraftService.clearDraft('amad_entry_details');
      notifyDataChanged('temporary_material_received');
      notifyDataChanged('purchase_master');
      setFormData(createDefaultFormData());
      setDetails([emptyDetailRow()]);
      onSave?.(res.payload);
    } catch (e: any) {
      console.error(e);
      alert("Error saving Arrival voucher: " + (e.message || "Could not write transaction."));
    } finally {
      setLoading(false);
    }
  };

  return (
    
    <LegacyLayout title="Temporary M.R" subtitle="ARRIVAL WORKSTATION" onClose={onCancel}>
      <div className="flex-1 flex flex-col font-sans text-slate-800 space-y-5"
          onKeyDownCapture={(e) => {
            if (e.key !== "Enter") return;

            const target = e.target as HTMLElement;

            if (target.tagName === "TEXTAREA") return;

            const currentField = target.closest<HTMLElement>(
              "input, select, textarea"
            );

            if (!currentField) return;

            const skipIds = new Set([
              "po_no_1094",
              "jci_1151",
              "consignment_note_no_1368",
              "di_no_1385",
              "di_date_1394",
              "invoice_no_1413",
              "invoice_date_1422",
              "lorry_returned_other_mill_1468",
              "way_bill_no_1596",
              "way_bill_date_1605",
            ]);

            const fields = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>(
                'input:not([type="hidden"]), select, textarea'
              )
            ).filter((el) => {
              const input = el as HTMLInputElement;

              return (
                el.offsetParent !== null &&
                !input.disabled &&
                !input.readOnly &&
                el.tabIndex >= 0
              );
            });

            const currentIndex = fields.indexOf(currentField);

            if (currentIndex === -1) return;

            const nextField = fields
              .slice(currentIndex + 1)
              .find((field) => !skipIds.has(field.id));

            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();

            nextField?.focus();
          }}
        >
        <div className="relative px-6 py-4 bg-[#F7AFA8] border border-[#FBCFCB] rounded-xl flex items-center justify-between shrink-0 shadow-md overflow-hidden w-full text-white">
          {/* Background Mill Illustration Artwork on the Right with light opacity */}
          <div 
            className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none bg-no-repeat bg-right bg-contain filter brightness-200"
            style={{ backgroundImage: `url('https://res.cloudinary.com/x6tw39wi/image/upload/v1785928946/icon_vffvx9.png')` }}
          />

          <div className="relative z-10 flex flex-col gap-1">
            <h2 className="font-serif font-black text-2xl text-[#FDE7E6] tracking-tight leading-none">
              New Arrival
            </h2>
          </div>

          {/* Action Controls & Session Badge */}
          <div className="relative z-10 flex items-center gap-3">
            <button
              type="button"
              className="px-3.5 py-1.5 bg-[#D94B5A] hover:bg-[#F7AFA8] text-[#FDE7E6] border border-[#FBCFCB] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
              title="Back to Sauda Desk (Esc)"
              onClick={onCancel}
            >
              <ArrowLeft className="h-4 w-4 text-[#FDE7E6]" />
              <span>Back</span>
            </button>
            <div className="bg-[#D94B5A] border border-[#FBCFCB] px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-2xs">
              <span className="text-[#FBCFCB] font-medium">Session:</span>
              <span className="font-bold text-[#FDE7E6] font-mono text-xs">{ 'BJCL/2026-2027/'}</span>
            </div>
          </div>
        </div>

        {/* ================= Receipt Voucher Info ================= */}
        <ReceiptVoucherInfoCard
          formData={formData}
          handleChange={handleChange}
          purchaseOrders={purchaseOrders}
          closedSaudaMap={closedSaudaMap}
          initialData={initialData}
          showPoDropdown={showPoDropdown}
          setShowPoDropdown={setShowPoDropdown}
          fetchPurchaseOrders={fetchPurchaseOrders}
          onSelectPo={(po) => {
            const poSupplier = (po.supplier || po.party_name || po.merchant || '').toUpperCase();
            const poBroker = (po.broker || '').toUpperCase();
            const poChallanSupplier = (po.challan_supplier || poSupplier).toUpperCase();
            const poArea = (po.area || '').toUpperCase();

            setFormData(prev => {
              const updated = {
                ...prev,
                po_no: po.po_no,
                supplier: poSupplier || prev.supplier,
                challan_supplier: poChallanSupplier || poSupplier || prev.challan_supplier,
                broker: poBroker || prev.broker,
                arrival_area_name: poArea || prev.arrival_area_name,
                jci: 'No'
              };

              const matchedArea = areas.find((a: any) => String(a.area_name).trim().toUpperCase() === poArea);
              if (matchedArea) {
                updated.arrival_area_code = matchedArea.area_code;
              }
              if (po.purchase_unit_code) updated.unit_code = po.purchase_unit_code;
              if (po.purchase_unit_name) updated.unit_name = po.purchase_unit_name;
              if (po.ptf_no || po.is_ptf) updated.ptf = 'Yes';

              return updated;
            });

            loadDetailsFromPo(po.po_no);
            setShowPoDropdown(false);
          }}
          suppliers={suppliers}
          brokers={brokers}
        />

        {/* ================= Transport & Document Info ================= */}
        <TransportDocInfoCard
          formData={formData}
          handleChange={handleChange}
          areas={areas}
          unitList={unitList}
          setFormData={setFormData}
          setDetails={setDetails}
        />

                {/* ===========================Receipt Grade Details & Weight Information=========================== */}
        <TemporaryArrivalGrid
          details={details}
          unitName={formData.unit_name}
          grades={grades}
          agencies={filteredArrivalAgencies}
          markas={markas}
          formDataArea={formData.arrival_area_name}
          onAddRow={handleAddRow}
          onDeleteRow={handleDeleteRow}
          onDeleteRowAt={handleDeleteRowAt}
          onDetailChange={handleDetailChange}
        />

        <TemporaryArrivalWeightCard
          formData={formData}
          onChange={handleChange}
        />

        {/* Bottom Action Bar */}
        <div className="w-full rounded-xl border border-[#F7AFA8] bg-[#F7AFA8] shadow-md overflow-hidden mt-5">
          <div className="flex justify-end items-center gap-3">
            <button
              onClick={clearForm}
              className="flex items-center gap-2 h-9 px-5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow transition-all duration-200 hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Clear (F2)
            </button>

            <button
              onClick={onCancel}
              className="flex items-center gap-2 h-9 px-5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow transition-all duration-200 hover:scale-[1.02] active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
              Exit (Esc)
            </button>

            <button
              onClick={handleSave}
              disabled={loading}
              className={`flex items-center gap-2 h-9 px-6 rounded-lg text-xs font-semibold shadow transition-all duration-200 active:scale-95 ${
                loading
                  ? "bg-gray-500 text-white cursor-not-allowed"
                  : "bg-[#ffb900] hover:bg-[#e6a700] text-black"
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? "SAVING..." : "SAVE ARRIVAL"}
            </button>
          </div>
        </div>

      </div>
        <div>
          <datalist id="markas_list">
            {markas.map((m, mIdx) => (
              <option key={m.id || mIdx} value={m.marka_name} />
            ))}
          </datalist>

          <datalist id="agencies_list">
            {filteredArrivalAgencies.map((a, aIdx) => (
              <option key={a.AGENCY_NAME || aIdx} value={a.AGENCY_NAME} />
            ))}
          </datalist>
        </div>
    </LegacyLayout>
  );
}
