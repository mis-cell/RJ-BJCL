import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrivalDetailRow, FinalArrivalEntryFormData } from './finalArrivalTypes';
import { dbModule } from '../../services/dbModule';
import { supabase } from '../../lib/supabase';
import { enforceEditOrDeletePermission } from '../../lib/permissions';
import { sanitizeDate } from '../../lib/utils';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { screenDraftService } from '../../services/screenDraftService';

interface UseFinalArrivalEntryLogicProps {
  initialData?: any;
  onSave?: (d: any) => void;
  onCancel?: () => void;
}

export function useFinalArrivalEntryLogic({ initialData, onSave }: UseFinalArrivalEntryLogicProps) {
  const [loading, setLoading] = useState(false);
  const [showTempMrDropdown, setShowTempMrDropdown] = useState(false);
  const [showPoDropdown, setShowPoDropdown] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  useKeyboardNavigation(containerRef, () => {
    handleSave();
  });

  const [brokers, setBrokers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [markas, setMarkas] = useState<any[]>([]);
  const [inspectionsList, setInspectionsList] = useState<any[]>([]);
  const [existingArrivals, setExistingArrivals] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [temporaryArrivalList, setTemporaryArrivalList] = useState<any[]>([]);
  const [unitList, setUnitList] = useState<string[]>(['BALES', 'DRUMS', 'LOOSE', 'P.BALES', 'H.BALES']);

  const getPaddedDetails = (initialFA?: any) => {
    let pDetails: any[] = [];
    const rawGrid = initialFA?.grid_details || initialFA?.details || initialFA?.items || initialFA?.raw_item?.grid_details || initialFA?.raw_item?.details;
    if (rawGrid) {
      if (typeof rawGrid === 'string') {
        try {
          const parsed = rawGrid === 'undefined' || rawGrid === 'null' ? [] : JSON.parse(rawGrid === "undefined" ? "null" : rawGrid);
          if (Array.isArray(parsed)) {
            pDetails = parsed;
          }
        } catch (e) {
          console.error("Error parsing grid_details JSON:", e);
        }
      } else if (Array.isArray(rawGrid)) {
        pDetails = rawGrid;
      }
    }
    
    // Map and sanitize all columns properly
    const mapped: ArrivalDetailRow[] = pDetails.map((d: any, idx: number) => {
      const u = (d.unit || initialFA?.unit_name || 'BALES').toString().trim().toUpperCase();
      const isLoose = u.includes('LOOSE') || u === 'LOOSE';
      const rawNetto = Number(d.netto_pnto) || Number(d.quantity_mt) || Number(d.challan_gross_wt) || Number(d.net_weight) || Number(d.weight) || 0;
      const qChln = isLoose ? 0 : (d.quantity_chln !== undefined && d.quantity_chln !== null && d.quantity_chln !== '' ? Number(d.quantity_chln) : (Number(d.quantity) || Math.round(rawNetto)));
      const qRcpt = isLoose ? 0 : (d.quantity_rcpt !== undefined && d.quantity_rcpt !== null && d.quantity_rcpt !== '' ? Number(d.quantity_rcpt) : (qChln || Number(d.quantity) || Math.round(rawNetto)));

      const rGradeCode = d.receipt_grade_code || d.grade_code || d.stock_grade_code || '';
      let rGradeName = d.receipt_grade_name || d.grade_name || d.stock_grade_name || d.arrival_grade || d.receipt_grade || '';
      if (!rGradeName && rGradeCode && grades.length > 0) {
        const matchG = grades.find(g => String(g.grade_code).trim().toUpperCase() === String(rGradeCode).trim().toUpperCase());
        if (matchG) rGradeName = matchG.grade_name;
      }
      let finalGradeCode = rGradeCode;
      if (!finalGradeCode && rGradeName && grades.length > 0) {
        const matchG = grades.find(g => String(g.grade_name).trim().toUpperCase() === String(rGradeName).trim().toUpperCase());
        if (matchG) finalGradeCode = matchG.grade_code;
      }

      let agencyName = d.agency_name || d.agency || '';
      const agencyCode = d.agency_code || '';
      if (!agencyName && agencyCode && agencies.length > 0) {
        const matchA = agencies.find(a => String(a.agency_code).trim().toUpperCase() === String(agencyCode).trim().toUpperCase());
        if (matchA) agencyName = matchA.agency_name;
      }

      let markaName = d.challan_marka_name || d.marka_name || d.marka || '';
      const markaCode = d.challan_marka_code || d.marka_code || '';
      if (!markaName && markaCode && markas.length > 0) {
        const matchM = markas.find(m => String(m.marka_code).trim().toUpperCase() === String(markaCode).trim().toUpperCase());
        if (matchM) markaName = matchM.marka_name;
      }

      const cGradeName = d.challan_grade_name || rGradeName || d.grade_name || '';

      return {
        srl_no: Number(d.srl_no) || idx + 1,
        receipt_grade_code: finalGradeCode,
        receipt_grade_name: rGradeName,
        crop_year: d.crop_year || '2026-27',
        challan_grade_name: cGradeName,
        agency_code: agencyCode,
        agency_name: agencyName,
        challan_marka_code: markaCode || '01',
        challan_marka_name: markaName || 'NO MARK',
        netto_pnto: rawNetto,
        quantity_chln: qChln,
        quantity_rcpt: qRcpt,
        unit: d.unit || u,
        remarks: d.remarks || '',
        marks_phota: d.marks_phota || ''
      };
    });

    const padded = [...mapped];
    if (padded.length === 0) {
      padded.push({
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
        unit: initialFA?.unit_name || 'BALES',
        remarks: '',
        marks_phota: ''
      });
    }
    return padded.map((row, idx) => ({ ...row, srl_no: idx + 1 }));
  };

  const [details, setDetails] = useState<ArrivalDetailRow[]>(() => getPaddedDetails(initialData));

  const [formData, setFormData] = useState<FinalArrivalEntryFormData>(() => {
    const rawInitArrNo = initialData?.final_arrival_no || initialData?.arrival_no || '';
    const formattedArrNo = rawInitArrNo
      ? (String(rawInitArrNo).toUpperCase().startsWith('MR0')
          ? String(rawInitArrNo).toUpperCase()
          : `MR0${String(rawInitArrNo).replace(/^(MR0?|AR0?|FA-?)/i, '').replace(/[^0-9]/g, '')}`)
      : 'MR0';
    return {
      financial_year: initialData?.financial_year || '2026-2027',
      arrival_no: formattedArrNo,
      mr_no: initialData?.mr_no || '',
      po_no: initialData?.po_no || '',
      po_date: initialData?.po_date || '',
      date: initialData?.date || initialData?.final_arrival_date || '',
      jci: initialData?.jci || initialData?.jci_no || 'No',
      jci_no: initialData?.jci || initialData?.jci_no || 'No',
      challan_supplier: (initialData?.challan_supplier || '').toUpperCase(),
      supplier: (initialData?.supplier || '').toUpperCase(),
      broker: (initialData?.broker || '').toUpperCase(),
      transporter_name: initialData?.transporter_name || '',
      challan_rr_no: initialData?.challan_rr_no || initialData?.challan_railway_receipt_no || initialData?.rr_gr_no || '',
      challan_railway_receipt_no: initialData?.challan_railway_receipt_no || initialData?.challan_rr_no || '',
      challan_rr_date: initialData?.challan_rr_date || '',
      lorry_number: initialData?.lorry_number || (initialData as any)?.lorry_no || (initialData as any)?.vehicle_no || '',
      pan_no: initialData?.pan_no || initialData?.part_no || '',
      part_no: initialData?.part_no || initialData?.pan_no || '',
      part_date: initialData?.part_date || '',
      consignment_note: initialData?.consignment_note || initialData?.consignment_note_no || (initialData as any)?.consignment_notice_no || '',
      consignment_note_no: initialData?.consignment_note || initialData?.consignment_note_no || (initialData as any)?.consignment_notice_no || '',
      consignment_note_date: initialData?.consignment_note_date || '',
      di_no: initialData?.di_no || '',
      di_date: initialData?.di_date || '',
      invoice_no: initialData?.invoice_no || '',
      invoice_date: initialData?.invoice_date || '',
      ptf: initialData?.ptf || initialData?.rfs || 'No',
      rfs: initialData?.rfs || initialData?.ptf || 'No',
      lorry_returned: initialData?.lorry_returned || 'No',
      lorry_returned_other_mill: initialData?.lorry_returned_other_mill || 'No',
      arrival_area_code: initialData?.arrival_area_code || '',
      arrival_area_name: (initialData?.arrival_area_name || initialData?.area || '').toUpperCase(),
      area: (initialData?.area || initialData?.arrival_area_name || '').toUpperCase(),
      unit_code: initialData?.unit_code || 'I',
      unit_name: initialData?.unit_name || 'BALES',
      way_bill_no: initialData?.way_bill_no || '',
      way_bill_date: initialData?.way_bill_date || '',
      rr_gr_no: initialData?.rr_gr_no || '',
      apmc_fees: initialData?.apmc_fees || 0,
      remarks: initialData?.remarks || '',
      temporary_arrival_no: initialData?.temporary_arrival_no || '',
      temporary_arrival_date: initialData?.temporary_arrival_date || '',

      // Weighments
      challan_material_weight: initialData?.challan_material_weight || 0,
      actual_gross_weight: initialData?.actual_gross_weight || 0,
      actual_tare_weight: initialData?.actual_tare_weight || 0,
      supplier_net_weight: initialData?.supplier_net_weight || 0,
      supplier_challan_gross: initialData?.supplier_challan_gross || 0,
      supplier_tare_weight: initialData?.supplier_tare_weight || 0,
      electronic_net_weight: initialData?.electronic_net_weight || 0,
      electronic_gross_weight: initialData?.electronic_gross_weight || 0,
      electronic_tare_weight: initialData?.electronic_tare_weight || 0,
      weight_reduced: initialData?.weight_reduced || 0
    };
  });

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
        console.warn("Failed to fetch unit_master in FinalArrivalEntry", err);
      }
    }
    loadUnits();
  }, []);

  const tempMrOptions = useMemo(() => {
    const list: any[] = [];

    const pendingTempArrivals = (temporaryArrivalList || []).filter((ta: any) => {
      const tempMrVal = String(ta.temporary_arrival_no || ta.amad_no || ta.arrival_no || '').trim().toUpperCase();
      const tempId = String(ta.id || ta.temporary_arrival_id || '').trim().toUpperCase();

      if (!tempMrVal && !tempId) return false;

      const isCurrentMatch = initialData && (
        (initialData.temporary_arrival_no && String(initialData.temporary_arrival_no).trim().toUpperCase() === tempMrVal) ||
        (initialData.arrival_no && String(initialData.arrival_no).trim().toUpperCase() === tempMrVal)
      );
      if (isCurrentMatch) return true;

      const isAlreadyFinalized = (existingArrivals || []).some((fa: any) => {
        const faTempNo = String(fa.temporary_arrival_no || fa.amad_no || '').trim().toUpperCase();
        const faArrNo = String(fa.arrival_no || fa.mr_no || '').trim().toUpperCase();
        const faTempId = String(fa.temporary_arrival_id || '').trim().toUpperCase();

        return (
          (tempMrVal && (faTempNo === tempMrVal || faArrNo === tempMrVal)) ||
          (tempId && faTempId === tempId)
        );
      });

      return !isAlreadyFinalized;
    });

    pendingTempArrivals.forEach((ta: any, idx: number) => {
      const poVal = (ta.po_no || '').trim().toUpperCase();
      const tempMrVal = (ta.temporary_arrival_no || ta.amad_no || ta.arrival_no || '').trim().toUpperCase();
      if (!tempMrVal) return;
      const supplierVal = (ta.supplier || ta.challan_supplier || '').trim();
      const lorryVal = (ta.lorry_number || ta.lorry_no || ta.vehicle_no || '').trim();
      const weightVal = ta.challan_material_weight || ta.weight_reduced || (ta.weight_qtl ? Number(ta.weight_qtl) / 10 : 0) || ta.quantity || 0;
      const dateVal = ta.date || ta.temporary_arrival_date || ta.po_date || '';

      list.push({
        id: ta.id || ta.temporary_arrival_id || `temp_${idx}`,
        temp_mr_no: tempMrVal,
        po_no: poVal,
        display_label: `Temp MR #${tempMrVal} ${poVal ? `(PO: ${poVal})` : ''} - ${supplierVal} ${lorryVal ? `[${lorryVal}]` : ''}`,
        supplier: supplierVal,
        challan_supplier: ta.challan_supplier || supplierVal,
        broker: ta.broker || '',
        lorry_number: lorryVal,
        po_date: dateVal,
        quantity: weightVal,
        source: 'temporary_material_received',
        raw_item: ta
      });
    });

    return list;
  }, [temporaryArrivalList, existingArrivals, initialData]);

  const combinedPoOptions = useMemo(() => {
    const poMap = new Map<string, any>();

    // 1. P.O.s from Temporary Arrival Section's active P.O. list (sauda_check_point / purchase_master)
    (purchaseOrders || []).forEach((po: any, idx: number) => {
      const poVal = String(po.po_no || '').trim().toUpperCase();
      if (!poVal) return;
      if (!poMap.has(poVal)) {
        const supplierVal = String(po.supplier || po.party_name || po.merchant || '').trim().toUpperCase();
        const contractMt = Number(po.total_contract_mt || po.quantity || 0);
        poMap.set(poVal, {
          id: po.po_id || po.id || `po_${idx}`,
          po_no: po.po_no,
          temp_mr_no: '',
          display_label: `P.O. #${po.po_no} - ${supplierVal} (${contractMt} MT)`,
          supplier: supplierVal,
          challan_supplier: String(po.challan_supplier || supplierVal).trim().toUpperCase(),
          broker: String(po.broker || '').trim().toUpperCase(),
          area: String(po.area || '').trim().toUpperCase(),
          lorry_number: '',
          po_date: po.po_date || po.s_date || po.date || '',
          total_contract_mt: contractMt,
          quantity: contractMt,
          is_reopened: Boolean(po.is_reopened),
          received_lorries: po.received_lorries || 0,
          contract_lorries: po.contract_lorries || 1,
          purchase_unit_code: po.purchase_unit_code || po.unit_code || '',
          purchase_unit_name: po.purchase_unit_name || po.unit_name || '',
          ptf: (po.ptf_no || po.is_ptf) ? 'Yes' : 'No',
          source: 'sauda_check_point',
          raw_item: po
        });
      }
    });

    // 2. Also include any P.O.s directly referenced in Temporary Arrival records (temporary_material_received)
    (temporaryArrivalList || []).forEach((ta: any, idx: number) => {
      const poVal = String(ta.po_no || '').trim().toUpperCase();
      if (!poVal) return;
      const tempMrVal = String(ta.temporary_arrival_no || ta.amad_no || ta.arrival_no || '').trim().toUpperCase();
      const supplierVal = String(ta.supplier || ta.challan_supplier || '').trim().toUpperCase();
      const lorryVal = String(ta.lorry_number || ta.lorry_no || ta.vehicle_no || '').trim();
      const weightVal = Number(ta.challan_material_weight || ta.weight_reduced || (ta.weight_qtl ? Number(ta.weight_qtl) / 10 : 0) || ta.quantity || 0);
      const dateVal = ta.po_date || ta.date || ta.temporary_arrival_date || '';

      if (poMap.has(poVal)) {
        const existing = poMap.get(poVal);
        if (!existing.temp_mr_no && tempMrVal) {
          existing.temp_mr_no = tempMrVal;
        }
        if (!existing.lorry_number && lorryVal) {
          existing.lorry_number = lorryVal;
        }
      } else {
        poMap.set(poVal, {
          id: ta.id || ta.temporary_arrival_id || `temp_po_${idx}`,
          po_no: poVal,
          temp_mr_no: tempMrVal,
          display_label: `P.O. #${poVal} ${tempMrVal ? `(Temp MR #${tempMrVal})` : ''} - ${supplierVal}`,
          supplier: supplierVal,
          challan_supplier: String(ta.challan_supplier || supplierVal).trim().toUpperCase(),
          broker: String(ta.broker || '').trim().toUpperCase(),
          area: String(ta.arrival_area_name || '').trim().toUpperCase(),
          lorry_number: lorryVal,
          po_date: dateVal,
          total_contract_mt: weightVal,
          quantity: weightVal,
          source: 'temporary_material_received',
          raw_item: ta
        });
      }
    });

    return Array.from(poMap.values());
  }, [purchaseOrders, temporaryArrivalList]);

  useEffect(() => {
    async function loadMastersAndIncrement() {
      try {
        const [brokData, suppData, areaData, agcData, gradeData, markaData, allArrivals, inspectionData, poData, tempPoData, tempArrivalData] = await Promise.all([
          dbModule.fetchAll('broker_master').catch(() => []),
          dbModule.fetchAll('supply_master').catch(() => []),
          dbModule.fetchAll('area_master').catch(() => []),
          dbModule.fetchAll('agency_master').catch(() => []),
          dbModule.fetchAll('grade_master').catch(() => []),
          dbModule.fetchAll('marka_master').catch(() => []),
          dbModule.fetchAll('final_arrival').catch(() => []),
          supabase ? supabase.from('material_inspection').select('*').order('created_at', { ascending: false }).then(r => r.data || []) : [],
          dbModule.fetchAll('purchase_master').catch(() => []),
          dbModule.fetchAll('sauda_check_point').catch(() => []),
          dbModule.fetchAll('temporary_material_received', 'created_at', false).catch(() => [])
        ]);

        setBrokers((brokData || []).map((b: any) => ({ ...b, brok_name: (b.brok_name || '').toUpperCase() })));
        setSuppliers((suppData || []).map((s: any) => ({ ...s, supp_name: (s.supp_name || '').toUpperCase() })));
        setAreas((areaData || []).map((a: any) => ({ ...a, area_name: (a.area_name || '').toUpperCase() })));
        setAgencies(agcData || []);
        setGrades(gradeData || []);
        setInspectionsList(inspectionData || []);
        setExistingArrivals(allArrivals || []);
        setTemporaryArrivalList(tempArrivalData || []);
        const normalizedTempPoData = (tempPoData || []).map(po => ({ ...po, status: po.status || 'temp' }));
        const mergedPos = [...(poData || []), ...normalizedTempPoData];
        const uniquePos = Array.from(new Map(mergedPos.map(po => [po.po_no, po])).values());

        setPurchaseOrders(uniquePos.filter((po: any) => {
          if (!po.po_no || po.status === 'cancelled') return false;
          
          const isCurrentMatch = initialData && initialData.po_no && String(po.po_no).trim().toUpperCase() === String(initialData.po_no).trim().toUpperCase();
          
          const pendingStr = String(po.pending ?? '').trim().toLowerCase();
          const statusStr = String(po.status ?? '').trim().toLowerCase();
          const receivedWt = parseFloat(po.received_weight_mt || po.received_mt) || 0;
          const contractWt = parseFloat(po.total_contract_mt || po.quantity) || 0;
          const isCompleted = po.pending === false || pendingStr === 'no' || pendingStr === 'false' || po.pending === 0 || statusStr === 'completed' || statusStr === 'settled' || (contractWt > 0 && receivedWt >= contractWt);

          if (isCurrentMatch) return true;
          return !isCompleted;
        }));

        const finalMarkas = markaData || [];
        setMarkas(finalMarkas);

        if (!initialData) {
          setFormData(prev => ({
            ...prev,
            arrival_no: prev.arrival_no && prev.arrival_no.startsWith('MR0') ? prev.arrival_no : 'MR0'
          }));
        }
      } catch (err) {
        console.error("Failed to load schema collections:", err);
      }
    }
    loadMastersAndIncrement();
  }, [initialData]);

  // Sync initialData changes when opening with prefilled record
  useEffect(() => {
    if (!initialData) return;
    const tempMr = initialData.temporary_arrival_no || initialData.amad_no || initialData.arrival_no || initialData.mr_no || '';
    const padded = getPaddedDetails(initialData);
    if (padded && padded.some(r => r.receipt_grade_name || r.challan_grade_name || Number(r.netto_pnto) > 0 || Number(r.quantity_chln) > 0)) {
      setDetails(padded);
    } else if (tempMr) {
      loadDetailsFromAmad(tempMr);
    }
  }, [initialData]);

  const loadDetailsFromAmad = async (tempMrNo: string) => {
    if (!tempMrNo) {
      alert("Please select or enter a Temporary M.R. Number.");
      return;
    }
    try {
      const searchVal = tempMrNo.trim().toUpperCase();
      const numOnly = searchVal.replace(/[^0-9]/g, '');

      // 1. Fetch from temporary_material_received
      let matchedAmad = temporaryArrivalList.find(a => {
        const aNo = String(a.temporary_arrival_no || a.amad_no || a.arrival_no || a.amad_id || '').trim().toUpperCase();
        const aNum = aNo.replace(/[^0-9]/g, '');
        return aNo === searchVal || (numOnly && aNum === numOnly);
      });

      if (!matchedAmad && supabase) {
        const { data } = await supabase
          .from('temporary_material_received')
          .select('*')
          .or(`temporary_arrival_no.ilike.%${searchVal}%,amad_no.ilike.%${searchVal}%${numOnly ? `,temporary_arrival_no.ilike.%${numOnly}%` : ''}`);
        if (data && data.length > 0) matchedAmad = data[0];
      }

      // 2. Also check mill_inspection_master / detail
      let matchedInsp: any = null;
      let matchedInspDetails: any[] = [];
      if (supabase) {
        const { data: dbInsp } = await supabase
          .from('mill_inspection_master')
          .select('*')
          .or(`arrival_no.ilike.%${searchVal}%,ref_arrival_no.ilike.%${searchVal}%,mr_no.ilike.%${searchVal}%`);
        if (dbInsp && dbInsp.length > 0) {
          matchedInsp = dbInsp[0];
          const { data: mDetails } = await supabase
            .from('mill_inspection_detail')
            .select('*')
            .eq('mr_no', matchedInsp.mr_no)
            .order('srl_no', { ascending: true });
          if (mDetails && mDetails.length > 0) {
            matchedInspDetails = mDetails;
          }
        }
      }

      if (!matchedAmad && !matchedInsp) {
        alert(`No Temporary M.R or Inspection record found matching "${tempMrNo}".`);
        return;
      }

      const finalPoNo = matchedAmad?.po_no || matchedInsp?.po_no || '';
      const matchedPo = purchaseOrders.find(po => String(po.po_no).trim().toUpperCase() === String(finalPoNo).trim().toUpperCase());

      // Update Form Data
      setFormData(prev => ({
        ...prev,
        temporary_arrival_no: matchedAmad?.temporary_arrival_no || matchedAmad?.amad_no || matchedInsp?.arrival_no || searchVal,
        mr_no: matchedInsp?.mr_no || matchedAmad?.temporary_arrival_no || prev.mr_no,
        temporary_arrival_date: matchedAmad?.date || matchedAmad?.temporary_arrival_date || matchedInsp?.arrival_date || prev.temporary_arrival_date,
        po_no: finalPoNo || prev.po_no,
        po_date: matchedPo?.po_date || matchedPo?.s_date || matchedAmad?.po_date || matchedAmad?.date || matchedInsp?.po_date || prev.po_date,
        jci: matchedAmad?.jci || matchedInsp?.jci || prev.jci,
        supplier: (matchedAmad?.supplier || matchedInsp?.supplier_name || matchedPo?.supplier || prev.supplier || '').toUpperCase(),
        challan_supplier: (matchedAmad?.challan_supplier || matchedAmad?.supplier || matchedInsp?.challan_supplier || matchedPo?.challan_supplier || matchedPo?.supplier || prev.challan_supplier || '').toUpperCase(),
        broker: (matchedAmad?.broker || matchedInsp?.broker_name || matchedPo?.broker || prev.broker || '').toUpperCase(),
        date: matchedAmad?.date || matchedInsp?.arrival_date || prev.date,
        lorry_number: matchedAmad?.lorry_number || matchedAmad?.lorry_no || matchedAmad?.vehicle_no || matchedInsp?.lorry_number || prev.lorry_number,
        transporter_name: matchedAmad?.transporter_name || matchedInsp?.transporter_name || prev.transporter_name,
        challan_rr_no: matchedAmad?.challan_rr_no || matchedAmad?.challan_railway_receipt_no || matchedInsp?.challan_rr_no || prev.challan_rr_no,
        challan_railway_receipt_no: matchedAmad?.challan_railway_receipt_no || matchedAmad?.challan_rr_no || matchedInsp?.challan_rr_no || prev.challan_railway_receipt_no,
        challan_rr_date: matchedAmad?.challan_rr_date || matchedAmad?.date || matchedInsp?.challan_rr_date || prev.challan_rr_date,
        pan_no: matchedAmad?.pan_no || matchedInsp?.pan_no || prev.pan_no,
        consignment_note: matchedAmad?.consignment_note || matchedAmad?.consignment_note_no || matchedInsp?.consignment_note || prev.consignment_note,
        consignment_note_no: matchedAmad?.consignment_note || matchedAmad?.consignment_note_no || matchedInsp?.consignment_note || prev.consignment_note_no,
        consignment_note_date: matchedAmad?.consignment_note_date || matchedInsp?.consignment_note_date || prev.consignment_note_date,
        di_no: matchedAmad?.di_no || matchedInsp?.di_no || prev.di_no,
        di_date: matchedAmad?.di_date || matchedInsp?.di_date || prev.di_date,
        part_date: matchedAmad?.di_date || matchedInsp?.part_date || prev.part_date,
        invoice_no: matchedAmad?.invoice_no || matchedInsp?.invoice_no || prev.invoice_no,
        invoice_date: matchedAmad?.invoice_date || matchedInsp?.invoice_date || prev.invoice_date,
        ptf: matchedAmad?.ptf || matchedInsp?.ptf || prev.ptf,
        lorry_returned: matchedAmad?.lorry_returned || matchedInsp?.lorry_returned || prev.lorry_returned,
        lorry_returned_other_mill: matchedAmad?.lorry_returned_other_mill || matchedInsp?.lorry_returned_other_mill || prev.lorry_returned_other_mill,
        arrival_area_code: matchedAmad?.arrival_area_code || matchedInsp?.arrival_area_code || prev.arrival_area_code,
        arrival_area_name: (matchedAmad?.arrival_area_name || matchedInsp?.arrival_area_name || prev.arrival_area_name || '').toUpperCase(),
        unit_code: matchedAmad?.unit_code || matchedInsp?.unit_code || prev.unit_code,
        unit_name: (matchedAmad?.unit_name || matchedInsp?.unit_name || prev.unit_name || 'BALES').toUpperCase(),
        way_bill_no: matchedAmad?.way_bill_no || matchedInsp?.way_bill_no || prev.way_bill_no,
        way_bill_date: matchedAmad?.way_bill_date || matchedInsp?.way_bill_date || prev.way_bill_date,
        apmc_fees: Number(matchedAmad?.apmc_fees ?? matchedAmad?.arival_apmc_fees ?? matchedInsp?.apmc_fees ?? matchedInsp?.arival_apmc_fees ?? prev.apmc_fees ?? 0),
        remarks: matchedAmad?.remarks || matchedInsp?.remarks || prev.remarks,
        challan_material_weight: Number(matchedAmad?.challan_material_weight) || Number(matchedInsp?.challan_material_weight) || Number(prev.challan_material_weight),
        actual_gross_weight: Number(matchedAmad?.actual_gross_weight) || Number(matchedInsp?.actual_gross_weight) || Number(prev.actual_gross_weight),
        supplier_challan_gross: Number(matchedAmad?.supplier_challan_gross) || Number(matchedInsp?.supplier_challan_gross) || Number(prev.supplier_challan_gross),
        electronic_gross_weight: Number(matchedAmad?.electronic_gross_weight) || Number(matchedInsp?.electronic_gross_weight) || Number(prev.electronic_gross_weight),
        actual_tare_weight: Number(matchedAmad?.actual_tare_weight) || Number(matchedInsp?.actual_tare_weight) || Number(prev.actual_tare_weight),
        supplier_tare_weight: Number(matchedAmad?.supplier_tare_weight) || Number(matchedInsp?.supplier_tare_weight) || Number(prev.supplier_tare_weight),
        electronic_tare_weight: Number(matchedAmad?.electronic_tare_weight) || Number(matchedInsp?.electronic_tare_weight) || Number(prev.electronic_tare_weight),
        supplier_net_weight: Number(matchedAmad?.supplier_net_weight) || Number(matchedInsp?.supplier_net_weight) || Number(prev.supplier_net_weight),
        electronic_net_weight: Number(matchedAmad?.electronic_net_weight) || Number(matchedInsp?.electronic_net_weight) || Number(prev.electronic_net_weight),
        weight_reduced: Number(matchedAmad?.weight_reduced) || Number(matchedInsp?.weight_reduced) || Number(prev.weight_reduced),
      }));

      // Grid Rows Loading:
      // Priority 1: Load directly from Temporary Arrival (matchedAmad) grid_details / Arrival Item Details Grid
      if (matchedAmad) {
        const rawGrid = matchedAmad.grid_details || matchedAmad.details || matchedAmad.items;
        const amadUnit = (matchedAmad.unit_name || matchedAmad.unit || 'BALES').toUpperCase();
        let parsedGrid: any[] = [];
        if (typeof rawGrid === 'string') {
          try { 
            const p = rawGrid === 'undefined' || rawGrid === 'null' ? [] : JSON.parse(rawGrid);
            if (Array.isArray(p)) parsedGrid = p;
          } catch (e) {}
        } else if (Array.isArray(rawGrid)) {
          parsedGrid = rawGrid;
        }

        if (parsedGrid && parsedGrid.length > 0) {
          const mappedGrid = parsedGrid.map((row: any, idx: number) => {
            const rowUnit = (row.unit || amadUnit || 'BALES').toString().trim().toUpperCase();
            const isLoose = rowUnit.includes('LOOSE') || rowUnit === 'LOOSE';
            const rawNetto = Number(row.netto_pnto) || Number(row.quantity_mt) || Number(row.challan_gross_wt) || Number(row.net_weight) || 0;
            const qChln = isLoose ? 0 : (row.quantity_chln !== undefined && row.quantity_chln !== null && row.quantity_chln !== '' ? Number(row.quantity_chln) : (Number(row.quantity) || Math.round(rawNetto)));
            const qRcpt = isLoose ? 0 : (row.quantity_rcpt !== undefined && row.quantity_rcpt !== null && row.quantity_rcpt !== '' ? Number(row.quantity_rcpt) : (qChln || Number(row.quantity) || Math.round(rawNetto)));

            // Receipt Grade Name from Temporary Arrival's Arrival Item Details Grid table
            const rGradeCode = row.receipt_grade_code || row.grade_code || row.stock_grade_code || '';
            let rGradeName = row.receipt_grade_name || row.receipt_grade || row.grade_name || row.stock_grade_name || row.arrival_grade || '';
            
            if (!rGradeName && rGradeCode && grades.length > 0) {
              const matchG = grades.find(g => String(g.grade_code).trim().toUpperCase() === String(rGradeCode).trim().toUpperCase());
              if (matchG) rGradeName = matchG.grade_name;
            }
            let finalGradeCode = rGradeCode;
            if (!finalGradeCode && rGradeName && grades.length > 0) {
              const matchG = grades.find(g => String(g.grade_name).trim().toUpperCase() === String(rGradeName).trim().toUpperCase());
              if (matchG) finalGradeCode = matchG.grade_code;
            }

            let agencyName = row.agency_name || row.agency || '';
            const agencyCode = row.agency_code || '';
            if (!agencyName && agencyCode && agencies.length > 0) {
              const matchA = agencies.find(a => String(a.agency_code).trim().toUpperCase() === String(agencyCode).trim().toUpperCase());
              if (matchA) agencyName = matchA.agency_name;
            }

            let markaName = row.challan_marka_name || row.marka_name || row.marka || '';
            const markaCode = row.challan_marka_code || row.marka_code || '';
            if (!markaName && markaCode && markas.length > 0) {
              const matchM = markas.find(m => String(m.marka_code).trim().toUpperCase() === String(markaCode).trim().toUpperCase());
              if (matchM) markaName = matchM.marka_name;
            }

            const cGradeName = row.challan_grade_name || rGradeName || row.grade_name || '';

            return {
              srl_no: Number(row.srl_no) || idx + 1,
              receipt_grade_code: finalGradeCode,
              receipt_grade_name: rGradeName,
              crop_year: row.crop_year || '2026-27',
              challan_grade_name: cGradeName,
              agency_code: agencyCode,
              agency_name: agencyName,
              challan_marka_code: markaCode || '01',
              challan_marka_name: markaName || 'NO MARK',
              netto_pnto: rawNetto,
              quantity_chln: qChln,
              quantity_rcpt: qRcpt,
              unit: row.unit || amadUnit,
              remarks: row.remarks || '',
              marks_phota: row.marks_phota || ''
            };
          });
          setDetails(mappedGrid);
          return;
        } else if (matchedAmad.variety || matchedAmad.grading || matchedAmad.receipt_grade) {
          const singleGrade = matchedAmad.variety || matchedAmad.grading || matchedAmad.receipt_grade || '';
          const matchG = grades.find(g => String(g.grade_name).trim().toUpperCase() === String(singleGrade).trim().toUpperCase() || String(g.grade_code).trim().toUpperCase() === String(singleGrade).trim().toUpperCase());
          setDetails([{
            srl_no: 1,
            receipt_grade_code: matchG ? matchG.grade_code : '',
            receipt_grade_name: matchG ? matchG.grade_name : singleGrade,
            crop_year: matchedAmad.crop_year || '2026-27',
            challan_grade_name: matchG ? matchG.grade_name : singleGrade,
            agency_code: matchedAmad.agency_code || '',
            agency_name: matchedAmad.agency_name || '',
            challan_marka_code: matchedAmad.marka_code || '01',
            challan_marka_name: matchedAmad.marka_name || matchedAmad.marka || 'NO MARK',
            netto_pnto: Number(matchedAmad.weight_qtl ? matchedAmad.weight_qtl / 10 : matchedAmad.net_weight || 0),
            quantity_chln: Number(matchedAmad.total_packets || matchedAmad.packets || 0),
            quantity_rcpt: Number(matchedAmad.total_packets || matchedAmad.packets || 0),
            unit: amadUnit,
            remarks: matchedAmad.remarks || '',
            marks_phota: ''
          }]);
          return;
        }
      }

      // Priority 2: If Inspection Detail rows exist with items, map them as fallback
      if (matchedInspDetails && matchedInspDetails.length > 0) {
        const newDetails = matchedInspDetails.map((md: any, index: number) => {
          const matchingGrade = grades.find(g => 
            String(g.grade_code).trim().toUpperCase() === String(md.stock_grade_code).trim().toUpperCase() || 
            String(g.grade_name).trim().toUpperCase() === String(md.stock_grade_code).trim().toUpperCase() ||
            String(g.grade_name).trim().toUpperCase() === String(md.arrival_grade).trim().toUpperCase()
          );
          const gradeName = matchingGrade ? matchingGrade.grade_name : (md.stock_grade_name || md.arrival_grade || '');
          const gradeCode = matchingGrade ? matchingGrade.grade_code : (md.stock_grade_code || '');

          const matchingMarka = markas.find(m => 
            String(m.marka_code).trim().toUpperCase() === String(md.marka).trim().toUpperCase() || 
            String(m.marka_name).trim().toUpperCase() === String(md.marka).trim().toUpperCase()
          );
          const markaName = matchingMarka ? matchingMarka.marka_name : (md.marka || 'NO MARK');
          const markaCode = matchingMarka ? matchingMarka.marka_code : (md.marka || '01');

          const rowUnit = (md.unit || matchedInsp?.unit_name || matchedAmad?.unit_name || 'BALES').toString().trim().toUpperCase();
          const isLoose = rowUnit.includes('LOOSE') || rowUnit === 'LOOSE';
          const rawNetto = Number(md.challan_gross_wt) || Number(md.netto_pnto) || 0;
          const qChln = isLoose ? 0 : (Number(md.quantity) || Math.round(rawNetto));
          const qRcpt = isLoose ? 0 : (Number(md.quantity) || Math.round(rawNetto));

          return {
            srl_no: index + 1,
            receipt_grade_code: gradeCode,
            receipt_grade_name: gradeName,
            crop_year: md.crop_year || '2026-27',
            challan_grade_name: gradeName,
            agency_code: '',
            agency_name: md.agency || '',
            challan_marka_code: markaCode,
            challan_marka_name: markaName,
            netto_pnto: rawNetto,
            quantity_chln: qChln,
            quantity_rcpt: qRcpt,
            unit: md.unit || rowUnit,
            remarks: md.remarks || '',
            marks_phota: md.marks_phota || ''
          };
        });
        setDetails(newDetails);
        return;
      }
    } catch (e: any) {
      console.error("Error loading Temporary M.R details:", e);
      alert("Error loading Temporary M.R details: " + (e.message || e));
    }
  };

  const loadDetailsFromInspection = async (mrNo: string) => {
    if (!mrNo) {
      alert("Please enter or select a Material Inspection M.R. Number first.");
      return;
    }
    try {
      const mrNoUpper = mrNo.trim().toUpperCase();
      let matchedInspection = inspectionsList.find(ins => String(ins.mr_no).trim().toUpperCase() === mrNoUpper);

      if (!matchedInspection && supabase) {
        const { data } = await supabase
          .from('mill_inspection_master')
          .select('*')
          .or(`mr_no.eq.${mrNoUpper},arrival_no.eq.${mrNoUpper}`);
        if (data && data.length > 0) matchedInspection = data[0];
      }

      let matchedDetails: any[] = [];
      let amadData: any = null;

      if (supabase) {
        const { data } = await supabase
          .from('mill_inspection_detail')
          .select('*')
          .eq('mr_no', mrNoUpper)
          .order('srl_no', { ascending: true });
        if (data && data.length > 0) matchedDetails = data;

        const arrNo = (matchedInspection?.arrival_no || matchedInspection?.ref_arrival_no || mrNoUpper).trim();
        const { data: tDataList } = await supabase
          .from('temporary_material_received')
          .select('*')
          .or(`temporary_arrival_no.eq.${arrNo},amad_no.eq.${arrNo},temporary_arrival_no.eq.${mrNoUpper}`);
        
        if (tDataList && tDataList.length > 0) {
          amadData = tDataList[0];
        }
      }

      if (!matchedInspection && !amadData) {
        await loadDetailsFromAmad(mrNoUpper);
        return;
      }

      const finalPoNo = matchedInspection?.po_no || amadData?.po_no || '';
      const matchedPo = purchaseOrders.find(po => String(po.po_no).trim().toUpperCase() === String(finalPoNo).trim().toUpperCase());

      setFormData(prev => ({
        ...prev,
        mr_no: matchedInspection?.mr_no || amadData?.temporary_arrival_no || mrNoUpper,
        po_no: finalPoNo || prev.po_no || '',
        po_date: matchedPo?.po_date || matchedPo?.s_date || matchedInspection?.po_date || amadData?.date || amadData?.lorry_date || prev.po_date || '',
        jci: matchedInspection?.jci || amadData?.jci || prev.jci || 'No',
        supplier: (matchedInspection?.supplier_name || amadData?.supplier || matchedPo?.supplier || prev.supplier || '').toUpperCase(),
        challan_supplier: (matchedInspection?.challan_supplier || amadData?.challan_supplier || matchedInspection?.supplier_name || matchedPo?.challan_supplier || matchedPo?.supplier || prev.challan_supplier || '').toUpperCase(),
        broker: (matchedInspection?.broker_name || amadData?.broker || matchedPo?.broker || prev.broker || '').toUpperCase(),
        date: matchedInspection?.arrival_date || amadData?.date || prev.date,
        lorry_number: (matchedInspection as any)?.lorry_number || (matchedInspection as any)?.lorry_no || (matchedInspection as any)?.vehicle_no || (amadData as any)?.lorry_number || (amadData as any)?.lorry_no || (amadData as any)?.vehicle_no || prev.lorry_number,
        transporter_name: matchedInspection?.transporter_name || amadData?.transporter_name || prev.transporter_name,
        challan_rr_no: matchedInspection?.challan_rr_no || (matchedInspection as any)?.challan_railway_receipt_no || amadData?.challan_rr_no || amadData?.challan_railway_receipt_no || prev.challan_rr_no,
        challan_railway_receipt_no: (matchedInspection as any)?.challan_railway_receipt_no || matchedInspection?.challan_rr_no || amadData?.challan_railway_receipt_no || amadData?.challan_rr_no || prev.challan_railway_receipt_no,
        challan_rr_date: matchedInspection?.challan_rr_date || amadData?.lorry_date || prev.challan_rr_date,
        pan_no: matchedInspection?.pan_no || amadData?.pan_no || prev.pan_no,
        consignment_note: (matchedInspection as any)?.consignment_note || matchedInspection?.consignment_note_no || (matchedInspection as any)?.consignment_no || amadData?.consignment_note || amadData?.consignment_note_no || prev.consignment_note,
        consignment_note_no: (matchedInspection as any)?.consignment_note || matchedInspection?.consignment_note_no || (matchedInspection as any)?.consignment_no || amadData?.consignment_note || amadData?.consignment_note_no || prev.consignment_note_no,
        consignment_note_date: (matchedInspection as any)?.consignment_note_date || (matchedInspection as any)?.consignment_date || amadData?.consignment_note_date || prev.consignment_note_date,
        di_no: matchedInspection?.di_no || amadData?.di_no || prev.di_no,
        di_date: matchedInspection?.di_date || amadData?.di_date || prev.di_date,
        part_date: matchedInspection?.part_date || amadData?.part_date || prev.part_date,
        invoice_no: matchedInspection?.invoice_no || amadData?.invoice_no || prev.invoice_no,
        invoice_date: matchedInspection?.invoice_date || amadData?.invoice_date || prev.invoice_date,
        ptf: matchedInspection?.ptf || amadData?.ptf || prev.ptf,
        lorry_returned: matchedInspection?.lorry_returned || amadData?.lorry_returned || prev.lorry_returned,
        lorry_returned_other_mill: matchedInspection?.lorry_returned_other_mill || amadData?.lorry_returned_other_mill || prev.lorry_returned_other_mill,
        arrival_area_code: matchedInspection?.arrival_area_code || amadData?.arrival_area_code || prev.arrival_area_code,
        arrival_area_name: matchedInspection?.arrival_area_name || amadData?.arrival_area_name || prev.arrival_area_name,
        unit_code: matchedInspection?.unit_code || amadData?.unit_code || prev.unit_code,
        unit_name: matchedInspection?.unit_name || amadData?.unit_name || prev.unit_name,
        way_bill_no: matchedInspection?.way_bill_no || amadData?.way_bill_no || prev.way_bill_no,
        way_bill_date: matchedInspection?.way_bill_date || amadData?.way_bill_date || prev.way_bill_date,
        apmc_fees: Number(matchedInspection?.apmc_fees ?? (matchedInspection as any)?.arival_apmc_fees ?? amadData?.apmc_fees ?? (amadData as any)?.arival_apmc_fees ?? prev.apmc_fees ?? 0),
        remarks: matchedInspection?.remarks || amadData?.remarks || prev.remarks,
        temporary_arrival_no: matchedInspection?.arrival_no || amadData?.temporary_arrival_no || amadData?.amad_no || prev.temporary_arrival_no,
        temporary_arrival_date: matchedInspection?.arrival_date || amadData?.date || prev.temporary_arrival_date,
        challan_material_weight: Number(matchedInspection?.challan_material_weight) || Number(amadData?.challan_material_weight) || Number(prev.challan_material_weight),
        actual_gross_weight: Number(matchedInspection?.actual_gross_weight) || Number(amadData?.actual_gross_weight) || Number(prev.actual_gross_weight),
        actual_tare_weight: Number(matchedInspection?.actual_tare_weight) || Number(amadData?.actual_tare_weight) || Number(prev.actual_tare_weight),
        supplier_net_weight: Number(matchedInspection?.supplier_net_weight) || Number(amadData?.supplier_net_weight) || Number(prev.supplier_net_weight),
        supplier_challan_gross: Number(matchedInspection?.supplier_challan_gross) || Number(amadData?.supplier_challan_gross) || Number(prev.supplier_challan_gross),
        supplier_tare_weight: Number(matchedInspection?.supplier_tare_weight) || Number(amadData?.supplier_tare_weight) || Number(prev.supplier_tare_weight),
        electronic_net_weight: Number(matchedInspection?.electronic_net_weight) || Number(amadData?.electronic_net_weight) || Number(prev.electronic_net_weight),
        electronic_gross_weight: Number(matchedInspection?.electronic_gross_weight) || Number(amadData?.electronic_gross_weight) || Number(prev.electronic_gross_weight),
        electronic_tare_weight: Number(matchedInspection?.electronic_tare_weight) || Number(amadData?.electronic_tare_weight) || Number(prev.electronic_tare_weight),
        weight_reduced: Number(matchedInspection?.weight_reduced) || Number(amadData?.weight_reduced) || Number(prev.weight_reduced)
      }));

      // Priority 1: Map from Temporary Arrival (amadData) Arrival Item Details Grid if exists
      let amadMappedGrid: any[] = [];
      if (amadData) {
        const rawGrid = amadData.grid_details || amadData.details || amadData.items;
        const amadUnit = (amadData.unit_name || amadData.unit || 'BALES').toUpperCase();
        let parsedGrid: any[] = [];
        if (typeof rawGrid === 'string') {
          try { 
            const p = rawGrid === 'undefined' || rawGrid === 'null' ? [] : JSON.parse(rawGrid);
            if (Array.isArray(p)) parsedGrid = p;
          } catch (e) {}
        } else if (Array.isArray(rawGrid)) {
          parsedGrid = rawGrid;
        }

        if (parsedGrid && parsedGrid.length > 0) {
          amadMappedGrid = parsedGrid.map((row: any, idx: number) => {
            const rowUnit = (row.unit || amadUnit || 'BALES').toString().trim().toUpperCase();
            const isLoose = rowUnit.includes('LOOSE') || rowUnit === 'LOOSE';
            const rawNetto = Number(row.netto_pnto) || Number(row.quantity_mt) || Number(row.challan_gross_wt) || Number(row.net_weight) || 0;
            const qChln = isLoose ? 0 : (row.quantity_chln !== undefined && row.quantity_chln !== null && row.quantity_chln !== '' ? Number(row.quantity_chln) : (Number(row.quantity) || Math.round(rawNetto)));
            const qRcpt = isLoose ? 0 : (row.quantity_rcpt !== undefined && row.quantity_rcpt !== null && row.quantity_rcpt !== '' ? Number(row.quantity_rcpt) : (qChln || Number(row.quantity) || Math.round(rawNetto)));

            const rGradeCode = row.receipt_grade_code || row.grade_code || row.stock_grade_code || '';
            let rGradeName = row.receipt_grade_name || row.receipt_grade || row.grade_name || row.stock_grade_name || row.arrival_grade || '';
            
            if (!rGradeName && rGradeCode && grades.length > 0) {
              const matchG = grades.find(g => String(g.grade_code).trim().toUpperCase() === String(rGradeCode).trim().toUpperCase());
              if (matchG) rGradeName = matchG.grade_name;
            }
            let finalGradeCode = rGradeCode;
            if (!finalGradeCode && rGradeName && grades.length > 0) {
              const matchG = grades.find(g => String(g.grade_name).trim().toUpperCase() === String(rGradeName).trim().toUpperCase());
              if (matchG) finalGradeCode = matchG.grade_code;
            }

            let agencyName = row.agency_name || row.agency || '';
            const agencyCode = row.agency_code || '';
            if (!agencyName && agencyCode && agencies.length > 0) {
              const matchA = agencies.find(a => String(a.agency_code).trim().toUpperCase() === String(agencyCode).trim().toUpperCase());
              if (matchA) agencyName = matchA.agency_name;
            }

            let markaName = row.challan_marka_name || row.marka_name || row.marka || '';
            const markaCode = row.challan_marka_code || row.marka_code || '';
            if (!markaName && markaCode && markas.length > 0) {
              const matchM = markas.find(m => String(m.marka_code).trim().toUpperCase() === String(markaCode).trim().toUpperCase());
              if (matchM) markaName = matchM.marka_name;
            }

            const cGradeName = row.challan_grade_name || rGradeName || row.grade_name || '';

            return {
              srl_no: Number(row.srl_no) || idx + 1,
              receipt_grade_code: finalGradeCode,
              receipt_grade_name: rGradeName,
              crop_year: row.crop_year || '2026-27',
              challan_grade_name: cGradeName,
              agency_code: agencyCode,
              agency_name: agencyName,
              challan_marka_code: markaCode || '01',
              challan_marka_name: markaName || 'NO MARK',
              netto_pnto: rawNetto,
              quantity_chln: qChln,
              quantity_rcpt: qRcpt,
              unit: row.unit || amadUnit,
              remarks: row.remarks || '',
              marks_phota: row.marks_phota || ''
            };
          });
        }
      }

      if (amadMappedGrid.length > 0) {
        setDetails(amadMappedGrid);
        return;
      }

      // Priority 2: Map from Inspection Details
      if (matchedDetails && matchedDetails.length > 0) {
        const newDetails = matchedDetails.map((md: any, index: number) => {
          const matchingGrade = grades.find(g => 
            String(g.grade_code).trim().toUpperCase() === String(md.stock_grade_code).trim().toUpperCase() || 
            String(g.grade_name).trim().toUpperCase() === String(md.stock_grade_code).trim().toUpperCase() ||
            String(g.grade_name).trim().toUpperCase() === String(md.arrival_grade).trim().toUpperCase()
          );
          const gradeName = matchingGrade ? matchingGrade.grade_name : (md.stock_grade_name || md.arrival_grade || '');
          const gradeCode = matchingGrade ? matchingGrade.grade_code : (md.stock_grade_code || '');

          const matchingMarka = markas.find(m => 
            String(m.marka_code).trim().toUpperCase() === String(md.marka).trim().toUpperCase() || 
            String(m.marka_name).trim().toUpperCase() === String(md.marka).trim().toUpperCase()
          );
          const markaName = matchingMarka ? matchingMarka.marka_name : (md.marka || 'NO MARK');
          const markaCode = matchingMarka ? matchingMarka.marka_code : (md.marka || '01');

          const rowUnit = (md.unit || matchedInspection?.unit_name || amadData?.unit_name || formData.unit_name || 'BALES').toString().trim().toUpperCase();
          const isLoose = rowUnit.includes('LOOSE') || rowUnit === 'LOOSE';
          const rawNetto = Number(md.challan_gross_wt) || Number(md.netto_pnto) || 0;

          return {
            srl_no: index + 1,
            receipt_grade_code: gradeCode,
            receipt_grade_name: gradeName,
            crop_year: md.crop_year || '2026-27',
            challan_grade_name: gradeName,
            agency_code: '',
            agency_name: md.agency || '',
            challan_marka_code: markaCode,
            challan_marka_name: markaName,
            netto_pnto: rawNetto,
            quantity_chln: isLoose ? 0 : (Number(md.quantity) || Math.round(rawNetto)),
            quantity_rcpt: isLoose ? 0 : (Number(md.quantity) || Math.round(rawNetto)),
            unit: md.unit || rowUnit,
            remarks: '',
            marks_phota: md.marks_phota || ''
          };
        });
        setDetails(newDetails);
      }
    } catch (e: any) {
      alert("Error loading inspection records: " + e.message);
    }
  };

  const loadDetailsFromPo = async (poNo: string) => {
    if (!poNo) return;
    try {
      const poNoUpper = poNo.trim().toUpperCase();
      let filteredDetails: any[] = [];

      if (supabase) {
        const [pdmRes, scpRes] = await Promise.all([
          supabase.from('purchase_detail_master').select('*').eq('po_no', poNo.trim()),
          supabase.from('sauda_check_point_details').select('*').eq('po_no', poNo.trim())
        ]);
        const pdm = pdmRes.data || [];
        const scp = scpRes.data || [];

        if (pdm.length > 0) {
          filteredDetails = pdm;
        } else if (scp.length > 0) {
          filteredDetails = scp;
        } else {
          const [pdmIns, scpIns] = await Promise.all([
            supabase.from('purchase_detail_master').select('*').ilike('po_no', poNoUpper),
            supabase.from('sauda_check_point_details').select('*').ilike('po_no', poNoUpper)
          ]);
          filteredDetails = (pdmIns.data && pdmIns.data.length > 0) ? pdmIns.data : (scpIns.data || []);
        }
      }

      if (!filteredDetails || filteredDetails.length === 0) {
        const [allPdm, allScp] = await Promise.all([
          dbModule.fetchAll('purchase_detail_master').catch(() => []),
          dbModule.fetchAll('sauda_check_point_details').catch(() => [])
        ]);
        const pdm = (allPdm || []).filter((d: any) => String(d.po_no).trim().toUpperCase() === poNoUpper);
        const scp = (allScp || []).filter((d: any) => String(d.po_no).trim().toUpperCase() === poNoUpper);
        filteredDetails = pdm.length > 0 ? pdm : scp;
      }

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
          let gradeName = fd.grade_name || fd.variety || fd.item_name || '';
          const gradeCode = fd.grade_code || fd.item_code || '';
          if (!gradeName && gradeCode && grades.length > 0) {
            const matchG = grades.find(g => String(g.grade_code).trim().toUpperCase() === String(gradeCode).trim().toUpperCase());
            if (matchG) gradeName = matchG.grade_name;
          }
          let markaName = fd.marka_name || fd.marka || '';
          const markaCode = fd.marka_code || '';
          if (!markaName && markaCode && markas.length > 0) {
            const matchM = markas.find(m => String(m.marka_code).trim().toUpperCase() === String(markaCode).trim().toUpperCase());
            if (matchM) markaName = matchM.marka_name;
          }
          let agencyName = fd.agency_name || fd.agency || '';
          const agencyCode = fd.agency_code || '';
          if (!agencyName && agencyCode && agencies.length > 0) {
            const matchA = agencies.find(a => String(a.agency_code).trim().toUpperCase() === String(agencyCode).trim().toUpperCase());
            if (matchA) agencyName = matchA.agency_name;
          }

          const nettoVal = Number(fd.quantity_mt || fd.quantity || fd.netto_pnto || 0);
          const rowUnit = (fd.unit || formData.unit_name || 'BALES').toString().trim().toUpperCase();
          const isLoose = rowUnit.includes('LOOSE') || rowUnit === 'LOOSE';

          return {
            srl_no: index + 1,
            receipt_grade_code: gradeCode,
            receipt_grade_name: gradeName,
            crop_year: fd.crop_year || '2026-27',
            challan_grade_name: gradeName,
            agency_code: agencyCode,
            agency_name: agencyName,
            challan_marka_code: markaCode || '01',
            challan_marka_name: markaName || 'NO MARK',
            netto_pnto: nettoVal,
            quantity_chln: isLoose ? 0 : Math.round(nettoVal),
            quantity_rcpt: isLoose ? 0 : Math.round(nettoVal),
            unit: fd.unit || rowUnit,
            remarks: fd.remarks || ''
          };
        });
        setDetails(newDetails);
      }
    } catch (err) {
      console.warn("Error loading details from PO:", err);
    }
  };

  const handleInputChange = (field: string, val: any) => {
    let finalVal = val;
    if (field === 'arrival_no') {
      const upper = String(val || '').toUpperCase();
      if (upper.startsWith('MR0')) {
        finalVal = 'MR0' + upper.slice(3).replace(/[^0-9]/g, '');
      } else if (upper === 'MR' || upper === 'M' || upper === '') {
        finalVal = 'MR0';
      } else {
        const suffix = upper.replace(/^(MR0?|AR0?|FA-?)/i, '').replace(/[^0-9]/g, '');
        finalVal = 'MR0' + suffix;
      }
    }

    setFormData(prev => {
      const next = { ...prev, [field]: finalVal };
      if (field === 'consignment_note') {
        next.consignment_note_no = finalVal;
      } else if (field === 'consignment_note_no') {
        next.consignment_note = finalVal;
      } else if (field === 'challan_rr_no') {
        next.challan_railway_receipt_no = finalVal;
      } else if (field === 'challan_railway_receipt_no') {
        next.challan_rr_no = finalVal;
      }

      if (field === 'unit_name') {
        const uUpper = String(finalVal || '').trim().toUpperCase();
        const isLoose = uUpper.includes('LOOSE') || uUpper === 'LOOSE';
        setDetails(prevRows => prevRows.map(r => ({
          ...r,
          unit: uUpper,
          ...(isLoose ? { quantity_chln: 0, quantity_rcpt: 0 } : {})
        })));
      }

      if (field === 'po_no' && finalVal) {
        const valUpper = String(finalVal).trim().toUpperCase();
        const matched = purchaseOrders.find(po => String(po.po_no).trim().toUpperCase() === valUpper);
        if (matched) {
          next.po_date = matched.po_date || matched.s_date || matched.date || next.po_date;
          next.supplier = (matched.supplier || matched.party_name || matched.merchant || next.supplier || '').toUpperCase();
          next.challan_supplier = (matched.challan_supplier || matched.supplier || matched.party_name || matched.merchant || next.challan_supplier || '').toUpperCase();
          next.broker = (matched.broker || next.broker || '').toUpperCase();
          next.arrival_area_name = (matched.area || next.arrival_area_name || '').toUpperCase();
          const matchedArea = areas.find(a => String(a.area_name).trim().toUpperCase() === String(matched.area).trim().toUpperCase());
          if (matchedArea) {
            next.arrival_area_code = matchedArea.area_code;
          }
        }
        const matchedTemp = temporaryArrivalList.find((t: any) => String(t.po_no || '').trim().toUpperCase() === valUpper && Number(t.apmc_fees ?? t.arival_apmc_fees ?? 0) > 0);
        if (matchedTemp && !Number(next.apmc_fees)) {
          next.apmc_fees = Number(matchedTemp.apmc_fees ?? matchedTemp.arival_apmc_fees ?? 0);
        }
        if (!next.temporary_arrival_no && (!details || details.length === 0 || !details.some(d => d.receipt_grade_name || d.netto_pnto > 0))) {
          loadDetailsFromPo(valUpper);
        }
      }
      return next;
    });
  };

  const handleSelectTempMrOption = (item: any) => {
    if (!item || !item.temp_mr_no) return;
    handleInputChange('temporary_arrival_no', item.temp_mr_no);
    loadDetailsFromAmad(item.temp_mr_no);
    setShowTempMrDropdown(false);
  };

  const handleSelectPoOption = (item: any) => {
    handleInputChange('po_no', item.po_no);
    if (item.supplier) handleInputChange('supplier', item.supplier);
    if (item.challan_supplier) handleInputChange('challan_supplier', item.challan_supplier);
    if (item.broker) handleInputChange('broker', item.broker);
    if (item.po_date) handleInputChange('po_date', item.po_date);
    if (item.area) handleAreaChange(item.area);
    if (item.purchase_unit_name) handleInputChange('unit_name', item.purchase_unit_name);
    if (item.ptf) handleInputChange('ptf', item.ptf);

    if (item.po_no && (!details || details.length === 0 || !details.some(d => d.receipt_grade_name || d.netto_pnto > 0))) {
      loadDetailsFromPo(item.po_no);
    }
    setShowPoDropdown(false);
  };

  const handleAreaChange = (val: string) => {
    const upperVal = val.toUpperCase();
    setFormData(prev => {
      const matched = areas.find(a => String(a.area_name).toUpperCase() === upperVal || `${a.area_code} - ${a.area_name}`.toUpperCase() === upperVal);
      return {
        ...prev,
        arrival_area_name: matched ? String(matched.area_name).toUpperCase() : upperVal,
        arrival_area_code: matched ? matched.area_code : prev.arrival_area_code
      };
    });
  };

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
        unit: formData.unit_name || 'BALES',
        remarks: '',
        marks_phota: ''
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

  const handleRowChange = (index: number, field: keyof ArrivalDetailRow, val: any) => {
    const updatedDetails = [...details];
    
    if (field === 'unit') {
      const uUpper = String(val || '').trim().toUpperCase();
      const isLoose = uUpper.includes('LOOSE') || uUpper === 'LOOSE';
      updatedDetails[index] = {
        ...updatedDetails[index],
        unit: uUpper,
        ...(isLoose ? { quantity_chln: 0, quantity_rcpt: 0 } : {})
      };
    } else if (field === 'receipt_grade_name' || field === 'receipt_grade_code') {
      const valStr = String(val || '').trim();
      const matchG = grades.find(g => 
        String(g.grade_code).trim().toUpperCase() === valStr.toUpperCase() || 
        String(g.grade_name).trim().toUpperCase() === valStr.toUpperCase()
      );
      const finalCode = matchG ? matchG.grade_code : (field === 'receipt_grade_code' ? valStr : (updatedDetails[index].receipt_grade_code || ''));
      const finalName = matchG ? matchG.grade_name : valStr;
      updatedDetails[index] = {
        ...updatedDetails[index],
        receipt_grade_code: finalCode,
        receipt_grade_name: finalName,
        challan_grade_name: updatedDetails[index].challan_grade_name || finalName
      };
    } else if (field === 'agency_name' || field === 'agency_code') {
      const valStr = String(val || '').trim();
      const matchA = agencies.find(a => 
        String(a.agency_code).trim().toUpperCase() === valStr.toUpperCase() || 
        String(a.agency_name).trim().toUpperCase() === valStr.toUpperCase()
      );
      updatedDetails[index] = {
        ...updatedDetails[index],
        agency_code: matchA ? matchA.agency_code : (field === 'agency_code' ? valStr : (updatedDetails[index].agency_code || '')),
        agency_name: matchA ? matchA.agency_name : valStr
      };
    } else if (field === 'challan_marka_name' || field === 'challan_marka_code') {
      const valStr = String(val || '').trim();
      const matchM = markas.find(m => 
        String(m.marka_code).trim().toUpperCase() === valStr.toUpperCase() || 
        String(m.marka_name).trim().toUpperCase() === valStr.toUpperCase()
      );
      updatedDetails[index] = {
        ...updatedDetails[index],
        challan_marka_code: matchM ? matchM.marka_code : (field === 'challan_marka_code' ? valStr : (updatedDetails[index].challan_marka_code || '')),
        challan_marka_name: matchM ? matchM.marka_name : valStr
      };
    } else {
      updatedDetails[index] = {
        ...updatedDetails[index],
        [field]: val
      };
    }
    
    setDetails(updatedDetails);
  };

  const calculatedLowestNetWeight = useMemo(() => {
    const elecNet = (Number(formData.electronic_gross_weight) || Number(formData.actual_gross_weight) || 0) - (Number(formData.electronic_tare_weight) || Number(formData.actual_tare_weight) || 0);
    const suppNet = (Number(formData.supplier_challan_gross) || 0) - (Number(formData.supplier_tare_weight) || 0);
    const nets = [
      Number(formData.electronic_net_weight),
      elecNet > 0 ? elecNet : 0,
      Number(formData.supplier_net_weight),
      suppNet > 0 ? suppNet : 0,
      Number(formData.challan_material_weight),
      Number(formData.weight_reduced)
    ].filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
    return nets.length > 0 ? Math.min(...nets) : '';
  }, [
    formData.electronic_net_weight,
    formData.electronic_gross_weight,
    formData.electronic_tare_weight,
    formData.actual_gross_weight,
    formData.actual_tare_weight,
    formData.supplier_net_weight,
    formData.supplier_challan_gross,
    formData.supplier_tare_weight,
    formData.challan_material_weight,
    formData.weight_reduced
  ]);

  const finalWeightDisplayValue = (formData.weight_reduced !== undefined && formData.weight_reduced !== null && Number(formData.weight_reduced) !== 0)
    ? formData.weight_reduced
    : calculatedLowestNetWeight;

  // Auto-calculate NETTO (M.T) for rows where UNIT is BALES (not LOOSE): (RCPT / Total RCPT) * Final Weight (M.TON)
  useEffect(() => {
    const finalWeight = Number(finalWeightDisplayValue) || 0;

    const isBalesRow = (row: ArrivalDetailRow) => {
      const u = (row.unit || formData.unit_name || 'BALES').toString().trim().toUpperCase();
      return u.includes('BALE') || u === 'BALES' || (!u.includes('LOOSE') && u !== 'LOOSE');
    };

    const getRowRcpt = (r: ArrivalDetailRow) => {
      const u = (r.unit || formData.unit_name || 'BALES').toString().trim().toUpperCase();
      if (u.includes('LOOSE') || u === 'LOOSE') return 0;
      return Number(r.quantity_rcpt) || Number(r.quantity_chln) || 0;
    };

    const balesIndices = details
      .map((r, i) => (isBalesRow(r) && getRowRcpt(r) > 0 ? i : -1))
      .filter(i => i !== -1);

    const sumRcpt = balesIndices.reduce((sum, idx) => sum + getRowRcpt(details[idx]), 0);

    let needsUpdate = false;
    let allocatedNetto = 0;

    const updated = details.map((row, index) => {
      const u = (row.unit || formData.unit_name || 'BALES').toString().trim().toUpperCase();
      const isLoose = u.includes('LOOSE') || u === 'LOOSE';

      if (isLoose) {
        if (row.quantity_chln !== 0 || row.quantity_rcpt !== 0) {
          needsUpdate = true;
          return { ...row, quantity_chln: 0, quantity_rcpt: 0 };
        }
        return row;
      }

      if (!isBalesRow(row)) return row;

      const rcpt = getRowRcpt(row);
      if (rcpt <= 0 || sumRcpt <= 0 || finalWeight <= 0) {
        if (Number(row.netto_pnto) !== 0) {
          needsUpdate = true;
          return { ...row, netto_pnto: 0 };
        }
        return row;
      }

      const isLastBalesRow = index === balesIndices[balesIndices.length - 1];
      let calculatedNetto = 0;
      if (isLastBalesRow) {
        calculatedNetto = Math.round((finalWeight - allocatedNetto) * 1000) / 1000;
        calculatedNetto = Math.max(0, calculatedNetto);
      } else {
        calculatedNetto = Math.round(((rcpt / sumRcpt) * finalWeight) * 1000) / 1000;
        allocatedNetto += calculatedNetto;
      }

      if (Number(row.netto_pnto) !== calculatedNetto) {
        needsUpdate = true;
        return { ...row, netto_pnto: calculatedNetto };
      }
      return row;
    });

    if (needsUpdate) {
      setDetails(updated);
    }
  }, [finalWeightDisplayValue, formData.unit_name, details]);

  const handleSave = async () => {
    if (initialData && !enforceEditOrDeletePermission("Edit")) {
      return;
    }
    if(formData.temporary_arrival_no==='' || formData.temporary_arrival_no===null){
        alert("Please Select Temporary Arrival No.");
      return
    }
    const cleanArrivalNo = String(formData.arrival_no || '').trim().replace(/^MR0?/i, '').trim();
    if (!formData.arrival_no || !cleanArrivalNo) {
      alert("Arrival No. is mandatory.");
      return;
    }
    if (formData.date==='' || formData.date===null) {
      alert("Please Enter The  Arrival Date.");
      return;
    }
    for (let i = 0; i < details.length; i++) {
      const row12 = details[i];
      if (!row12.receipt_grade_name || !String(row12.receipt_grade_name).trim() ) {
        alert(`Row ${i + 1}: Receipt Grade Name is required.`);
        return;
      }
      if (!row12.crop_year || !String(row12.crop_year || "").trim()) {
        alert(`Row ${i + 1}: Crop Year is required.`);
        return;
      }
      if (!row12.agency_name || !String(row12.agency_name || "").trim()) {
        alert(`Row ${i + 1}: Agency Name is required.`);
        return;
      }
      if (!row12.netto_pnto || !String(row12.netto_pnto || "").trim()) {
        alert(`Row ${i + 1}: Net WT is required.`);
        return;
      }
    }
    /* if(formData.challan_material_weight==='' || formData.challan_material_weight===null || Number(formData.supplier_net_weight) <= 0){
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
    } */
    

    setLoading(true);
    try {
      const activeRows = details.filter(d => 
        d.receipt_grade_name || d.receipt_grade_code || d.challan_grade_name || Number(d.netto_pnto) > 0 || Number(d.quantity_chln) > 0 || Number(d.quantity_rcpt) > 0
      );

      const totalPacketsSum = activeRows.reduce((acc, curr) => {
        const u = (curr.unit || formData.unit_name || '').toString().trim().toUpperCase();
        const isLoose = u.includes('LOOSE') || u === 'LOOSE';
        if (isLoose) return acc;
        return acc + (Number(curr.quantity_rcpt) || Number(curr.quantity_chln) || 0);
      }, 0);
      const totalWeightSum = activeRows.reduce((acc, curr) => acc + (Number(curr.netto_pnto) || 0), 0);

      const isHeaderLoose = (formData.unit_name || '').toString().trim().toUpperCase().includes('LOOSE');
      const payload = {
        financial_year: formData.financial_year,
        final_arrival_no: formData.arrival_no,
        arrival_no: formData.arrival_no,
        final_arrival_date: sanitizeDate(formData.date),
        arrival_date: sanitizeDate(formData.date),
        mr_no: formData.mr_no || null,
        po_no: formData.po_no || null,
        po_date: sanitizeDate(formData.po_date),
        date: sanitizeDate(formData.date),
        jci: formData.jci || 'No',
        jci_no: formData.jci || 'No',
        challan_supplier: formData.challan_supplier,
        supplier: formData.supplier,
        broker: formData.broker,
        transporter_name: formData.transporter_name,
        challan_rr_no: formData.challan_rr_no || formData.challan_railway_receipt_no || '',
        challan_railway_receipt_no: formData.challan_railway_receipt_no || formData.challan_rr_no || '',
        challan_rr_date: sanitizeDate(formData.challan_rr_date),
        lorry_number: formData.lorry_number,
        lorry_no: formData.lorry_number,
        pan_no: formData.pan_no || formData.part_no || '',
        part_no: formData.part_no || formData.pan_no || '',
        part_date: sanitizeDate(formData.part_date),
        consignment_note: formData.consignment_note || formData.consignment_note_no || '',
        consignment_note_no: formData.consignment_note || formData.consignment_note_no || '',
        consignment_note_date: sanitizeDate(formData.consignment_note_date),
        di_no: formData.di_no,
        di_date: sanitizeDate(formData.di_date),
        invoice_no: formData.invoice_no,
        invoice_date: sanitizeDate(formData.invoice_date),
        ptf: formData.ptf || 'No',
        rfs: formData.ptf || 'No',
        lorry_returned: formData.lorry_returned || 'No',
        lorry_returned_other_mill: formData.lorry_returned_other_mill || 'No',
        arrival_area_code: formData.arrival_area_code,
        arrival_area_name: formData.arrival_area_name,
        area: formData.arrival_area_name,
        unit_code: formData.unit_code,
        unit_name: formData.unit_name,
        way_bill_no: formData.way_bill_no,
        way_bill_date: sanitizeDate(formData.way_bill_date),
        rr_gr_no: formData.rr_gr_no || '',
        apmc_fees: Number(formData.apmc_fees) || 0,
        remarks: formData.remarks,
        temporary_arrival_no: formData.temporary_arrival_no,
        temporary_arrival_date: sanitizeDate(formData.temporary_arrival_date),
        total_packets: isHeaderLoose ? 0 : totalPacketsSum,
        weight_qtl: totalWeightSum * 10,
        grid_details: activeRows.map(row => {
          const u = (row.unit || formData.unit_name || '').toString().trim().toUpperCase();
          const isLoose = u.includes('LOOSE') || u === 'LOOSE' || isHeaderLoose;
          return {
            ...row,
            unit: row.unit || formData.unit_name || 'BALES',
            quantity_chln: isLoose ? 0 : Math.round(Number(row.quantity_chln) || 0),
            quantity_rcpt: isLoose ? 0 : Math.round(Number(row.quantity_rcpt) || 0)
          };
        }),

        // Weighments
        challan_material_weight: formData.challan_material_weight || 0,
        actual_gross_weight: formData.actual_gross_weight || 0,
        actual_tare_weight: formData.actual_tare_weight || 0,
        supplier_net_weight: formData.supplier_net_weight || 0,
        supplier_challan_gross: formData.supplier_challan_gross || 0,
        supplier_tare_weight: formData.supplier_tare_weight || 0,
        electronic_net_weight: formData.electronic_net_weight || 0,
        electronic_gross_weight: formData.electronic_gross_weight || 0,
        electronic_tare_weight: formData.electronic_tare_weight || 0,
        weight_reduced: Number(finalWeightDisplayValue) || Number(formData.weight_reduced) || 0
      };

      try {
        if (initialData && initialData.final_arrival_id) {
          await dbModule.update('final_arrival', 'final_arrival_id', initialData.final_arrival_id, payload);
          alert(`Final Arrival Voucher #${formData.arrival_no} updated successfully!`);
        } else {
          await dbModule.insert('final_arrival', payload);
          alert(`Final Arrival Register Saved successfully!\nAdded under Final Arrival Voucher #${formData.arrival_no}`);
        }
      } catch (saveErr: any) {
        if (saveErr?.message?.includes('lorry_number') || saveErr?.message?.includes('schema cache')) {
          try {
            await supabase?.rpc("exec_sql", { 
              query: `
                ALTER TABLE IF EXISTS final_arrival ADD COLUMN IF NOT EXISTS lorry_number TEXT;
                NOTIFY pgrst, 'reload schema';
              ` 
            });
            if (initialData && initialData.final_arrival_id) {
              await dbModule.update('final_arrival', 'final_arrival_id', initialData.final_arrival_id, payload);
              alert(`Final Arrival Voucher #${formData.arrival_no} updated successfully!`);
            } else {
              await dbModule.insert('final_arrival', payload);
              alert(`Final Arrival Register Saved successfully!\nAdded under Final Arrival Voucher #${formData.arrival_no}`);
            }
          } catch (retryErr: any) {
            const { lorry_number, ...fallbackPayload } = payload as any;
            if (initialData && initialData.final_arrival_id) {
              await dbModule.update('final_arrival', 'final_arrival_id', initialData.final_arrival_id, fallbackPayload);
              alert(`Final Arrival Voucher #${formData.arrival_no} updated successfully!`);
            } else {
              await dbModule.insert('final_arrival', fallbackPayload);
              alert(`Final Arrival Register Saved successfully!\nAdded under Final Arrival Voucher #${formData.arrival_no}`);
            }
          }
        } else {
          throw saveErr;
        }
      }

      if (supabase && formData.unit_name) {
        const u = formData.unit_name.toUpperCase();
        const keys = [formData.arrival_no, formData.mr_no, formData.temporary_arrival_no, formData.po_no].filter(Boolean);
        for (const k of keys) {
          Promise.all([
            supabase.from('material_inspection_details').update({ unit: u }).eq('mr_no', k),
            supabase.from('material_inspection').update({ unit_name: u }).eq('mr_no', k)
          ]).catch(() => {});
        }
      }

      localStorage.removeItem('final_arrival_draft');
      screenDraftService.clearDraft('final_arrival_entry');
      screenDraftService.clearDraft('final_arrival_details');

      if (onSave) onSave(payload);
    } catch (e: any) {
      alert("Failed to save final arrival voucher: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const totalReceiptQuantity = details.reduce((acc, curr) => {
    const u = (curr.unit || formData.unit_name || '').toString().trim().toUpperCase();
    const isLoose = u.includes('LOOSE') || u === 'LOOSE';
    return acc + (isLoose ? 0 : (Number(curr.quantity_rcpt) || 0));
  }, 0);

  const totalChallanQuantity = details.reduce((acc, curr) => {
    const u = (curr.unit || formData.unit_name || '').toString().trim().toUpperCase();
    const isLoose = u.includes('LOOSE') || u === 'LOOSE';
    return acc + (isLoose ? 0 : (Number(curr.quantity_chln) || 0));
  }, 0);

  const totalNettoWeight = details.reduce((acc, curr) => acc + (Number(curr.netto_pnto) || 0), 0);

  return {
    loading,
    containerRef,
    formData,
    setFormData,
    details,
    setDetails,
    brokers,
    suppliers,
    areas,
    agencies,
    grades,
    markas,
    purchaseOrders,
    temporaryArrivalList,
    unitList,
    showTempMrDropdown,
    setShowTempMrDropdown,
    tempMrOptions,
    handleSelectTempMrOption,
    showPoDropdown,
    setShowPoDropdown,
    combinedPoOptions,
    handleInputChange,
    handleAreaChange,
    handleSelectPoOption,
    loadDetailsFromAmad,
    loadDetailsFromInspection,
    loadDetailsFromPo,
    handleAddRow,
    handleDeleteRow,
    handleRowChange,
    handleSave,
    finalWeightDisplayValue,
    calculatedLowestNetWeight,
    totalReceiptQuantity,
    totalChallanQuantity,
    totalNettoWeight
  };
}
