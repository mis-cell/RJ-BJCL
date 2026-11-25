import { useState, useEffect } from 'react';
import { BATCH_CODES } from './entryConstants';
import { 
  IssueRouteType, 
  MaterialIssueRowItem, 
  SplitTotals, 
  ReconciliationStatus 
} from './entryTypes';
import { extractRecordMrNo, areMrNumbersEqual } from '../../lib/mrNumberUtils';

interface UseMaterialIssueEntryLogicProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  items: MaterialIssueRowItem[];
  setItems: React.Dispatch<React.SetStateAction<MaterialIssueRowItem[]>>;
  issueRoute: IssueRouteType;
  setIssueRoute: (route: IssueRouteType) => void;
  finalArrivals: any[];
  godownRecords: any[];
  isEditMode: boolean;
  showToast: (msg: string) => void;
}

export function useMaterialIssueEntryLogic({
  formData,
  setFormData,
  items,
  setItems,
  issueRoute,
  setIssueRoute,
  finalArrivals,
  godownRecords,
  isEditMode,
  showToast
}: UseMaterialIssueEntryLogicProps) {
  const [selectedArrivalId, setSelectedArrivalId] = useState<string>('');
  const [arrivalMeta, setArrivalMeta] = useState<any>(null);
  const [batchOptions, setBatchOptions] = useState<string[]>([]);

  // Fetch batches from batch_master on mount with robust fallback
  useEffect(() => {
    async function loadBatches() {
      try {
        const { supabase } = await import('../../lib/supabase');
        if (supabase) {
          const { data } = await supabase
            .from('batch_master')
            .select('batch_name')
            .order('batch_name');
          if (data && data.length > 0) {
            const names = Array.from(new Set(data.map((r: any) => r.batch_name).filter(Boolean))) as string[];
            setBatchOptions(names);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch from batch_master, using fallback:', err);
      }
      setBatchOptions(Object.values(BATCH_CODES));
    }
    loadBatches();
  }, []);

  // Pre-load linked arrival / Mill Inspection MR when editing or when requisition_no changes
  useEffect(() => {
    if (formData.requisition_no) {
      const reqKey = String(formData.requisition_no || '').trim().toUpperCase();
      const matched = finalArrivals.find(
        (a) => areMrNumbersEqual(extractRecordMrNo(a), reqKey)
      );
      if (matched) {
        const canonicalMr = extractRecordMrNo(matched);
        const idVal = String(matched.id || matched.final_arrival_id || canonicalMr || '');
        if (selectedArrivalId !== idVal) {
          setSelectedArrivalId(idVal);
        }

        let parsedGrid: any[] = [];
        if (matched.grid_details) {
          if (typeof matched.grid_details === 'string') {
            try {
              parsedGrid = JSON.parse(matched.grid_details === "undefined" ? "null" : matched.grid_details);
            } catch (e) {}
          } else if (Array.isArray(matched.grid_details)) {
            parsedGrid = matched.grid_details;
          }
        }

        const computedChlnQty = (parsedGrid || []).reduce((acc: number, row: any) =>
          acc + Number(row.quantity_chln || row.quantity_rcpt || row.quantity || row.qty || row.bales || 0), 0
        );
        const enhancedMatched = {
          ...matched,
          extracted_total_chln_qty: computedChlnQty > 0 ? computedChlnQty : matched.total_packets
        };

        if (
          !arrivalMeta ||
          (!areMrNumbersEqual(extractRecordMrNo(arrivalMeta), extractRecordMrNo(matched)) &&
            arrivalMeta.final_arrival_id !== matched.final_arrival_id &&
            arrivalMeta.id !== matched.id)
        ) {
          setArrivalMeta(enhancedMatched);
        }
      } else {
        if (selectedArrivalId) setSelectedArrivalId('');
        if (arrivalMeta) setArrivalMeta(null);
      }
    } else {
      if (selectedArrivalId || arrivalMeta || isEditMode) {
        setSelectedArrivalId('');
        setArrivalMeta(null);
      }
    }
  }, [isEditMode, formData.requisition_no, finalArrivals]);

  // Auto generate voucher number based on route if not editing
  const generateRouteIssueNo = (route: 'godown' | 'mill' | 'factory') => {
    const prefix = route === 'godown' ? 'GRN' : route === 'mill' ? 'SEL' : 'RJI';
    const year = new Date().getFullYear();
    const randomNo = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}/${year}/${randomNo}`;
  };

  const chooseRoute = (route: 'godown' | 'mill' | 'factory') => {
    setIssueRoute(route);
    setFormData((prev: any) => ({
      ...prev,
      issue_no: isEditMode && prev.issue_no ? prev.issue_no : generateRouteIssueNo(route),
      godown: route === 'mill' ? (godownRecords[0]?.gdn_name || '') : prev.godown,
      party_name: route === 'mill' ? "BALLY JUTE COMPANY LIMITED" : prev.party_name
    }));

    // Seed empty details rows
    if (items.length === 0) {
      setItems([
        { srl: 1, crop: '2025-26', grade_name: 'TD5', marka: 'NO MARK', qty: 0, weight_kgs: 0, area: '', agency: '', code: '', batch_name: '', unit: 'BALES', place: '', itg_no: '', rate: 0, location_dest: '' },
        { srl: 2, crop: '2025-26', grade_name: 'TD5', marka: 'NO MARK', qty: 0, weight_kgs: 0, area: '', agency: '', code: '', batch_name: '', unit: 'BALES', place: '', itg_no: '', rate: 0, location_dest: '' },
        { srl: 3, crop: '2025-26', grade_name: 'TD5', marka: 'NO MARK', qty: 0, weight_kgs: 0, area: '', agency: '', code: '', batch_name: '', unit: 'BALES', place: '', itg_no: '', rate: 0, location_dest: '' }
      ]);
    }
  };

  const changeRoute = () => {
    if (confirm("Are you sure you want to change route? Unsaved changes will be reset.")) {
      setIssueRoute(null);
      setItems([]);
      setSelectedArrivalId('');
      setArrivalMeta(null);
    }
  };

  const loadFA = () => {
    if (!selectedArrivalId) {
      alert("Select a Final Arrival (M.R. No.) first.");
      return;
    }
    const matched = finalArrivals.find(
      (a) =>
        String(a.id || '') === String(selectedArrivalId) ||
        String(a.final_arrival_id || '') === String(selectedArrivalId) ||
        areMrNumbersEqual(extractRecordMrNo(a), selectedArrivalId)
    );
    if (matched) {
      let parsedGrid: any[] = [];
      if (matched.grid_details) {
        if (typeof matched.grid_details === 'string') {
          try {
            parsedGrid = JSON.parse(matched.grid_details === "undefined" ? "null" : matched.grid_details);
          } catch (e) {}
        } else if (Array.isArray(matched.grid_details)) {
          parsedGrid = matched.grid_details;
        }
      }

      const mappedDetails: MaterialIssueRowItem[] = (parsedGrid || []).map((row: any, idx: number) => {
        const wtMt = Number(
          row.final_receipt_wt ??
          row.reduced_weight ??
          row.receipt_gross_wt ??
          row.challan_gross_wt ??
          row.gross_weight_batch ??
          row.netto_pnto ??
          0
        );
        const weightKgs = wtMt > 0 ? Math.round(wtMt * 1000) : Number(row.weight_kgs || 0);
        return {
          srl: idx + 1,
          crop: row.crop_year || row.crop || '2026-27',
          grade_name: row.stock_grade_name || row.arrival_grade || row.receipt_grade_name || row.challan_grade_name || row.grade_name || 'TD5',
          marka: row.marks || row.marka || row.challan_marka_name || row.marka_name || 'NO MARK',
          qty: Number(row.quantity || row.quantity_rcpt || row.quantity_chln || row.qty || row.bales || row.packets || 0),
          weight_kgs: weightKgs,
          area: row.area || matched.arrival_area_name || matched.arrival_area || '',
          agency: row.agency_name || row.agency || matched.agency || '',
          code: row.stock_grade_code || row.receipt_grade_code || row.challan_marka_code || row.code || '',
          batch_name: row.batch_name || '',
          unit: row.unit || matched.unit_name || 'BALES',
          place: '',
          itg_no: '',
          rate: 0,
          location_dest: ''
        };
      });

      const computedChlnQty = (parsedGrid || []).reduce((acc: number, row: any) =>
        acc + Number(row.quantity || row.quantity_rcpt || row.quantity_chln || row.qty || row.bales || row.packets || 0), 0
      );
      const enhancedMatched = {
        ...matched,
        extracted_total_chln_qty: computedChlnQty > 0 ? computedChlnQty : matched.total_packets
      };

      if (mappedDetails.length === 0) {
        mappedDetails.push({
          srl: 1,
          crop: '2026-27',
          grade_name: 'TD5',
          marka: 'NO MARK',
          qty: Number(matched.total_packets || 0),
          weight_kgs: Math.round(Number(matched.challan_material_weight || 0) * 1000),
          area: enhancedMatched.arrival_area_name || enhancedMatched.arrival_area || '',
          agency: '',
          code: '',
          batch_name: '',
          unit: 'BALES',
          place: '',
          itg_no: '',
          rate: 0,
          location_dest: ''
        });
      }

      const mrRef = extractRecordMrNo(matched);
      setItems(mappedDetails);
      setArrivalMeta(enhancedMatched);
      setFormData((prev: any) => ({
        ...prev,
        requisition_no: mrRef,
        party_name: matched.supplier || matched.supplier_name || '',
        lorry_number: matched.lorry_number || matched.lorry_no || matched.vehicle_no || '',
        jci: matched.jci || prev.jci || 'No',
        remarks: `STOCKED POST-RECEIVE #MR-${mrRef}`
      }));
      showToast(`Loaded details from Mill Inspection M.R. #${mrRef}`);
    }
  };

  const addRow = () => {
    const nextSrl = items.length + 1;
    setItems(prev => [
      ...prev,
      {
        srl: nextSrl,
        crop: '2025-26',
        grade_name: 'TD5',
        marka: 'NO MARK',
        qty: 0,
        weight_kgs: 0,
        area: arrivalMeta?.arrival_area_name || '',
        agency: '',
        code: '',
        batch_name: '',
        unit: 'BALES',
        place: '',
        itg_no: '',
        rate: 0,
        location_dest: ''
      }
    ]);
  };

  const deleteRow = (index: number) => {
    setItems(prev => {
      const copy = prev.filter((_, i) => i !== index);
      return copy.map((item, idx) => ({ ...item, srl: idx + 1 }));
    });
  };

  const deleteLastRow = () => {
    if (items.length <= 1) return;
    setItems(prev => {
      const copy = prev.slice(0, -1);
      return copy.map((item, idx) => ({ ...item, srl: idx + 1 }));
    });
  };

  const updateRow = (index: number, field: string, val: any) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      if (field === 'code') {
        copy[index].batch_name = BATCH_CODES[val] || '';
      }
      return copy;
    });
  };

  // Split totals calculation
  const getSplitTotals = (): SplitTotals => {
    const acc: Record<string, { q: number; w: number }> = {
      BALES: { q: 0, w: 0 },
      LOOSE: { q: 0, w: 0 },
      DRUMS: { q: 0, w: 0 }
    };
    items.forEach(it => {
      const u = (it.unit || 'BALES').toUpperCase();
      const q = parseFloat(String(it.qty)) || 0;
      const w = parseFloat(String(it.weight_kgs)) || 0;
      if (acc[u]) {
        acc[u].q += q;
        acc[u].w += w;
      }
    });

    const grandQ = acc.BALES.q + acc.LOOSE.q + acc.DRUMS.q;
    const grandW = acc.BALES.w + acc.LOOSE.w + acc.DRUMS.w;
    const grandAmount = items.reduce((sum, it) => 
      sum + ((parseFloat(String(it.qty)) || 0) * (parseFloat(String(it.rate)) || 0)), 0
    );

    return {
      balesQ: acc.BALES.q,
      balesW: acc.BALES.w / 1000, // converted to MT
      looseQ: acc.LOOSE.q,
      looseW: acc.LOOSE.w / 1000,
      drumsQ: acc.DRUMS.q,
      drumsW: acc.DRUMS.w / 1000,
      grandQ,
      grandW: grandW / 1000,
      grandAmount
    };
  };

  const splitTotals = getSplitTotals();

  // Reconciliation parameters
  const getReconciliation = (): ReconciliationStatus => {
    if (!arrivalMeta) return { matchBales: true, matchWt: true, balBales: 0, balWt: 0, arrBales: 0, arrWt: 0 };
    const arrBales = Number(arrivalMeta.extracted_total_chln_qty || arrivalMeta.total_packets || arrivalMeta.packets || arrivalMeta.bales || 0);
    const arrWt = arrivalMeta.challan_material_weight !== undefined && arrivalMeta.challan_material_weight !== null
      ? Number(arrivalMeta.challan_material_weight)
      : (arrivalMeta.weight_qtl 
          ? (Number(arrivalMeta.weight_qtl) / 10) 
          : Number(arrivalMeta.total_actual_weight || arrivalMeta.total_weight_kgs || 0) / 1000); // in MT

    const balBales = arrBales - splitTotals.balesQ;
    const balWt = arrWt - splitTotals.grandW;

    const matchBales = balBales === 0;
    const matchWt = Math.abs(balWt) < 0.005;

    return {
      arrBales,
      arrWt,
      balBales,
      balWt,
      matchBales,
      matchWt
    };
  };

  const recon = getReconciliation();

  const resetAll = () => {
    if (confirm("Are you sure you want to clear this form?")) {
      setFormData((prev: any) => ({
        ...prev,
        remarks: '',
        issued_by: '',
        received_by: '',
        stack_no: '',
        jci: 'No',
        batch_order: '',
        requisition_no: '',
        lorry_number: '',
        party_name: ''
      }));
      setSelectedArrivalId('');
      setArrivalMeta(null);
      setItems([
        { srl: 1, crop: '2025-26', grade_name: 'TD5', marka: 'NO MARK', qty: 0, weight_kgs: 0, area: '', agency: '', code: '', batch_name: '', unit: 'BALES', place: '', itg_no: '', rate: 0, location_dest: '' }
      ]);
    }
  };

  return {
    selectedArrivalId,
    setSelectedArrivalId,
    arrivalMeta,
    setArrivalMeta,
    batchOptions,
    chooseRoute,
    changeRoute,
    loadFA,
    addRow,
    deleteRow,
    deleteLastRow,
    updateRow,
    splitTotals,
    recon,
    resetAll
  };
}
