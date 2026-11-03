import React, { useState, useEffect, useMemo } from 'react';
import { useLiveAutoRefresh } from '../hooks/useLiveAutoRefresh';
import { 
  TrendingUp, 
  History, 
  Search, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Calculator, 
  Settings2, 
  RefreshCcw, 
  FileSpreadsheet, 
  Save, 
  Download, 
  AlertCircle,
  ArrowRight,
  X,
  Printer,
  ClipboardList,
  Upload,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Layers,
  ShieldCheck,
  Zap,
  Filter,
  Sparkles,
  Database,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  ChevronRight,
  Sliders,
  HelpCircle
} from 'lucide-react';
import Papa from 'papaparse';
import { cn, sanitizeCsvData } from '../lib/utils';
import { enforceEditOrDeletePermission, getCurrentUserContext, isUserId10 } from '../lib/permissions';
import { getAuthenticatedUser, resolveUserIdentity } from '../lib/userResolver';
import LegacyLayout, { LegacyButton } from '../components/LegacyLayout';
import { supabase } from '../lib/supabase';
import {
  refreshSattaCache,
  fetchSattaBaseRates,
  getCachedBaseRateHistory,
  getCachedBaseRateApprovalState,
  approveBaseRateByUser010,
  encodeBaseRateRemarks,
  parseBaseRateRemarks,
  savePendingBaseRateMeta,
  BASE_RATE_APPROVAL_REQUIRED_MSG,
  BaseRateApprovalState,
  SattaBaseRateHistoryItem,
} from '../services/sattaRateService';
import { logChange } from '../services/auditLogService';
import { UniversalAuditLogModal } from '../components/UniversalAuditLogModal';

export { MONTH_COLS } from '../components/satta/sattaConstants';
import {
  ALL_GRADES,
  MONTH_COLS,
  AreaDifferential,
  formatDateDMY,
  formatDateTime
} from '../components/satta/sattaConstants';
import { SattaRateConfirmModal } from '../components/satta/SattaRateConfirmModal';
import { SattaPrintPreviewModal } from '../components/satta/SattaPrintPreviewModal';
import { SattaUploadSuccessModal } from '../components/satta/SattaUploadSuccessModal';


export default function SattaChart({ 
  onClose, 
  isEmbedded = false,
  onNavigate
}: { 
  onClose?: () => void; 
  isEmbedded?: boolean; 
  onNavigate?: (page: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'base_rate' | 'matrix' | 'diff_history'>('base_rate');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
  const [showUploadSuccessModal, setShowUploadSuccessModal] = useState<boolean>(false);
  
  // Rate Inputs
  const [baseRate, setBaseRate] = useState<number>(17500);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState<string>('Standard Base Rate update');
  
  // Database States
  const [dbDifferentials, setDbDifferentials] = useState<Record<string, Record<string, number>>>({});
  const [dbDiffUsers, setDbDiffUsers] = useState<Record<string, Record<string, { user: string; time?: string }>>>({});
  const [rateHistory, setRateHistory] = useState<any[]>([]);
  const [latestRateRecord, setLatestRateRecord] = useState<any | null>(null);
  const [approvalState, setApprovalState] = useState<BaseRateApprovalState>(getCachedBaseRateApprovalState());
  const [baseRateChangeHistory, setBaseRateChangeHistory] = useState<SattaBaseRateHistoryItem[]>(getCachedBaseRateHistory());
  const [isApprovingRate, setIsApprovingRate] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<{message: string, success: boolean} | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  const [showUniversalAuditModal, setShowUniversalAuditModal] = useState<boolean>(false);

  const userIs010 = isUserId10();
  const currentAuthUser = getAuthenticatedUser();

  // Differential History Audit State
  const [diffHistoryLogs, setDiffHistoryLogs] = useState<any[]>([]);
  const [isDiffHistoryLoading, setIsDiffHistoryLoading] = useState<boolean>(false);
  const [diffFilterDateFrom, setDiffFilterDateFrom] = useState<string>('');
  const [diffFilterDateTo, setDiffFilterDateTo] = useState<string>('');
  const [diffFilterArea, setDiffFilterArea] = useState<string>('ALL');
  const [diffFilterGrade, setDiffFilterGrade] = useState<string>('ALL');
  const [diffFilterChangedBy, setDiffFilterChangedBy] = useState<string>('ALL');
  const [diffFilterSearch, setDiffFilterSearch] = useState<string>('');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');

  // Cell Editing
  const [editingCell, setEditingCell] = useState<{area: string, grade: string, val: string} | null>(null);
  
  // Hover Tooltip state
  const [hoveredCell, setHoveredCell] = useState<{area: string, grade: string, diff: number, rate: number} | null>(null);

  // Historical Inspection Modal
  const [selectedHistoryRun, setSelectedHistoryRun] = useState<any | null>(null);
  const [historyRunDetails, setHistoryRunDetails] = useState<any[]>([]);
  const [isHistDetailLoading, setIsHistDetailLoading] = useState<boolean>(false);

  // New Audit, Confirmation and Duplicate Check state variables
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState<boolean>(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<{hasDuplicate: boolean, count: number}>({ hasDuplicate: false, count: 0 });

  // History Tab Sub-view state
  const [historySubTab, setHistorySubTab] = useState<'range_list' | 'matrix' | 'chronology'>('range_list');

  // CSV Import State
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Initialize and Auto-refresh Satta Chart
  useLiveAutoRefresh(() => {
    loadChartConfig();
    fetchRateHistory();
    fetchDiffHistory();
  }, [], { tables: ['satta_base_rates', 'satta_differentials', 'satta_calculated_rates', 'satta_differential_audit_logs', 'app_audit_logs'] });

  // Auto-select latest instance when entering range_list mode
  useEffect(() => {
    if ((historySubTab === 'range_list' || historySubTab === 'matrix') && rateHistory.length > 0 && !selectedHistoryRun) {
      handleViewHistoryDetails(rateHistory[0]);
    }
  }, [historySubTab, rateHistory]);

  // Fast rate lookup map by date key (YYYY-MM-DD)
  // Preserves latest update on that date as the active rate
  const rateLookup = useMemo(() => {
    const map = new Map<string, number>();
    rateHistory.forEach(r => {
      if (r.start_date && r.base_rate !== undefined && r.base_rate !== null) {
        if (!map.has(r.start_date)) {
          map.set(r.start_date, Number(r.base_rate));
        }
      }
    });
    return map;
  }, [rateHistory]);

  // Intraday multiple updates tracker per date
  const intradayUpdatesMap = useMemo(() => {
    const map = new Map<string, any[]>();
    rateHistory.forEach(r => {
      if (r.start_date && r.base_rate !== undefined && r.base_rate !== null) {
        const list = map.get(r.start_date) || [];
        list.push(r);
        map.set(r.start_date, list);
      }
    });
    return map;
  }, [rateHistory]);

  // Monthly Base Rate Summary Statistics (AVG, MAX, MIN across months)
  const monthlySummaryStats = useMemo(() => {
    return MONTH_COLS.map((m) => {
      const targetYear = selectedYear + (m.yearOffset || 0);
      const rates: number[] = [];
      for (let day = 1; day <= m.days; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dateKey = `${targetYear}-${m.month}-${dayStr}`;
        const rateVal = rateLookup.get(dateKey);
        if (rateVal && rateVal > 0) {
          rates.push(rateVal);
        }
      }
      if (rates.length === 0) {
        return {
          month: m.name,
          avg: null,
          max: null,
          min: null,
          count: 0
        };
      }
      const sum = rates.reduce((a, b) => a + b, 0);
      const avg = sum / rates.length;
      const max = Math.max(...rates);
      const min = Math.min(...rates);
      return {
        month: m.name,
        avg: avg.toFixed(2),
        max: max.toFixed(2),
        min: min.toFixed(2),
        count: rates.length
      };
    });
  }, [selectedYear, rateLookup]);

  const loadChartConfig = async () => {
    setIsLoading(true);
    try {
      if (!supabase) return;

      const enrichedRates = await fetchSattaBaseRates();
      if (enrichedRates && enrichedRates.length > 0) {
        setLatestRateRecord(enrichedRates[0]);
        setBaseRate(Number(enrichedRates[0].base_rate));
        setStartDate(enrichedRates[0].start_date);
        setRemarks(enrichedRates[0].clean_remarks || parseBaseRateRemarks(enrichedRates[0].remarks).cleanRemarks || '');
        setRateHistory(enrichedRates);
        setApprovalState(getCachedBaseRateApprovalState());
        setBaseRateChangeHistory(getCachedBaseRateHistory());
      }

      // Fetch differentials without mutating or deleting database rows during read
      const { data: diffs, error: diffErr } = await supabase
        .from('satta_differentials')
        .select('*');

      if (diffErr) {
        throw diffErr;
      }

      if (diffs && diffs.length > 0) {
        const cache: Record<string, Record<string, number>> = {};
        const userMap: Record<string, Record<string, { user: string; time?: string }>> = {};
        diffs.forEach(item => {
          let area = String(item.area || '').trim().toUpperCase();
          if (
            area === 'LOWER ASSAM' || 
            area === 'BILASIPARA' || 
            area.includes('TARABARI') || 
            area === 'L/A' ||
            area === 'BELLOW ASSAM' || 
            area === 'BELOW ASSAM' ||
            area.includes('BELLOW') ||
            area.includes('BELOW')
          ) {
            area = 'L/A TARABARI';
          }
          if (!cache[area]) cache[area] = {};
          if (!userMap[area]) userMap[area] = {};
          const val = Number(item.differential);
          cache[area][item.grade] = val;
          const resolvedIdentity = resolveUserIdentity(item.updated_by, item.updated_by_id);
          userMap[area][item.grade] = {
            user: resolvedIdentity.displayLabel || item.updated_by || '',
            time: item.updated_at || item.created_at
          };
        });

        setDbDifferentials(cache);
        setDbDiffUsers(userMap);
      } else {
        setDbDifferentials({});
        setDbDiffUsers({});
      }
      setLastSyncedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error("Error loading chart variables:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRateHistory = async () => {
    try {
      if (!supabase) return;
      const data = await fetchSattaBaseRates();
      setRateHistory(data || []);
      setApprovalState(getCachedBaseRateApprovalState());
      setBaseRateChangeHistory(getCachedBaseRateHistory());
      if (data && data.length > 0) {
        setLatestRateRecord(data[0]);
        if (!selectedHistoryRun) {
          handleViewHistoryDetails(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching rate logs:", err);
    }
  };

  const handleUser010ApproveBaseRate = async (recordId?: string) => {
    if (!isUserId10()) {
      alert("Access Denied: Only User ID 010 is authorized to approve Base Rate changes.");
      return;
    }
    setIsApprovingRate(true);
    try {
      const updatedState = await approveBaseRateByUser010(recordId);
      setApprovalState(updatedState);
      const refreshed = await fetchSattaBaseRates();
      setRateHistory(refreshed);
      setBaseRateChangeHistory(getCachedBaseRateHistory());
      if (refreshed.length > 0) setLatestRateRecord(refreshed[0]);
      setSaveStatus({
        message: `Base Rate ₹${(updatedState.currentBaseRate || baseRate).toLocaleString('en-IN')} approved by ${updatedState.approvedByDisplay || 'User 010'}. Sauda Entry & Sauda Check Point operations are now unlocked for today!`,
        success: true,
      });
    } catch (err: any) {
      alert(err.message || "Failed to approve Base Rate.");
    } finally {
      setIsApprovingRate(false);
    }
  };

  // Cell Editing Save Action
  const handleSaveCellDifferential = async () => {
    if (!editingCell || !supabase) return;
    const { area, grade, val } = editingCell;
    const numericDiff = Number(val) || 0;
    let canonicalArea = area;
    const upper = area.trim().toUpperCase();
    if (
      upper === 'LOWER ASSAM' ||
      upper === 'BILASIPARA' ||
      upper === 'L/A' ||
      upper.includes('TARABARI') ||
      upper === 'BELLOW ASSAM' ||
      upper === 'BELOW ASSAM' ||
      upper.includes('BELLOW') ||
      upper.includes('BELOW')
    ) {
      canonicalArea = 'L/A TARABARI';
    }

    const oldDiff = dbDifferentials[canonicalArea]?.[grade] !== undefined
      ? Number(dbDifferentials[canonicalArea][grade])
      : null;
    const diffChange = oldDiff !== null ? numericDiff - oldDiff : null;
    const changedDate = new Date().toISOString().split('T')[0];
    const authUser = getAuthenticatedUser();
    const changedBy = authUser.displayLabel || authUser.username;
    const nowIso = new Date().toISOString();

    try {
      setIsLoading(true);
      // 1. Upsert into live satta_differentials table with updated_by and timestamp
      const diffPayload: any = {
        area: canonicalArea,
        grade,
        differential: numericDiff,
        updated_by: changedBy,
        updated_at: nowIso,
        start_date: changedDate
      };

      const { error } = await supabase
        .from('satta_differentials')
        .upsert(diffPayload, {
          onConflict: 'area,grade'
        })
        .select();

      if (error) {
        delete diffPayload.updated_by;
        const { error: err2 } = await supabase
          .from('satta_differentials')
          .upsert(diffPayload, {
            onConflict: 'area,grade'
          });
        if (err2) console.warn('satta_differentials upsert warning:', err2);
      }

      // 2. Auto-save per-day differential calculated rate snapshot in database
      try {
        const calcPayload: any = {
          start_date: changedDate,
          area: canonicalArea,
          grade,
          differential: numericDiff,
          base_rate: baseRate,
          final_rate: baseRate + numericDiff,
          updated_by: changedBy,
          created_at: nowIso
        };

        const { error: calcErr } = await supabase
          .from('satta_calculated_rates')
          .upsert(calcPayload);

        if (calcErr) {
          delete calcPayload.updated_by;
          await supabase.from('satta_calculated_rates').upsert(calcPayload);
        }
      } catch (calcExc) {
        console.warn('satta_calculated_rates write skipped:', calcExc);
      }

      // 3. Record audit history in Supabase satta_differential_audit_logs
      try {
        await supabase
          .from('satta_differential_audit_logs')
          .insert({
            changed_date: changedDate,
            area: canonicalArea,
            grade,
            old_differential: oldDiff,
            new_differential: numericDiff,
            differential_change: diffChange,
            changed_by: changedBy,
            remarks: `Live Pivot Matrix edit: ${oldDiff !== null ? (oldDiff >= 0 ? '+' : '') + oldDiff : 'New'} → ${(numericDiff >= 0 ? '+' : '') + numericDiff}`,
            created_at: nowIso
          });
      } catch (audExc) {
        console.warn('satta_differential_audit_logs write skipped:', audExc);
      }

      // 4. Record in Universal App Audit Log
      try {
        await logChange({
          module: 'Satta Desk / Rate Chart',
          entity_name: 'Satta Differential',
          record_id: `${canonicalArea} • ${grade}`,
          action: 'UPDATE',
          field_name: 'differential',
          field_label: `${canonicalArea} [${grade}] Differential`,
          old_value: oldDiff !== null ? (oldDiff >= 0 ? `+${oldDiff}` : `${oldDiff}`) : '0',
          new_value: numericDiff >= 0 ? `+${numericDiff}` : `${numericDiff}`,
          user_name: changedBy,
          remarks: `Live Pivot Matrix differential updated from ${oldDiff !== null ? oldDiff : 0} to ${numericDiff} on ${changedDate}`
        });
      } catch (logExc) {
        console.warn('Universal log write skipped:', logExc);
      }

      // Clean up any stale LOWER ASSAM, BILASIPARA, or BELLOW ASSAM rows
      if (canonicalArea === 'L/A TARABARI') {
        supabase.from('satta_differentials').delete().in('area', ['LOWER ASSAM', 'BILASIPARA', 'BELLOW ASSAM', 'BELOW ASSAM']).then();
        supabase.from('satta_calculated_rates').delete().in('area', ['LOWER ASSAM', 'BILASIPARA', 'BELLOW ASSAM', 'BELOW ASSAM']).then();
      }

      setDbDifferentials(prev => ({
        ...prev,
        [canonicalArea]: {
          ...(prev[canonicalArea] || {}),
          [grade]: numericDiff
        }
      }));

      setDbDiffUsers(prev => ({
        ...prev,
        [canonicalArea]: {
          ...(prev[canonicalArea] || {}),
          [grade]: { user: changedBy, time: nowIso }
        }
      }));

      // Refresh differential history table & central rate cache
      fetchDiffHistory();
      refreshSattaCache().catch(() => {});

      setEditingCell(null);
      setSaveStatus({
        message: `Differential for ${canonicalArea} [${grade}] updated to ${numericDiff >= 0 ? '+' : ''}${numericDiff}. Change recorded in Differential History!`,
        success: true
      });
    } catch (exc: any) {
      alert("Error saving differential: " + exc.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Differential History from Supabase
  const fetchDiffHistory = async () => {
    if (!supabase) return;
    setIsDiffHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('satta_differential_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching satta_differential_audit_logs from Supabase:', error);
      } else {
        setDiffHistoryLogs(data || []);
      }
    } catch (err) {
      console.error('Failed to load differential history:', err);
    } finally {
      setIsDiffHistoryLoading(false);
    }
  };

  const checkForDuplicateRates = async (selectedDate: string) => {
    if (!supabase) return { hasDuplicate: false, count: 0 };
    try {
      const { data, error } = await supabase
        .from('satta_calculated_rates')
        .select('id')
        .eq('start_date', selectedDate);
      
      if (error) {
        return { hasDuplicate: false, count: 0 };
      }
      return {
        hasDuplicate: data && data.length > 0,
        count: data ? data.length : 0
      };
    } catch (e) {
      return { hasDuplicate: false, count: 0 };
    }
  };

  const handleUpdateBaseRate = async () => {
    if (!baseRate || baseRate <= 0) {
      alert("Please provide a valid Base Rate greater than 0.");
      return;
    }

    setIsCheckingDuplicates(true);
    const result = await checkForDuplicateRates(startDate);
    setDuplicateCheckResult(result);
    setIsCheckingDuplicates(false);
    setShowConfirmModal(true);
  };

  const executeRateUpdate = async () => {
    setShowConfirmModal(false);
    if (!supabase) {
      alert("Database offline. Satta Chart history cannot be recorded.");
      return;
    }

    setIsLoading(true);
    setSaveStatus(null);

    const authUser = getAuthenticatedUser();
    const currentUserName = authUser.username;
    const currentUserId = authUser.userId;
    const currentUserDisplay = authUser.displayLabel;
    const nowIso = new Date().toISOString();

    try {
      // Do NOT delete previous base rate records on the same date!
      // Multiple intraday updates are preserved in satta_base_rates and history.
      const oldRateValue = latestRateRecord ? Number(latestRateRecord.base_rate) : null;
      const cleanRemarksText =
        parseBaseRateRemarks(remarks).cleanRemarks ||
        `Base rate changed to ₹${baseRate.toLocaleString('en-IN')} by ${currentUserDisplay}`;

      const encodedRemarks = encodeBaseRateRemarks(cleanRemarksText, {
        prev: oldRateValue,
        by: currentUserName,
        byId: currentUserId,
        at: nowIso,
        st: 'PENDING',
        appBy: null,
        appById: null,
        appAt: null,
      });

      let rRecord: any = null;
      const basePayload: any = {
        base_rate: baseRate,
        previous_rate: oldRateValue,
        start_date: startDate,
        updated_by: currentUserName,
        updated_by_id: currentUserId,
        updated_at: nowIso,
        approval_status: 'PENDING',
        approved_by: null,
        approved_by_id: null,
        approved_at: null,
        remarks: encodedRemarks,
        created_at: nowIso
      };

      const { data: d1, error: e1 } = await supabase
        .from('satta_base_rates')
        .insert(basePayload)
        .select()
        .single();

      if (e1) {
        const fallbackPayload = {
          base_rate: baseRate,
          start_date: startDate,
          remarks: encodedRemarks,
          created_at: nowIso,
        };
        const { data: d2, error: e2 } = await supabase
          .from('satta_base_rates')
          .insert(fallbackPayload)
          .select()
          .single();

        if (e2) {
          const { data: d3, error: e3 } = await supabase
            .from('satta_base_rates')
            .insert({
              base_rate: baseRate,
              start_date: startDate,
              created_at: nowIso
            })
            .select()
            .single();

          if (e3) {
            console.warn('Supabase satta_base_rates insert failed, using fallback record:', e3);
            rRecord = {
              id: 'local-' + Date.now(),
              base_rate: baseRate,
              start_date: startDate,
              remarks: encodedRemarks,
              created_at: nowIso
            };
          } else {
            rRecord = d3;
          }
        } else {
          rRecord = d2;
        }
      } else {
        rRecord = d1;
      }

      // Persist pending approval metadata & invalidate once-per-day approval cache
      savePendingBaseRateMeta(
        String(rRecord?.id || ''),
        startDate,
        baseRate,
        oldRateValue,
        currentUserName,
        currentUserId,
        nowIso
      );

      // Save to local storage for offline / immediate availability
      try {
        localStorage.setItem('satta_latest_base_rate', String(baseRate));
        localStorage.setItem('satta_chart_upload_date', startDate);
      } catch (e) {}

      // Insert Audit Log safely
      try {
        const auditPayload: any = {
          base_rate_id: String(rRecord?.id || ''),
          old_rate: oldRateValue,
          new_rate: baseRate,
          changed_date: startDate,
          changed_by: currentUserName,
          updated_by_id: currentUserId,
          approval_status: 'PENDING',
          remarks: `${cleanRemarksText} (Updated by ${currentUserDisplay})`,
          created_at: nowIso
        };
        const { error: audErr } = await supabase
          .from('satta_base_rate_audit_logs')
          .insert(auditPayload);

        if (audErr) {
          await supabase
            .from('satta_base_rate_audit_logs')
            .insert({
              old_rate: oldRateValue,
              new_rate: baseRate,
              changed_date: startDate,
              changed_by: currentUserDisplay,
              remarks: `${cleanRemarksText} [Status: PENDING USER 010 APPROVAL]`,
              created_at: nowIso
            });
        }
      } catch (auditErr) {
        console.warn('satta_base_rate_audit_logs write skipped:', auditErr);
      }

      // Log into Universal System Audit Log safely
      try {
        await logChange({
          module: 'Satta Desk / Rate Chart',
          entity_name: 'Satta Base Rate',
          record_id: startDate,
          action: 'UPDATE',
          field_name: 'base_rate',
          field_label: 'Satta Base Rate (₹/Qtl)',
          old_value: oldRateValue !== null ? `₹${oldRateValue.toLocaleString('en-IN')}` : 'None',
          new_value: `₹${baseRate.toLocaleString('en-IN')}`,
          user_name: currentUserDisplay,
          remarks: `${cleanRemarksText} | Updated by ${currentUserDisplay} | Pending Approval from User 010`
        });
      } catch (logErr) {
        console.warn('Universal log write skipped:', logErr);
      }

      const calcRows: any[] = [];
      const baseRecordId = rRecord?.id || ('local-' + Date.now());
      
      Object.keys(dbDifferentials).forEach(area => {
        const gradesCache = dbDifferentials[area] || {};
        Object.keys(gradesCache).forEach(grade => {
          const diffVal = gradesCache[grade] || 0;
          calcRows.push({
            base_rate_id: baseRecordId,
            base_rate: baseRate,
            start_date: startDate,
            area: area,
            grade: grade,
            differential: diffVal,
            final_rate: baseRate + diffVal,
            updated_by: currentUserDisplay,
            created_at: nowIso
          });
        });
      });

      if (calcRows.length > 0) {
        try {
          // Refresh calculated rates snapshot for this date
          await supabase
            .from('satta_calculated_rates')
            .delete()
            .eq('start_date', startDate);

          const { error: batchErr } = await supabase
            .from('satta_calculated_rates')
            .insert(calcRows);

          if (batchErr) {
            // Retry without updated_by
            const cleanCalcRows = calcRows.map(({ updated_by, ...rest }) => rest);
            await supabase
              .from('satta_calculated_rates')
              .insert(cleanCalcRows);
          }
        } catch (calcExc) {
          console.warn('Calculated rates snapshot write skipped:', calcExc);
        }
      }

      await loadChartConfig();
      await fetchRateHistory();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('base-rate-approval-changed', { detail: getCachedBaseRateApprovalState() }));
        window.dispatchEvent(new CustomEvent('base-rate-updated'));
      }

      setSaveStatus({
        message: `Base Rate ₹${baseRate.toLocaleString('en-IN')} updated by ${currentUserDisplay} at ${formatDateTime(nowIso)}. Status: Pending Approval from User 010.`,
        success: true
      });
    } catch (err: any) {
      setSaveStatus({
        message: "Failed to record Satta Base Rate: " + err.message,
        success: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewHistoryDetails = async (run: any) => {
    setSelectedHistoryRun(run);
    setIsHistDetailLoading(true);
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('satta_calculated_rates')
        .select('*')
        .eq('base_rate_id', run.id);

      if (error) throw error;
      setHistoryRunDetails(data || []);
    } catch (err) {
      console.error("Error retrieving historical table run:", err);
    } finally {
      setIsHistDetailLoading(false);
    }
  };

  const handleSeedHistoricalList = async () => {
    if (!supabase) return;
    if (!window.confirm("Seed the historical base rate range logs? Existing records on these identical dates will be replaced.")) return;
    
    setIsLoading(true);
    try {
      await fetchRateHistory();
      alert("Historic Base Rate range series successfully refreshed from database!");
      loadChartConfig();
    } catch (err: any) {
      alert("Failed to seed Satta range logs: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCsvExport = (rows: any[], filename: string) => {
    const dataToExport = rows.map((r, i) => ({
      Srl: i + 1,
      Area: r.area,
      Grade: r.grade,
      "Base Rate": r.base_rate,
      "Differential (Premium/Discount)": r.differential,
      "Calculated Final Rate": r.final_rate,
      "Effective From Date": r.start_date,
    }));
    const sanitizedData = sanitizeCsvData(dataToExport);
    const csv = Papa.unparse(sanitizedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSampleCsv = () => {
    const headers = ['Area', 'Grade', 'Differential'];
    const rows: any[] = [];
    Object.entries(dbDifferentials).forEach(([areaName, diffs]) => {
      Object.entries(diffs).forEach(([grade, diffVal]) => {
        rows.push([areaName, grade, diffVal]);
      });
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'satta_chart_latest.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvUpload = (file: File) => {
    setIsUploading(true);
    setUploadProgress(20);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
      complete: async (results) => {
        setUploadProgress(40);
        const data = results.data as any[];
        if (!data || data.length === 0) {
          alert("Uploaded CSV is empty.");
          setIsUploading(false);
          return;
        }

        const firstRow = data[0] || {};
        const rawKeys = Object.keys(firstRow);

        // Find Area column
        const areaCol = rawKeys.find(k => /^(area|region|district|place)$/i.test(k.trim())) ||
                        rawKeys.find(k => /area/i.test(k));

        // Find Grade column
        const gradeCol = rawKeys.find(k => /^(grade|item|jute_grade|jute grade)$/i.test(k.trim())) ||
                         rawKeys.find(k => /grade/i.test(k));

        // Find Differential column
        const diffCol = rawKeys.find(k => /^(differential|diff|difference|differential \(premium\/discount\)|premium\/discount|rate diff)$/i.test(k.trim())) ||
                        rawKeys.find(k => /diff/i.test(k)) ||
                        rawKeys.find(k => /^rate$/i.test(k.trim()));

        // Map to guarantee strictly ONE row per unique (Area, Grade)
        // This is CRITICAL to prevent PostgreSQL:
        // "ON CONFLICT DO UPDATE command cannot affect row a second time"
        const uniqueMap = new Map<string, { area: string; grade: string; differential: number }>();

        // Normalizer to treat LOWER ASSAM, BILASIPARA, and L/A TARABARI as identical
        const normalizeUploadedArea = (raw: string): string => {
          const upper = String(raw || '').trim().toUpperCase();
          if (
            upper === 'LOWER ASSAM' || 
            upper === 'BILASIPARA' || 
            upper === 'L/A' || 
            upper.includes('TARABARI') ||
            upper === 'BELLOW ASSAM' ||
            upper === 'BELOW ASSAM' ||
            upper.includes('BELLOW') ||
            upper.includes('BELOW')
          ) {
            return 'L/A TARABARI';
          }
          return upper;
        };

        if (areaCol && gradeCol && diffCol) {
          // 1. Standard 3-column format: Area, Grade, Differential
          data.forEach((row: any) => {
            const rawArea = normalizeUploadedArea(row[areaCol]);
            const rawGrade = String(row[gradeCol] || '').trim().toUpperCase();
            const rawDiffVal = row[diffCol];

            if (rawArea && rawGrade && rawDiffVal !== undefined && rawDiffVal !== null && String(rawDiffVal).trim() !== '') {
              const cleanedDiff = Number(String(rawDiffVal).replace(/[^0-9.-]/g, '')) || 0;
              const compositeKey = `${rawArea}___${rawGrade}`;
              uniqueMap.set(compositeKey, {
                area: rawArea,
                grade: rawGrade,
                differential: cleanedDiff
              });
            }
          });
        } else if (areaCol) {
          // 2. Matrix / Pivot format: Column 1 is Area, other columns are Grade names (e.g. TD4, TD5, TD6, etc.)
          const otherCols = rawKeys.filter(k => k !== areaCol && !/^(srl|sl|id|created_at|start_date)$/i.test(k.trim()));
          data.forEach((row: any) => {
            const rawArea = normalizeUploadedArea(row[areaCol]);
            if (!rawArea) return;

            otherCols.forEach(col => {
              const rawDiffVal = row[col];
              if (rawDiffVal !== undefined && rawDiffVal !== null && String(rawDiffVal).trim() !== '') {
                const cleanedGrade = col.trim().toUpperCase();
                const cleanedDiff = Number(String(rawDiffVal).replace(/[^0-9.-]/g, '')) || 0;
                const compositeKey = `${rawArea}___${cleanedGrade}`;
                uniqueMap.set(compositeKey, {
                  area: rawArea,
                  grade: cleanedGrade,
                  differential: cleanedDiff
                });
              }
            });
          });
        } else {
          alert("Invalid CSV format. Please ensure the CSV contains 'Area', 'Grade', and 'Differential' columns (or an 'Area' column with Grade columns).");
          setIsUploading(false);
          return;
        }

        const upsertRows = Array.from(uniqueMap.values());

        if (upsertRows.length === 0) {
          alert("No valid Area-Grade differential rows found in the uploaded CSV.");
          setIsUploading(false);
          return;
        }

        setIsLoading(true);
        setUploadProgress(60);

        try {
          const changedDate = new Date().toISOString().split('T')[0];
          const authUser = getAuthenticatedUser();
          const changedBy = authUser.displayLabel || authUser.username || 'Unknown User';
          const nowIso = new Date().toISOString();

          // Prepare audit log entries for any differential that changed or was newly set
          const auditLogRows: any[] = [];
          upsertRows.forEach(item => {
            const oldVal = dbDifferentials[item.area]?.[item.grade] !== undefined
              ? Number(dbDifferentials[item.area][item.grade])
              : null;
            const newVal = Number(item.differential);

            if (oldVal === null || oldVal !== newVal) {
              const diffChange = oldVal !== null ? newVal - oldVal : null;
              auditLogRows.push({
                changed_date: changedDate,
                area: item.area,
                grade: item.grade,
                old_differential: oldVal,
                new_differential: newVal,
                differential_change: diffChange,
                changed_by: `${changedBy} (CSV)`,
                remarks: `CSV Upload: ${oldVal !== null ? (oldVal >= 0 ? '+' : '') + oldVal : 'New'} → ${(newVal >= 0 ? '+' : '') + newVal}`,
                created_at: nowIso
              });
            }
          });

          if (supabase) {
            // Upsert in safe batches of 100 rows to ensure fast, failure-proof execution
            const batchSize = 100;
            for (let i = 0; i < upsertRows.length; i += batchSize) {
              const batch = upsertRows.slice(i, i + batchSize);
              const { error: batchErr } = await supabase
                .from('satta_differentials')
                .upsert(batch, { onConflict: 'area,grade' });

              if (batchErr) {
                console.warn("Batch upsert encountered issue, retrying individually:", batchErr.message);
                // Fallback: row-by-row upsert so no single row blocks the rest
                for (const item of batch) {
                  await supabase
                    .from('satta_differentials')
                    .upsert([item], { onConflict: 'area,grade' });
                }
              }
              const currentProgress = 60 + Math.round(((i + batch.length) / upsertRows.length) * 20);
              setUploadProgress(Math.min(currentProgress, 80));
            }

            // Record audit logs in satta_differential_audit_logs so they show in Differential History
            if (auditLogRows.length > 0) {
              for (let i = 0; i < auditLogRows.length; i += batchSize) {
                const auditBatch = auditLogRows.slice(i, i + batchSize);
                await supabase
                  .from('satta_differential_audit_logs')
                  .insert(auditBatch);
              }
            }
          }

          setDbDifferentials(prev => {
            const copy = { ...prev };
            upsertRows.forEach(item => {
              if (!copy[item.area]) copy[item.area] = {};
              copy[item.area][item.grade] = item.differential;
            });
            return copy;
          });

          // Refresh differential history table & central rate cache
          fetchDiffHistory();
          refreshSattaCache().catch(() => {});

          setUploadProgress(100);
          setSaveStatus({
            message: `Satta Chart CSV uploaded successfully! Saved ${upsertRows.length} area-grade differentials (${auditLogRows.length} logged in Differential History).`,
            success: true
          });

          // Mark Satta Chart as uploaded in system storage
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem('satta_chart_uploaded', 'true');
              window.localStorage.setItem('satta_chart_upload_date', new Date().toISOString().split('T')[0]);
            }
            window.dispatchEvent(new CustomEvent('satta-chart-uploaded'));
            window.dispatchEvent(new CustomEvent('app-data-updated', { detail: { table: 'satta_differentials' } }));
          } catch {}

          setShowUploadSuccessModal(true);
          loadChartConfig();
        } catch (err: any) {
          alert("Error saving uploaded differentials: " + err.message);
        } finally {
          setIsLoading(false);
          setTimeout(() => setIsUploading(false), 500);
        }
      },
      error: (error) => {
        alert("Error parsing CSV file: " + error.message);
        setIsUploading(false);
      }
    });
  };

  // Executive Dynamic Metrics Calculation
  const metrics = useMemo(() => {
    let maxRate = 0;
    let maxArea = '';
    let maxGrade = '';
    let minRate = Infinity;
    let minArea = '';
    let minGrade = '';
    let totalRateSum = 0;
    let cellCount = 0;
    let highPremiumCount = 0;
    let moderatePremiumCount = 0;
    let discountCount = 0;
    let criticalDiscountCount = 0;
    let baseCount = 0;

    const areaSet = new Set<string>();

    Object.entries(dbDifferentials).forEach(([areaName, diffs]) => {
      areaSet.add(areaName);
      ALL_GRADES.forEach(grade => {
        const diffVal = diffs[grade];
        if (diffVal !== undefined) {
          const finalVal = baseRate + diffVal;
          cellCount++;
          totalRateSum += finalVal;
          if (finalVal > maxRate) {
            maxRate = finalVal;
            maxArea = areaName;
            maxGrade = grade;
          }
          if (finalVal < minRate) {
            minRate = finalVal;
            minArea = areaName;
            minGrade = grade;
          }
          if (diffVal >= 1000) highPremiumCount++;
          else if (diffVal > 0) moderatePremiumCount++;
          else if (diffVal === 0) baseCount++;
          else if (diffVal >= -1000) discountCount++;
          else criticalDiscountCount++;
        }
      });
    });

    const avgRate = cellCount > 0 ? Math.round(totalRateSum / cellCount) : baseRate;
    if (minRate === Infinity) minRate = baseRate;

    // Base rate shift
    const prevRate = rateHistory.length > 1 ? Number(rateHistory[1].base_rate) : baseRate;
    const rateDiff = baseRate - prevRate;
    const ratePctChange = prevRate > 0 ? ((rateDiff / prevRate) * 100).toFixed(1) : '0.0';

    return {
      maxRate,
      maxArea,
      maxGrade,
      minRate,
      minArea,
      minGrade,
      avgRate,
      totalAreas: areaSet.size,
      cellCount,
      highPremiumCount,
      moderatePremiumCount,
      premiumCount: highPremiumCount + moderatePremiumCount,
      discountCount,
      criticalDiscountCount,
      baseCount,
      prevRate,
      rateDiff,
      ratePctChange
    };
  }, [dbDifferentials, baseRate, rateHistory]);

  // Combined and Search-Filtered Table Rows derived strictly from Supabase dbDifferentials
  const allAreaRows = useMemo(() => {
    const areaMap = new Map<string, Record<string, number>>();
    // Overlay dynamic differentials and additional regions from database
    Object.entries(dbDifferentials).forEach(([rawAreaName, diffs]) => {
      const upper = String(rawAreaName || '').trim().toUpperCase();
      // LOWER ASSAM & BILASIPARA & L/A TARABARI are the exact same: treat all as L/A TARABARI
      const canonicalArea = (
        upper === 'LOWER ASSAM' || 
        upper === 'BILASIPARA' || 
        upper === 'L/A' || 
        upper.includes('TARABARI') ||
        upper === 'BELLOW ASSAM' ||
        upper === 'BELOW ASSAM' ||
        upper.includes('BELLOW') ||
        upper.includes('BELOW')
      )
        ? 'L/A TARABARI'
        : rawAreaName;

      if (areaMap.has(canonicalArea)) {
        areaMap.set(canonicalArea, { ...areaMap.get(canonicalArea), ...diffs });
      } else {
        areaMap.set(canonicalArea, { ...diffs });
      }
    });

    return Array.from(areaMap.entries()).map(([area, diffs]) => ({
      area,
      diffs
    }));
  }, [dbDifferentials]);

  const filteredSeedRows = useMemo(() => {
    return allAreaRows.filter(row => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase().trim();
        const areaLower = row.area.toLowerCase();
        if (areaLower.includes(q)) return true;
        // Search synonyms for Lower Assam (matches L/A TARABARI if user queries LOWER ASSAM, BILASIPARA, or BELLOW ASSAM)
        if ((areaLower.includes('tarabari') || areaLower.includes('lower assam')) && 
            (q.includes('lower') || q.includes('assam') || q.includes('bilasipara') || q.includes('tarabari') || q === 'l/a' || q.includes('bellow') || q.includes('below'))) {
          return true;
        }
        return false;
      }
      return true;
    });
  }, [allAreaRows, searchTerm]);

  const visibleGrades = useMemo(() => {
    if (selectedGradeFilter === 'TD') {
      return ALL_GRADES.filter(g => g.startsWith('TD'));
    }
    if (selectedGradeFilter === 'BTR') {
      return ALL_GRADES.filter(g => g.startsWith('BTR'));
    }
    if (selectedGradeFilter === 'MESTA') {
      return ALL_GRADES.filter(g => g.startsWith('M.'));
    }
    return ALL_GRADES;
  }, [selectedGradeFilter]);

  const distinctDiffAreas = useMemo(() => {
    const set = new Set<string>();
    diffHistoryLogs.forEach((l: any) => {
      if (l.area) set.add(String(l.area).trim().toUpperCase());
    });
    Object.keys(dbDifferentials).forEach(a => {
      if (a) set.add(a.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [diffHistoryLogs, dbDifferentials]);

  const distinctDiffGrades = useMemo(() => {
    const set = new Set<string>();
    diffHistoryLogs.forEach((l: any) => {
      if (l.grade) set.add(String(l.grade).trim().toUpperCase());
    });
    ALL_GRADES.forEach(g => set.add(g));
    return Array.from(set);
  }, [diffHistoryLogs]);

  const distinctDiffUsers = useMemo(() => {
    const set = new Set<string>();
    diffHistoryLogs.forEach((l: any) => {
      if (l.changed_by) set.add(String(l.changed_by).trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [diffHistoryLogs]);

  const filteredDiffHistoryLogs = useMemo(() => {
    return diffHistoryLogs.filter((log: any) => {
      // Date from
      if (diffFilterDateFrom && log.changed_date && log.changed_date < diffFilterDateFrom) {
        return false;
      }
      // Date to
      if (diffFilterDateTo && log.changed_date && log.changed_date > diffFilterDateTo) {
        return false;
      }
      // Area filter
      if (diffFilterArea !== 'ALL') {
        const logArea = String(log.area || '').trim().toUpperCase();
        const filterArea = diffFilterArea.trim().toUpperCase();
        if (logArea !== filterArea) return false;
      }
      // Grade filter
      if (diffFilterGrade !== 'ALL') {
        const logGrade = String(log.grade || '').trim().toUpperCase();
        const filterGrade = diffFilterGrade.trim().toUpperCase();
        if (logGrade !== filterGrade) return false;
      }
      // Changed By filter
      if (diffFilterChangedBy !== 'ALL') {
        const logUser = String(log.changed_by || '').trim().toUpperCase();
        const filterUser = diffFilterChangedBy.trim().toUpperCase();
        if (logUser !== filterUser) return false;
      }
      // Search
      if (diffFilterSearch.trim()) {
        const q = diffFilterSearch.trim().toLowerCase();
        const matchArea = String(log.area || '').toLowerCase().includes(q);
        const matchGrade = String(log.grade || '').toLowerCase().includes(q);
        const matchUser = String(log.changed_by || '').toLowerCase().includes(q);
        const matchRemarks = String(log.remarks || '').toLowerCase().includes(q);
        const matchDate = formatDateDMY(log.changed_date).toLowerCase().includes(q);
        if (!matchArea && !matchGrade && !matchUser && !matchRemarks && !matchDate) {
          return false;
        }
      }
      return true;
    });
  }, [
    diffHistoryLogs,
    diffFilterDateFrom,
    diffFilterDateTo,
    diffFilterArea,
    diffFilterGrade,
    diffFilterChangedBy,
    diffFilterSearch
  ]);

  const content = (
    <div className="space-y-6 max-w-full font-sans pb-12 bg-[#FDE7E6] min-h-screen text-[#1F2937]">
      
      {/* TOP NAVIGATION & BREADCRUMB HEADER */}
      <div className="bg-[#D94B5A] text-white p-3 md:p-2 rounded-2xl shadow-xl border-2 border-[#FBCFCB] relative overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex pt-1 gap-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('base_rate')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 shadow-sm",
              activeTab === 'base_rate'
                ? "bg-[#D94B5A] text-white border-2 border-[#FDE7E6] shadow-lg scale-105"
                : "bg-[#E85A5A] text-white hover:bg-[#D94B5A] font-bold border border-[#FBCFCB]"
            )}
          >
            <DollarSign className={cn("h-4 w-4", activeTab === 'base_rate' ? "text-[#FDE7E6]" : "text-[#FBCFCB]")} />
            <span className="text-white font-black">Satta Chart Base Rate</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 shadow-sm",
              activeTab === 'matrix'
                ? "bg-[#D94B5A] text-white border-2 border-[#FDE7E6] shadow-lg scale-105"
                : "bg-[#E85A5A] text-white hover:bg-[#D94B5A] font-bold border border-[#FBCFCB]"
            )}
          >
            <FileSpreadsheet className={cn("h-4 w-4", activeTab === 'matrix' ? "text-[#FDE7E6]" : "text-[#FBCFCB]")} />
            <span className="text-white font-black">Live Pivot Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('diff_history')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 shadow-sm",
              activeTab === 'diff_history'
                ? "bg-[#D94B5A] text-white border-2 border-[#FDE7E6] shadow-lg scale-105"
                : "bg-[#E85A5A] text-white hover:bg-[#D94B5A] font-bold border border-[#FBCFCB]"
            )}
          >
            <History className={cn("h-4 w-4", activeTab === 'diff_history' ? "text-[#FDE7E6]" : "text-[#FBCFCB]")} />
            <span className="text-white font-black">Differential History</span>
          </button>

          <div className="bg-[#D94B5A] border border-[#FBCFCB] px-3.5 py-1.5 rounded-xl text-right shrink-0">
            <div className="text-[10px] text-[#FBCFCB] font-black uppercase tracking-wider">
              Last Updated {latestRateRecord?.updated_by_display ? `by ${latestRateRecord.updated_by_display}` : ''}
            </div>
            <div className="text-xs font-mono font-bold text-white flex items-center gap-1 justify-end">
              <Clock className="h-3 w-3 text-[#FDE7E6]" />
              <span className="text-white font-black">
                {latestRateRecord
                  ? formatDateTime(latestRateRecord.updated_at || latestRateRecord.created_at) || formatDateDMY(latestRateRecord.start_date)
                  : `Today ${lastSyncedAt}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SAVE / STATUS NOTIFICATION BANNER */}
      {saveStatus && (
        <div className={cn(
          "p-4 rounded-2xl border-2 flex items-center justify-between gap-3 text-xs font-bold shadow-md animate-fadeIn",
          saveStatus.success 
            ? "bg-emerald-50 border-emerald-500 text-emerald-950" 
            : "bg-rose-50 border-rose-500 text-rose-950"
        )}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className={cn("h-5 w-5 shrink-0", saveStatus.success ? "text-emerald-600" : "text-rose-600")} />
            <span>{saveStatus.message}</span>
          </div>
          <button onClick={() => setSaveStatus(null)} className="text-slate-500 hover:text-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* MANDATORY BASE RATE USER TRACKING & USER 010 APPROVAL STATUS BAR */}
      {latestRateRecord && (
        <div className={cn(
          "rounded-2xl border-2 p-4 shadow-sm transition-all",
          approvalState.isApproved
            ? "bg-emerald-50/90 border-emerald-300"
            : "bg-amber-50 border-amber-400"
        )}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className={cn(
                "px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 border shadow-2xs",
                approvalState.isApproved
                  ? "bg-emerald-600 text-white border-emerald-700"
                  : "bg-amber-500 text-slate-950 border-amber-600 animate-pulse"
              )}>
                <ShieldCheck className="h-4 w-4" />
                <span>{approvalState.isApproved ? "Approved" : "Pending Approval"}</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] mr-1.5">Previous Rate:</span>
                  <strong className="font-mono text-slate-700 font-black">
                    {approvalState.previousBaseRate !== null && approvalState.previousBaseRate !== undefined
                      ? `₹${Number(approvalState.previousBaseRate).toLocaleString('en-IN')}`
                      : '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] mr-1.5">Current Base Rate:</span>
                  <strong className="font-mono text-[#D94B5A] text-sm font-black">
                    ₹{Number(latestRateRecord.base_rate).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] mr-1.5">Updated By:</span>
                  <strong className="text-slate-900 font-black">
                    {latestRateRecord.updated_by_display || latestRateRecord.updated_by || 'Historical Record'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] mr-1.5">Last Updated Date & Time:</span>
                  <strong className="font-mono text-slate-800 font-bold">
                    {formatDateTime(latestRateRecord.updated_at || latestRateRecord.created_at) || formatDateDMY(latestRateRecord.start_date)}
                  </strong>
                </div>
                {approvalState.isApproved && approvalState.approvedByDisplay && (
                  <div>
                    <span className="text-emerald-700 font-bold uppercase text-[10px] mr-1.5">Approved By (User 010):</span>
                    <strong className="text-emerald-950 font-black">
                      {approvalState.approvedByDisplay}
                    </strong>
                    {approvalState.approvedAt && (
                      <span className="font-mono text-[11px] text-emerald-800 ml-1.5">
                        ({formatDateTime(approvalState.approvedAt)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!approvalState.isApproved ? (
                userIs010 ? (
                  <button
                    type="button"
                    onClick={() => handleUser010ApproveBaseRate(latestRateRecord?.id)}
                    disabled={isApprovingRate}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4 text-amber-200" />
                    <span>{isApprovingRate ? "Approving..." : "Approve Base Rate (User 010)"}</span>
                  </button>
                ) : (
                  <div className="bg-rose-100 border border-rose-300 text-rose-900 px-3.5 py-2 rounded-xl text-[11px] font-black flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{BASE_RATE_APPROVAL_REQUIRED_MSG} (Logged in as: {currentAuthUser.displayLabel})</span>
                  </div>
                )
              ) : (
                <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 px-3.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Daily Base Rate Approved • Sauda Entry & Sauda Check Point Unlocked</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA BY TAB */}

      {/* TAB 0: SATTA CHART BASE RATE (SIMPLIFIED FULL-YEAR & DAILY MATRIX VIEW) */}
      {activeTab === 'base_rate' && (
        <div className="space-y-4">
          {/* SIMPLIFIED CONTROLS */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-[#FBCFCB] shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#F7AFA8] text-[#FDE7E6] rounded-2xl shadow-inner">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-black text-[#D94B5A] tracking-tight font-serif">
                  Satta Chart Base Rate
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-[#FDE7E6] px-3.5 py-2 rounded-xl border border-slate-300">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent text-sm font-black text-[#D94B5A] outline-none cursor-pointer pr-2"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2027}>2027</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  loadChartConfig();
                  fetchRateHistory();
                }}
                disabled={isLoading}
                className="bg-[#F7AFA8] hover:bg-[#D94B5A] text-white font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <RefreshCcw className={`h-4 w-4 text-[#FDE7E6] ${isLoading ? 'animate-spin' : ''}`} />
                <span>View Full Year</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintPreview(true)}
                className="bg-[#FDE7E6] hover:bg-[#FBCFCB] text-[#D94B5A] font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md cursor-pointer active:scale-95"
              >
                <Printer className="h-4 w-4" />
                <span>Print Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUniversalAuditModal(true)}
                className="bg-[#D94B5A] hover:bg-[#F7AFA8] text-[#FDE7E6] border border-[#FDE7E6]/50 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md cursor-pointer active:scale-95"
              >
                <History className="h-4 w-4" />
                <span>System Change Log</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!approvalState.isApproved) {
                    alert(BASE_RATE_APPROVAL_REQUIRED_MSG);
                    return;
                  }
                  try {
                    if (typeof window !== 'undefined' && window.localStorage) {
                      window.localStorage.setItem('satta_chart_uploaded', 'true');
                      window.localStorage.setItem('satta_chart_upload_date', new Date().toISOString().split('T')[0]);
                    }
                    window.dispatchEvent(new CustomEvent('satta-chart-uploaded'));
                  } catch {}
                  if (onNavigate) {
                    onNavigate('sauda_entry');
                  } else {
                    window.location.hash = '#sauda_entry';
                  }
                }}
                className={cn(
                  "font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md cursor-pointer active:scale-95",
                  approvalState.isApproved
                    ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                )}
              >
                <span>Proceed to NEW SAUDA CONTRACT ENTRY</span>
                <ArrowRight className="h-4 w-4 text-amber-300" />
              </button>
            </div>
          </div>

          {/* FULL-YEAR DAILY BASE RATE MATRIX TABLE */}
          <div className="bg-white rounded-2xl border border-[#FBCFCB] shadow-sm overflow-hidden">
            <div className="bg-[#D94B5A] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#FDE7E6]">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#FDE7E6]" />
                <span className="text-sm font-black uppercase tracking-wider">
                  Full-Year Daily Base Rate Schedule ({selectedYear})
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-emerald-200">
                <span>Database Source: <strong className="text-white font-mono">satta_base_rates</strong></span>
                <span className="text-[#FDE7E6]">•</span>
                <span>Active Recorded Days: <strong className="text-white font-mono">{rateHistory.length}</strong></span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-[#FDE7E6] border-b border-slate-300 text-xs font-black text-[#D94B5A] uppercase tracking-wider">
                    <th className="py-2.5 px-3 border-r border-slate-300 sticky left-0 bg-[#FDE7E6] z-10 w-16 text-slate-800">
                      Date
                    </th>
                    {MONTH_COLS.map((m) => (
                      <th key={m.name} className="py-2.5 px-3 border-r border-slate-200 min-w-[76px] text-[#D94B5A]">
                        {m.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-mono">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const dayStr = String(day).padStart(2, '0');
                    return (
                      <tr key={day} className="hover:bg-amber-50/60 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-700 bg-[#FDE7E6] border-r border-slate-300 sticky left-0 z-10">
                          {dayStr}
                        </td>
                        {MONTH_COLS.map((m) => {
                          const targetYear = selectedYear + (m.yearOffset || 0);
                          const dateKey = `${targetYear}-${m.month}-${dayStr}`;
                          const hasDay = day <= m.days;
                          const rateVal = hasDay ? rateLookup.get(dateKey) : null;

                          const dayUpdates = hasDay ? intradayUpdatesMap.get(dateKey) || [] : [];
                          const hasMultiple = dayUpdates.length > 1;
                          const latestUpdate = dayUpdates[0];
                          const latestUserDisplay =
                            latestUpdate?.updated_by_display || latestUpdate?.updated_by || '';
                          const latestTimeStr =
                            latestUpdate?.updated_at || latestUpdate?.created_at
                              ? formatDateTime(latestUpdate.updated_at || latestUpdate.created_at)
                              : '';
                          const isCellPending = latestUpdate?.approval_status === 'PENDING';

                          const tooltipText = dayUpdates
                            .map((u, i) => {
                              const who = u.updated_by_display || u.updated_by || '';
                              const when =
                                u.updated_at || u.created_at
                                  ? formatDateTime(u.updated_at || u.created_at)
                                  : formatDateDMY(u.start_date);
                              const stLabel =
                                u.approval_status === 'PENDING'
                                  ? ' [Pending Approval - User 010]'
                                  : u.approved_by_display
                                  ? ` [Approved by ${u.approved_by_display}]`
                                  : '';
                              return `#${dayUpdates.length - i}: ₹${Number(u.base_rate).toLocaleString('en-IN')}${who ? ` by ${who}` : ''} (${when})${stLabel}`;
                            })
                            .join('\n');

                          return (
                            <td key={m.name} className="py-1.5 px-1 border-r border-slate-100 text-slate-800">
                              {rateVal && rateVal > 0 ? (
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <span 
                                    title={
                                      tooltipText ||
                                      `Base Rate: ₹${rateVal.toLocaleString('en-IN')}${
                                        latestUserDisplay ? ` | Updated by: ${latestUserDisplay}` : ''
                                      }`
                                    }
                                    className={cn(
                                      "font-bold px-1.5 py-0.5 rounded border inline-block min-w-[56px] text-center cursor-help",
                                      isCellPending
                                        ? "bg-amber-50 text-amber-950 border-amber-400"
                                        : "bg-emerald-50 text-emerald-950 border-emerald-200"
                                    )}
                                  >
                                    {rateVal.toLocaleString('en-IN')}
                                  </span>
                                  {isCellPending && (
                                    <span
                                      title="Pending Approval from User 010"
                                      className="text-[7px] bg-rose-100 text-rose-800 border border-rose-300 font-black px-1 rounded uppercase"
                                    >
                                      Pending 010
                                    </span>
                                  )}
                                  {hasMultiple && (
                                    <span 
                                      title={tooltipText}
                                      className="text-[7.5px] bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-1 rounded cursor-help shadow-2xs"
                                    >
                                      {dayUpdates.length} updates
                                    </span>
                                  )}
                                  {latestUserDisplay ? (
                                    <span 
                                      className="text-[8px] text-indigo-900 bg-indigo-50/90 border border-indigo-200 px-1 py-0.2 rounded font-sans truncate max-w-[76px] font-bold leading-tight cursor-help"
                                      title={
                                        tooltipText ||
                                        `Updated by: ${latestUserDisplay}${latestTimeStr ? ` on ${latestTimeStr}` : ''}`
                                      }
                                    >
                                      {latestUserDisplay}
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-slate-300 font-normal">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MONTHLY SUMMARY TABLE (AVG / MAX / MIN) */}
          <div className="bg-white rounded-2xl border border-[#FBCFCB] shadow-sm overflow-hidden mt-4">
            <div className="bg-[#D94B5A] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#FDE7E6]">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#FDE7E6]" />
                <span className="text-sm font-black uppercase tracking-wider">
                  Satta Chart Base Rate Monthly Summary ({selectedYear})
                </span>
              </div>
              <div className="text-xs text-emerald-200">
                <span>Calculated Metrics: <strong className="text-white font-mono">AVG • MAX • MIN</strong></span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-[#FDE7E6] border-b border-slate-300 text-xs font-black text-[#D94B5A] uppercase tracking-wider">
                    <th className="py-2.5 px-3 border-r border-slate-300 sticky left-0 bg-[#FDE7E6] z-10 w-16 text-slate-800 text-center">
                      
                    </th>
                    {MONTH_COLS.map((m) => (
                      <th key={m.name} className="py-2.5 px-3 border-r border-slate-200 min-w-[76px] text-[#D94B5A]">
                        {m.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-mono">
                  {/* AVG Row */}
                  <tr className="hover:bg-amber-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-black text-slate-800 bg-[#FDE7E6] border-r border-slate-300 sticky left-0 z-10 text-center">
                      AVG
                    </td>
                    {monthlySummaryStats.map((stat) => (
                      <td key={`avg-${stat.month}`} className="py-2.5 px-2 border-r border-slate-100 font-bold text-slate-800">
                        {stat.avg ? (
                          <span className="font-bold text-[#D94B5A] bg-emerald-50 text-emerald-950 px-2 py-0.5 rounded border border-emerald-200 inline-block min-w-[58px]">
                            {stat.avg}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  {/* MAX Row */}
                  <tr className="hover:bg-amber-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-black text-slate-800 bg-[#FDE7E6] border-r border-slate-300 sticky left-0 z-10 text-center">
                      MAX
                    </td>
                    {monthlySummaryStats.map((stat) => (
                      <td key={`max-${stat.month}`} className="py-2.5 px-2 border-r border-slate-100 font-bold text-slate-800">
                        {stat.max ? (
                          <span className="font-bold text-emerald-800 bg-emerald-100/70 text-emerald-950 px-2 py-0.5 rounded border border-emerald-300 inline-block min-w-[58px]">
                            {stat.max}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  {/* MIN Row */}
                  <tr className="hover:bg-amber-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-black text-slate-800 bg-[#FDE7E6] border-r border-slate-300 sticky left-0 z-10 text-center">
                      MIN
                    </td>
                    {monthlySummaryStats.map((stat) => (
                      <td key={`min-${stat.month}`} className="py-2.5 px-2 border-r border-slate-100 font-bold text-slate-800">
                        {stat.min ? (
                          <span className="font-bold text-rose-800 bg-rose-50 text-rose-950 px-2 py-0.5 rounded border border-rose-200 inline-block min-w-[58px]">
                            {stat.min}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* COMPLETE BASE RATE CHANGE & USER 010 APPROVAL HISTORY TABLE */}
          <div className="bg-white rounded-2xl border border-[#FBCFCB] shadow-sm overflow-hidden mt-4">
            <div className="bg-[#D94B5A] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#FDE7E6]">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-[#FDE7E6]" />
                <span className="text-sm font-black uppercase tracking-wider">
                  Base Rate Change & User 010 Approval History
                </span>
              </div>
              <div className="text-xs text-[#FDE7E6] font-semibold">
                <span>Authorized Approver: <strong className="text-white font-mono">User ID 010 Only</strong></span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#FDE7E6] border-b border-slate-300 text-[11px] font-black text-[#D94B5A] uppercase tracking-wider">
                    <th className="py-2.5 px-3 border-r border-slate-200">Effective Date</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">Previous Base Rate</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">Updated Base Rate</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Changed By (Username & ID)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Changed Date & Time</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">Approval Status</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Approved By (User 010)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Approval Date & Time</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {baseRateChangeHistory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400 font-semibold">
                        No Base Rate change history records found.
                      </td>
                    </tr>
                  ) : (
                    baseRateChangeHistory.slice(0, 50).map((item, idx) => {
                      const isPending = item.approval_status === 'PENDING';
                      return (
                        <tr key={item.id || idx} className="hover:bg-amber-50/50 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-slate-100">
                            {formatDateDMY(item.start_date)}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-600 text-right border-r border-slate-100">
                            {item.previous_rate !== null && item.previous_rate !== undefined
                              ? `₹${Number(item.previous_rate).toLocaleString('en-IN')}`
                              : '—'}
                          </td>
                          <td className="py-2 px-3 font-mono font-black text-[#D94B5A] text-right border-r border-slate-100">
                            ₹{Number(item.new_rate).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-100">
                            {item.changed_by_display}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700 border-r border-slate-100">
                            {formatDateTime(item.changed_at) || formatDateDMY(item.start_date)}
                          </td>
                          <td className="py-2 px-3 text-center border-r border-slate-100">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase border inline-block",
                                isPending
                                  ? "bg-amber-100 text-amber-900 border-amber-400"
                                  : "bg-emerald-100 text-emerald-900 border-emerald-300"
                              )}
                            >
                              {isPending ? "Pending Approval" : "Approved"}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-100">
                            {item.approved_by_display || (isPending ? 'Awaiting User 010' : '—')}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700 border-r border-slate-100">
                            {item.approved_at ? formatDateTime(item.approved_at) : '—'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isPending ? (
                              userIs010 ? (
                                <button
                                  type="button"
                                  onClick={() => handleUser010ApproveBaseRate(item.id)}
                                  disabled={isApprovingRate}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer shadow-2xs disabled:opacity-50"
                                >
                                  Approve (010)
                                </button>
                              ) : (
                                <span className="text-[10px] text-rose-700 font-bold">User 010 Only</span>
                              )
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-bold">Verified</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* TAB 1: LIVE PIVOT MATRIX & CONTROL SIDEBAR */}
      {activeTab === 'matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* LEFT SIDEBAR CONTROLS */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            
            {/* BASE RATE CARD */}
            <div className="bg-white rounded-2xl p-4 border border-[#FBCFCB] shadow-sm relative overflow-hidden">
              <div className="bg-[#D94B5A] text-white -mx-4 -mt-4 p-3 mb-4 rounded-t-2xl flex items-center justify-between border-b-2 border-[#FDE7E6]">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-[#FDE7E6]" />
                  <h3 className="text-xs font-black uppercase tracking-wider">Configure Base Rate</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {(latestRateRecord?.updated_by_display || latestRateRecord?.updated_by) && (
                    <span className="text-[9px] bg-[#F7AFA8] text-slate-950 border border-[#F06D6C] px-2 py-0.5 rounded-full font-bold">
                      By: {latestRateRecord.updated_by_display || latestRateRecord.updated_by}
                    </span>
                  )}
                  <span className={cn(
                    "text-[9px] px-2 py-0.5 rounded-full font-black uppercase",
                    approvalState.isApproved
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-amber-200 text-amber-950"
                  )}>
                    {approvalState.isApproved ? "Approved" : "Pending Approval"}
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="current_base_rate_1323" className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                      Current Base Rate (₹)
                    </label>
                    {(latestRateRecord?.updated_by_display || latestRateRecord?.updated_by) && (
                      <span className="text-[9.5px] font-bold text-emerald-800">
                        Updated By: <strong className="text-[#D94B5A] underline">{latestRateRecord.updated_by_display || latestRateRecord.updated_by}</strong>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-500">₹</span>
                    <input
 id="current_base_rate_1323" name="current_base_rate" aria-label="Current Base Rate (₹)"                      type="number"
                      value={baseRate}
                      onChange={(e) => setBaseRate(Number(e.target.value) || 0)}
                      className="w-full bg-[#FDE7E6] border-2 border-[#F7AFA8] font-mono font-black text-base text-[#D94B5A] pl-7 pr-3 py-2 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#FDE7E6]"
                      required
                    />
                  </div>
                  {latestRateRecord && (
                    <div className="text-[9.5px] text-slate-600 font-medium flex flex-col gap-0.5 mt-1.5 px-0.5">
                      <div className="flex items-center justify-between">
                        <span>Database Rate: <strong className="font-mono text-slate-800 font-bold">₹{Number(latestRateRecord.base_rate).toLocaleString('en-IN')}</strong></span>
                        <span className="text-[9px] font-bold text-slate-700 font-mono">
                          {formatDateTime(latestRateRecord.updated_at || latestRateRecord.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status: <strong className={approvalState.isApproved ? "text-emerald-700" : "text-amber-700"}>{approvalState.isApproved ? "Approved" : "Pending Approval (User 010)"}</strong></span>
                        {approvalState.approvedByDisplay && (
                          <span className="text-[9px] text-emerald-800 font-bold">By {approvalState.approvedByDisplay}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="effective_date_1339" className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Effective Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
 id="effective_date_1339" name="effective_date" aria-label="Effective Date"                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-[#FDE7E6] border border-slate-300 font-mono font-bold text-xs pl-9 pr-3 py-2 rounded-xl outline-none focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="audit_remarks_1353" className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Audit Remarks
                  </label>
                  <textarea
 id="audit_remarks_1353" name="audit_remarks" aria-label="Audit Remarks"                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                    placeholder="Log comments or reason for rate change..."
                    className="w-full bg-[#FDE7E6] border border-slate-300 font-medium text-xs p-2.5 rounded-xl outline-none focus:bg-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUpdateBaseRate}
                  disabled={isLoading}
                  className="w-full bg-[#F7AFA8] hover:bg-[#D94B5A] text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4 text-[#FDE7E6]" />
                  <span>{isLoading ? "Saving Rates..." : "Apply & Publish Base Rate"}</span>
                </button>

                {!approvalState.isApproved && userIs010 && (
                  <button
                    type="button"
                    onClick={() => handleUser010ApproveBaseRate(latestRateRecord?.id)}
                    disabled={isApprovingRate}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4 text-amber-200" />
                    <span>{isApprovingRate ? "Approving..." : "Approve Base Rate (User 010)"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* IMPORT CARD */}
            <div className="bg-white rounded-2xl p-4 border border-[#FBCFCB] shadow-sm">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-[#D94B5A]" />
                  <h3 className="text-xs font-black uppercase text-[#D94B5A]">Import CSV Chart Data</h3>
                </div>
                <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">.CSV Format</span>
              </div>

              <div className="space-y-3 text-xs">
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="w-full bg-[#FDE7E6] hover:bg-slate-100 text-[#D94B5A] border border-slate-300 font-bold py-2 px-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-[#FDE7E6]" />
                  <span>Download CSV Template</span>
                </button>

                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleCsvUpload(file);
                  }}
                  className="border-2 border-dashed border-[#F7AFA8]/30 hover:border-[#F7AFA8] bg-[#FDE7E6] p-4 rounded-xl text-center cursor-pointer transition-all flex flex-col items-center justify-center relative min-h-[90px]"
                  onClick={() => document.getElementById('satta-csv-file-input')?.click()}
                >
                  <Upload className="h-5 w-5 text-[#D94B5A] mb-1" />
                  <span className="text-[10px] font-black text-[#D94B5A] uppercase">
                    Drag & Drop CSV or Click
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 mt-0.5">
                    Headers: Area, Grade, Differential
                  </span>
                  <input
 name="file" aria-label="file"                    id="satta-csv-file-input"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCsvUpload(file);
                    }}
                  />
                </div>

                {isUploading && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600">
                      <span>Uploading & Processing...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#F7AFA8] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* IMPORT CARD */}

          </div>

          {/* RIGHT LIVE PIVOT MATRIX SPREADSHEET */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-3">
            
            {/* MATRIX CONTROL HEADER */}
            <div className="bg-white p-3.5 rounded-2xl border border-[#FBCFCB] shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
 id="search_area_name_1499" name="search_area_name" aria-label="Search Area Name..."                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Area Name..."
                    className="bg-[#FDE7E6] border border-slate-300 pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#F7AFA8] w-48"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Grade Filter Pills */}
                <div className="hidden sm:flex items-center gap-1 bg-[#FDE7E6] p-1 rounded-xl border border-slate-200 text-[10px] font-extrabold uppercase">
                  <button
                    onClick={() => setSelectedGradeFilter('ALL')}
                    className={cn("px-2.5 py-1 rounded-lg transition-all cursor-pointer", selectedGradeFilter === 'ALL' ? "bg-[#D94B5A] text-white" : "text-slate-600")}
                  >
                    All Grades ({ALL_GRADES.length})
                  </button>
                  <button
                    onClick={() => setSelectedGradeFilter('TD')}
                    className={cn("px-2.5 py-1 rounded-lg transition-all cursor-pointer", selectedGradeFilter === 'TD' ? "bg-[#D94B5A] text-white" : "text-slate-600")}
                  >
                    TD Series
                  </button>
                  <button
                    onClick={() => setSelectedGradeFilter('BTR')}
                    className={cn("px-2.5 py-1 rounded-lg transition-all cursor-pointer", selectedGradeFilter === 'BTR' ? "bg-[#D94B5A] text-white" : "text-slate-600")}
                  >
                    BTR Series
                  </button>
                  <button
                    onClick={() => setSelectedGradeFilter('MESTA')}
                    className={cn("px-2.5 py-1 rounded-lg transition-all cursor-pointer", selectedGradeFilter === 'MESTA' ? "bg-[#D94B5A] text-white" : "text-slate-600")}
                  >
                    Mesta
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCsvExport(
                    filteredSeedRows.flatMap(r => 
                      ALL_GRADES.map(g => {
                        const diffVal = dbDifferentials[r.area]?.[g] !== undefined ? dbDifferentials[r.area][g] : r.diffs[g];
                        return diffVal !== undefined ? { area: r.area, grade: g, base_rate: baseRate, differential: diffVal, final_rate: baseRate + diffVal, start_date: startDate } : null;
                      }).filter(Boolean)
                    ),
                    `Satta_Calculated_Matrix_${startDate}`
                  )}
                  className="bg-white hover:bg-slate-100 text-[#D94B5A] border border-slate-300 font-bold px-3 py-1.5 rounded-xl text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="h-3.5 w-3.5 text-[#FDE7E6]" />
                  <span>Export Excel (CSV)</span>
                </button>

                <div className="bg-[#D94B5A] text-white font-mono font-bold text-xs px-3 py-1.5 rounded-xl border border-[#FDE7E6]/40 shadow-sm">
                  Base Rate: ₹{baseRate.toLocaleString()}
                </div>
              </div>
            </div>

            {/* COLOR CODING LEGEND */}
            <div className="bg-white p-2.5 rounded-xl border border-[#FBCFCB] flex flex-wrap items-center justify-between gap-2 text-[10px] font-extrabold uppercase">
              <span className="text-slate-500 font-bold flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5 text-[#FDE7E6]" /> Color Legend:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#D94B5A] text-white">Very High (≥+1000)</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">High Premium (&gt;0)</span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">Equal / Base (0)</span>
                <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-900 border border-orange-300">Low Discount (&lt;0)</span>
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300">Critical (&lt;-1000)</span>
              </div>
            </div>

            {/* Inline Cell Differential Editor */}
            {editingCell && (
              <div className="p-3 border-2 border-emerald-600 bg-emerald-50 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-slideDown shadow-md">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-emerald-800" />
                  <span className="text-xs font-extrabold uppercase text-slate-800">
                    Edit Differential for <strong className="text-emerald-900">{editingCell.area}</strong> grade <strong className="text-emerald-900">{editingCell.grade}</strong>:
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
 id="0_1590" name="0" aria-label="0"                    type="number"
                    value={editingCell.val}
                    onChange={(e) => setEditingCell({...editingCell, val: e.target.value})}
                    placeholder="0"
                    className="w-28 bg-white border border-slate-400 font-mono font-bold text-xs p-1.5 rounded-lg outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveCellDifferential()}
                  />
                  <button
                    onClick={handleSaveCellDifferential}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-lg uppercase cursor-pointer shadow-sm"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingCell(null)} className="p-1.5 hover:bg-emerald-200 rounded-lg">
                    <X className="h-4 w-4 text-slate-600" />
                  </button>
                </div>
              </div>
            )}

            {/* PIVOT MATRIX SPREADSHEET TABLE WITH FROZEN HEADER & FIRST COLUMN */}
            <div className="bg-white rounded-2xl border border-[#FBCFCB] shadow-md overflow-hidden relative">
              
              {/* Tooltip Hover Overlay */}
              {hoveredCell && (
                <div className="absolute top-2 right-4 z-20 bg-[#D94B5A] text-white p-2.5 rounded-xl shadow-2xl border border-[#FDE7E6] text-xs font-mono animate-fadeIn flex items-center gap-3">
                  <div>
                    <span className="text-[#FDE7E6] font-bold block text-[10px]">{hoveredCell.area} • {hoveredCell.grade}</span>
                    <span className="text-white font-extrabold text-sm">Calculated: ₹{hoveredCell.rate.toLocaleString()}</span>
                  </div>
                  <div className="border-l border-white/20 pl-3">
                    <span className="text-slate-300 text-[10px] block">Differential Offset</span>
                    <span className={cn("font-bold text-xs", hoveredCell.diff >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {hoveredCell.diff >= 0 ? `+₹${hoveredCell.diff}` : `-₹${Math.abs(hoveredCell.diff)}`}
                    </span>
                    {dbDiffUsers[hoveredCell.area]?.[hoveredCell.grade]?.user && (
                      <span className="text-[9px] text-amber-300 block font-sans font-bold mt-0.5">
                        Updated by: {dbDiffUsers[hoveredCell.area][hoveredCell.grade].user}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="overflow-auto max-h-[620px] scrollbar-thin">
                <table className="w-full text-left border-collapse font-sans text-xs min-w-[1300px]">
                  <thead className="bg-[#D94B5A] text-white font-black uppercase text-[10px] tracking-wider sticky top-0 z-20 shadow-sm">
                    <tr className="border-b-2 border-[#FDE7E6]">
                      <th className="p-3 border-r border-[#F06D6C] sticky left-0 bg-[#F7AFA8] text-left min-w-[170px] shadow-[3px_0_6px_rgba(0,0,0,0.2)] z-30">
                        Area Name ({filteredSeedRows.length})
                      </th>
                      {visibleGrades.map(g => (
                        <th key={g} className="p-2.5 text-center border-r border-[#F06D6C] font-mono min-w-[80px]">
                          {g}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs font-medium">
                    {filteredSeedRows.map((row, idx) => {
                      const areaName = row.area;
                      return (
                        <tr key={areaName} className={cn("hover:bg-[#FDE7E6] transition-colors uppercase", idx % 2 === 0 ? "bg-[#FDE7E6]/50" : "bg-white")}>
                          
                          {/* Frozen First Column: Area Name */}
                          <td className="p-3 border-r border-slate-300 font-extrabold text-[#D94B5A] bg-white sticky left-0 z-10 shadow-[3px_0_6px_rgba(0,0,0,0.06)] flex items-center justify-between">
                            <span>{areaName}</span>
                            <ChevronRight className="h-3 w-3 text-slate-300" />
                          </td>

                          {/* Dynamic Grade Cells */}
                          {visibleGrades.map(grade => {
                            const diffVal = dbDifferentials[areaName]?.[grade] !== undefined
                              ? dbDifferentials[areaName][grade]
                              : row.diffs[grade];
                            
                            const hasDiff = diffVal !== undefined;
                            const finalComputedRate = hasDiff ? baseRate + diffVal : null;
                            const isVeryHigh = hasDiff && diffVal >= 1000;
                            const isHigh = hasDiff && diffVal > 0 && diffVal < 1000;
                            const isBase = hasDiff && diffVal === 0;
                            const isLow = hasDiff && diffVal < 0 && diffVal >= -1000;
                            const isCritical = hasDiff && diffVal < -1000;

                            return (
                              <td
                                key={grade}
                                onMouseEnter={() => hasDiff && setHoveredCell({ area: areaName, grade, diff: diffVal, rate: finalComputedRate! })}
                                onMouseLeave={() => setHoveredCell(null)}
                                onClick={() => {
                                  if (!enforceEditOrDeletePermission("Edit")) return;
                                  setEditingCell({
                                    area: areaName,
                                    grade: grade,
                                    val: hasDiff ? String(diffVal) : ''
                                  });
                                }}
                                className={cn(
                                  "p-1.5 border-r border-slate-200 text-center font-bold relative group cursor-pointer transition-all hover:ring-2 hover:ring-[#F7AFA8] hover:z-10",
                                  hasDiff
                                    ? isVeryHigh
                                      ? "bg-[#D94B5A] text-white shadow-sm font-black"
                                      : isHigh
                                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                                        : isBase
                                          ? "bg-amber-50 text-amber-900 border-amber-200"
                                          : isLow
                                            ? "bg-orange-50 text-orange-950 border-orange-200"
                                            : "bg-rose-50 text-rose-950 font-black border-rose-200"
                                    : "text-slate-300 font-normal italic"
                                )}
                              >
                                {hasDiff ? (
                                  <div className="flex flex-col justify-center items-center">
                                    <span className="text-[10.5px] font-mono font-black">₹{finalComputedRate?.toLocaleString()}</span>
                                    <div className="flex items-center gap-1">
                                      <span className={cn(
                                        "text-[8.5px] font-extrabold font-mono",
                                        isVeryHigh ? "text-[#FDE7E6]" :
                                        isHigh ? "text-emerald-700" :
                                        isBase ? "text-amber-800" :
                                        isLow ? "text-orange-700" : "text-rose-700"
                                      )}>
                                        {diffVal >= 0 ? `+${diffVal}` : diffVal}
                                      </span>
                                      {dbDiffUsers[areaName]?.[grade]?.user && (
                                        <span 
                                          className="text-[7px] text-slate-500 font-sans truncate max-w-[45px] font-medium"
                                          title={`Updated by: ${dbDiffUsers[areaName][grade].user}`}
                                        >
                                          • {dbDiffUsers[areaName][grade].user}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-slate-300 group-hover:text-slate-600">--</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: DEDICATED DIFFERENTIAL HISTORY AUDIT VIEW */}
      {activeTab === 'diff_history' && (
        <div className="space-y-4">
          {/* HEADER & TOP ACTIONS */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-[#FBCFCB] shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#F7AFA8] text-[#FDE7E6] rounded-2xl shadow-inner">
                <History className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base md:text-lg font-black text-[#D94B5A] tracking-tight font-serif">
                    Differential History
                  </h2>
                  <span className="text-[10px] font-sans font-extrabold bg-[#FDE7E6] text-[#D94B5A] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Live Supabase Audit
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('matrix')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#D94B5A]" />
                <span>Open Live Matrix</span>
              </button>

              <button
                type="button"
                onClick={fetchDiffHistory}
                disabled={isDiffHistoryLoading}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCcw className={cn("h-3.5 w-3.5", isDiffHistoryLoading && "animate-spin")} />
                <span>{isDiffHistoryLoading ? "Refreshing..." : "Refresh"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const exportRows = filteredDiffHistoryLogs.map((log: any, idx: number) => ({
                    "Srl": idx + 1,
                    "Date": formatDateDMY(log.changed_date),
                    "Area Name": log.area,
                    "Grade": log.grade,
                    "Previous Differential": log.old_differential !== null && log.old_differential !== undefined ? log.old_differential : '',
                    "New Differential": log.new_differential !== null && log.new_differential !== undefined ? log.new_differential : '',
                    "Change": log.differential_change !== null && log.differential_change !== undefined ? (log.differential_change > 0 ? `+${log.differential_change}` : log.differential_change) : '',
                    "Changed By": resolveUserIdentity(log.changed_by, log.updated_by_id).displayLabel || log.changed_by || '—',
                    "Changed At": formatDateTime(log.created_at),
                    "Remarks": log.remarks || ''
                  }));
                  handleCsvExport(exportRows, `Differential_History_${new Date().toISOString().split('T')[0]}.csv`);
                }}
                disabled={filteredDiffHistoryLogs.length === 0}
                className="px-3.5 py-2 bg-[#F7AFA8] hover:bg-[#D94B5A] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Download className="h-3.5 w-3.5 text-[#FDE7E6]" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* FILTERS TOOLBAR */}
          <div className="bg-white p-4 rounded-2xl border border-[#FBCFCB] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#D94B5A] uppercase tracking-wider">
                <Filter className="h-3.5 w-3.5 text-[#FDE7E6]" />
                <span>Audit Filters</span>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-[#D94B5A] font-black">{filteredDiffHistoryLogs.length}</strong> of {diffHistoryLogs.length} audit entries
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Search</label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={diffFilterSearch}
                    onChange={(e) => setDiffFilterSearch(e.target.value)}
                    placeholder="Search Area, Grade, User..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FDE7E6] focus:bg-white"
                  />
                  {diffFilterSearch && (
                    <button
                      type="button"
                      onClick={() => setDiffFilterSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Date From</label>
                <input
                  type="date"
                  value={diffFilterDateFrom}
                  onChange={(e) => setDiffFilterDateFrom(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FDE7E6] focus:bg-white font-mono"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Date To</label>
                <input
                  type="date"
                  value={diffFilterDateTo}
                  onChange={(e) => setDiffFilterDateTo(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FDE7E6] focus:bg-white font-mono"
                />
              </div>

              {/* Area Name Dropdown */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Area Name</label>
                <select
                  value={diffFilterArea}
                  onChange={(e) => setDiffFilterArea(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FDE7E6] focus:bg-white"
                >
                  <option value="ALL">All Areas ({distinctDiffAreas.length})</option>
                  {distinctDiffAreas.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* Grade Dropdown */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Grade</label>
                <select
                  value={diffFilterGrade}
                  onChange={(e) => setDiffFilterGrade(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FDE7E6] focus:bg-white"
                >
                  <option value="ALL">All Grades ({distinctDiffGrades.length})</option>
                  {distinctDiffGrades.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub-row for Changed By & Reset */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Changed By:</span>
                  <select
                    value={diffFilterChangedBy}
                    onChange={(e) => setDiffFilterChangedBy(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FDE7E6]"
                  >
                    <option value="ALL">All Users ({distinctDiffUsers.length})</option>
                    {distinctDiffUsers.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                {(diffFilterSearch || diffFilterDateFrom || diffFilterDateTo || diffFilterArea !== 'ALL' || diffFilterGrade !== 'ALL' || diffFilterChangedBy !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setDiffFilterSearch('');
                      setDiffFilterDateFrom('');
                      setDiffFilterDateTo('');
                      setDiffFilterArea('ALL');
                      setDiffFilterGrade('ALL');
                      setDiffFilterChangedBy('ALL');
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* AUDIT TABLE */}
          <div className="bg-white rounded-2xl border border-[#FBCFCB] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#D94B5A] text-white text-xs font-black uppercase tracking-wider border-b-2 border-[#FDE7E6]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Area Name</th>
                    <th className="py-3 px-4">Grade</th>
                    <th className="py-3 px-4 text-right">Previous Differential</th>
                    <th className="py-3 px-4 text-right">New Differential</th>
                    <th className="py-3 px-4 text-center">Change</th>
                    <th className="py-3 px-4 text-center">Changed By</th>
                    <th className="py-3 px-4 text-right">Changed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {isDiffHistoryLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <RefreshCcw className="h-6 w-6 text-[#FDE7E6] animate-spin mx-auto mb-2" />
                        <div className="font-bold text-slate-700">Loading Differential History from Supabase...</div>
                      </td>
                    </tr>
                  ) : filteredDiffHistoryLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <div className="font-bold text-slate-700">No Differential History Found</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {diffHistoryLogs.length > 0 
                            ? "Try adjusting your filters above to see more records." 
                            : "Edits made in Live Pivot Matrix will automatically appear here."}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDiffHistoryLogs.map((log: any) => {
                      const changeVal = log.differential_change;
                      const hasChange = changeVal !== null && changeVal !== undefined;
                      const isPositive = hasChange && changeVal > 0;
                      const isNegative = hasChange && changeVal < 0;

                      return (
                        <tr key={log.id} className="hover:bg-amber-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {formatDateDMY(log.changed_date)}
                          </td>
                          <td className="py-3 px-4 font-extrabold text-[#D94B5A] whitespace-nowrap">
                            {log.area}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md font-mono font-black text-xs bg-slate-100 text-slate-800 border border-slate-300">
                              {log.grade}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                            {log.old_differential !== null && log.old_differential !== undefined ? (
                              <span className={cn(
                                "font-bold",
                                log.old_differential > 0 ? "text-emerald-700" : log.old_differential < 0 ? "text-rose-700" : "text-slate-700"
                              )}>
                                {log.old_differential > 0 ? `+${log.old_differential}` : log.old_differential}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                            {log.new_differential !== null && log.new_differential !== undefined ? (
                              <span className={cn(
                                "font-black text-sm",
                                log.new_differential > 0 ? "text-emerald-800" : log.new_differential < 0 ? "text-rose-800" : "text-slate-800"
                              )}>
                                {log.new_differential > 0 ? `+${log.new_differential}` : log.new_differential}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {hasChange ? (
                              <span className={cn(
                                "inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-black",
                                isPositive 
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : isNegative 
                                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                                  : "bg-slate-100 text-slate-600 border border-slate-300"
                              )}>
                                {isPositive && <ArrowUpRight className="h-3 w-3 text-emerald-700" />}
                                {isNegative && <ArrowDownRight className="h-3 w-3 text-rose-700" />}
                                {isPositive ? `+${changeVal}` : changeVal}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-300">
                              {resolveUserIdentity(log.changed_by, log.updated_by_id).displayLabel || log.changed_by || '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                            {formatDateTime(log.created_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <SattaRateConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        baseRate={baseRate}
        latestRateRecord={latestRateRecord}
        startDate={startDate}
        remarks={remarks}
        duplicateCheckResult={duplicateCheckResult}
        onExecuteRateUpdate={executeRateUpdate}
      />

      <SattaPrintPreviewModal
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        selectedYear={selectedYear}
        rateLookup={rateLookup}
        monthlySummaryStats={monthlySummaryStats}
      />

      <SattaUploadSuccessModal
        isOpen={showUploadSuccessModal}
        onClose={() => setShowUploadSuccessModal(false)}
        onNavigate={onNavigate}
      />


      {/* Universal Change Log Modal */}
      <UniversalAuditLogModal
        isOpen={showUniversalAuditModal}
        onClose={() => setShowUniversalAuditModal(false)}
        initialModule="Satta Desk / Rate Chart"
      />

    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <LegacyLayout title="Satta Dashboard" subtitle="Live Market Intelligence & Rate Chart Console">
      {content}
    </LegacyLayout>
  );
}
