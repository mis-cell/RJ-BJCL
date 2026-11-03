import React, { useState, useEffect } from 'react';
import { useLiveAutoRefresh } from '../hooks/useLiveAutoRefresh';
import Papa from 'papaparse';
import { 
  Archive, 
  Search, 
  Printer, 
  ArrowLeft,
  Filter,
  Plus,
  RefreshCcw,
  FileText,
  Edit,
  Trash2,
  Calendar,
  Layers,
  Truck,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  Bell,
  User,
  ShieldCheck,
  Scale,
  PackageCheck,
  Building2,
  Power,
  Leaf,
  ChevronDown,
  X,
  ClipboardCheck,
  Package,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import { cn, sanitizeCsvData } from '../lib/utils';
import PrintModal from '../components/PrintModal';
import LegacyLayout from '../components/LegacyLayout';
import TemporaryArrival from './TemporaryArrival';
import { dbModule } from '../services/dbModule';
import { Amad } from '../types';
import { supabase } from '../lib/supabase';
import { enforceEditOrDeletePermission, canEditOrDelete, canViewCompletedData } from '../lib/permissions';
import { PaginationControls } from '../components/PaginationControls';
import { parseMonthKey } from '../components/common/MonthWiseCardsRibbon';

export const calculateNetWeightVal = (
  gross: number,
  moisture: number,
  dust: number,
  ncv: number,
  arrivalAreaName: string,
  poDateStr: string,
  generalDateStr?: string
): string => {
  if (!gross) return "";
  
  let month = 0;
  let dateToParse = poDateStr || generalDateStr;
  if (dateToParse) {
    const d = new Date(dateToParse);
    if (!isNaN(d.getTime())) {
      month = d.getMonth();
    }
  }

  const areaNameClean = String(arrivalAreaName || '').toLowerCase();
  const isDaisee = areaNameClean.includes("daisee");
  
  let moistureLimit = 16;
  const isJanToJune = month >= 0 && month <= 5;
  
  if (isJanToJune) {
    if (isDaisee) {
      moistureLimit = 18;
    } else {
      moistureLimit = 16;
    }
  } else {
    if (isDaisee) {
      moistureLimit = 20;
    } else {
      moistureLimit = 18;
    }
  }

  const moistureExcessPct = moisture > moistureLimit ? (moisture - moistureLimit) : 0;
  const totalDeductionPct = moistureExcessPct + dust + ncv;
  const netWeight = gross * (1 - totalDeductionPct / 100);
  return netWeight.toFixed(3);
};

// Vector Illustrations matching Bally Jute Company Limited branding
const FactorySketchIllustration = () => (
  <svg className="w-32 h-20 opacity-80" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Background hills */}
    <path d="M10 100 Q 50 70 100 95 Q 150 110 190 90 L 190 110 L 10 110 Z" fill="#FBCFCB" opacity="0.5" />
    {/* Factory Chimney */}
    <rect x="150" y="30" width="14" height="70" fill="#D94B5A" opacity="0.8" />
    <polygon points="148,30 166,30 164,25 150,25" fill="#F7AFA8" />
    {/* Chimney Smoke */}
    <path d="M157 20 Q 152 10 162 5 T 155 -5" stroke="#F48F8B" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
    {/* Factory Main Building */}
    <rect x="30" y="55" width="115" height="45" fill="#F7AFA8" opacity="0.85" rx="1" />
    {/* Roof sawteeth */}
    <polygon points="30,55 50,40 50,55 70,40 70,55 90,40 90,55 110,40 110,55 130,40 130,55 145,55" fill="#E85A5A" />
    {/* Factory Windows */}
    <rect x="40" y="65" width="12" height="15" fill="#FDE7E6" opacity="0.9" />
    <rect x="60" y="65" width="12" height="15" fill="#FDE7E6" opacity="0.9" />
    <rect x="80" y="65" width="12" height="15" fill="#FDE7E6" opacity="0.9" />
    <rect x="100" y="65" width="12" height="15" fill="#FDE7E6" opacity="0.9" />
    <rect x="120" y="65" width="15" height="25" fill="#F06D6C" />
    {/* Ground line */}
    <line x1="10" y1="100" x2="190" y2="100" stroke="#F7AFA8" strokeWidth="2" strokeLinecap="round" />
    {/* Small Jute plants */}
    <path d="M15 100 Q 12 90 8 85 M15 100 Q 18 88 22 84 M15 100 L 15 82" stroke="#D94B5A" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const JuteBagStackIllustration = ({ className = "w-14 h-11 shrink-0" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Bottom Sack 1 */}
    <rect x="10" y="50" width="55" height="35" rx="6" fill="#F7AFA8" stroke="#D94B5A" strokeWidth="2" />
    <path d="M10 58 Q 37 62 65 58" stroke="#E85A5A" strokeWidth="1.5" />
    {/* Bottom Sack 2 */}
    <rect x="58" y="52" width="52" height="33" rx="6" fill="#FBCFCB" stroke="#D94B5A" strokeWidth="2" />
    {/* Top Sack */}
    <rect x="30" y="24" width="60" height="36" rx="6" fill="#FDE7E6" stroke="#D94B5A" strokeWidth="2" />
    {/* Sack Tie / Rope */}
    <path d="M30 32 L 90 32" stroke="#E85A5A" strokeWidth="2.5" strokeDasharray="3 2" />
    {/* BJ Stamp on Top Sack */}
    <rect x="48" y="38" width="24" height="16" rx="2" fill="#FDE7E6" stroke="#F7AFA8" strokeWidth="1" />
    <text x="60" y="47" fontSize="8" fontWeight="bold" fill="#D94B5A" textAnchor="middle" fontFamily="serif">Bj</text>
    <text x="60" y="52" fontSize="4" fontWeight="bold" fill="#D94B5A" textAnchor="middle">BALLY JUTE</text>
  </svg>
);

const JuteRopeLeavesIllustration = () => (
  <svg className="w-24 h-20" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Coiled Rope */}
    <path d="M20 60 Q 40 40 60 60 T 90 50" stroke="#F48F8B" strokeWidth="6" strokeLinecap="round" fill="none" />
    <path d="M20 60 Q 40 40 60 60 T 90 50" stroke="#D94B5A" strokeWidth="1.5" strokeDasharray="2 3" strokeLinecap="round" fill="none" />
    {/* Botanical Leaves */}
    <path d="M60 40 Q 75 20 85 25 Q 70 38 60 40 Z" fill="#D94B5A" />
    <path d="M60 40 Q 80 35 90 42 Q 72 50 60 40 Z" fill="#F7AFA8" />
    <path d="M40 30 Q 30 10 20 15 Q 32 28 40 30 Z" fill="#E85A5A" />
  </svg>
);

interface AmadRegisterProps {
  onClose?: () => void;
  onNew?: () => void;
  onCreateFinalMr?: (amad: Amad) => void;
  onNavigate?: (page: string) => void;
}

export default function AmadRegister({ onClose, onNew, onCreateFinalMr, onNavigate }: AmadRegisterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string | null>(null);
  const [amadList, setAmadList] = useState<Amad[]>([]);
  const [editingAmad, setEditingAmad] = useState<Amad | null>(null);
  const [selectedAmadId, setSelectedAmadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  // 100-rows per page pagination (searches full dataset, displays paginated)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [sortField, setSortField] = useState<'date' | 'temp_arrival' | 'po_no'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'date' | 'temp_arrival' | 'po_no') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDateFilter, endDateFilter, selectedMonthFilter]);

  // Modern Printing Form State System for "MARKS & QUALITY RECEIVED"
  const [printData, setPrintData] = useState<any | null>(null);
  const [isPrintingModalOpen, setIsPrintingModalOpen] = useState(false);

  // Column picker selection state
  const [printColumns, setPrintColumns] = useState({
    crop_year: true,
    marka: true,
    quality: true,
    quantity_rcpt: true,
    claim: true,
    gross_wt: true,
    moisture_pct: true,
    dust_pct: true,
    ncv_pct: true,
    net_wt: true,
    settlement: true,
    rate: true
  });

  // Pending PO Arrivals State & Tab Selection
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [inspectionsList, setInspectionsList] = useState<any[]>([]);

  const handlePreparePrint = async (amad: Amad) => {
    setLoading(true);
    try {
      let inspectionMaster: any = null;
      let inspectionDetails: any[] = [];
      let mrSettlementMaster: any = null;
      let mrSettlementDetails: any[] = [];

      if (supabase) {
        const { data: mMaster, error: mMasterErr } = await supabase
          .from('mill_inspection_master')
          .select('*')
          .eq('arrival_no', amad.amad_no)
          .maybeSingle();

        if (!mMasterErr && mMaster) {
          inspectionMaster = mMaster;
          const { data: mDetails } = await supabase
            .from('mill_inspection_detail')
            .select('*')
            .eq('mr_no', mMaster.mr_no)
            .order('srl_no', { ascending: true });
          if (mDetails) inspectionDetails = mDetails;

          const { data: sMaster } = await supabase
            .from('mr_settlement_master')
            .select('*')
            .eq('mr_no', mMaster.mr_no)
            .maybeSingle();
          if (sMaster) {
            mrSettlementMaster = sMaster;
            const { data: sDetails } = await supabase
              .from('mr_settlement_detail')
              .select('*')
              .eq('mr_no', mMaster.mr_no)
              .order('srl_no', { ascending: true });
            if (sDetails) mrSettlementDetails = sDetails;
          }
        }
      }

      let parsedGrid: any[] = [];
      if (amad.grid_details) {
        if (typeof amad.grid_details === 'string') {
          try {
            const parsed = amad.grid_details === 'undefined' || amad.grid_details === 'null' ? [] : JSON.parse(amad.grid_details === "undefined" ? "null" : amad.grid_details);
            if (Array.isArray(parsed)) {
              parsedGrid = parsed;
            }
          } catch(e) {}
        } else if (Array.isArray(amad.grid_details)) {
          parsedGrid = amad.grid_details;
        }
      }

      const parsedAgencyNames = parsedGrid
        .map((row: any) => (row.agency_name || '').trim())
        .filter(Boolean);
      if (amad.agency_name) {
        parsedAgencyNames.push(amad.agency_name.trim());
      }
      const uniqueAgencies = Array.from(new Set(parsedAgencyNames));
      let finalArrivalAreaName = amad.arrival_area_name || '';
      const agencyNameStr = uniqueAgencies.join(", ");
      if (agencyNameStr && !finalArrivalAreaName.includes(agencyNameStr)) {
        finalArrivalAreaName = `${finalArrivalAreaName} / ${agencyNameStr}`;
      }

      const mappedRows: any[] = (inspectionDetails.length > 0) ? inspectionDetails.map((det, i) => {
        const settRow = mrSettlementDetails.find(s => s.srl_no === det.srl_no);
        const gross = Number(det.challan_gross_wt) || 0;
        const moisture = Number(inspectionMaster?.actual_moisture) || 0;
        const dust = Number(inspectionMaster?.actual_dust) || 0;
        const ncv = Number(inspectionMaster?.actual_ncv) || 0;
        const netStr = calculateNetWeightVal(
          gross,
          moisture,
          dust,
          ncv,
          finalArrivalAreaName,
          amad.po_no || '',
          amad.date || ''
        );

        return {
          crop_year: det.crop_year || '2026-27',
          marka: det.marka || '',
          quality: det.stock_grade_name || '',
          quantity_rcpt: Number(det.quantity) || 0,
          gross_wt: gross || '',
          moisture_pct: moisture || '',
          dust_pct: dust || '',
          ncv_pct: ncv || '',
          net_wt: netStr || '',
          settlement_grade: settRow?.sett_grade || det.stock_grade_name || '',
          settlement_moisture: settRow?.sett_moisture_deduction || '',
          settlement_dust: settRow?.sett_dust_deduction || '',
          settlement_prem_less: settRow?.sett_all_diff || '',
          rate: mrSettlementMaster?.summary_rate_qtel || ''
        };
      }) : parsedGrid.filter(row => row.receipt_grade_name || row.challan_marka_name).map((p, i) => {
        return {
          crop_year: p.crop_year || '2026-27',
          marka: p.challan_marka_name || '',
          quality: p.receipt_grade_name || '',
          quantity_rcpt: Number(p.quantity_chln) || Number(p.quantity_rcpt) || Number(p.quantity) || 0,
          gross_wt: p.netto_pnto || p.weight || '',
          moisture_pct: '',
          dust_pct: '',
          ncv_pct: '',
          net_wt: p.netto_pnto || p.weight || '',
          settlement_grade: p.receipt_grade_name || '',
          settlement_moisture: '',
          settlement_dust: '',
          settlement_prem_less: '',
          rate: ''
        };
      });

      while (mappedRows.length < 8) {
        mappedRows.push({
          crop_year: '',
          marka: '',
          quality: '',
          quantity_rcpt: '',
          gross_wt: '',
          moisture_pct: '',
          dust_pct: '',
          ncv_pct: '',
          net_wt: '',
          settlement_grade: '',
          settlement_moisture: '',
          settlement_dust: '',
          settlement_prem_less: '',
          rate: ''
        });
      }

      const rawMrNo = inspectionMaster?.mr_no || `MR/ARR/${amad.amad_no}`;
      let formattedMrNo = rawMrNo;
      if (rawMrNo && rawMrNo.includes('/')) {
        const parts = rawMrNo.split('/');
        if (parts[0].toUpperCase() === 'MR') {
          const lastPart = parts[parts.length - 1];
          if (lastPart) {
            formattedMrNo = `MR${lastPart}`;
          }
        }
      }

      setPrintData({
        amad_no: amad.amad_no,
        date: amad.date,
        po_no: amad.po_no || '',
        po_date: amad.lorry_date || amad.date,
        mr_no: formattedMrNo,
        mr_date: inspectionMaster?.mr_date || amad.date,
        transporter_name: amad.transporter_name || '',
        challan_rr_no: amad.challan_rr_no || '',
        lorry_number: amad.lorry_number || (amad as any).lorry_no || (amad as any).vehicle_no || '',
        arrival_area_name: finalArrivalAreaName,
        supplier: amad.supplier || '',
        remarks: amad.remarks || inspectionMaster?.remarks || '',
        rows: mappedRows
      });

      setIsPrintingModalOpen(true);
    } catch(e) {
      console.error("Error setting up print view:", e);
      alert("Failed to load full inspection details, loading basic data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAmads = async () => {
    if (amadList.length === 0) setLoading(true);
    setRefreshMessage(null);
    try {
      const [data, poData, inspectionData, finalArrivalData] = await Promise.all([
        dbModule.fetchAll('temporary_material_received', 'created_at', false),
        dbModule.fetchAll('purchase_master').catch(() => []),
        dbModule.fetchAll('mill_inspection_master').catch(() => []),
        dbModule.fetchAll('final_arrival').catch(() => [])
      ]);

      const norm = (v: any) => String(v || '').trim().toUpperCase();
      const isValidPo = (v: any) => {
        const s = norm(v);
        return Boolean(s && s !== 'NO' && s !== 'N/A' && s !== 'NONE');
      };

      const poByArrivalNo = new Map<string, string>();
      (finalArrivalData || []).forEach((fa: any) => {
        if (isValidPo(fa.po_no)) {
          [fa.temporary_arrival_no, fa.amad_no, fa.final_arrival_no, fa.mr_no, fa.arrival_no].forEach(k => {
            if (norm(k)) poByArrivalNo.set(norm(k), String(fa.po_no).trim());
          });
        }
      });
      (inspectionData || []).forEach((insp: any) => {
        if (isValidPo(insp.po_no)) {
          [insp.arrival_no, insp.mr_no, insp.temporary_arrival_no].forEach(k => {
            if (norm(k) && !poByArrivalNo.has(norm(k))) {
              poByArrivalNo.set(norm(k), String(insp.po_no).trim());
            }
          });
        }
      });

      const normalized = (data || []).map((item: any) => {
        const tempNo = item.temporary_arrival_no || item.amad_no || item.arrival_no || item.mr_no || (item.amad_id ? String(item.amad_id).slice(0, 8) : '');
        const existingPo = isValidPo(item.po_no) ? item.po_no : '';
        const resolvedPo =
          existingPo ||
          poByArrivalNo.get(norm(tempNo)) ||
          poByArrivalNo.get(norm(item.amad_no)) ||
          poByArrivalNo.get(norm(item.mr_no)) ||
          item.po_no ||
          '';

        return {
          ...item,
          temporary_arrival_no: tempNo,
          amad_no: tempNo,
          po_no: resolvedPo
        };
      });

      setAmadList(normalized);
      setPurchaseOrders(poData || []);
      setInspectionsList(inspectionData || []);
      
      setRefreshMessage(`Database sync complete: successfully fetched ${data?.length || 0} active arrivals & ${poData?.length || 0} purchase contracts!`);
      setTimeout(() => setRefreshMessage(null), 4500);
    } catch(e: any) {
      console.error("Error fetching arrivals:", e);
      setRefreshMessage(`Sync failed: ${e.message || e}`);
      setTimeout(() => setRefreshMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmads();
  }, []);

  useLiveAutoRefresh(fetchAmads, [], { tables: ['temporary_material_received', 'purchase_master', 'mill_inspection_master', 'final_arrival', 'clubbed_pomr'] });

  const handleEditAmad = (amad: Amad) => {
    if (!enforceEditOrDeletePermission("Edit")) return;
    setEditingAmad(amad);
  };

  const handleDelete = async (id: string, amad_no: string) => {
    if (!enforceEditOrDeletePermission("Delete")) {
      return;
    }

    if (confirm(`Are you sure you want to completely delete Arrival Voucher ${amad_no}?`)) {
      try {
        await Promise.all([
          dbModule.delete('temporary_material_received', 'amad_id', id),
          dbModule.delete('issue_master', 'amad_id', id).catch(() => null)
        ]);
        alert(`Arrival Voucher ${amad_no} deleted permanently.`);
        fetchAmads();
        if (selectedAmadId === id) setSelectedAmadId(null);
      } catch (e) {
        console.error(e);
        alert("Failed to delete arrival voucher");
      }
    }
  };

  if (editingAmad) {
    return (
      <TemporaryArrival 
        initialData={editingAmad} 
        onCancel={() => setEditingAmad(null)} 
        onSave={() => { setEditingAmad(null); fetchAmads(); }} 
      />
    );
  }

  const inspectedSet = new Set(inspectionsList.map(i => String(i.arrival_no || '').trim().toUpperCase()));

  // Filter and sort list
  const filteredAmads = amadList.filter(a => {
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      (a.temporary_arrival_no || a.amad_no || '').toLowerCase().includes(term) ||
      (a.supplier || '').toLowerCase().includes(term) ||
      (a.broker || '').toLowerCase().includes(term) ||
      (a.lorry_number || (a as any).lorry_no || (a as any).vehicle_no || '').toLowerCase().includes(term) ||
      (a.arrival_area_name || '').toLowerCase().includes(term) ||
      (a.status === 'cancelled' && term === 'void');
    
    let matchDateRange = true;
    if (startDateFilter && endDateFilter) {
      matchDateRange = a.date >= startDateFilter && a.date <= endDateFilter;
    } else if (startDateFilter) {
      matchDateRange = a.date >= startDateFilter;
    } else if (endDateFilter) {
      matchDateRange = a.date <= endDateFilter;
    }

    if (selectedMonthFilter) {
      const rowDate = a.date || (a as any).amad_date || (a as any).arrival_date || (a as any).created_at;
      const parsed = parseMonthKey(rowDate);
      if (!parsed || parsed.key !== selectedMonthFilter) return false;
    }

    if (!canViewCompletedData()) {
      const isInspected = inspectedSet.has(String(a.amad_no || a.temporary_arrival_no || '').trim().toUpperCase());
      if (isInspected) return false;
    }

    return matchSearch && matchDateRange;
  }).sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1;

    if (sortField === 'date') {
      const timeA = new Date(a.date || 0).getTime() || 0;
      const timeB = new Date(b.date || 0).getTime() || 0;
      if (timeA !== timeB) return (timeA - timeB) * dir;
    } else if (sortField === 'temp_arrival') {
      const arrA = String(a.temporary_arrival_no || a.amad_no || a.amad_id || '').replace(/^#+/, '').trim().toUpperCase();
      const arrB = String(b.temporary_arrival_no || b.amad_no || b.amad_id || '').replace(/^#+/, '').trim().toUpperCase();
      const numA = parseInt(arrA.replace(/[^0-9]/g, ''), 10);
      const numB = parseInt(arrB.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return (numA - numB) * dir;
      }
      const cmp = arrA.localeCompare(arrB, undefined, { numeric: true });
      if (cmp !== 0) return cmp * dir;
    } else if (sortField === 'po_no') {
      const poA = String(a.po_no || '').replace(/^#+/, '').trim().toUpperCase();
      const poB = String(b.po_no || '').replace(/^#+/, '').trim().toUpperCase();
      const hasPoA = Boolean(poA && poA !== '--');
      const hasPoB = Boolean(poB && poB !== '--');
      if (hasPoA !== hasPoB) {
        return hasPoA ? -1 : 1;
      }
      const cmp = poA.localeCompare(poB, undefined, { numeric: true });
      if (cmp !== 0) return cmp * dir;
    }

    // Fallback tie-breakers:
    // 1. Voucher Date (newest first)
    const dateDiff = new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    if (dateDiff !== 0) return dateDiff;

    // 2. Temp Arrival serial (descending)
    const arrA = String(a.temporary_arrival_no || a.amad_no || '').replace(/^#+/, '').trim().toUpperCase();
    const arrB = String(b.temporary_arrival_no || b.amad_no || '').replace(/^#+/, '').trim().toUpperCase();
    const arrCmp = arrB.localeCompare(arrA, undefined, { numeric: true });
    if (arrCmp !== 0) return arrCmp;

    // 3. Supplier Name
    const suppA = (a.supplier || '').toUpperCase();
    const suppB = (b.supplier || '').toUpperCase();
    return suppA.localeCompare(suppB);
  });

  const handleExportToExcel = () => {
    if (filteredAmads.length === 0) {
      alert("No data available to export.");
      return;
    }

    const dataToExport = filteredAmads.map((amad) => {
      const formattedDate = amad.date ? new Date(amad.date).toLocaleDateString('en-GB') : '';
      const bales = getChlnQty(amad);
      const weightMt = (Number(amad.weight_qtl || amad.weight || 0) / 10);

      return {
        "Voucher Date": formattedDate,
        "Temporary M.R No": (amad.temporary_arrival_no || amad.amad_no) ? String(amad.temporary_arrival_no || amad.amad_no).replace(/^#+/, '') : '',
        "P.O. Number": amad.po_no ? String(amad.po_no).replace(/^#+/, '') : '',
        "Supplier": amad.supplier || '',
        "Broker": amad.broker || 'DIRECT',
        "Lorry Number": amad.lorry_number || (amad as any).lorry_no || (amad as any).vehicle_no || '',
        "Unit": amad.unit_name || amad.unit_code || 'BALES',
        "Qty": bales,
        "Weight": weightMt.toFixed(3),
        "Transporter": amad.transporter_name || '',
        "Challan/RR No.": amad.challan_rr_no || '',
        "Lorry Date": amad.lorry_date || '',
        "Arrival Area": amad.arrival_area_name || '',
        "Unit Name": amad.unit_name || '',
        "Way Bill No.": amad.way_bill_no || '',
        "APMC Fees (Rs)": amad.apmc_fees || 0,
        "Remarks": amad.remarks || ''
      };
    });

    try {
      const sanitizedData = sanitizeCsvData(dataToExport);
      const csv = Papa.unparse(sanitizedData);
      const csvContent = "\uFEFF" + csv;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Temporary_MR_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export. Please try again.");
    }
  };

  // Helper to extract Challan Quantity ("Chln") from Receipt Grade Details (grid_details)
  const getChlnQty = (item: any): number => {
    if (!item) return 0;
    if (item.grid_details) {
      let grid: any[] = [];
      if (typeof item.grid_details === 'string') {
        try {
          const parsed = item.grid_details === 'undefined' || item.grid_details === 'null' ? [] : JSON.parse(item.grid_details === "undefined" ? "null" : item.grid_details);
          if (Array.isArray(parsed)) grid = parsed;
        } catch (e) {}
      } else if (Array.isArray(item.grid_details)) {
        grid = item.grid_details;
      }
      if (grid.length > 0) {
        let hasChln = false;
        let sumChln = 0;
        grid.forEach((row: any) => {
          const val = row.quantity_chln !== undefined && row.quantity_chln !== null && row.quantity_chln !== ''
            ? Number(row.quantity_chln)
            : (row.chln !== undefined && row.chln !== null && row.chln !== '' ? Number(row.chln) : NaN);
          if (!isNaN(val)) {
            hasChln = true;
            sumChln += val;
          }
        });
        if (hasChln) return sumChln;

        const fallback = grid.reduce((acc: number, row: any) => acc + (Number(row.quantity_chln) || Number(row.chln) || Number(row.quantity) || Number(row.qty) || 0), 0);
        if (fallback > 0) return fallback;
      }
    }
    return Number(item.total_packets || item.packets || 0);
  };

  // Helper to extract lowest net weight (Final Weight in M.Ton)
  const getLowestNetWeight = (item: any): number => {
    if (!item) return 0;
    const nets = [
      Number(item.electronic_net_weight),
      Number(item.supplier_net_weight),
      Number(item.challan_material_weight),
      Number(item.weight_reduced),
      item.weight_qtl ? Number(item.weight_qtl) / 10 : 0,
      Number(item.weight),
      Number(item.quantity)
    ].filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
    return nets.length > 0 ? Math.min(...nets) : 0;
  };

  // Metrics
  const totalBales = filteredAmads.reduce((acc, a) => acc + getChlnQty(a), 0);
  const totalWeightMt = filteredAmads.reduce((acc, a) => acc + getLowestNetWeight(a), 0);

  // Inspection status counts
  const pendingCount = filteredAmads.filter(a => !inspectedSet.has(String(a.amad_no || a.temporary_arrival_no || '').trim().toUpperCase())).length;
  const completedCount = filteredAmads.length - pendingCount;

  // Group by Date
  const dateWiseArrivalsMap: { [date: string]: { count: number; packets: number; weight: number } } = {};
  amadList.forEach(a => {
    const d = a.date || 'No Date';
    if (!dateWiseArrivalsMap[d]) {
      dateWiseArrivalsMap[d] = { count: 0, packets: 0, weight: 0 };
    }
    dateWiseArrivalsMap[d].count += 1;
    dateWiseArrivalsMap[d].packets += getChlnQty(a);
    dateWiseArrivalsMap[d].weight += getLowestNetWeight(a);
  });

  const dateWiseArrivalList = Object.entries(dateWiseArrivalsMap)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Top Nav Items
  const navTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'maingate', label: 'Main Gate' },
    { id: 'mill', label: 'Mill' },
    { id: 'po', label: 'Purchase' },
    { id: 'satta', label: 'Satta' },
    { id: 'amad', label: 'T.M.R', active: true },
    { id: 'material_inspection', label: 'Quality' },
    { id: 'stock', label: 'Inventory' },
    { id: 'production', label: 'Production' },
    { id: 'reports', label: 'Reports' },
    { id: 'vyapari', label: 'Masters' },
    { id: 'admindesk', label: 'Administration' },
  ];

  return (
    <LegacyLayout title="TEMPORARY M.R" subtitle="TEMPORARY ARRIVAL WORKSTATION" onClose={onClose} activeNavTab="amad">
      <div className="bg-[#FDE7E6] text-slate-800 font-sans flex flex-col selection:bg-[#F7AFA8] selection:text-white p-2 md:p-3">

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 space-y-4 w-full">

          {/* 3. KPI CARDS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* KPI 1 */}
          <div className="bg-white rounded-xl border border-[#FBCFCB] p-3.5 shadow-xs hover:border-[#F7AFA8]/40 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Filtered Loads</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#D94B5A] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold font-mono text-slate-900">{filteredAmads.length} <span className="text-xs font-sans font-semibold text-slate-600">Lorries</span></p>
            <p className="text-[10px] font-medium text-emerald-700 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Loads
            </p>
          </div>

          {/* KPI 2 */}
          <div className="bg-white rounded-xl border border-[#FBCFCB] p-3.5 shadow-xs hover:border-[#F7AFA8]/40 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Total Packets</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#8C6D33] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold font-mono text-blue-900">{totalBales.toLocaleString()} <span className="text-xs font-sans font-semibold text-slate-600">Bales</span></p>
            <p className="text-[10px] font-medium text-slate-500 mt-1">Total Arrived Packets</p>
          </div>

          {/* KPI 3 */}
          <div className="bg-white rounded-xl border border-[#FBCFCB] p-3.5 shadow-xs hover:border-[#F7AFA8]/40 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Total Weight</span>
              <div className="w-8 h-8 rounded-lg bg-[#FDE7E6] text-[#D94B5A] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold font-mono text-rose-700">{totalWeightMt.toFixed(3)} <span className="text-xs font-sans font-semibold text-slate-600">MT</span></p>
            <p className="text-[10px] font-medium text-slate-500 mt-1">Total Net Weight</p>
          </div>

          {/* KPI 4 */}
          <div className="bg-white rounded-xl border border-[#FBCFCB] p-3.5 shadow-xs hover:border-[#F7AFA8]/40 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Pending Inspection</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold font-mono text-amber-800">{pendingCount}</p>
            <p className="text-[10px] font-medium text-amber-600 mt-1">Awaiting Inspection</p>
          </div>

          {/* KPI 5 */}
          <div className="bg-white rounded-xl border border-[#FBCFCB] p-3.5 shadow-xs hover:border-[#F7AFA8]/40 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Completed Inspection</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold font-mono text-emerald-800">{completedCount}</p>
            <p className="text-[10px] font-medium text-emerald-600 mt-1">Completed Today</p>
          </div>

          {/* KPI 6 */}
          <div className="bg-white rounded-xl border border-[#FBCFCB] p-3.5 shadow-xs hover:border-[#F7AFA8]/40 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Last Updated</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <RefreshCcw className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-base font-bold font-mono text-slate-800">09:30 AM</p>
            <p className="text-[10px] font-medium text-slate-500 mt-1">Today 27 Jul 2026</p>
          </div>
        </div>

        {/* 5. SEARCH & FILTER TOOLBAR */}
        <div className="bg-white rounded-xl border border-[#FBCFCB] p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="flex items-center gap-2 bg-[#FDE7E6] border border-[#FBCFCB] rounded-lg px-3 py-1.5 flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
 id="search_by_voucher_no_supp_841" name="search_by_voucher_no_supp" aria-label="Search by Voucher No, Supplier, Broker Name or Lorry plate..."              type="text"
              placeholder="Search by Voucher No, Supplier, Broker Name or Lorry plate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs w-full outline-none text-slate-800 placeholder:text-slate-400 font-sans"
            />
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#FDE7E6] border border-[#FBCFCB] rounded-lg px-2.5 py-1 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">From:</span>
              <input
 id="startdatefilter_854" name="startdatefilter" aria-label="startdatefilter"                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="bg-transparent outline-none text-xs font-mono text-slate-800"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-[#FDE7E6] border border-[#FBCFCB] rounded-lg px-2.5 py-1 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">To:</span>
              <input
 id="enddatefilter_863" name="enddatefilter" aria-label="enddatefilter"                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="bg-transparent outline-none text-xs font-mono text-slate-800"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportToExcel}
              className="bg-[#F48F8B] hover:bg-[#F06D6C] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer border border-[#F06D6C]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              Export to CSV
            </button>
            <button
              onClick={() => { setSearchTerm(''); setStartDateFilter(''); setEndDateFilter(''); }}
              className="bg-[#FDE7E6] hover:bg-[#FBCFCB] text-[#D94B5A] border border-[#FBCFCB] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              onClick={fetchAmads}
              disabled={loading}
              className="bg-[#F48F8B] hover:bg-[#F06D6C] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50 border border-[#F06D6C]"
            >
              <RefreshCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Refresh
            </button>
          </div>

          {/* Metric counter */}
          <div className="text-xs font-mono font-bold text-slate-700 bg-[#FDE7E6] border border-[#FBCFCB] px-3 py-1.5 rounded-lg">
            TOTAL FILTERED METRIC TONS : <span className="text-[#D94B5A] font-extrabold">{totalWeightMt.toFixed(3)} MT</span>
          </div>
        </div>

        {/* 6. PRIMARY LAUNCHER BAR */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNew}
            className="bg-[#D94B5A] hover:bg-[#E85A5A] text-white px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer border border-[#D94B5A] active:scale-95"
          >
            <Plus className="w-4 h-4 text-white" />
            New Arrival Entry
          </button>
          <button
            onClick={() => {
              if (selectedAmadId) {
                const target = amadList.find(a => a.amad_id === selectedAmadId);
                if (target) handlePreparePrint(target);
                else alert("Selected record not found");
              } else {
                alert("Please select a row from the table first");
              }
            }}
            className="bg-white border border-[#FBCFCB] hover:bg-[#FDE7E6] text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#D94B5A]" />
            Print Selected Slip
          </button>
        </div>

        {/* REFRESH MESSAGE FEEDBACK */}
        {refreshMessage && (
          <div className={cn(
            "p-3 rounded-lg border text-xs font-semibold flex items-center justify-between shadow-xs",
            refreshMessage.includes("failed") ? "bg-red-50 text-red-800 border-red-200" : "bg-emerald-50 text-emerald-900 border-emerald-200"
          )}>
            <span>{refreshMessage}</span>
            <button onClick={() => setRefreshMessage(null)} className="text-xs font-bold underline cursor-pointer">Close</button>
          </div>
        )}

        {/* 7. LEDGER DATA TABLE */}
        <div className="bg-white rounded-xl border border-[#FBCFCB] shadow-xs overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center z-20">
              <RefreshCcw className="w-8 h-8 text-[#D94B5A] animate-spin mb-2" />
              <p className="text-xs font-bold text-[#D94B5A]">Updating Ledger Data...</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#D94B5A] text-white font-serif text-xs">
                  <th
                    onClick={() => handleSort('date')}
                    className="py-3 px-3 font-semibold text-center border-r border-[#F7AFA8]/30 cursor-pointer select-none hover:bg-[#E85A5A] transition-colors"
                    title="Sort by Voucher Date"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Voucher Date</span>
                      <span className="text-[10px] font-sans opacity-90">
                        {sortField === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('temp_arrival')}
                    className="py-3 px-3 font-semibold text-center border-r border-[#F7AFA8]/30 cursor-pointer select-none hover:bg-[#E85A5A] transition-colors"
                    title="Sort by Temp Arrival"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Temp Arrival</span>
                      <span className="text-[10px] font-sans opacity-90">
                        {sortField === 'temp_arrival' ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('po_no')}
                    className="py-3 px-3 font-semibold text-center border-r border-[#F7AFA8]/30 cursor-pointer select-none hover:bg-[#E85A5A] transition-colors"
                    title="Sort by PO"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>PO</span>
                      <span className="text-[10px] font-sans opacity-90">
                        {sortField === 'po_no' ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                      </span>
                    </div>
                  </th>
                  <th className="py-3 px-3 font-semibold border-r border-[#F7AFA8]/30">Supplier Name</th>
                  <th className="py-3 px-3 font-semibold border-r border-[#F7AFA8]/30">Broker Reference</th>
                  <th className="py-3 px-3 font-semibold text-center border-r border-[#F7AFA8]/30">Lorry Number</th>
                  <th className="py-3 px-3 font-semibold text-center border-r border-[#F7AFA8]/30">Unit</th>
                  <th className="py-3 px-3 font-semibold text-right border-r border-[#F7AFA8]/30">Qty</th>
                  <th className="py-3 px-3 font-semibold text-right border-r border-[#F7AFA8]/30">Final Weight (M.Ton)</th>
                  <th className="py-3 px-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FBCFCB]/60 font-mono text-xs">
                {filteredAmads.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((amad, idx) => {
                  const isSelected = selectedAmadId === amad.amad_id;
                  const formattedDate = amad.date ? new Date(amad.date).toLocaleDateString('en-GB') : '--';
                  const bales = getChlnQty(amad);
                  const weightMt = getLowestNetWeight(amad);
                  const isVoid = amad.status === 'cancelled';
                  const isInspected = inspectedSet.has(String(amad.amad_no || amad.temporary_arrival_no || '').trim().toUpperCase());

                  return (
                    <tr
                      key={amad.amad_id || idx}
                      onClick={() => setSelectedAmadId(amad.amad_id || null)}
                      onDoubleClick={() => { if(!isVoid) handleEditAmad(amad); }}
                      className={cn(
                        "hover:bg-[#FDE7E6] transition-colors cursor-pointer h-10",
                        isSelected ? "bg-[#F7AFA8]/10 font-bold" : (idx % 2 === 0 ? "bg-white" : "bg-[#FDE7E6]/40")
                      )}
                    >
                      <td className="py-2 px-3 text-center text-slate-600">{formattedDate}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900">
                        {String(amad.temporary_arrival_no || amad.amad_no || amad.amad_id || '--').replace(/^#+/, '')}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-amber-800">
                        {amad.po_no ? String(amad.po_no).replace(/^#+/, '') : '--'}
                      </td>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-800 uppercase">{amad.supplier || '--'}</td>
                      <td className="py-2 px-3 font-sans text-slate-600 uppercase">{amad.broker || 'DIRECT'}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800 uppercase">
                        {amad.lorry_number || (amad as any).lorry_no || (amad as any).vehicle_no || '--'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-800 border border-blue-200">
                          {amad.unit_name || amad.unit_code || 'BALES'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-blue-900">{bales}</td>
                      <td className="py-2 px-3 text-right font-bold text-rose-700">{weightMt.toFixed(3)}</td>
                      <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {onCreateFinalMr && (
                            <button
                              onClick={() => onCreateFinalMr(amad)}
                              className="p-1 hover:bg-[#F7AFA8]/10 rounded text-emerald-700 hover:text-emerald-900 transition-colors"
                              title="Convert to Final M.R"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handlePreparePrint(amad)}
                            className="p-1 hover:bg-[#F7AFA8]/10 rounded text-slate-600 hover:text-slate-900 transition-colors"
                            title="Print Slip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {canEditOrDelete() && (
                            <>
                              <button
                                onClick={() => handleEditAmad(amad)}
                                className="p-1 hover:bg-[#F7AFA8]/10 rounded text-blue-600 hover:text-blue-800 transition-colors"
                                title="Edit Record"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(amad.amad_id!, amad.amad_no)}
                                className="p-1 hover:bg-[#F7AFA8]/10 rounded text-rose-600 hover:text-rose-800 transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredAmads.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-sans italic text-xs">
                      No matching Temporary M.R records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-2">
            <PaginationControls
              currentPage={currentPage}
              totalItems={filteredAmads.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>

        {/* 8. BOTTOM SUMMARY CARDS - DEEP GREEN ULTRA COMPACT THEME (HALF SIZE) */}
        <div className="max-w-2xl mx-auto w-full bg-gradient-to-r from-[#F7AFA8] to-[#D94B5A] rounded-lg border border-[#F06D6C] py-1.5 px-3 text-white shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2 relative overflow-hidden">
          {/* Bottom Left Jute Bags Illustration */}
          <div className="flex items-center gap-2">
            <JuteBagStackIllustration className="w-8 h-7 shrink-0" />
            <div>
              <p className="font-serif font-bold text-[10px] text-amber-300 uppercase tracking-wider leading-none">Bally Jute Quality Assurance</p>
              <p className="text-[9px] text-emerald-100/80 leading-none mt-0.5">
                Verified weight bridge counts & logs synced in real time.
              </p>
            </div>
          </div>

          {/* Center Cumulative Cards */}
          <div className="flex items-center gap-1.5 text-center">
            <div className="bg-[#D94B5A] border border-[#F06D6C] px-2 py-0.5 rounded">
              <p className="text-[7.5px] font-bold text-emerald-200 uppercase leading-none">Loads</p>
              <p className="text-[11px] font-bold font-mono text-amber-300 leading-none">{filteredAmads.length} <span className="text-[8px] text-emerald-200 font-sans">Lorries</span></p>
            </div>
            <div className="bg-[#D94B5A] border border-[#F06D6C] px-2 py-0.5 rounded">
              <p className="text-[7.5px] font-bold text-emerald-200 uppercase leading-none">Packets</p>
              <p className="text-[11px] font-bold font-mono text-amber-300 leading-none">{totalBales} <span className="text-[8px] text-emerald-200 font-sans">Bales</span></p>
            </div>
            <div className="bg-[#D94B5A] border border-[#F06D6C] px-2 py-0.5 rounded">
              <p className="text-[7.5px] font-bold text-emerald-200 uppercase leading-none">Net Weight</p>
              <p className="text-[11px] font-bold font-mono text-amber-300 leading-none">{totalWeightMt.toFixed(3)} <span className="text-[8px] text-emerald-200 font-sans">MT</span></p>
            </div>
          </div>

          {/* Bottom Right Operational Status Badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="bg-[#D94B5A] text-white p-1 px-2 rounded flex items-center gap-1 border border-[#F06D6C] shadow-xs">
              <ShieldCheck className="w-3 h-3 text-amber-300" />
              <div>
                <p className="text-[7.5px] font-bold tracking-wider text-amber-300 uppercase leading-none">STATUS</p>
                <p className="text-[9px] font-bold leading-none text-white mt-0.5">HUB ONLINE</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* PRINT SLIP MODAL */}
      {isPrintingModalOpen && printData && (
        <PrintModal 
          isOpen={isPrintingModalOpen} 
          onClose={() => setIsPrintingModalOpen(false)} 
          title={`MARKS & QUALITY RECEIVED SLIP ${String(printData.amad_no || '').replace(/^#+/, '')}`}
        >
          <div className="bg-white p-6 rounded-lg text-slate-800 text-xs font-mono max-w-4xl mx-auto space-y-4 printable-slip">
            {/* Header */}
            <div className="text-center border-b-2 border-slate-900 pb-3">
              <h2 className="text-xl font-bold font-serif text-[#D94B5A]">BALLY JUTE COMPANY LIMITED</h2>
              <p className="text-xs font-sans font-semibold text-slate-600">P.O. BALLY, DIST. HOWRAH (WEST BENGAL)</p>
              <h3 className="text-sm font-bold text-[#D94B5A] mt-2 underline tracking-wider uppercase font-serif">
                MARKS & QUALITY RECEIVED SLIP (TEMPORARY M.R)
              </h3>
            </div>

            {/* Meta Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FDE7E6] p-3 rounded border border-[#FBCFCB]">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Arrival Voucher</span>
                <span className="font-bold text-slate-900">{String(printData.amad_no || '').replace(/^#+/, '')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Arrival Date</span>
                <span className="font-bold text-slate-900">{printData.date}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">P.O. Number</span>
                <span className="font-bold text-amber-800">{printData.po_no || 'DIRECT'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">M.R Number</span>
                <span className="font-bold text-emerald-800">{printData.mr_no}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Supplier Name</span>
                <span className="font-bold text-slate-900 uppercase">{printData.supplier}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Transporter</span>
                <span className="font-bold text-slate-900 uppercase">{printData.transporter_name || '--'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Lorry Number</span>
                <span className="font-bold text-slate-900 uppercase">{printData.lorry_number || '--'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Arrival Area</span>
                <span className="font-bold text-slate-900 uppercase">{printData.arrival_area_name || '--'}</span>
              </div>
            </div>

            {/* Column toggles */}
            <div className="flex flex-wrap gap-2 text-[10px] font-sans bg-slate-50 p-2 rounded border border-slate-200">
              <span className="font-bold text-slate-700 my-auto">Display Columns:</span>
              {Object.keys(printColumns).map((col) => (
                <label key={col} className="flex items-center gap-1 cursor-pointer bg-white px-1.5 py-0.5 rounded border border-slate-300">
                  <input
 id="checkbox_1200" name="checkbox" aria-label="checkbox"                    type="checkbox"
                    checked={(printColumns as any)[col]}
                    onChange={(e) => setPrintColumns(prev => ({ ...prev, [col]: e.target.checked }))}
                    className="rounded text-[#D94B5A]"
                  />
                  <span className="capitalize">{col.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>

            {/* Particulars Table */}
            <div className="overflow-x-auto border border-slate-900 rounded">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[#D94B5A] text-white font-serif">
                    {printColumns.crop_year && <th className="p-1.5 border-r border-slate-700 text-center">Crop Year</th>}
                    {printColumns.marka && <th className="p-1.5 border-r border-slate-700">Marka</th>}
                    {printColumns.quality && <th className="p-1.5 border-r border-slate-700">Quality / Grade</th>}
                    {printColumns.quantity_rcpt && <th className="p-1.5 border-r border-slate-700 text-right">Qty (Bales)</th>}
                    {printColumns.gross_wt && <th className="p-1.5 border-r border-slate-700 text-right">Gross Wt</th>}
                    {printColumns.moisture_pct && <th className="p-1.5 border-r border-slate-700 text-right">Moisture %</th>}
                    {printColumns.dust_pct && <th className="p-1.5 border-r border-slate-700 text-right">Dust %</th>}
                    {printColumns.ncv_pct && <th className="p-1.5 border-r border-slate-700 text-right">NCV %</th>}
                    {printColumns.net_wt && <th className="p-1.5 text-right">Net Wt (MT)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {printData.rows.map((row: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      {printColumns.crop_year && <td className="p-1.5 text-center border-r border-slate-300">{row.crop_year || '--'}</td>}
                      {printColumns.marka && <td className="p-1.5 border-r border-slate-300 font-bold uppercase">{row.marka || '--'}</td>}
                      {printColumns.quality && <td className="p-1.5 border-r border-slate-300 font-bold uppercase">{row.quality || '--'}</td>}
                      {printColumns.quantity_rcpt && <td className="p-1.5 border-r border-slate-300 text-right font-bold text-blue-900">{row.quantity_rcpt || '--'}</td>}
                      {printColumns.gross_wt && <td className="p-1.5 border-r border-slate-300 text-right">{row.gross_wt || '--'}</td>}
                      {printColumns.moisture_pct && <td className="p-1.5 border-r border-slate-300 text-right">{row.moisture_pct || '--'}</td>}
                      {printColumns.dust_pct && <td className="p-1.5 border-r border-slate-300 text-right">{row.dust_pct || '--'}</td>}
                      {printColumns.ncv_pct && <td className="p-1.5 border-r border-slate-300 text-right">{row.ncv_pct || '--'}</td>}
                      {printColumns.net_wt && <td className="p-1.5 text-right font-bold text-rose-700">{row.net_wt || '--'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Remarks & Signatures */}
            <div className="pt-4 flex items-end justify-between border-t border-slate-300 text-[10px] font-sans">
              <div>
                <p className="font-bold text-slate-700">Remarks: {printData.remarks || 'NIL'}</p>
                <p className="text-slate-500 mt-1">Generated by Bally Jute Company Limited ERP</p>
              </div>
              <div className="flex gap-12">
                <div className="text-center pt-6 border-t border-slate-400 min-w-[100px]">
                  <p className="font-bold">Weighbridge Clerk</p>
                </div>
                <div className="text-center pt-6 border-t border-slate-400 min-w-[100px]">
                  <p className="font-bold">Receiving In-Charge</p>
                </div>
              </div>
            </div>
          </div>
        </PrintModal>
      )}
        </div>
    </LegacyLayout>
  );
}
