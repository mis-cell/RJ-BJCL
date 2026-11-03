import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { sanitizeCsvData, canDeleteData } from '../../lib/utils';
import { dbModule } from '../../services/dbModule';
import { supabase } from '../../lib/supabase';
import { 
  FALLBACK_GODOWNS, 
  FALLBACK_GRADES, 
  FALLBACK_AREAS, 
  FALLBACK_UNITS, 
  DEFAULT_GODOWNS 
} from '../../utils/stockSummaryConstants';
import {
  StockTab,
  StockSubTab,
  TreeHierarchyMode,
  MetricCalculationMode,
  LiveStockItem,
  StockCounts,
  OpeningFormState,
  ClosingFormState,
  DateWiseStockStat
} from './types';

export function useStockSummaryData(initialSubTab: StockSubTab = 'opening') {
  // Navigation Tabs: 'opening' (CRUD Dashboard) vs 'live' (Dynamic calculations summary)
  const [activeTab, setActiveTab] = useState<StockTab>('opening');
  // Sub-tabs for switching between Opening Stock ledger and Closing Stock ledger
  const [stockSubTab, setStockSubTab] = useState<StockSubTab>(initialSubTab);

  // Standard Live Reports & Total Counts
  const [counts, setCounts] = useState<StockCounts>({ amad: 0, sauda: 0, total_bales: 0 });

  // Dropdown Metadata fetched from Supabase
  const [godowns, setGodowns] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  // Saved Opening & Closing Stock rows
  const [openingStocks, setOpeningStocks] = useState<any[]>([]);
  const [closingStocks, setClosingStocks] = useState<any[]>([]);
  const [godownWiseStocks, setGodownWiseStocks] = useState<any[]>([]);
  const [millIssueMasters, setMillIssueMasters] = useState<any[]>([]);
  const [millIssueDetails, setMillIssueDetails] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [metricCalculationMode, setMetricCalculationMode] = useState<MetricCalculationMode>('cumulative');
  const [loading, setLoading] = useState(false);
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});
  const [treeHierarchyMode, setTreeHierarchyMode] = useState<TreeHierarchyMode>('area_grade');
  const [expandedGradesTop, setExpandedGradesTop] = useState<Record<string, boolean>>({});
  const [expandedAreasSub, setExpandedAreasSub] = useState<Record<string, boolean>>({});
  const [expandedLiveGrades, setExpandedLiveGrades] = useState<Record<string, boolean>>({});

  // Multi-filters & Quick actions state
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('ALL');
  const [selectedGodownFilter, setSelectedGodownFilter] = useState('ALL');
  const [transferRecord, setTransferRecord] = useState<any | null>(null);
  const [transferTargetGodown, setTransferTargetGodown] = useState('');
  const [transferBales, setTransferBales] = useState('');
  const [updateGodownRecord, setUpdateGodownRecord] = useState<any | null>(null);
  const [newGodownName, setNewGodownName] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Form input states for Opening Stock
  const [formState, setFormState] = useState<OpeningFormState>({
    id: '',
    opening_date: new Date().toISOString().split('T')[0],
    godown: '',
    area: '',
    grade: '',
    jci: 'No',
    unit: 'BALES',
    quantity: '',
    weight: '',
    avg_weight: ''
  });

  // Form input states for Closing Stock
  const [closingFormState, setClosingFormState] = useState<ClosingFormState>({
    id: '',
    stock_date: new Date().toISOString().split('T')[0],
    godown: '',
    commodity: 'RAW JUTE',
    variety: 'TOSSA',
    grade: '',
    no_of_bales: '',
    weight_qtl: '',
    rate_per_qtl: '6500',
    total_value: '0',
    remarks: '',
    recorded_by: 'ADMIN'
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  
  // Selection, Printing, and Audit Trail state hooks
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [selectedClosingStockId, setSelectedClosingStockId] = useState<string | null>(null);

  // 100-rows per page pagination
  const [closingCurrentPage, setClosingCurrentPage] = useState(1);
  const [closingPageSize, setClosingPageSize] = useState(100);
  const [liveCurrentPage, setLiveCurrentPage] = useState(1);
  const [livePageSize, setLivePageSize] = useState(100);

  useEffect(() => {
    setClosingCurrentPage(1);
    setLiveCurrentPage(1);
  }, [searchQuery, selectedGodownFilter, selectedGradeFilter, selectedAreaFilter, startDateFilter, endDateFilter]);

  const [isPrintingModalOpen, setIsPrintingModalOpen] = useState(false);
  const [isClosingPrintModalOpen, setIsClosingPrintModalOpen] = useState(false);

  const [printData, setPrintData] = useState<any | null>(null);
  const [printClosingData, setPrintClosingData] = useState<any | null>(null);

  const [showCapacityPopup, setShowCapacityPopup] = useState(false);
  const [popupSearchQuery, setPopupSearchQuery] = useState("");

  const [showCustomGradeClosing, setShowCustomGradeClosing] = useState(false);
  const [customGradeValueClosing, setCustomGradeValueClosing] = useState('');

  const getGodownCapacityAndName = (gdnVal: string) => {
    const valStr = String(gdnVal || '').trim();
    if (!valStr) {
      return { name: "No Godown Selected", capacity: 0 };
    }
    let found = DEFAULT_GODOWNS.find(
      g => String(g.gdn_name || '').trim().toLowerCase() === valStr.toLowerCase() ||
           String(g.gdn_short_name || '').trim().toLowerCase() === valStr.toLowerCase()
    );
    if (!found) {
      found = DEFAULT_GODOWNS.find(
        g => String(g.gdn_code || '').trim().toLowerCase() === valStr.toLowerCase()
      );
    }
    if (found) {
      return {
        name: found.gdn_name,
        capacity: Number(found.gdn_capacity || 450)
      };
    }

    if (valStr === '1' || valStr.toUpperCase() === 'GDN-01') return { name: "1", capacity: 600 };
    if (valStr === '2') return { name: "2", capacity: 450 };
    if (valStr === '3') return { name: "3", capacity: 450 };
    if (valStr === '3A') return { name: "3A", capacity: 450 };
    if (valStr === '4') return { name: "4", capacity: 450 };
    if (valStr === '4A') return { name: "4A", capacity: 450 };
    if (valStr === '4B') return { name: "4B", capacity: 600 };
    if (valStr === '5') return { name: "5", capacity: 450 };

    return {
      name: valStr,
      capacity: 450
    };
  };

  // Dual loading logic for Live Valuation counts and Master Dropdowns/Data
  useEffect(() => {
    async function initPage() {
      setLoading(true);
      try {
        // 1. Fetch amad & sauda counts
        const [amad, sauda] = await Promise.all([
          dbModule.fetchAll('temporary_material_received').catch(() => []),
          dbModule.fetchAll('sauda_master').catch(() => [])
        ]);
        setCounts({ 
          amad: amad.length, 
          sauda: sauda.reduce((acc: number, curr: any) => acc + (Number(curr.pkts) || 0), 0),
          total_bales: amad.reduce((acc: number, curr: any) => acc + (Number(curr.packets) || 0), 0)
        });

        // 2. Fetch masters and saved opening/closing stock entries
        await Promise.all([
          fetchDropdowns(),
          loadOpeningStocks(),
          loadClosingStocks(),
          loadMillIssuesAndGodownWiseStocks()
        ]);
      } catch (err) {
        console.error("Initialization warning:", err);
      } finally {
        setLoading(false);
      }
    }
    initPage();
  }, []);

  const fetchDropdowns = async () => {
    if (!supabase) return;
    try {
      // Fetch godown, grade, and area
      const [gdnRes, grdRes, arRes] = await Promise.all([
        supabase.from('godown_master').select('*').limit(150),
        supabase.from('grade_master').select('*').limit(150),
        supabase.from('area_master').select('*').limit(150),
      ]);

      if (gdnRes.data && gdnRes.data.length > 0) {
        const sortedGodowns = [...gdnRes.data].sort((a, b) => 
          String(a.gdn_name || '').localeCompare(String(b.gdn_name || ''))
        );
        setGodowns(sortedGodowns);
      }
      if (grdRes.data && grdRes.data.length > 0) {
        const sortedGrades = [...grdRes.data].sort((a, b) => 
          String(a.grade_name || a.name || '').localeCompare(String(b.grade_name || b.name || ''))
        );
        setGrades(sortedGrades);
      }
      if (arRes.data && arRes.data.length > 0) {
        const sortedAreas = [...arRes.data].sort((a, b) => 
          String(a.area_name || a.name || '').localeCompare(String(b.area_name || b.name || ''))
        );
        setAreas(sortedAreas);
      }

      // Dynamically load units from unit_master
      let fetchedUnits: any[] = [];
      try {
        const { data } = await supabase.from('unit_master').select('*').limit(150);
        if (data && data.length > 0) {
          fetchedUnits = data;
        }
      } catch (err) {
        console.warn("unit_master fetch failed", err);
      }

      if (fetchedUnits.length > 0) {
        const sortedUnits = fetchedUnits
          .map(u => ({ unit_name: String(u.unit_name || u.name || '').toUpperCase() }))
          .filter(u => u.unit_name)
          .sort((a, b) => a.unit_name.localeCompare(b.unit_name));
        
        const uniqueUnits = sortedUnits.filter((v, i, a) => a.findIndex(t => t.unit_name === v.unit_name) === i);
        setUnits(uniqueUnits);
      } else {
        setUnits(FALLBACK_UNITS);
      }
    } catch (err) {
      console.warn("Could not pre-fetch some metadata tables, using dynamic values.", err);
    }
  };

  const loadOpeningStocks = async () => {
    try {
      if (supabase) {
        const [opRes, gdnRes] = await Promise.all([
          supabase.from('opening_stock').select('*').order('opening_date', { ascending: false }),
          supabase.from('godown_wise_stock').select('*').order('stock_date', { ascending: false })
        ]);
        
        if (opRes.error) throw opRes.error;
        if (gdnRes.error) throw gdnRes.error;

        const opData = (opRes.data || []).map(r => ({
          ...r,
          stock_date: r.opening_date || r.stock_date || new Date().toISOString().split('T')[0],
          opening_date: r.opening_date || r.stock_date || new Date().toISOString().split('T')[0]
        }));
        
        const gdnData = (gdnRes.data || []).map(r => ({
          ...r,
          opening_date: r.stock_date || r.opening_date || new Date().toISOString().split('T')[0],
          stock_date: r.stock_date || r.opening_date || new Date().toISOString().split('T')[0]
        }));
        
        // Combine them and remove duplicates by ID just in case
        const combined = [...gdnData, ...opData];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        
        setOpeningStocks(unique);
        localStorage.setItem('po_auto_opening_stock', JSON.stringify(unique));
        return;
      }
    } catch (err) {
      console.warn("Error loading saved opening stocks from Supabase, using localStorage fallback:", err);
    }

    // Local fallback
    const stored = localStorage.getItem('po_auto_opening_stock');
    if (stored && stored !== 'undefined' && stored !== 'null') {
      try {
        setOpeningStocks(JSON.parse(stored === "undefined" ? "null" : stored));
      } catch (e) {
        console.error("Failed to parse opening stocks from localStorage", e);
        setOpeningStocks([]);
      }
    } else {
      setOpeningStocks([]);
    }
  };

  const loadClosingStocks = async () => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('closing_stock')
          .select('*')
          .order('stock_date', { ascending: false });
        
        if (error) throw error;
        setClosingStocks(data || []);
        return;
      }
    } catch (err) {
      console.warn("Error loading closing stocks from Supabase, using localStorage fallback:", err);
    }

    // Fallback local storage
    const stored = localStorage.getItem('po_auto_closing_stock');
    if (stored && stored !== 'undefined' && stored !== 'null') {
      try {
        setClosingStocks(JSON.parse(stored === "undefined" ? "null" : stored));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const loadMillIssuesAndGodownWiseStocks = async () => {
    try {
      let gwsData: any[] = [];
      let mimData: any[] = [];
      let midData: any[] = [];

      if (supabase) {
        try {
          const [gwsRes, mimRes, midRes] = await Promise.all([
            supabase.from('godown_wise_stock').select('*'),
            supabase.from('mill_issue_master').select('*'),
            supabase.from('mill_issue_detail').select('*')
          ]);
          gwsData = gwsRes.data || [];
          mimData = mimRes.data || [];
          midData = midRes.data || [];
        } catch (se) {
          console.warn("Supabase fetch failed, falling back to dbModule", se);
        }
      }

      if (!gwsData || gwsData.length === 0) {
        gwsData = await dbModule.fetchAll('godown_wise_stock').catch(() => []);
      }
      if (!mimData || mimData.length === 0) {
        mimData = await dbModule.fetchAll('mill_issue_master').catch(() => []);
      }
      if (!midData || midData.length === 0) {
        midData = await dbModule.fetchAll('mill_issue_detail').catch(() => []);
      }

      setGodownWiseStocks(gwsData || []);
      setMillIssueMasters(mimData || []);
      setMillIssueDetails(midData || []);
    } catch (err) {
      console.warn("Could not load mill issues or godown wise stocks:", err);
    }
  };

  const handleClosingFieldChange = (field: string, value: string) => {
    setClosingFormState(prev => {
      const updated = { ...prev, [field]: value };
      
      // Estimation logic: 1 Bale is approx 0.52 Quintals
      if (field === 'no_of_bales') {
        const bales = parseFloat(value) || 0;
        updated.weight_qtl = String(Math.round(bales * 0.52 * 100) / 100);
      }
      
      const balesVal = parseFloat(updated.no_of_bales) || 0;
      const weightVal = parseFloat(updated.weight_qtl) || (Math.round(balesVal * 0.52 * 100) / 100);
      const rateVal = parseFloat(updated.rate_per_qtl) || 0;
      updated.total_value = String(Math.round(weightVal * rateVal * 100) / 100);
      
      return updated;
    });
  };

  // Helper methods for logging audits, exporting to CSV, and preparing print dialogs
  const logOpeningStockAudit = (action: 'CREATE' | 'UPDATE' | 'DELETE', details: string) => {
    try {
      const timestamp = new Date().toISOString();
      const user = localStorage.getItem("mill_operator_id") || "OPERATOR-01";
      const logEntry = {
        id: Math.random().toString(36).substring(2, 9),
        action,
        timestamp,
        user_id: user,
        details
      };
      const existing = (function(){
        try {
          const val = localStorage.getItem('mill_opening_stock_change_history');
          if (!val || val === 'undefined' || val === 'null') return [];
          const parsed = JSON.parse(val === "undefined" ? "null" : val);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          return [];
        }
      })();
      localStorage.setItem('mill_opening_stock_change_history', JSON.stringify([logEntry, ...existing]));
    } catch (e) {
      console.error("Failed to write opening stock audit log", e);
    }
  };

  const triggerCSVDownload = (data: any[], prefix: string) => {
    try {
      const sanitizedData = sanitizeCsvData(data);
      const csv = Papa.unparse(sanitizedData);
      const csvContent = "\uFEFF" + csv;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${prefix}${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to export ledger data to CSV.");
    }
  };

  const handleExportToCSV = () => {
    if (stockSubTab === 'opening') {
      if (filteredSavedStocks.length === 0) {
        alert("No opening stock data available to export.");
        return;
      }
      const dataToExport = filteredSavedStocks.map(row => ({
        'Opening Date': row.opening_date || '',
        'Godown / Warehouse': row.godown || '',
        'Area Station': row.area || '',
        'Grade Component': row.grade || '',
        'Govt Supplied (JCI)': row.jci || 'No',
        'Unit': row.unit || 'BALES',
        'Quantity': Number(row.quantity) || 0,
        'Weight (MT)': (Number(row.weight) || 0) / 10,
        'Avg Wt (MT/unit)': row.avg_weight ? (Number(row.avg_weight) / 10) : (Number(row.quantity) > 0 ? Number(((Number(row.weight) / Number(row.quantity)) / 10).toFixed(4)) : 0)
      }));
      triggerCSVDownload(dataToExport, 'Opening_Stock_Ledger_');
    } else {
      if (filteredClosingStocks.length === 0) {
        alert("No closing stock data available to export.");
        return;
      }
      const dataToExport = filteredClosingStocks.map(row => ({
        'Stock Date': row.stock_date || '',
        'Godown Location': row.godown || '',
        'Commodity': row.commodity || 'RAW JUTE',
        'Variety': row.variety || 'TOSSA',
        'Grade Component': row.grade || '',
        'No of Bales': Number(row.no_of_bales) || 0,
        'Weight (MT)': (Number(row.weight_qtl) || 0) / 10,
        'Rate per MT': (Number(row.rate_per_qtl) || 0) * 10,
        'Total Value (Rs)': Number(row.total_value) || 0,
        'Recorded By': row.recorded_by || 'ADMIN',
        'Remarks': row.remarks || ''
      }));
      triggerCSVDownload(dataToExport, 'Closing_Stock_Ledger_');
    }
  };

  const handleExportLiveStockToCSV = () => {
    const liveRows = calculateLiveStocks();

    const allRows = liveRows.map(row => ({
      name: row.grade,
      opening: row.openingQty,
      incoming: row.incomingQty,
      outgoing: row.outgoingQty,
      balance: row.balanceQty,
      weight: row.balanceWt
    }));

    const filteredRows = allRows.filter(row => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return row.name.toLowerCase().includes(q);
    });

    if (filteredRows.length === 0) {
      alert("No live stock data available to export.");
      return;
    }

    const dataToExport = filteredRows.map(row => ({
      "Commodity Quality & Grade": row.name,
      "Opening Stock (Bales)": row.opening,
      "Issue to Godown (Bales)": row.incoming,
      "Godown to Factory (Bales)": row.outgoing,
      "Current Stock Balance (Bales)": row.balance,
      "Net Weight (MT)": Number((row.weight / 10).toFixed(2))
    }));

    triggerCSVDownload(dataToExport, "Live_Latest_Inventory_Report_");
  };

  const handlePreparePrint = (row: any) => {
    setPrintData(row);
    setIsPrintingModalOpen(true);
    
    const timestamp = new Date().toISOString();
    const user = localStorage.getItem("mill_operator_id") || "OPERATOR-01";
    const logEntry = {
      id: Math.random().toString(36).substring(2, 9),
      user_id: user,
      timestamp,
      row_ids: [row.id || 'N/A'],
      details: `Printed Opening Stock Certificate for ${row.grade} @ ${row.godown} [Qty: ${row.quantity} ${row.unit}]`
    };
    try {
      const existingLogs = JSON.parse(localStorage.getItem("mill_inspection_print_logs") === "undefined" ? "[]" : (localStorage.getItem("mill_inspection_print_logs") || "[]"));
      localStorage.setItem("mill_inspection_print_logs", JSON.stringify([logEntry, ...existingLogs]));
    } catch (err) {
      console.error("Local print event log error:", err);
    }
  };

  const handlePrepareClosingPrint = (row: any) => {
    setPrintClosingData(row);
    setIsClosingPrintModalOpen(true);

    const timestamp = new Date().toISOString();
    const user = localStorage.getItem("mill_operator_id") || "OPERATOR-01";
    const logEntry = {
      id: Math.random().toString(36).substring(2, 9),
      user_id: user,
      timestamp,
      row_ids: [row.id || 'N/A'],
      details: `Printed Opening Stock Statement for ${row.grade} @ ${row.godown} [Bales: ${row.no_of_bales || row.quantity}, Value: Rs. ${row.total_value}]`
    };
    try {
      const existingLogs = JSON.parse(localStorage.getItem("mill_inspection_print_logs") === "undefined" ? "[]" : (localStorage.getItem("mill_inspection_print_logs") || "[]"));
      localStorage.setItem("mill_inspection_print_logs", JSON.stringify([logEntry, ...existingLogs]));
    } catch (err) {
      console.error(err);
    }
  };

  // Combine fetched metadata with static defaults so the dropdown is never empty
  const mergedGodowns = godowns.length > 0 ? godowns : FALLBACK_GODOWNS;
  const mergedGrades = grades.length > 0 ? grades : FALLBACK_GRADES;
  const mergedAreas = areas.length > 0 ? areas : FALLBACK_AREAS;
  const mergedUnits = units.length > 0 ? units : FALLBACK_UNITS;

  const resetForm = () => {
    setFormState({
      id: '',
      opening_date: new Date().toISOString().split('T')[0],
      godown: '',
      area: '',
      grade: '',
      jci: 'No',
      unit: 'BALES',
      quantity: '',
      weight: '',
      avg_weight: ''
    });
    setIsEditing(false);
    setSelectedStockId(null);
    try {
      localStorage.removeItem('AUTOSAVE_STOCK_SUMMARY');
    } catch (e) {
      console.warn(e);
    }
  };

  const resetClosingForm = () => {
    setClosingFormState({
      id: '',
      stock_date: new Date().toISOString().split('T')[0],
      godown: '',
      commodity: 'RAW JUTE',
      variety: 'TOSSA',
      grade: '',
      no_of_bales: '',
      weight_qtl: '',
      rate_per_qtl: '6500',
      total_value: '0',
      remarks: '',
      recorded_by: 'ADMIN'
    });
    setIsEditing(false);
    setShowCustomGradeClosing(false);
    setCustomGradeValueClosing('');
    setSelectedClosingStockId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      alert("Supplied database client is offline.");
      return;
    }

    setLoading(true);
    const finalArea = (formState.area || '').toUpperCase().trim();
    const finalGrade = (formState.grade || '').toUpperCase().trim();
    const finalGodown = (formState.godown || '').toUpperCase().trim();
    const finalUnit = (formState.unit || 'BALES').toUpperCase().trim();

    if (!finalGodown) {
      alert("Please provide a valid Godown.");
      setLoading(false);
      return;
    }
    if (!finalArea) {
      alert("Please provide a valid Area name.");
      setLoading(false);
      return;
    }
    if (!finalGrade) {
      alert("Please provide a valid Grade specification.");
      setLoading(false);
      return;
    }

    const qty = parseFloat(formState.quantity) || 0;
    const wt = parseFloat(formState.weight) || 0;
    const calculatedAvg = qty > 0 ? parseFloat((wt / qty).toFixed(3)) : 0;

    const recordId = isEditing && formState.id ? formState.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'local-' + Date.now());

    const payload = {
      id: recordId,
      opening_date: formState.opening_date,
      stock_date: formState.opening_date,
      godown: finalGodown,
      area: finalArea,
      grade: finalGrade,
      jci: formState.jci,
      unit: finalUnit,
      quantity: qty,
      weight: wt,
      avg_weight: calculatedAvg,
    };

    try {
      let success = false;
      if (supabase && !String(recordId).startsWith('local-')) {
        try {
          const payloadOp = { ...payload };
          const payloadGdn = {
            id: recordId,
            stock_date: formState.opening_date,
            godown: finalGodown,
            area: finalArea,
            grade: finalGrade,
            jci: formState.jci,
            unit: finalUnit,
            quantity: qty,
            weight: wt,
            avg_weight: calculatedAvg
          };

          const [opRes, gdnRes] = await Promise.all([
            supabase.from('opening_stock').upsert(payloadOp),
            supabase.from('godown_wise_stock').upsert(payloadGdn)
          ]);
          
          if (opRes.error) throw opRes.error;
          if (gdnRes.error) throw gdnRes.error;
          success = true;
        } catch (dbErr) {
          console.warn("Database operation failed for opening stock, utilizing local storage fallback:", dbErr);
        }
      }

      if (!success) {
        const stored = localStorage.getItem('po_auto_opening_stock');
        let current: any[] = [];
        if (stored && stored !== 'undefined' && stored !== 'null') {
          try { current = JSON.parse(stored === "undefined" ? "null" : stored); } catch (e) { console.error(e); }
        }
        if (isEditing && formState.id) {
          current = current.map(item => item.id === formState.id ? { ...item, ...payload } : item);
          logOpeningStockAudit('UPDATE', `[Local] Updated Opening Stock: ${finalGrade} @ ${finalGodown}`);
          alert("Opening Stock record updated locally!");
        } else {
          const newRecord = { ...payload, created_at: new Date().toISOString() };
          current = [newRecord, ...current];
          logOpeningStockAudit('CREATE', `[Local] Created Opening Stock: ${finalGrade} @ ${finalGodown}`);
          alert("New Opening Stock master record created locally!");
        }
        localStorage.setItem('po_auto_opening_stock', JSON.stringify(current));
        setOpeningStocks(current);
      } else {
        logOpeningStockAudit(isEditing ? 'UPDATE' : 'CREATE', `${isEditing ? 'Updated' : 'Created'} Opening Stock: ${finalGrade} @ ${finalGodown} [Qty: ${qty} ${finalUnit}, Wt: ${wt} Qtl]`);
        alert(isEditing ? "Opening Stock record updated successfully!" : "New Opening Stock master record created successfully!");
        await loadOpeningStocks();
      }
      setIsFormModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error(err);
      alert("Error saving record: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClosingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const finalGrade = closingFormState.grade === 'CUSTOM_MANUAL' ? customGradeValueClosing : closingFormState.grade;

    if (!finalGrade || !finalGrade.trim()) {
      alert("Please provide a valid Grade specification.");
      setLoading(false);
      return;
    }

    const payload = {
      stock_date: closingFormState.stock_date,
      godown: closingFormState.godown,
      commodity: closingFormState.commodity,
      variety: closingFormState.variety,
      grade: finalGrade.toUpperCase().trim(),
      no_of_bales: parseInt(closingFormState.no_of_bales) || 0,
      weight_qtl: parseFloat(closingFormState.weight_qtl) || 0,
      rate_per_qtl: parseFloat(closingFormState.rate_per_qtl) || 0,
      total_value: parseFloat(closingFormState.total_value) || 0,
      remarks: closingFormState.remarks,
      recorded_by: closingFormState.recorded_by || 'ADMIN'
    };

    try {
      if (isEditing && closingFormState.id) {
        const { error } = await supabase
          .from('closing_stock')
          .update(payload)
          .eq('id', closingFormState.id);
        
        if (error) throw error;
        logOpeningStockAudit('UPDATE', `Updated Closing Stock: ${finalGrade} @ ${closingFormState.godown} [Bales: ${closingFormState.no_of_bales}, Value: Rs. ${closingFormState.total_value}]`);
        alert("Success: Closing Stock record updated successfully!");
      } else {
        const { error } = await supabase
          .from('closing_stock')
          .insert(payload);
        
        if (error) throw error;
        logOpeningStockAudit('CREATE', `Created Closing Stock: ${finalGrade} @ ${closingFormState.godown} [Bales: ${closingFormState.no_of_bales}, Value: Rs. ${closingFormState.total_value}]`);
        alert("Success: New Monthly Closing Stock master registered!");
      }
      setIsFormModalOpen(false);
      resetClosingForm();
      await loadClosingStocks();
    } catch (dbErr: any) {
      console.error("Closing Stock DB write failed:", dbErr);
      alert("Error saving Closing Stock record to database: " + (dbErr.message || String(dbErr)));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (row: any) => {
    const qty = parseFloat(row.quantity) || 0;
    const wt = parseFloat(row.weight) || 0;
    const computedAvg = qty > 0 ? (wt / qty).toFixed(3) : '0.000';

    setFormState({
      id: row.id,
      opening_date: row.opening_date,
      godown: row.godown,
      area: row.area,
      grade: row.grade,
      jci: row.jci || 'No',
      unit: row.unit || 'BALES',
      quantity: String(row.quantity),
      weight: String(row.weight),
      avg_weight: row.avg_weight ? String(row.avg_weight) : computedAvg,
    });

    setIsEditing(true);
    setIsFormModalOpen(true);
  };

  const handleEditClosing = (row: any) => {
    const gradeExists = mergedGrades.some(g => (g.grade_name || g.name || g.code || '').toUpperCase() === row.grade.toUpperCase());

    setClosingFormState({
      id: row.id,
      stock_date: row.stock_date,
      godown: row.godown,
      commodity: row.commodity || 'RAW JUTE',
      variety: row.variety || 'TOSSA',
      grade: gradeExists ? row.grade : 'CUSTOM_MANUAL',
      no_of_bales: String(row.no_of_bales || 0),
      weight_qtl: String(row.weight_qtl || 0.0),
      rate_per_qtl: String(row.rate_per_qtl || 6500),
      total_value: String(row.total_value || 0.0),
      remarks: row.remarks || '',
      recorded_by: row.recorded_by || 'ADMIN'
    });

    if (!gradeExists) {
      setCustomGradeValueClosing(row.grade);
      setShowCustomGradeClosing(true);
    } else {
      setShowCustomGradeClosing(false);
      setCustomGradeValueClosing('');
    }

    setIsEditing(true);
    setIsFormModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!canDeleteData()) {
      alert("Only Admin can delete data.");
      return;
    }

    if (confirm(`Are you sure you want to permanently delete Opening Stock entry for [${name}]?`)) {
      setLoading(true);
      try {
        if (supabase) {
          const [opDel, gdnDel] = await Promise.all([
            supabase.from('opening_stock').delete().eq('id', id),
            supabase.from('godown_wise_stock').delete().eq('id', id)
          ]);
          
          if (opDel.error) throw opDel.error;
          if (gdnDel.error) throw gdnDel.error;
        }

        logOpeningStockAudit('DELETE', `Deleted Opening Stock record [ID: ${id}]: ${name}`);
        alert("Opening Stock record deleted successfully from database.");
        await loadOpeningStocks();

        if (formState.id === id) {
          resetForm();
        }
      } catch (err: any) {
        alert("Deletion failed: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExecuteTransfer = async () => {
    if (!transferRecord || !transferTargetGodown || !transferBales) {
      alert("Please select target godown and enter valid bales to transfer.");
      return;
    }
    const qtyToTransfer = parseInt(transferBales) || 0;
    if (qtyToTransfer <= 0 || qtyToTransfer > Number(transferRecord.quantity || 0)) {
      alert("Invalid quantity to transfer.");
      return;
    }

    try {
      const sourceQty = Number(transferRecord.quantity || 0);
      const sourceWt = Number(transferRecord.weight || 0);
      const transferWt = Number((sourceWt * (qtyToTransfer / Math.max(1, sourceQty))).toFixed(3));
      const updatedSourceQty = sourceQty - qtyToTransfer;
      const updatedSourceWt = Number((sourceWt * (updatedSourceQty / Math.max(1, sourceQty))).toFixed(3));
      const openingDate = new Date().toISOString().split('T')[0];

      const esc = (v: any) => `'${String(v ?? '').replace(/'/g, "''")}'`;
      await dbModule.executeTransaction([
        `UPDATE opening_stock SET quantity = ${updatedSourceQty}, weight = ${updatedSourceWt} WHERE id = ${esc(transferRecord.id)} AND quantity = ${sourceQty};`,
        `UPDATE godown_wise_stock SET quantity = ${updatedSourceQty}, weight = ${updatedSourceWt} WHERE id = ${esc(transferRecord.id)};`,
        `INSERT INTO opening_stock (opening_date, godown, area, grade, jci, unit, quantity, weight) VALUES (${esc(openingDate)}, ${esc(transferTargetGodown)}, ${esc(transferRecord.area)}, ${esc(transferRecord.grade)}, ${esc(transferRecord.jci || 'No')}, ${esc(transferRecord.unit || 'BALES')}, ${qtyToTransfer}, ${transferWt});`
      ]);

      await loadOpeningStocks();
      alert(`Success: Atomically transferred ${qtyToTransfer} bales to godown ${transferTargetGodown}!`);
      setTransferRecord(null);
      setTransferBales('');
      setTransferTargetGodown('');
    } catch (err: any) {
      console.error("Transfer failed:", err);
      alert("Error executing atomic stock transfer: " + (err.message || String(err)));
    }
  };

  const handleExecuteUpdateGodown = async () => {
    if (!updateGodownRecord || !newGodownName) {
      alert("Please select a new godown name.");
      return;
    }

    try {
      if (supabase) {
        await supabase.from('opening_stock').update({ godown: newGodownName }).eq('id', updateGodownRecord.id);
        await supabase.from('godown_wise_stock').update({ godown: newGodownName }).eq('id', updateGodownRecord.id);
      }
      await loadOpeningStocks();
      alert(`Success: Godown updated to ${newGodownName} successfully!`);
      setUpdateGodownRecord(null);
      setNewGodownName('');
    } catch (err) {
      console.error("Update godown failed:", err);
      alert("Error updating godown location.");
    }
  };

  const handleDeleteClosing = async (id: string, name: string) => {
    if (!canDeleteData()) {
      alert("Only Admin can delete data.");
      return;
    }

    if (confirm(`Are you sure you want to permanently delete Closing Stock entry for [${name}]?`)) {
      setLoading(true);
      try {
        if (supabase) {
          const { error } = await supabase
            .from('closing_stock')
            .delete()
            .eq('id', id);
          if (error) throw error;
        }
        logOpeningStockAudit('DELETE', `Deleted Closing Stock record [ID: ${id}]: ${name}`);
        alert("Closing Stock record deleted successfully from database.");
        await loadClosingStocks();
        if (closingFormState.id === id) {
          resetClosingForm();
        }
      } catch (err: any) {
        console.error("Closing Stock DB delete failed:", err);
        alert("Failed to delete Closing Stock record: " + (err.message || String(err)));
      } finally {
        setLoading(false);
      }
    }
  };

  // Searching & live filters
  const filteredSavedStocks = openingStocks.filter(row => {
    const rowDate = row.opening_date || row.stock_date || '';
    if (startDateFilter && rowDate < startDateFilter) return false;
    if (endDateFilter && rowDate > endDateFilter) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (row.opening_date || '').toLowerCase().includes(q) ||
      (row.godown || '').toLowerCase().includes(q) ||
      (row.area || '').toLowerCase().includes(q) ||
      (row.grade || '').toLowerCase().includes(q) ||
      (row.unit || '').toLowerCase().includes(q) ||
      (row.jci || '').toLowerCase().includes(q)
    );
  });

  const filteredClosingStocks = closingStocks.filter(row => {
    const rowDate = row.stock_date || row.opening_date || '';
    if (startDateFilter && rowDate < startDateFilter) return false;
    if (endDateFilter && rowDate > endDateFilter) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (row.stock_date || '').toLowerCase().includes(q) ||
      (row.godown || '').toLowerCase().includes(q) ||
      (row.commodity || '').toLowerCase().includes(q) ||
      (row.variety || '').toLowerCase().includes(q) ||
      (row.grade || '').toLowerCase().includes(q) ||
      (row.remarks || '').toLowerCase().includes(q)
    );
  });

  const calculateLiveStocks = (): LiveStockItem[] => {
    const gradeMap: { [key: string]: LiveStockItem } = {};

    // 1. Process opening_stock as initial opening stock components
    openingStocks.forEach(item => {
      const gName = String(item.grade || 'UNKNOWN').trim().toUpperCase();
      if (!gradeMap[gName]) {
        gradeMap[gName] = { grade: gName, openingQty: 0, openingWt: 0, incomingQty: 0, incomingWt: 0, outgoingQty: 0, outgoingWt: 0, balanceQty: 0, balanceWt: 0 };
      }
      gradeMap[gName].openingQty += Number(item.quantity) || 0;
      gradeMap[gName].openingWt += Number(item.weight) || 0;
    });

    // 2. Classify material issue masters by type
    const godownIssueNos = new Set<string>(); // "Issue to Godown" (Incoming)
    const factoryIssueNos = new Set<string>(); // "Godown to Factory" (Outgoing)

    millIssueMasters.forEach(m => {
      const type = String(m.issue_type || '').trim().toUpperCase();
      const issueNoUpper = String(m.issue_no).trim().toUpperCase();
      if (type === 'GODOWN') {
        godownIssueNos.add(issueNoUpper);
      } else if (type === 'FACTORY' || type === 'FACTORY ISSUE' || type === 'SELL') {
        factoryIssueNos.add(issueNoUpper);
      }
    });

    // 3. Process details and map to the correct grade
    millIssueDetails.forEach(d => {
      const issueNoUpper = String(d.issue_no).trim().toUpperCase();
      const gName = String(d.grade_name || d.grade || 'UNKNOWN').trim().toUpperCase();

      if (godownIssueNos.has(issueNoUpper)) {
        if (!gradeMap[gName]) {
          gradeMap[gName] = { grade: gName, openingQty: 0, openingWt: 0, incomingQty: 0, incomingWt: 0, outgoingQty: 0, outgoingWt: 0, balanceQty: 0, balanceWt: 0 };
        }
        gradeMap[gName].incomingQty += Number(d.qty) || 0;
        const wtKgs = Number(d.weight_kgs) || 0;
        gradeMap[gName].incomingWt += wtKgs / 100; // Convert kgs to quintals
      } else if (factoryIssueNos.has(issueNoUpper)) {
        if (!gradeMap[gName]) {
          gradeMap[gName] = { grade: gName, openingQty: 0, openingWt: 0, incomingQty: 0, incomingWt: 0, outgoingQty: 0, outgoingWt: 0, balanceQty: 0, balanceWt: 0 };
        }
        gradeMap[gName].outgoingQty += Number(d.qty) || 0;
        const wtKgs = Number(d.weight_kgs) || 0;
        gradeMap[gName].outgoingWt += wtKgs / 100; // Convert kgs to quintals
      }
    });

    // 4. Return formatted objects with final balances (Opening + Incoming - Outgoing)
    return Object.values(gradeMap).map(row => {
      const balanceQty = row.openingQty + row.incomingQty - row.outgoingQty;
      const balanceWt = row.openingWt + row.incomingWt - row.outgoingWt;

      return {
        ...row,
        balanceQty,
        balanceWt
      };
    });
  };

  const formatDateBeautiful = (dateStr: string) => {
    if (!dateStr || dateStr === 'No Date') return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Dynamic Metrics variables
  let totalOpeningQty = 0;
  let totalOpeningWt = 0;
  let totalIssuedToGodownBales = 0;
  let totalIssuedToGodownWeight = 0;
  let totalIssuedToFactoryBales = 0;
  let totalIssuedToFactoryWeight = 0;

  if (metricCalculationMode === 'cumulative') {
    const endLimit = endDateFilter || '9999-12-31';

    const opFiltered = openingStocks.filter(r => (r.opening_date || r.stock_date || '') <= endLimit);
    totalOpeningQty = opFiltered.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    totalOpeningWt = opFiltered.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);

    const godownIssueNosSet = new Set(
      millIssueMasters
        .filter(m => String(m.issue_type || '').trim().toUpperCase() === 'GODOWN' && (m.date || '') <= endLimit)
        .map(m => String(m.issue_no).trim().toUpperCase())
    );
    totalIssuedToGodownBales = millIssueDetails
      .filter(d => godownIssueNosSet.has(String(d.issue_no).trim().toUpperCase()))
      .reduce((sum, d) => sum + (Number(d.qty) || 0), 0);
    totalIssuedToGodownWeight = millIssueDetails
      .filter(d => godownIssueNosSet.has(String(d.issue_no).trim().toUpperCase()))
      .reduce((sum, d) => sum + ((Number(d.weight_kgs) || 0) / 100), 0);

    const factoryIssueNosSet = new Set(
      millIssueMasters
        .filter(m => {
          const type = String(m.issue_type || '').trim().toUpperCase();
          const isFactoryType = type === 'FACTORY' || type === 'FACTORY ISSUE' || type === 'SELL';
          return isFactoryType && (m.date || '') <= endLimit;
        })
        .map(m => String(m.issue_no).trim().toUpperCase())
    );
    totalIssuedToFactoryBales = millIssueDetails
      .filter(d => factoryIssueNosSet.has(String(d.issue_no).trim().toUpperCase()))
      .reduce((sum, d) => sum + (Number(d.qty) || 0), 0);
    totalIssuedToFactoryWeight = millIssueDetails
      .filter(d => factoryIssueNosSet.has(String(d.issue_no).trim().toUpperCase()))
      .reduce((sum, d) => sum + ((Number(d.weight_kgs) || 0) / 100), 0);

  } else {
    const startLimit = startDateFilter || '1900-01-01';
    const endLimit = endDateFilter || '9999-12-31';

    const opFiltered = openingStocks.filter(r => {
      const d = r.opening_date || r.stock_date || '';
      return d >= startLimit && d <= endLimit;
    });
    totalOpeningQty = opFiltered.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    totalOpeningWt = opFiltered.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);

    const godownIssueNosSet = new Set(
      millIssueMasters
        .filter(m => {
          const type = String(m.issue_type || '').trim().toUpperCase();
          const d = m.date || '';
          return type === 'GODOWN' && d >= startLimit && d <= endLimit;
        })
        .map(m => String(m.issue_no).trim().toUpperCase())
    );
    totalIssuedToGodownBales = millIssueDetails
      .filter(d => godownIssueNosSet.has(String(d.issue_no).trim().toUpperCase()))
      .reduce((sum, d) => sum + (Number(d.qty) || 0), 0);
    totalIssuedToGodownWeight = millIssueDetails
      .filter(d => godownIssueNosSet.has(String(d.issue_no).trim().toUpperCase()))
      .reduce((sum, d) => sum + ((Number(d.weight_kgs) || 0) / 100), 0);

    const factoryIssueNosSet = new Set(
      millIssueMasters
        .filter(m => {
          const type = String(m.issue_type || '').trim().toUpperCase();
          const d = m.date || '';
          const isFactoryType = type === 'FACTORY' || type === 'FACTORY ISSUE' || type === 'SELL';
          return isFactoryType && d >= startLimit && d <= endLimit;
        })
        .map(m => String(m.issue_no).trim().toUpperCase())
    );
    totalIssuedToFactoryBales = millIssueDetails
      .filter(d => factoryIssueNosSet.has(String(d.issue_no).trim().toUpperCase()))
      .reduce((sum, d) => sum + (Number(d.qty) || 0), 0);
    totalIssuedToFactoryWeight = millIssueDetails
      .filter(d => factoryIssueNosSet.has(String(d.issue_no).trim().toUpperCase()))
      .reduce((sum, d) => sum + ((Number(d.weight_kgs) || 0) / 100), 0);
  }

  const currentClosingStockBales = totalOpeningQty + totalIssuedToGodownBales - totalIssuedToFactoryBales;
  const currentClosingStockWeight = totalOpeningWt + totalIssuedToGodownWeight - totalIssuedToFactoryWeight;

  const getOpeningStockDateInfo = () => {
    if (startDateFilter || endDateFilter) {
      if (metricCalculationMode === 'cumulative') {
        return `OPENING STOCK AS OF ${formatDateBeautiful(endDateFilter || 'LATEST')}`;
      } else {
        return `OPENINGS FROM ${formatDateBeautiful(startDateFilter || 'EARLIEST')} TO ${formatDateBeautiful(endDateFilter || 'LATEST')}`;
      }
    }
    const dates = openingStocks.map(r => r.opening_date || r.stock_date).filter(Boolean).sort();
    if (dates.length === 0) return 'NO BASELINE RECORDED';
    if (dates.length === 1) return `AS OF ${formatDateBeautiful(dates[0])}`;
    return `BASE: ${formatDateBeautiful(dates[0])} TO ${formatDateBeautiful(dates[dates.length - 1])}`;
  };

  const getIssuedToGodownDateInfo = () => {
    const startLimit = startDateFilter || '1900-01-01';
    const endLimit = endDateFilter || '9999-12-31';

    const dates = millIssueMasters
      .filter(m => {
        const type = String(m.issue_type || '').trim().toUpperCase();
        if (type !== 'GODOWN') return false;
        if (metricCalculationMode === 'cumulative') {
          return (m.date || '') <= endLimit;
        } else {
          return (m.date || '') >= startLimit && (m.date || '') <= endLimit;
        }
      })
      .map(m => m.date)
      .filter(Boolean)
      .sort();

    if (dates.length === 0) return 'NO INWARDS RECORDED';
    return metricCalculationMode === 'cumulative'
      ? `TOTAL INWARDS UP TO ${formatDateBeautiful(dates[dates.length - 1])}`
      : `INWARDS: ${formatDateBeautiful(dates[0])} TO ${formatDateBeautiful(dates[dates.length - 1])}`;
  };

  const getIssuedToFactoryDateInfo = () => {
    const startLimit = startDateFilter || '1900-01-01';
    const endLimit = endDateFilter || '9999-12-31';

    const dates = millIssueMasters
      .filter(m => {
        const type = String(m.issue_type || '').trim().toUpperCase();
        const matches = type === 'FACTORY' || type === 'FACTORY ISSUE' || type === 'SELL';
        if (!matches) return false;
        if (metricCalculationMode === 'cumulative') {
          return (m.date || '') <= endLimit;
        } else {
          return (m.date || '') >= startLimit && (m.date || '') <= endLimit;
        }
      })
      .map(m => m.date)
      .filter(Boolean)
      .sort();

    if (dates.length === 0) return 'NO OUTWARDS RECORDED';
    return metricCalculationMode === 'cumulative'
      ? `TOTAL OUTWARDS UP TO ${formatDateBeautiful(dates[dates.length - 1])}`
      : `OUTWARDS: ${formatDateBeautiful(dates[0])} TO ${formatDateBeautiful(dates[dates.length - 1])}`;
  };

  const getCurrentStockBalanceDateInfo = () => {
    const endLimit = endDateFilter || '9999-12-31';
    if (startDateFilter || endDateFilter) {
      if (metricCalculationMode === 'cumulative') {
        return `STOCK POSITION AS OF ${formatDateBeautiful(endLimit)}`;
      } else {
        return `NET CHANGE IN SELECTED PERIOD`;
      }
    }
    const allDates: string[] = [];
    openingStocks.forEach(r => { if (r.opening_date || r.stock_date) allDates.push(r.opening_date || r.stock_date); });
    millIssueMasters.forEach(r => { if (r.date) allDates.push(r.date); });
    if (allDates.length === 0) return 'NO DATA AS OF NOW';
    allDates.sort();
    return `REAL-TIME AS OF: ${formatDateBeautiful(allDates[allDates.length - 1])}`;
  };

  const totalClosingBales = filteredClosingStocks.reduce((sum, r) => sum + (Number(r.no_of_bales) || 0), 0);
  const totalClosingWt = filteredClosingStocks.reduce((sum, r) => sum + (Number(r.weight_qtl) || 0), 0);
  const totalClosingValue = filteredClosingStocks.reduce((sum, r) => sum + (Number(r.total_value) || 0), 0);

  const dateWiseOpeningStocksMap: { [date: string]: { count: number; quantity: number; weight: number } } = {};
  openingStocks.forEach(r => {
    const d = r.opening_date || r.stock_date || 'No Date';
    if (!dateWiseOpeningStocksMap[d]) {
      dateWiseOpeningStocksMap[d] = { count: 0, quantity: 0, weight: 0 };
    }
    dateWiseOpeningStocksMap[d].count += 1;
    dateWiseOpeningStocksMap[d].quantity += Number(r.quantity || 0);
    dateWiseOpeningStocksMap[d].weight += Number(r.weight || 0);
  });

  const dateWiseOpeningList: DateWiseStockStat[] = Object.entries(dateWiseOpeningStocksMap)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const dateWiseClosingStocksMap: { [date: string]: { count: number; quantity: number; weight: number; value: number } } = {};
  closingStocks.forEach(r => {
    const d = r.stock_date || r.opening_date || 'No Date';
    if (!dateWiseClosingStocksMap[d]) {
      dateWiseClosingStocksMap[d] = { count: 0, quantity: 0, weight: 0, value: 0 };
    }
    dateWiseClosingStocksMap[d].count += 1;
    dateWiseClosingStocksMap[d].quantity += Number(r.no_of_bales || 0);
    dateWiseClosingStocksMap[d].weight += Number(r.weight_qtl || 0);
    dateWiseClosingStocksMap[d].value += Number(r.total_value || 0);
  });

  const dateWiseClosingList: DateWiseStockStat[] = Object.entries(dateWiseClosingStocksMap)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    activeTab,
    setActiveTab,
    stockSubTab,
    setStockSubTab,
    counts,
    godowns,
    grades,
    areas,
    units,
    openingStocks,
    closingStocks,
    godownWiseStocks,
    millIssueMasters,
    millIssueDetails,
    searchQuery,
    setSearchQuery,
    startDateFilter,
    setStartDateFilter,
    endDateFilter,
    setEndDateFilter,
    metricCalculationMode,
    setMetricCalculationMode,
    loading,
    expandedAreas,
    setExpandedAreas,
    expandedGrades,
    setExpandedGrades,
    treeHierarchyMode,
    setTreeHierarchyMode,
    expandedGradesTop,
    setExpandedGradesTop,
    expandedAreasSub,
    setExpandedAreasSub,
    expandedLiveGrades,
    setExpandedLiveGrades,
    selectedGradeFilter,
    setSelectedGradeFilter,
    selectedAreaFilter,
    setSelectedAreaFilter,
    selectedGodownFilter,
    setSelectedGodownFilter,
    transferRecord,
    setTransferRecord,
    transferTargetGodown,
    setTransferTargetGodown,
    transferBales,
    setTransferBales,
    updateGodownRecord,
    setUpdateGodownRecord,
    newGodownName,
    setNewGodownName,
    isPdfModalOpen,
    setIsPdfModalOpen,
    formState,
    setFormState,
    closingFormState,
    setClosingFormState,
    isEditing,
    setIsEditing,
    isFormModalOpen,
    setIsFormModalOpen,
    selectedStockId,
    setSelectedStockId,
    selectedClosingStockId,
    setSelectedClosingStockId,
    closingCurrentPage,
    setClosingCurrentPage,
    closingPageSize,
    setClosingPageSize,
    liveCurrentPage,
    setLiveCurrentPage,
    livePageSize,
    setLivePageSize,
    isPrintingModalOpen,
    setIsPrintingModalOpen,
    isClosingPrintModalOpen,
    setIsClosingPrintModalOpen,
    printData,
    printClosingData,
    showCapacityPopup,
    setShowCapacityPopup,
    popupSearchQuery,
    setPopupSearchQuery,
    showCustomGradeClosing,
    setShowCustomGradeClosing,
    customGradeValueClosing,
    setCustomGradeValueClosing,
    getGodownCapacityAndName,
    fetchDropdowns,
    loadOpeningStocks,
    loadClosingStocks,
    loadMillIssuesAndGodownWiseStocks,
    handleClosingFieldChange,
    handleExportToCSV,
    handleExportLiveStockToCSV,
    handlePreparePrint,
    handlePrepareClosingPrint,
    mergedGodowns,
    mergedGrades,
    mergedAreas,
    mergedUnits,
    resetForm,
    resetClosingForm,
    handleSubmit,
    handleClosingSubmit,
    handleEdit,
    handleEditClosing,
    handleDelete,
    handleDeleteClosing,
    handleExecuteTransfer,
    handleExecuteUpdateGodown,
    filteredSavedStocks,
    filteredClosingStocks,
    calculateLiveStocks,
    formatDateBeautiful,
    totalOpeningQty,
    totalOpeningWt,
    totalIssuedToGodownBales,
    totalIssuedToGodownWeight,
    totalIssuedToFactoryBales,
    totalIssuedToFactoryWeight,
    currentClosingStockBales,
    currentClosingStockWeight,
    getOpeningStockDateInfo,
    getIssuedToGodownDateInfo,
    getIssuedToFactoryDateInfo,
    getCurrentStockBalanceDateInfo,
    totalClosingBales,
    totalClosingWt,
    totalClosingValue,
    dateWiseOpeningList,
    dateWiseClosingList
  };
}
