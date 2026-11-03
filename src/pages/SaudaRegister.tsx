import React, { useState, useEffect, useDeferredValue } from 'react';
import { useLiveAutoRefresh } from '../hooks/useLiveAutoRefresh';
import { screenDraftService } from '../services/screenDraftService';
import { createPortal } from 'react-dom';
import Papa from 'papaparse';
import { 
  HandCoins, 
  Search, 
  Download, 
  Upload,
  Printer, 
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Filter,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowUpRight,
  Calculator,
  ChevronDown,
  X,
  RefreshCcw,
  FileText,
  Edit,
  Trash2,
  Mail,
  Send,
  ClipboardList,
  Scale,
  IndianRupee,
  Eye,
  History,
  Lock
} from 'lucide-react';
import { cn, sanitizeCsvData, getApiUrl, cleanSaudaNo } from '../lib/utils';
import LegacyLayout, { LegacyFieldset, LegacyButton } from '../components/LegacyLayout';
import SaudaEntry from './SaudaEntry';
import SaudaPrintSlip from '../components/SaudaPrintSlip';
import { UniversalAuditLogModal } from '../components/UniversalAuditLogModal';
import { dbModule } from '../services/dbModule';
import { Sauda, SaudaQualityDetail } from '../types';
import { supabase } from '../lib/supabase';
import { enforceEditOrDeletePermission, canEditOrDelete, canViewCompletedData, isUserId10, isUserId2, isUserAdmin, isL5OrAdmin, getCurrentUserContext, isSaudaApproved, canEditSaudaContract, canDeleteSaudaContract } from '../lib/permissions';
import { initUserMap, resolveDisplayName } from '../lib/userResolver';
import { logChange } from '../services/auditLogService';
import { PaginationControls } from '../components/PaginationControls';
import { generateSaudaPdfBase64 } from '../lib/saudaPdf';
import {
  BASE_RATE_APPROVAL_REQUIRED_MSG,
  getBaseRateApprovalState,
  getCachedBaseRateApprovalState,
  fetchSattaBaseRates
} from '../services/sattaRateService';
import { compareQualities, formatPoNumber, generateSaudaHtmlEmail } from '../components/sauda-register/saudaRegisterUtils';
import { Th, AccountsModal } from '../components/sauda-register/AccountsModal';
import { SaudaImportModal } from '../components/sauda-register/SaudaImportModal';
import { SaudaApprovalModal, SaudaRejectionModal, SaudaDetailsModal } from '../components/sauda-register/SaudaApprovalModals';


export default function SaudaRegister({ onClose, onNew, isActive = true }: { onClose?: () => void; onNew?: () => void; isActive?: boolean }) {
  const [saudaList, setSaudaList] = useState<Sauda[]>([]);
  const [poList, setPoList] = useState<any[]>([]);
  const [arrivalsList, setArrivalsList] = useState<any[]>([]);
  const [scpList, setScpList] = useState<any[]>([]);
  const [selectedSaudaId, setSelectedSaudaId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingSauda, setEditingSauda] = useState<Sauda | null>(null);
  const [printingSauda, setPrintingSauda] = useState<Sauda | null>(null);
  const [printingBook, setPrintingBook] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [emailSendingStatus, setEmailSendingStatus] = useState<Record<string, 'sending' | 'sent' | 'error' | 'success' | 'idle'>>({});
  const [openActionDropdownId, setOpenActionDropdownId] = useState<string | null>(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditRecordId, setAuditRecordId] = useState<string | undefined>();

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [searchTerm, setSearchTerm] = useState(() => screenDraftService.getFilters('sauda_search', ''));
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusTab, setStatusTab] = useState<'pending' | 'checked' | 'approved' | 'rejected' | 'drafts' | 'resubmitted' | 'all'>(() => {
    const saved = screenDraftService.getFilters('sauda_status_tab', isUserId10() ? 'pending' : 'all');
    return saved as any;
  });

  useEffect(() => {
    screenDraftService.saveFilters('sauda_search', searchTerm);
    screenDraftService.saveFilters('sauda_status_tab', statusTab);
  }, [searchTerm, statusTab]);

  const isUser10 = isUserId10();
  const isUser2 = isUserId2();
  const isAdminOrL4 = isUserAdmin() || isL5OrAdmin();

  const canSeeChecked = true;
  const canSeeRejected = true;
  const canSeeAllHistory = true;

  // Status Checkers for Maker-Checker Workflow
  const isApprovedSauda = (s: Sauda) => {
    return Boolean(
      s.is_checked || 
      String(s.status || '').toUpperCase() === 'APPROVED' || 
      String(s.approval_status || '').toUpperCase() === 'APPROVED' ||
      String(s.status || '').toUpperCase() === 'CHECKED' ||
      String(s.approval_status || '').toUpperCase() === 'CHECKED' ||
      Boolean(s.approved_by)
    );
  };

  const isCheckedSauda = isApprovedSauda;

  const isDraftSauda = (s: Sauda) => {
    return (
      String(s.status || '').toUpperCase() === 'DRAFT' ||
      String(s.approval_status || '').toUpperCase() === 'DRAFT'
    );
  };

  const isRejectedSauda = (s: Sauda) => {
    if (isApprovedSauda(s)) return false;
    const st = String(s.status || '').toUpperCase();
    const ast = String(s.approval_status || '').toUpperCase();
    if (st === 'REJECTED' || ast === 'REJECTED') return true;
    if (st === 'PENDING' || ast === 'PENDING') return false;
    return Boolean(s.rejected_by);
  };

  const isPendingUncheckedSauda = (s: Sauda) => {
    return !isApprovedSauda(s) && !isRejectedSauda(s) && !isDraftSauda(s);
  };

  const isResubmittedSauda = (s: Sauda) => {
    return (Number(s.resubmission_count) || 0) > 0;
  };

  // Approval & Rejection Modal State
  const [approvingSauda, setApprovingSauda] = useState<Sauda | null>(null);
  const [isApprovingLoading, setIsApprovingLoading] = useState(false);

  const [rejectingSauda, setRejectingSauda] = useState<Sauda | null>(null);
  const [rejectionRemarksInput, setRejectionRemarksInput] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const [isRejectingLoading, setIsRejectingLoading] = useState(false);

  const [viewingDetailsSauda, setViewingDetailsSauda] = useState<Sauda | null>(null);
  const [baseRateApprovalState, setBaseRateApprovalState] = useState(() => getCachedBaseRateApprovalState());

  useEffect(() => {
    let mounted = true;
    const syncBaseRateApproval = async () => {
      try {
        await fetchSattaBaseRates();
        const st = await getBaseRateApprovalState();
        if (mounted) setBaseRateApprovalState(st);
      } catch (_e) {}
    };
    syncBaseRateApproval();
    const onRateChange = () => {
      syncBaseRateApproval();
    };
    window.addEventListener('satta-base-rate-updated', onRateChange);
    window.addEventListener('app-data-updated', onRateChange);
    return () => {
      mounted = false;
      window.removeEventListener('satta-base-rate-updated', onRateChange);
      window.removeEventListener('app-data-updated', onRateChange);
    };
  }, []);

  // User 010 (Checker) Final Approval Handler
  const handleMarkCheck = async (entry: Sauda) => {
    const brState = await getBaseRateApprovalState();
    setBaseRateApprovalState(brState);
    if (!brState.isApproved) {
      alert(BASE_RATE_APPROVAL_REQUIRED_MSG);
      return;
    }

    const userCtx = getCurrentUserContext();
    const canCheck = isUserAdmin() || isUserId10() || isL5OrAdmin() || userCtx.userRole === 'ADMIN';

    if (!canCheck) {
      alert("🔒 Permission Denied: Only User ID 010 (Checker) can approve Sauda contracts.");
      return;
    }

    if (isApprovedSauda(entry)) {
      alert(`🔒 Contract is Permanently Locked: Sauda #${entry.sauda_no} is already approved by User 010. Per company policy, once approved it cannot be un-approved or edited.`);
      return;
    }

    setApprovingSauda(entry);
  };

  const handleConfirmApprove = async () => {
    if (!approvingSauda) return;
    const userCtx = getCurrentUserContext();
    const approverName = resolveDisplayName(userCtx.userName || userCtx.username || userCtx.userId, 'User 010 (Checker)');

    setIsApprovingLoading(true);
    const entry = approvingSauda;
    const targetId = entry.sauda_id || (entry as any).id;
    const saudaNo = entry.sauda_no;
    const cleanNo = String(saudaNo || '').replace(/^0+/, '');

    const updatePayload = {
      is_checked: true,
      checked_by: approverName,
      approved_by: approverName,
      checked_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
      status: 'APPROVED',
      approval_status: 'APPROVED',
      rejected_by: null,
      rejected_at: null,
      last_updated_at: new Date().toISOString()
    };

    setSaudaList(prev => prev.map(s => {
      const match = (s.sauda_id && targetId && s.sauda_id === targetId) || (s.sauda_no && saudaNo && String(s.sauda_no).replace(/^0+/, '') === cleanNo);
      return match ? { ...s, ...updatePayload } : s;
    }));

    try {
      const cleanKey = String(saudaNo || targetId || '').trim().toUpperCase();
      if (cleanKey) {
        localStorage.setItem(`sauda_check_status_${cleanKey}`, JSON.stringify(updatePayload));
      }
      if (targetId) {
        localStorage.setItem(`sauda_check_status_${String(targetId).trim().toUpperCase()}`, JSON.stringify(updatePayload));
      }
      if (targetId) {
        await dbModule.update('sauda_master', 'sauda_id', targetId, updatePayload);
      } else if (saudaNo) {
        await dbModule.update('sauda_master', 'sauda_no', saudaNo, updatePayload);
      }

      logChange({
        module: 'Sauda Desk',
        entity_name: 'Sauda Final Approval',
        record_id: String(targetId || saudaNo),
        action: 'UPDATE',
        field_name: 'status',
        field_label: 'Approval Status',
        old_value: entry.status || 'PENDING',
        new_value: 'APPROVED',
        user_name: approverName,
        remarks: `Sauda #${saudaNo} verified and final approved by User 010. Contract is permanently locked.`
      }).catch(() => {});

      window.dispatchEvent(new CustomEvent('app-data-updated', { detail: { table: 'sauda_master' } }));
      setApprovingSauda(null);
      alert(`✅ Sauda #${entry.sauda_no} approved successfully! This contract is now PERMANENTLY LOCKED against editing and deletion.`);
    } catch (err: any) {
      console.error("Error approving sauda:", err);
      alert("Failed to save approval: " + (err.message || err));
    } finally {
      setIsApprovingLoading(false);
    }
  };

  // User 010 (Checker) Rejection Handler with Mandatory Remarks
  const handleMarkReject = (entry: Sauda) => {
    const userCtx = getCurrentUserContext();
    const canReject = isUserAdmin() || isUserId10() || isL5OrAdmin() || isUserId2() || userCtx.userRole === 'ADMIN';

    if (!canReject) {
      alert("🔒 Permission Denied: Only User ID 010 (Checker) can reject Sauda contracts.");
      return;
    }

    if (isApprovedSauda(entry)) {
      alert(`🔒 Contract is Permanently Locked: Sauda #${entry.sauda_no} is approved and cannot be rejected or modified.`);
      return;
    }

    if (isRejectedSauda(entry)) {
      if (isUser2 || !isUser10) {
        // User 002 (Maker) opens rejected entry for correction and resubmission
        handleEdit(entry);
        return;
      }
    }

    setRejectingSauda(entry);
    setRejectionRemarksInput(entry.rejection_remarks || '');
    setRejectionError('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingSauda) return;
    const trimmedRemarks = rejectionRemarksInput.trim();
    if (!trimmedRemarks) {
      setRejectionError("Mandatory rejection remarks are required. Please explain why this entry is rejected.");
      return;
    }
    if (trimmedRemarks.length < 3) {
      setRejectionError("Please provide a descriptive remark explaining what corrections User 002 needs to make.");
      return;
    }

    const userCtx = getCurrentUserContext();
    const rejectorName = resolveDisplayName(userCtx.userName || userCtx.username || userCtx.userId, 'User 010 (Checker)');

    setIsRejectingLoading(true);
    const entry = rejectingSauda;
    const targetId = entry.sauda_id || (entry as any).id;
    const saudaNo = entry.sauda_no;
    const cleanNo = String(saudaNo || '').replace(/^0+/, '');

    const updatePayload = {
      is_checked: false,
      checked_by: null,
      checked_at: null,
      approved_by: null,
      approved_at: null,
      status: 'REJECTED',
      approval_status: 'REJECTED',
      rejected_by: rejectorName,
      rejected_at: new Date().toISOString(),
      rejection_remarks: trimmedRemarks,
      last_updated_at: new Date().toISOString()
    };

    setSaudaList(prev => prev.map(s => {
      const match = (s.sauda_id && targetId && s.sauda_id === targetId) || (s.sauda_no && saudaNo && String(s.sauda_no).replace(/^0+/, '') === cleanNo);
      return match ? { ...s, ...updatePayload } : s;
    }));

    try {
      const cleanKey = String(saudaNo || targetId || '').trim().toUpperCase();
      if (cleanKey) {
        localStorage.setItem(`sauda_check_status_${cleanKey}`, JSON.stringify(updatePayload));
      }
      if (targetId) {
        localStorage.setItem(`sauda_check_status_${String(targetId).trim().toUpperCase()}`, JSON.stringify(updatePayload));
      }
      if (targetId) {
        await dbModule.update('sauda_master', 'sauda_id', targetId, updatePayload);
      } else if (saudaNo) {
        await dbModule.update('sauda_master', 'sauda_no', saudaNo, updatePayload);
      }

      logChange({
        module: 'Sauda Desk',
        entity_name: 'Sauda Contract Rejection',
        record_id: String(targetId || saudaNo),
        action: 'UPDATE',
        field_name: 'status',
        field_label: 'Approval Status',
        old_value: entry.status || 'PENDING',
        new_value: 'REJECTED',
        user_name: rejectorName,
        remarks: `Sauda #${saudaNo} rejected by User 010. Reason: ${trimmedRemarks}`
      }).catch(() => {});

      window.dispatchEvent(new CustomEvent('app-data-updated', { detail: { table: 'sauda_master' } }));
      setRejectingSauda(null);
      setRejectionRemarksInput('');
      setRejectionError('');
      alert(`✕ Sauda #${entry.sauda_no} has been REJECTED with remarks and returned to User 002 for correction.`);
    } catch (err: any) {
      console.error("Error rejecting sauda:", err);
      alert("Failed to save rejection: " + (err.message || err));
    } finally {
      setIsRejectingLoading(false);
    }
  };

  const handleSendMail = async (sauda: Sauda) => {
    const sId = sauda.sauda_id;
    if (!sId) return;

    setEmailSendingStatus(prev => ({ ...prev, [sId]: 'sending' }));

    try {
      let qDetails: SaudaQualityDetail[] = sauda.quality_details || [];
      
      // If quality details are not loaded on the row, fetch them from DB
      if (qDetails.length === 0 && supabase) {
        const { data, error } = await supabase
          .from('sauda_quality_details')
          .select('*')
          .eq('sauda_id', sId);
        if (!error && data) {
          qDetails = data;
        }
      }

      const fullSauda = {
        ...sauda,
        quality_details: qDetails
      };

      const emailHtml = generateSaudaHtmlEmail(fullSauda);
      const saudaPdfBase64 = generateSaudaPdfBase64(fullSauda);

      let recipientEmails = "";
      if (supabase) {
        const addedEmails = new Set<string>();
        
        // Lookup Broker in customer_master
        if (sauda.broker) {
          const { data: custBroker } = await supabase
            .from('customer_master')
            .select('email')
            .eq('firm_name', sauda.broker)
            .maybeSingle();
          if (custBroker?.email) {
            const email = custBroker.email.trim();
            if (email && !addedEmails.has(email.toLowerCase())) {
              recipientEmails += `, ${email}`;
              addedEmails.add(email.toLowerCase());
            }
          }
        }
        
        // Lookup Supplier in customer_master
        if (sauda.supplier) {
          const { data: custSupplier } = await supabase
            .from('customer_master')
            .select('email')
            .eq('firm_name', sauda.supplier)
            .maybeSingle();
          if (custSupplier?.email) {
            const email = custSupplier.email.trim();
            if (email && !addedEmails.has(email.toLowerCase())) {
              recipientEmails += `, ${email}`;
              addedEmails.add(email.toLowerCase());
            }
          }
        }
      }

      const res = await fetch(getApiUrl("/api/send-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `📋 SAUDA SLIP CONTRACT: #${sauda.sauda_no} - [${sauda.broker || 'N/A'}]`,
          to: recipientEmails.split(',').map(e => e.trim()).filter(Boolean).join(', ') || 'rawjute@ballyjute.com',
          html: emailHtml,
          filename: `Sauda_Contract_${sauda.sauda_no || 'Draft'}.pdf`,
          pdfData: saudaPdfBase64 || undefined
        })
      });

      const resText = await res.text();
      let resData;
      try {
        resData = JSON.parse(resText);
      } catch (e) {
        throw new Error("Mail Dispatch Failed: " + (resText.substring(0, 100) || `Status ${res.status}`));
      }
      
      if (res.ok && resData.success) {
        setEmailSendingStatus(prev => ({ ...prev, [sId]: 'success' }));
        alert(`Email for Sauda #${sauda.sauda_no} sent successfully to ${recipientEmails}!`);
        setTimeout(() => {
          setEmailSendingStatus(prev => ({ ...prev, [sId]: 'idle' }));
        }, 3000);
      } else {
        throw new Error(resData.error || "Failed to send email");
      }
    } catch (err: any) {
      console.error(err);
      setEmailSendingStatus(prev => ({ ...prev, [sId]: 'error' }));
      alert(`Failed to send email: ${err.message || String(err)}`);
      setTimeout(() => {
        setEmailSendingStatus(prev => ({ ...prev, [sId]: 'idle' }));
      }, 3000);
    }
  };

  const handleCsvDownload = async () => {
    try {
      if (!supabase) {
        alert("Database connection client not loaded.");
        return;
      }
      const { data: fullData, error } = await supabase
        .from('sauda_master')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!fullData || fullData.length === 0) {
        alert("No Sauda contracts found in database to export.");
        return;
      }

      // Map raw columns to descriptive headers covering ALL fields
      const dataToExport = fullData.map((row: any) => {
        let qDetailsStr = '';
        if (Array.isArray(row.quality_details)) {
          qDetailsStr = JSON.stringify(row.quality_details);
        } else if (typeof row.quality_details === 'string') {
          qDetailsStr = row.quality_details;
        }

        return {
          "Order No": row.sauda_no || '',
          "Session": row.session || '2026-2027',
          "PO Type": row.po_type || 'Normal',
          "Date": row.date ? new Date(row.date).toISOString().split('T')[0] : '',
          "Broker": row.broker || '',
          "Supplier": row.supplier || '',
          "Challan Supplier": row.challan_supplier || '',
          "Area": row.area || '',
          "Agency": row.agency || '',
          "Marks": row.marks || '',
          "No of Lorries": row.no_of_lorries || 1,
          "Units Per Lorry": row.units_per_lorry || row.units_per_lorry_type || 80,
          "Unit Type": row.unit_type || 'BALES',
          "Total Unit": row.total_unit || 0,
          "Wt Per Lorry": row.wt_per_lorry || 0,
          "Total Wt Ton": row.total_wt_in_ton || 0,
          "Shipment Date": row.shipment_date ? new Date(row.shipment_date).toISOString().split('T')[0] : '',
          "Shipment Days": row.shipment_days || 0,
          "Shipment Penalty": row.shipment_penalty || 0,
          "Marks Claim": row.marks_claim || 0,
          "Quantity Claim": row.quantity_claim || 0,
          "Book Rate": row.b_rate || 0,
          "Book Date": row.b_date ? new Date(row.b_date).toISOString().split('T')[0] : '',
          "Superior Normal Marks": row.superior_normal_marks || 'New (F2)',
          "Remarks": row.remarks || '',
          "Status": (row.status || 'PENDING').toUpperCase(),
          "Quality Details JSON": qDetailsStr,
          "Sauda ID": row.sauda_id || '',
          "Created At": row.created_at || ''
        };
      });

      const sanitizedData = sanitizeCsvData(dataToExport);
      const csv = Papa.unparse(sanitizedData);
      const csvContent = "\uFEFF" + csv; // Add UTF-8 BOM so excel reads unicode correctly
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Sauda_Desk_Full_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("CSV Export failed:", err);
      alert("Failed to export: " + err.message);
    }
  };

  const handleCsvImport = async (csvDataString: string) => {
    if (!csvDataString || !csvDataString.trim()) {
      alert("Please select a CSV file or paste CSV text first.");
      return;
    }

    const brState = await getBaseRateApprovalState();
    setBaseRateApprovalState(brState);
    if (!brState.isApproved) {
      alert(BASE_RATE_APPROVAL_REQUIRED_MSG);
      return;
    }

    setIsImporting(true);
    setImportStatusMessage("Parsing CSV data...");

    try {
      const parsed = Papa.parse(csvDataString, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false
      });

      const rows: any[] = parsed.data || [];
      if (rows.length === 0) {
        alert("No valid data rows found in the provided CSV.");
        setIsImporting(false);
        return;
      }

      setImportStatusMessage(`Grouping and processing ${rows.length} rows...`);

      const cleanVal = (v: any) => (v !== undefined && v !== null ? String(v).trim() : '');

      const groupMap = new Map<string, { header: any; qualities: any[] }>();

      rows.forEach((r, idx) => {
        const orderNoRaw = cleanVal(r["Order No"] || r["order_no"] || r["sauda_no"] || r["Order Number"] || r["Contract No"] || r["SLIP NO"]);
        if (!orderNoRaw) return;

        let sessionVal = cleanVal(r["Session"] || r["session"] || '2026-2027');
        sessionVal = sessionVal.replace(/^BJCL\//i, '').replace(/\/.*$/, '').trim() || '2026-2027';

        let saudaNo = orderNoRaw;
        if (!saudaNo.startsWith('BJCL/')) {
          const digits = saudaNo.replace(/^0+/, '');
          const padded = digits ? digits : String(idx + 153).padStart(4, '0');
          saudaNo = `BJCL/${sessionVal}/${padded}`;
        }

        const parseDateString = (dtStr: string) => {
          if (!dtStr) return new Date().toISOString().split('T')[0];
          const s = dtStr.trim();
          if (s.length >= 10 && s[4] === '-' && s[7] === '-') return s.slice(0, 10);
          if (s.includes('-')) {
            const parts = s.split('-');
            if (parts.length === 3) {
              if (parts[0].length === 2 && parts[2].length === 4) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            }
          }
          const d = new Date(s);
          return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        };

        const dateVal = parseDateString(cleanVal(r["Date"] || r["date"] || r["DATE"]));
        const shipmentDateVal = parseDateString(cleanVal(r["Shipment Date"] || r["shipment_date"] || r["SHIPMENT BY"] || dateVal));
        const bDateVal = parseDateString(cleanVal(r["Book Date"] || r["b_date"] || r["S. DATE"] || dateVal));

        const qualityVal = cleanVal(r["Quality"] || r["quality"] || r["QUALITY / GRADE"] || r["Grade"] || 'TD6').toUpperCase();
        const rsVal = parseFloat(cleanVal(r["Rs"] || r["rs"] || r["B. RATE"] || r["Rate"] || r["book_rate"] || '0')) || 0;
        const agencyVal = cleanVal(r["Agency"] || r["agency"] || r["AGENCY"] || r["Area"] || '').toUpperCase();
        const markaVal = cleanVal(r["Marka"] || r["marka"] || r["MARKA"] || r["Marks"] || '').toUpperCase();
        const qtyVal = parseFloat(cleanVal(r["Qty"] || r["qty"] || r["Quantity"] || '0')) || 0;

        if (!groupMap.has(saudaNo)) {
          let qJson = [];
          const rawQJson = cleanVal(r["Quality Details JSON"] || r["quality_details"]);
          if (rawQJson) {
            try {
              qJson = JSON.parse(rawQJson);
            } catch (e) {}
          }

          groupMap.set(saudaNo, {
            header: {
              financial_year: sessionVal,
              session: sessionVal,
              sauda_no: saudaNo,
              po_type: cleanVal(r["PO Type"] || r["po_type"] || r["P.O. TYPE"] || 'Normal'),
              date: dateVal,
              broker: cleanVal(r["Broker"] || r["broker"] || r["BROKER"]).toUpperCase(),
              supplier: cleanVal(r["Supplier"] || r["supplier"] || r["SUPPLIER"]).toUpperCase(),
              challan_supplier: cleanVal(r["Challan Supplier"] || r["challan_supplier"] || r["Supplier"] || r["supplier"]).toUpperCase(),
              area: cleanVal(r["Area"] || r["area"] || r["AREA / CENTER"]).toUpperCase(),
              agency: agencyVal,
              marks: markaVal,
              no_of_lorries: parseInt(cleanVal(r["No of Lorries"] || r["no_of_lorries"] || '1'), 10) || 1,
              units_per_lorry: parseFloat(cleanVal(r["Units Per Lorry"] || r["units_per_lorry"] || '80')) || 80,
              units_per_lorry_type: cleanVal(r["Units Per Lorry"] || r["units_per_lorry"] || '80'),
              total_unit: parseInt(cleanVal(r["Total Unit"] || r["total_unit"] || '160'), 10) || 160,
              wt_per_lorry: parseFloat(cleanVal(r["Wt Per Lorry"] || r["wt_per_lorry"] || '11.8')) || 11.8,
              unit_type: cleanVal(r["Unit Type"] || r["unit_type"] || 'BALES').toUpperCase() || 'BALES',
              total_wt_in_ton: parseFloat(cleanVal(r["Total Wt Ton"] || r["total_wt_in_ton"] || '23.6')) || 23.6,
              shipment_date: shipmentDateVal,
              shipment_days: parseInt(cleanVal(r["Shipment Days"] || r["shipment_days"] || '15'), 10) || 15,
              shipment_penalty: parseFloat(cleanVal(r["Shipment Penalty"] || r["shipment_penalty"] || '50')) || 50,
              marks_claim: parseFloat(cleanVal(r["Marks Claim"] || r["marks_claim"] || '0')) || 0,
              quantity_claim: parseFloat(cleanVal(r["Quantity Claim"] || r["quantity_claim"] || '0')) || 0,
              b_rate: parseFloat(cleanVal(r["Book Rate"] || r["b_rate"] || rsVal || '12500')) || 12500,
              b_date: bDateVal,
              superior_normal_marks: cleanVal(r["Superior Normal Marks"] || r["superior_normal_marks"] || 'New (F2)'),
              remarks: cleanVal(r["Remarks"] || r["remarks"] || 'Area, Agency Grade, Grade differential can change as per market.'),
              status: cleanVal(r["Status"] || r["status"] || 'PENDING').toUpperCase() || 'PENDING',
              approval_status: cleanVal(r["Status"] || r["status"] || 'PENDING').toUpperCase() || 'PENDING',
              quality_details_json: qJson
            },
            qualities: []
          });
        }

        const currentGroup = groupMap.get(saudaNo)!;
        if (qualityVal) {
          currentGroup.qualities.push({
            quality: qualityVal,
            rs: rsVal,
            agency: agencyVal || currentGroup.header.agency,
            marka: markaVal || currentGroup.header.marks,
            qty: qtyVal,
            agencies: agencyVal ? [agencyVal] : [],
            markas: markaVal ? [markaVal] : []
          });
        }
      });

      const totalGroups = groupMap.size;
      if (totalGroups === 0) {
        alert("No valid Sauda records could be parsed. Check column header names.");
        setIsImporting(false);
        return;
      }

      setImportStatusMessage(`Importing ${totalGroups} Sauda contracts into Supabase...`);

      let importedCount = 0;
      for (const [sNo, item] of groupMap.entries()) {
        const header = item.header;
        let finalQD = item.qualities;

        if (header.quality_details_json && header.quality_details_json.length > 0) {
          finalQD = header.quality_details_json;
        }

        delete header.quality_details_json;

        if (supabase) {
          const { data: existing } = await supabase.from('sauda_master').select('sauda_id').eq('sauda_no', sNo).maybeSingle();
          if (existing?.sauda_id) {
            header.sauda_id = existing.sauda_id;
            await dbModule.update('sauda_master', 'sauda_id', existing.sauda_id, header);
            await supabase.from('sauda_quality_details').delete().eq('sauda_id', existing.sauda_id);
          } else {
            const inserted = await dbModule.insert('sauda_master', header);
            if (inserted && inserted.sauda_id) {
              header.sauda_id = inserted.sauda_id;
            } else {
              const { data: fetched } = await supabase.from('sauda_master').select('sauda_id').eq('sauda_no', sNo).maybeSingle();
              if (fetched?.sauda_id) header.sauda_id = fetched.sauda_id;
            }
          }

          if (header.sauda_id && finalQD.length > 0) {
            for (const q of finalQD) {
              await dbModule.insert('sauda_quality_details', {
                sauda_id: header.sauda_id,
                sauda_no: sNo,
                financial_year: header.financial_year || '2026-2027',
                quality: q.quality || 'TD6',
                qty: q.qty || 0,
                agency: q.agency || header.agency || '',
                marka: q.marka || header.marks || '',
                rs: q.rs || header.b_rate || 0
              }).catch(() => {});
            }
          }
        }
        importedCount++;
      }

      alert(`✅ Success! Successfully imported ${importedCount} Sauda contracts (${rows.length} total detail rows) into Supabase!`);
      setIsImportModalOpen(false);
      setImportCsvText('');
      window.dispatchEvent(new CustomEvent('app-data-updated'));
      fetchSaudas();
    } catch (err: any) {
      console.error("Import error:", err);
      alert(`Import failed: ${err.message || String(err)}`);
    } finally {
      setIsImporting(false);
      setImportStatusMessage('');
    }
  };

  const fetchSaudas = async () => {
    setIsRefreshing(true);
    try {
      const [saudasData, posData, arrivalsData, scpData] = await Promise.all([
        dbModule.fetchAll('sauda_master', 'created_at', false).catch(async () => {
          return await dbModule.fetchAll('sauda_master').catch(async () => {
            if (supabase) {
              const { data } = await supabase.from('sauda_master').select('*').order('date', { ascending: false });
              return data || [];
            }
            return [];
          });
        }),
        dbModule.fetchAll('purchase_master').catch(() => []),
        dbModule.fetchAll('temporary_material_received', 'created_at', false).catch(() => []),
        dbModule.fetchAll('sauda_check_point').catch(() => [])
      ]);

      const mergedSaudas = (saudasData || []).map((rawSauda: any) => {
        const s = { ...rawSauda };
        const dbStatus = String(s.status || s.approval_status || '').toUpperCase();
        // If DB row was resubmitted (PENDING), ensure stale rejected_by is cleared
        if (dbStatus === 'PENDING' && s.rejected_by) {
          s.rejected_by = null;
          s.rejected_at = null;
        }

        const cleanKey = String(s.sauda_no || s.sauda_id || '').trim().toUpperCase();
        const idKey = s.sauda_id ? String(s.sauda_id).trim().toUpperCase() : '';
        if (cleanKey) {
          try {
            const cachedStr = localStorage.getItem(`sauda_check_status_${cleanKey}`);
            if (cachedStr) {
              const cachedObj = JSON.parse(cachedStr);
              const cachedStatus = String(cachedObj.status || cachedObj.approval_status || '').toUpperCase();
              const dbUpdatedTime = new Date(s.last_updated_at || s.submitted_at || 0).getTime();
              const cacheUpdatedTime = new Date(cachedObj.last_updated_at || cachedObj.rejected_at || cachedObj.approved_at || 0).getTime();

              // Discard stale REJECTED cache if DB shows PENDING resubmission or newer update
              const isStaleRejectedCache =
                cachedStatus === 'REJECTED' &&
                dbStatus === 'PENDING' &&
                (!s.rejected_by || (Number(s.resubmission_count) || 0) > 0 || (dbUpdatedTime > 0 && dbUpdatedTime >= cacheUpdatedTime));

              if (isStaleRejectedCache || dbStatus === 'APPROVED') {
                localStorage.removeItem(`sauda_check_status_${cleanKey}`);
                if (idKey) localStorage.removeItem(`sauda_check_status_${idKey}`);
                return s;
              }

              return { ...s, ...cachedObj };
            }
          } catch (_e) {}
        }
        return s;
      });

      setSaudaList(mergedSaudas);
      setPoList(posData || []);
      setArrivalsList(arrivalsData || []);
      setScpList(scpData || []);
    } catch(e) {
      console.error("fetchSaudas error:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useLiveAutoRefresh(() => {
    if (isActive) fetchSaudas();
  }, [isActive], { tables: ['sauda_master', 'sauda_quality_details', 'sms_sauda', 'purchase_master', 'temporary_material_received', 'sauda_check_point', 'sauda_check_point_details'] });

  useEffect(() => {
    initUserMap();
  }, []);

  const handleDelete = async (id: string) => {
    const target = saudaList.find(s => s.sauda_id === id || (s as any).id === id);
    if (target && isApprovedSauda(target)) {
      alert(`🔒 Permission Denied: Sauda #${target.sauda_no} has been approved by User 010 (Checker).\n\nPer company policy, once approved, this contract is PERMANENTLY LOCKED against deletion by ALL users.`);
      return;
    }
    if (target && isPendingUncheckedSauda(target)) {
      alert(`🔒 Permission Denied: Sauda #${target.sauda_no} is currently Pending Approval from User 010 and cannot be deleted.`);
      return;
    }

    if (!enforceEditOrDeletePermission("Delete")) {
      return;
    }

    if (confirm("Are you sure you want to delete this Sauda?")) {
      try {
        if (supabase) {
          await supabase.from('sauda_quality_details').delete().eq('sauda_id', id);
        }
        await dbModule.delete('sauda_master', 'sauda_id', id);
        alert("Sauda deleted permanently.");
        await fetchSaudas();
      } catch (e: any) {
        console.error("Delete Sauda error:", e);
        alert("Failed to delete Sauda: " + (e.message || e));
      }
    }
  };

  const handleEdit = async (sauda: Sauda) => {
    const brState = await getBaseRateApprovalState();
    setBaseRateApprovalState(brState);
    if (!brState.isApproved) {
      alert(BASE_RATE_APPROVAL_REQUIRED_MSG);
      return;
    }

    // Once approved by User 010, permanently locked against editing by all users!
    if (isApprovedSauda(sauda)) {
      alert(`🔒 Permission Denied: Sauda #${sauda.sauda_no} is approved by User 010 (Checker).\n\nPer company policy, once approved, this contract is PERMANENTLY LOCKED against editing by ALL users.`);
      return;
    }

    // Pending Approval cannot be edited by User 002
    if (isPendingUncheckedSauda(sauda)) {
      alert(`🔒 Permission Denied: Sauda #${sauda.sauda_no} is currently Pending Approval from User 010.\n\nIt cannot be edited until verified by the Checker.`);
      return;
    }

    if (isUser10) {
      alert(`🔒 Notice: User 010 (Checker) reviews contracts without directly modifying data. Please use the Approve or Reject buttons.`);
      return;
    }

    if (!enforceEditOrDeletePermission("Edit")) {
      return;
    }
    // Fetch quality details for this sauda if not already present
    try {
      if ((!sauda.quality_details || sauda.quality_details.length === 0) && sauda.sauda_id) {
        const { supabase } = await import('../lib/supabase.ts');
        if (supabase) {
           const { data } = await supabase.from('sauda_quality_details').select('*').eq('sauda_id', sauda.sauda_id);
           if (data && data.length > 0) {
             const sorted = (data || []).sort((a: any, b: any) => compareQualities(a.quality || '', b.quality || ''));
             sauda.quality_details = sorted;
           }
        }
      }
    } catch(e) { console.error("Could not fetch qualities", e); }
    
    setEditingSauda(sauda);
  };

  const handlePrint = async (sauda: Sauda) => {
    let fullSauda = { ...sauda };
    try {
      if ((!fullSauda.quality_details || fullSauda.quality_details.length === 0) && sauda.sauda_id) {
        const { supabase } = await import('../lib/supabase.ts');
        if (supabase) {
           const { data } = await supabase.from('sauda_quality_details').select('*').eq('sauda_id', sauda.sauda_id);
           if (data && data.length > 0) {
             const sorted = (data || []).sort((a: any, b: any) => compareQualities(a.quality || '', b.quality || ''));
             const fallbackQ = (sorted.find((s: any) => s.quality)?.quality) || (sauda as any).quality || 'TD5';
             const fallbackR = Number(sauda.b_rate) || Number(sorted.find((s: any) => s.rs && Number(s.rs) > 0)?.rs) || 13500;
             fullSauda.quality_details = sorted.map((s: any) => ({
               ...s,
               quality: s.quality || fallbackQ,
               rs: Number(s.rs) > 0 ? Number(s.rs) : fallbackR
             }));
           }
        }
      }
    } catch(e) { console.error("Could not fetch qualities", e); }
    
    setPrintingSauda(fullSauda);
  };

  const handleViewDetails = async (sauda: Sauda) => {
    let fullSauda = { ...sauda };
    setViewingDetailsSauda(fullSauda);
    try {
      if ((!fullSauda.quality_details || fullSauda.quality_details.length === 0) && sauda.sauda_id) {
        const { supabase } = await import('../lib/supabase.ts');
        if (supabase) {
          const { data } = await supabase.from('sauda_quality_details').select('*').eq('sauda_id', sauda.sauda_id);
          if (data && data.length > 0) {
            const sorted = (data || []).sort((a: any, b: any) => compareQualities(a.quality || '', b.quality || ''));
            const fallbackQ = (sorted.find((s: any) => s.quality)?.quality) || (sauda as any).quality || 'TD5';
            const fallbackR = Number(sauda.b_rate) || Number(sorted.find((s: any) => s.rs && Number(s.rs) > 0)?.rs) || 13500;
            fullSauda = {
              ...fullSauda,
              quality_details: sorted.map((s: any) => ({
                ...s,
                quality: s.quality || fallbackQ,
                rs: Number(s.rs) > 0 ? Number(s.rs) : fallbackR
              }))
            };
            setViewingDetailsSauda(fullSauda);
          }
        }
      }
    } catch (e) {
      console.error("Could not fetch qualities for preview", e);
    }
  };

  if (printingSauda) {
    const portalModal = (
      <div className="fixed inset-0 z-[200] bg-[#525659] flex flex-col print:bg-white print:static print:z-auto print-modal">
        <style>{`
          @media print {
            #root {
              display: none !important;
            }

            .no-print {
              display: none !important;
            }

            html, body {
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              max-height: none !important;
              background: white !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }

            .print-modal {
              position: static !important;
              background: white !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
            }

            @page {
              size: A5 portrait;
              margin: 0;
            }
          }
        `}</style>

        {/* Viewer Toolbar */}
        <div className="flex-none w-full bg-[#323639] shadow-md no-print">
          <div className="w-full px-3 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center">
            
            {isUser10 ? (
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <button
                  onClick={() => setPrintingSauda(null)}
                  className="p-1.5 sm:p-2 text-gray-300 hover:bg-white/10 rounded-full transition shrink-0"
                  title="Close Preview"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <span className="text-white font-medium text-xs sm:text-sm truncate">
                  Sauda Details # {printingSauda.sauda_no}
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <button
                    onClick={() => setPrintingSauda(null)}
                    className="p-1.5 sm:p-2 text-gray-300 hover:bg-white/10 rounded-full transition shrink-0"
                    title="Close Preview"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <span className="text-white font-medium text-xs sm:text-sm truncate">
                    Sauda_Contract_#{printingSauda.sauda_no}.pdf
                  </span>
                </div>

                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded shadow flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold transition shrink-0"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </>
            )}

          </div>
        </div>

        {/* Scrollable Canvas */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-8 flex justify-center items-start print:p-0 print:overflow-visible">
          <div className="w-full max-w-[148mm] flex justify-center">
            <SaudaPrintSlip sauda={printingSauda} />
          </div>
        </div>
      </div>
    );

    return createPortal(portalModal, document.body);
  }

  if (editingSauda) {
    return (
       <SaudaEntry 
         initialData={editingSauda} 
         onCancel={() => setEditingSauda(null)} 
         onSave={() => { setEditingSauda(null); fetchSaudas(); }} 
       />
    );
  }

  // Check if a Sauda contract has already been entered into Sauda Check Point or Final P.O.
  function isSaudaInCheckPointOrPo(s: Sauda) {
    if (!s) return false;
    const statusVal = String((s as any).status || '').toLowerCase();
    if (statusVal === 'completed' || statusVal === 'in_check_point' || statusVal === 'in_po' || statusVal === 'final') {
      return true;
    }

    const sId = String(s.sauda_id || (s as any).id || '').trim().toUpperCase();
    const sNo = String(s.sauda_no || '').trim().toUpperCase();
    const sSession = String(s.session || s.financial_year || '').trim().toUpperCase();
    const sDisplay = (formatPoNumber(s) || '').trim().toUpperCase();

    if (!sNo && !sId) return false;

    const getCleanDigits = (str: string) => {
      if (!str) return '';
      const clean = String(str).trim().toUpperCase();
      const withoutPrefix = clean
        .replace(/^BJCL\//i, '')
        .replace(/^BJC\//i, '')
        .replace(/^BJC/i, '')
        .replace(/^PO[-/]/i, '')
        .replace(/^PTF[-/]/i, '');
      const withoutYear = withoutPrefix
        .replace(/20\d{2}-20\d{2}/g, '')
        .replace(/20\d{2}\/20\d{2}/g, '')
        .replace(/20\d{2}20\d{2}/g, '')
        .replace(/\/\d{2}-\d{2}$/g, '')
        .replace(/^\d{2}-\d{2}\//g, '')
        .replace(/[^0-9A-Z]/g, '');
      return withoutYear.replace(/^0+/, '');
    };

    const sNoDigits = getCleanDigits(sNo);
    const sDisplayDigits = getCleanDigits(sDisplay);

    const allPoSources = [...(scpList || []), ...(poList || [])];

    return allPoSources.some(p => {
      if (!p) return false;
      const pSaudaId = String(p.sauda_id || p.sauda_id_ref || '').trim().toUpperCase();
      if (sId && pSaudaId && sId === pSaudaId) return true;

      const pPo = String(p.po_no || '').trim().toUpperCase();
      const pContract = String(p.contract_po_no || '').trim().toUpperCase();
      const pSaudaNo = String(p.sauda_no || p.po_contract || p.contract_no || '').trim().toUpperCase();
      const pPtf = String(p.ptf_no || '').trim().toUpperCase();

      const pTokens = [pPo, pContract, pSaudaNo, pPtf].filter(Boolean);
      if (pTokens.some(tok => tok === sNo || tok === sDisplay)) {
        return true;
      }

      if (sNoDigits && sNoDigits.length >= 2) {
        for (const tok of pTokens) {
          const tokDigits = getCleanDigits(tok);
          if (tokDigits && tokDigits === sNoDigits) {
            const pSession = String(p.session || p.financial_year || '').trim().toUpperCase();
            if (!sSession || !pSession || sSession === pSession || pSession.includes(sSession) || sSession.includes(pSession)) {
              return true;
            }
          }
        }
      }

      return false;
    });
  }

  // Function declaration (hoisted) so getSaudaStatusAndWeight can use it even when
  // called from the filter above — avoids a "before initialization" crash.
  function matchPoNo(po1: string, po2: string) {
    if (!po1 || !po2) return false;
    const p1 = po1.trim().toLowerCase();
    const p2 = po2.trim().toLowerCase();
    if (p1 === p2) return true;

    const clean1 = p1.replace(/[^a-z0-9]/g, '');
    const clean2 = p2.replace(/[^a-z0-9]/g, '');
    if (clean1 && clean1 === clean2) return true;

    const getCoreDigits = (str: string) => {
      const withoutPrefix = str
        .replace(/^bjcl\//i, '')
        .replace(/^bjc\//i, '')
        .replace(/^bjc/i, '')
        .replace(/^po[-/]/i, '')
        .replace(/^ptf[-/]/i, '');
      const withoutYear = withoutPrefix
        .replace(/20\d{2}-20\d{2}/g, '')
        .replace(/20\d{2}\/20\d{2}/g, '')
        .replace(/20\d{2}20\d{2}/g, '')
        .replace(/\/\d{2}-\d{2}$/g, '')
        .replace(/^\d{2}-\d{2}\//g, '')
        .replace(/[^0-9a-z]/g, '');
      return withoutYear.replace(/^0+/, '');
    };

    const d1 = getCoreDigits(p1);
    const d2 = getCoreDigits(p2);
    if (d1 && d2 && d1.length >= 2 && d1 === d2) {
      return true;
    }
    return false;
  }

  function getSaudaStatusAndWeight(s: Sauda) {
    const isMovedToCheckPoint = isSaudaInCheckPointOrPo(s);
    if (isMovedToCheckPoint) {
      return {
        status: 'completed',
        receivedWeight: 0,
        contractWeight: Number(s.total_wt_in_ton) || 0
      };
    }

    const saudaPoDisplayNo = formatPoNumber(s);
    
    const matchSaudaWithPo = (saudaNumStr: string, poNoStr: string, contractPoNoStr?: string) => {
      if (!saudaNumStr || !poNoStr) return false;
      const sNoClean = saudaNumStr.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
      if (!sNoClean) return false;

      const checkMatch = (p: string) => {
        const pUpper = p.trim().toUpperCase();
        if (pUpper === saudaNumStr.trim().toUpperCase()) return true;

        const pNoClean = pUpper.replace(/[^0-9A-Z]/g, '');
        let pNoDigits = pNoClean;
        pNoDigits = pNoDigits.replace(/20\d{2}20\d{2}/g, ''); // strip "20262027"
        pNoDigits = pNoDigits.replace(/\d{4}/g, ''); // strip remaining 4-digit blocks
        
        const cleanS = sNoClean.replace(/^0+/, '');
        const cleanP = pNoDigits.replace(/^0+/, '');

        if (cleanS && cleanP && cleanS === cleanP) {
          return true;
        }

        const regex = new RegExp(`(^|[^0-9A-Z])${sNoClean}([^0-9A-Z]|$)`);
        return regex.test(pUpper);
      };

      return checkMatch(poNoStr) || (contractPoNoStr ? checkMatch(contractPoNoStr) : false);
    };

    const matchedPos = poList.filter(p => {
      const pNo = String(p.po_no || '');
      const cpNo = String(p.contract_po_no || '');
      return (
        matchSaudaWithPo(String(s.sauda_no || ''), pNo, cpNo) ||
        matchSaudaWithPo(saudaPoDisplayNo, pNo, cpNo)
      );
    });

    let totalContractMt = 0;
    let totalReceivedMt = 0;
    let anyPoIsPending = false;

    // Check if arrivals has entries matching these POs
    matchedPos.forEach(p => {
      const contractWeight = parseFloat(p.total_contract_mt) || 0;
      totalContractMt += contractWeight;

      const matchingArrivals = (arrivalsList || []).filter((ar: any) => 
        matchPoNo(p.po_no, ar.po_no) || matchPoNo(p.contract_po_no, ar.po_no)
      );
      const poReceived = matchingArrivals.reduce((sum: number, ar: any) => {
        return sum + (Number(ar.weight_qtl || ar.weight || 0) / 10);
      }, 0);
      totalReceivedMt += poReceived;

      const isDbCompleted = p.pending === false || p.pending === 'No' || String(p.pending).toLowerCase() === 'false' || p.pending === 0;
      const isWeightCompleted = contractWeight > 0 && poReceived >= (contractWeight - 0.01);
      if (!(isDbCompleted || isWeightCompleted)) {
        anyPoIsPending = true;
      }
    });

    if (matchedPos.length === 0) {
      const isDbCompleted = s.status === 'completed';
      return {
        status: isDbCompleted ? 'completed' : 'pending',
        receivedWeight: 0,
        contractWeight: Number(s.total_wt_in_ton) || 0
      };
    }

    const isCompleted = !anyPoIsPending;
    const isPartial = !isCompleted && totalReceivedMt > 0;
    const status = isCompleted ? 'completed' : (isPartial ? 'partial' : 'pending');

    return {
      status,
      receivedWeight: totalReceivedMt,
      contractWeight: totalContractMt
    };
  }

  const filteredSaudas = saudaList.filter(s => {
    // If this Sauda has already moved to Sauda Check Point or Final P.O, hide it from Sauda Desk
    if (isSaudaInCheckPointOrPo(s)) return false;

    // Filtering by Status Tab
    if (statusTab === 'pending') {
      if (!isPendingUncheckedSauda(s)) return false;
    } else if (statusTab === 'checked' || statusTab === 'approved') {
      if (!isApprovedSauda(s)) return false;
    } else if (statusTab === 'rejected') {
      if (!isRejectedSauda(s)) return false;
    } else if (statusTab === 'drafts') {
      if (!isDraftSauda(s)) return false;
    } else if (statusTab === 'resubmitted') {
      if (!isResubmittedSauda(s)) return false;
    }

    const term = searchTerm.toLowerCase().trim();
    const saudaDisplayNo = (formatPoNumber(s) || '').toLowerCase();
    const matchesSearch = !term || 
      (s.sauda_no || '').toLowerCase().includes(term) ||
      (s.session || '').toLowerCase().includes(term) ||
      saudaDisplayNo.includes(term) ||
      (s.broker || '').toLowerCase().includes(term) || 
      (s.supplier || '').toLowerCase().includes(term) ||
      (s.challan_supplier || '').toLowerCase().includes(term) ||
      (s.marks || '').toLowerCase().includes(term) ||
      (s.area || '').toLowerCase().includes(term) ||
      (s.agency || '').toLowerCase().includes(term) ||
      (s.remarks || '').toLowerCase().includes(term) ||
      (s.rejection_remarks || '').toLowerCase().includes(term);
      
    if (!matchesSearch) return false;

    if (startDate && (!s.date || new Date(s.date) < new Date(startDate))) return false;
    if (endDate && (!s.date || new Date(s.date) > new Date(endDate))) return false;

    return true;
  }).sort((a, b) => new Date(b.date || (b as any).b_date || (b as any).created_at || 0).getTime() - new Date(a.date || (a as any).b_date || (a as any).created_at || 0).getTime());

  // Active Saudas strictly in Sauda Desk (not yet moved to Sauda Check Point)
  const activeSaudas = saudaList.filter(s => !isSaudaInCheckPointOrPo(s));
  const pendingSaudas = activeSaudas.filter(s => isPendingUncheckedSauda(s));
  const checkedSaudas = activeSaudas.filter(s => isApprovedSauda(s));
  const rejectedSaudas = activeSaudas.filter(s => isRejectedSauda(s));
  const draftSaudas = activeSaudas.filter(s => isDraftSauda(s));
  const resubmittedSaudas = activeSaudas.filter(s => isResubmittedSauda(s));

  const totalSaudas = activeSaudas.length;
  const pendingSaudasCount = pendingSaudas.length;
  const checkedSaudasCount = checkedSaudas.length;
  const rejectedSaudasCount = rejectedSaudas.length;
  const draftSaudasCount = draftSaudas.length;
  const resubmittedSaudasCount = resubmittedSaudas.length;

  const pendingWeightTons = pendingSaudas.reduce((acc, s) => acc + (Number(s.total_wt_in_ton) || 0), 0);
  const totalWeightTons = activeSaudas.reduce((acc, s) => acc + (Number(s.total_wt_in_ton) || 0), 0);
  const displayedWeightTons = filteredSaudas.reduce((acc, s) => acc + (Number(s.total_wt_in_ton) || 0), 0);
  const bookTotalValue = filteredSaudas.reduce((acc, s) => acc + (Number(s.b_rate || 0) * Number(s.total_wt_in_ton || 0)), 0);

  return (
    <LegacyLayout title="Sauda Desk" subtitle="Bally Jute Company Limited ERP Console" onClose={onClose}>
      <div className="space-y-4 relative pb-10 font-sans">
        {!baseRateApprovalState.isApproved && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 text-white p-2 rounded-lg shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-black text-amber-950 uppercase tracking-wide">
                  {BASE_RATE_APPROVAL_REQUIRED_MSG}
                </p>
                <p className="text-[11px] font-semibold text-amber-800 mt-0.5">
                  Latest Base Rate: <span className="font-black">₹{Number(baseRateApprovalState.currentBaseRate ?? baseRateApprovalState.currentRate ?? 0).toLocaleString('en-IN')}</span>
                  {(baseRateApprovalState.previousBaseRate ?? baseRateApprovalState.previousRate) ? ` (Prev: ₹${Number(baseRateApprovalState.previousBaseRate ?? baseRateApprovalState.previousRate ?? 0).toLocaleString('en-IN')})` : ''}
                  {' • '}Updated By: <span className="font-black">{baseRateApprovalState.updatedByDisplay || 'User'}</span>
                  {' • '}Status: <span className="font-black text-amber-900">Pending Approval (User 010)</span>
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-amber-200/80 border border-amber-400 text-[10px] font-black text-amber-950 uppercase tracking-wider shrink-0">
              Sauda Operations Locked
            </span>
          </div>
        )}

        {/* 1. Maker-Checker Dedicated Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total Sauda Entries */}
          <div 
            onClick={() => setStatusTab('all')}
            className={cn(
              "rounded-[18px] border p-3.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between cursor-pointer",
              statusTab === 'all'
                ? "bg-gradient-to-br from-blue-100 via-white to-blue-50 border-blue-400 ring-2 ring-blue-300"
                : "bg-gradient-to-br from-blue-50 via-white to-indigo-50/60 border-blue-200"
            )}
          >
            <div>
              <p className="text-2xl font-black text-blue-950 tracking-tight font-mono">{totalSaudas}</p>
              <p className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider mt-0.5">Total Sauda Entries</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold text-blue-700 bg-blue-100 rounded-md border border-blue-200/60">
                All Records
              </span>
            </div>
            <div className="p-2.5 bg-blue-100/80 border border-blue-200 rounded-xl text-blue-600 shadow-xs">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>

          {/* Card 2: User 010 shows Pending Approval, User 002 shows Drafts */}
          {isUser10 ? (
            <div 
              onClick={() => setStatusTab('pending')}
              className={cn(
                "rounded-[18px] border p-3.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between cursor-pointer",
                statusTab === 'pending'
                  ? "bg-gradient-to-br from-amber-100 via-white to-amber-50 border-amber-400 ring-2 ring-amber-300"
                  : "bg-gradient-to-br from-amber-50 via-white to-amber-50/60 border-amber-200"
              )}
            >
              <div>
                <p className="text-2xl font-black text-amber-950 tracking-tight font-mono">{pendingSaudasCount}</p>
                <p className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider mt-0.5">Pending Approval</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold text-amber-800 bg-amber-100 rounded-md border border-amber-200/60">
                  Awaiting Review
                </span>
              </div>
              <div className="p-2.5 bg-amber-100/80 border border-amber-200 rounded-xl text-amber-600 shadow-xs">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          ) : (
            <div 
              onClick={() => setStatusTab('drafts')}
              className={cn(
                "rounded-[18px] border p-3.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between cursor-pointer",
                statusTab === 'drafts'
                  ? "bg-gradient-to-br from-slate-200 via-white to-slate-100 border-slate-400 ring-2 ring-slate-300"
                  : "bg-gradient-to-br from-slate-50 via-white to-slate-100/60 border-slate-200"
              )}
            >
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">{draftSaudasCount}</p>
                <p className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mt-0.5">Draft Entries</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold text-slate-700 bg-slate-100 rounded-md border border-slate-200/60">
                  Unsubmitted
                </span>
              </div>
              <div className="p-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-slate-600 shadow-xs">
                <Edit className="h-5 w-5" />
              </div>
            </div>
          )}

          {/* Card 3: User 010 shows Approved Entries, User 002 shows Pending Approval */}
          {isUser10 ? (
            <div 
              onClick={() => setStatusTab('approved')}
              className={cn(
                "rounded-[18px] border p-3.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between cursor-pointer",
                (statusTab === 'approved' || statusTab === 'checked')
                  ? "bg-gradient-to-br from-emerald-100 via-white to-emerald-50 border-emerald-400 ring-2 ring-emerald-300"
                  : "bg-gradient-to-br from-emerald-50 via-white to-emerald-50/60 border-emerald-200"
              )}
            >
              <div>
                <p className="text-2xl font-black text-emerald-950 tracking-tight font-mono">{checkedSaudasCount}</p>
                <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider mt-0.5">Approved Entries</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-100 rounded-md border border-emerald-200/60">
                  Permanently Locked
                </span>
              </div>
              <div className="p-2.5 bg-emerald-100/80 border border-emerald-200 rounded-xl text-emerald-600 shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          ) : (
            <div 
              onClick={() => setStatusTab('pending')}
              className={cn(
                "rounded-[18px] border p-3.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between cursor-pointer",
                statusTab === 'pending'
                  ? "bg-gradient-to-br from-amber-100 via-white to-amber-50 border-amber-400 ring-2 ring-amber-300"
                  : "bg-gradient-to-br from-amber-50 via-white to-amber-50/60 border-amber-200"
              )}
            >
              <div>
                <p className="text-2xl font-black text-amber-950 tracking-tight font-mono">{pendingSaudasCount}</p>
                <p className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider mt-0.5">Pending Approval</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold text-amber-800 bg-amber-100 rounded-md border border-amber-200/60">
                  Submitted to 010
                </span>
              </div>
              <div className="p-2.5 bg-amber-100/80 border border-amber-200 rounded-xl text-amber-600 shadow-xs">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          )}

          {/* Card 4: Rejected Entries */}
          <div 
            onClick={() => setStatusTab('rejected')}
            className={cn(
              "rounded-[18px] border p-3.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between cursor-pointer",
              statusTab === 'rejected'
                ? "bg-gradient-to-br from-rose-100 via-white to-rose-50 border-rose-400 ring-2 ring-rose-300"
                : "bg-gradient-to-br from-rose-50 via-white to-rose-50/60 border-rose-200"
            )}
          >
            <div>
              <p className="text-2xl font-black text-rose-950 tracking-tight font-mono">{rejectedSaudasCount}</p>
              <p className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider mt-0.5">Rejected Entries</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold text-rose-800 bg-rose-100 rounded-md border border-rose-200/60">
                {isUser10 ? "Returned to Maker" : "Needs Correction"}
              </span>
            </div>
            <div className="p-2.5 bg-rose-100/80 border border-rose-200 rounded-xl text-rose-600 shadow-xs">
              <X className="h-5 w-5" />
            </div>
          </div>

          {/* Card 5: User 010 shows Resubmitted Entries, User 002 shows Approved Entries */}
          {isUser10 ? (
            <div 
              onClick={() => setStatusTab('resubmitted')}
              className={cn(
                "rounded-[18px] border p-3.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between cursor-pointer",
                statusTab === 'resubmitted'
                  ? "bg-gradient-to-br from-purple-100 via-white to-purple-50 border-purple-400 ring-2 ring-purple-300"
                  : "bg-gradient-to-br from-purple-50 via-white to-purple-50/60 border-purple-200"
              )}
            >
              <div>
                <p className="text-2xl font-black text-purple-950 tracking-tight font-mono">{resubmittedSaudasCount}</p>
                <p className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider mt-0.5">Resubmitted Entries</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold text-purple-800 bg-purple-100 rounded-md border border-purple-200/60">
                  Corrected by 002
                </span>
              </div>
              <div className="p-2.5 bg-purple-100/80 border border-purple-200 rounded-xl text-purple-600 shadow-xs">
                <RefreshCcw className="h-5 w-5" />
              </div>
            </div>
          ) : (
            <div 
              onClick={() => setStatusTab('approved')}
              className={cn(
                "rounded-[18px] border p-3.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between cursor-pointer",
                (statusTab === 'approved' || statusTab === 'checked')
                  ? "bg-gradient-to-br from-emerald-100 via-white to-emerald-50 border-emerald-400 ring-2 ring-emerald-300"
                  : "bg-gradient-to-br from-emerald-50 via-white to-emerald-50/60 border-emerald-200"
              )}
            >
              <div>
                <p className="text-2xl font-black text-emerald-950 tracking-tight font-mono">{checkedSaudasCount}</p>
                <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider mt-0.5">Approved Entries</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-100 rounded-md border border-emerald-200/60">
                  Permanently Locked
                </span>
              </div>
              <div className="p-2.5 bg-emerald-100/80 border border-emerald-200 rounded-xl text-emerald-600 shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          )}
        </div>

        {/* 2. Search & Action Toolbar Section */}
        <div className="bg-white border border-slate-200 rounded-[18px] p-3 shadow-xs flex flex-wrap items-center gap-3 justify-between">
          {/* Left: Search Box */}
          <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              id="search_broker_or_supplier_830" 
              name="search_broker_or_supplier" 
              aria-label="Search Broker or Supplier..."
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F7AFA8]/20 focus:border-[#F7AFA8] transition-all" 
              placeholder="Search Broker or Supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Date Filters & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">From</span>
              <input 
                id="startdate_843" 
                name="startdate" 
                aria-label="startdate"
                type="date" 
                className="bg-transparent font-medium text-slate-700 outline-none text-xs" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">To</span>
              <input 
                id="enddate_853" 
                name="enddate" 
                aria-label="enddate"
                type="date" 
                className="bg-transparent font-medium text-slate-700 outline-none text-xs" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
              />
            </div>

            <button 
              onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }}
              className="px-2.5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center gap-1 transition-all cursor-pointer active:scale-95" 
              title="Clear search and filter"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>

            <button 
              onClick={fetchSaudas}
              disabled={isRefreshing}
              className="px-2.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Refresh Sauda database"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Buttons Moved Beside Search Section: New Sauda, Print Book, Export, Import, Audit Trail */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {!isUser10 && (
              <button
                onClick={async () => {
                  const brState = await getBaseRateApprovalState();
                  setBaseRateApprovalState(brState);
                  if (!brState.isApproved) {
                    alert(BASE_RATE_APPROVAL_REQUIRED_MSG);
                    return;
                  }
                  if (onNew) onNew();
                }}
                className="bg-[#F7AFA8] hover:bg-[#D94B5A] text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-[#FBCFCB]"
              >
                <Plus className="h-4 w-4 text-[#FDE7E6]" />
                <span>New Sauda</span>
              </button>
            )}

            <button
              onClick={() => {
                if (selectedSaudaId) {
                  const sauda = saudaList.find(s => s.sauda_id === selectedSaudaId);
                  if (sauda) handlePrint(sauda);
                } else {
                  setPrintingBook(true);
                }
              }}
              className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#D94B5A] border border-slate-300 hover:border-[#F7AFA8] px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Print Book</span>
            </button>

            <button
              onClick={() => {
                setAuditRecordId(undefined);
                setAuditModalOpen(true);
              }}
              className="bg-white hover:bg-slate-50 text-slate-700 hover:text-[#D94B5A] border border-slate-300 hover:border-[#F7AFA8] px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="View Universal Audit Trail for Sauda Contracts"
            >
              <History className="h-4 w-4 text-[#D94B5A]" />
              <span>Audit Trail</span>
            </button>

            {/* Quick Section Switchers Beside Search */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 shrink-0 gap-1 flex-wrap">
              {isUser10 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setStatusTab('pending')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1",
                      statusTab === 'pending'
                        ? "bg-[#D94B5A] text-white shadow-2xs"
                        : "text-slate-700 hover:bg-slate-200"
                    )}
                    title="Pending Approval - Awaiting Verification"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pending Approval</span>
                    <span className="text-[10px] font-mono opacity-90">({pendingSaudasCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusTab('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1",
                      statusTab === 'all'
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "text-slate-700 hover:bg-slate-200"
                    )}
                    title="All Registered Contracts"
                  >
                    <span>All Contracts</span>
                    <span className="text-[10px] font-mono opacity-80">({totalSaudas})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusTab('approved')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1",
                      (statusTab === 'approved' || statusTab === 'checked')
                        ? "bg-emerald-800 text-white shadow-2xs"
                        : "text-emerald-800 hover:bg-emerald-100/60"
                    )}
                    title="Approved Entries (Permanently Locked)"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approved</span>
                    <span className="text-[10px] font-mono opacity-80">({checkedSaudasCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusTab('rejected')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1",
                      statusTab === 'rejected'
                        ? "bg-rose-800 text-white shadow-2xs"
                        : "text-rose-800 hover:bg-rose-100/60"
                    )}
                    title="Rejected Entries"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Rejected</span>
                    <span className="text-[10px] font-mono opacity-80">({rejectedSaudasCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusTab('resubmitted')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1",
                      statusTab === 'resubmitted'
                        ? "bg-purple-800 text-white shadow-2xs"
                        : "text-purple-800 hover:bg-purple-100/60"
                    )}
                    title="Resubmitted Entries by User 002"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    <span>Resubmitted</span>
                    <span className="text-[10px] font-mono opacity-80">({resubmittedSaudasCount})</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setStatusTab('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1",
                      statusTab === 'all'
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "text-slate-700 hover:bg-slate-200"
                    )}
                    title="All Registered Contracts"
                  >
                    <span>All Contracts</span>
                    <span className="text-[10px] font-mono opacity-80">({totalSaudas})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusTab('drafts')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1",
                      statusTab === 'drafts'
                        ? "bg-slate-800 text-white shadow-2xs"
                        : "text-slate-700 hover:bg-slate-200"
                    )}
                    title="Draft Entries (Editable)"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Drafts</span>
                    <span className="text-[10px] font-mono opacity-80">({draftSaudasCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusTab('pending')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1",
                      statusTab === 'pending'
                        ? "bg-amber-600 text-white shadow-2xs"
                        : "text-amber-800 hover:bg-amber-100/60"
                    )}
                    title="Pending Approval (Awaiting User 010)"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pending Approval</span>
                    <span className="text-[10px] font-mono opacity-80">({pendingSaudasCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusTab('rejected')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1",
                      statusTab === 'rejected'
                        ? "bg-rose-800 text-white shadow-2xs"
                        : "text-rose-800 hover:bg-rose-100/60"
                    )}
                    title="Rejected Entries (Edit & Resubmit)"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Rejected</span>
                    <span className="text-[10px] font-mono opacity-80">({rejectedSaudasCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusTab('approved')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1",
                      (statusTab === 'approved' || statusTab === 'checked')
                        ? "bg-emerald-800 text-white shadow-2xs"
                        : "text-emerald-800 hover:bg-emerald-100/60"
                    )}
                    title="Approved Entries (Permanently Locked)"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approved</span>
                    <span className="text-[10px] font-mono opacity-80">({checkedSaudasCount})</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 4. Data Table */}
        <div className="bg-white border border-[#CBD5E1] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] min-h-[400px]">
            <table className={cn("w-full border-collapse text-xs text-[#111111]", isUser10 ? "min-w-[600px]" : "min-w-[1380px]")}>
              <thead className="bg-[#FDE7E6] border-b-2 border-[#D94B5A] sticky top-0 z-20 shadow-2xs font-black">
                <tr className="h-10 text-[11px] sm:text-[12px] font-black text-[#111111] uppercase tracking-wider">
                  <th className={cn("py-2.5 text-center whitespace-nowrap min-w-[110px]", isUser10 ? "px-2" : "px-3")}>Date</th>
                  <th className={cn("py-2.5 text-center whitespace-nowrap min-w-[120px]", isUser10 ? "px-2" : "px-3")}>Order No.</th>
                  {!isUser10 && <th className="px-3 py-2.5 text-center whitespace-nowrap min-w-[100px]">Session</th>}
                  <th className={cn("py-2.5 text-left whitespace-nowrap min-w-[180px]", isUser10 ? "px-2" : "px-4")}>Broker</th>
                  {!isUser10 && <th className="px-4 py-2.5 text-left whitespace-nowrap min-w-[220px]">Supplier</th>}
                  {!isUser10 && <th className="px-3 py-2.5 text-center whitespace-nowrap min-w-[110px]">Units/Lorry</th>}
                  {!isUser10 && <th className="px-3 py-2.5 text-center whitespace-nowrap min-w-[100px] bg-[#FFF2CC] text-[#92400E] font-black">Unit</th>}
                  {!isUser10 && <th className="px-4 py-2.5 text-right whitespace-nowrap min-w-[120px] bg-blue-50 text-blue-950 font-black">B. Rate</th>}
                  <th className={cn("py-2.5 text-center whitespace-nowrap min-w-[150px]", isUser10 ? "px-2" : "px-3")}>Status</th>
                  <th className={cn("py-2.5 text-center whitespace-nowrap min-w-[130px]", isUser10 ? "px-1" : "px-3")}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredSaudas.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((entry, idx) => {
                  const isSelected = selectedSaudaId === entry.sauda_id;
                  const canSeeActions = true;
                  const isChecked = isApprovedSauda(entry);
                  const isPending = isPendingUncheckedSauda(entry);
                  const isRejected = isRejectedSauda(entry);
                  const isDraft = isDraftSauda(entry);
                  const isResubmitted = isResubmittedSauda(entry);
                  const userCtx = getCurrentUserContext();
                  const checkerName = resolveDisplayName(entry.approved_by || entry.checked_by || (isChecked ? userCtx.userName : null), 'Checker (User 010)');
                  const rejectorName = resolveDisplayName(entry.rejected_by || (isRejected ? userCtx.userName : null), 'Checker (User 010)');

                  return (
                    <tr 
                      key={entry.sauda_id} 
                      onClick={() => setSelectedSaudaId(entry.sauda_id!)}
                      onDoubleClick={() => {
                        if (isChecked || isPending) {
                          handleViewDetails(entry);
                          return;
                        }
                        if (isRejected || isDraft) {
                          if (isUser2 || isUserAdmin()) {
                            handleEdit(entry);
                          } else {
                            handleViewDetails(entry);
                          }
                          return;
                        }
                        if (canEditSaudaContract(entry)) {
                          handleEdit(entry);
                        } else {
                          handleViewDetails(entry);
                        }
                      }}
                      className={cn(
                        "h-10 cursor-pointer transition-colors text-xs font-medium", 
                        isSelected 
                          ? "bg-[#D94B5A] text-white" 
                          : (idx % 2 === 0 ? "bg-white hover:bg-amber-50/50" : "bg-slate-50/40 hover:bg-amber-50/50")
                      )}
                    >
                      <td className={cn("text-center font-mono text-[11px] whitespace-nowrap", isUser10 ? "px-2" : "px-3", isSelected ? "text-white" : "text-slate-500")}>
                        {new Date(entry.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className={cn("text-center font-bold whitespace-nowrap", isUser10 ? "px-2" : "px-3", isSelected ? "text-amber-300" : "text-slate-900")}>
                        #{entry.sauda_no}
                      </td>
                      {!isUser10 && (
                        <td className={cn("px-3 text-center text-[10px] font-mono", isSelected ? "text-emerald-100" : "text-slate-500")}>
                          {entry.session}
                        </td>
                      )}
                      <td 
                        className={cn("font-bold uppercase text-xs truncate overflow-hidden min-w-[180px] max-w-[240px] px-3.5 py-2.5 border-r border-[#CBD5E1]", isSelected ? "text-white" : "text-[#111111]")}
                        title={entry.broker}
                      >
                        {entry.broker || '-'}
                      </td>
                      {!isUser10 && (
                        <td 
                          className={cn("font-bold uppercase text-xs truncate overflow-hidden min-w-[220px] max-w-[280px] px-3.5 py-2.5 border-r border-[#CBD5E1]", isSelected ? "text-white" : "text-[#262626]")}
                          title={entry.supplier}
                        >
                          {entry.supplier || '-'}
                        </td>
                      )}
                      {!isUser10 && (
                        <td className="px-3 text-center text-slate-700 font-mono font-semibold">
                          {entry.units_per_lorry !== undefined && entry.units_per_lorry !== null && entry.units_per_lorry !== ''
                            ? entry.units_per_lorry 
                            : (entry.units_per_lorry_type && !isNaN(Number(entry.units_per_lorry_type)) ? entry.units_per_lorry_type : '-')}
                        </td>
                      )}
                      {!isUser10 && (
                        <td className="px-3 text-center font-bold font-mono">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] uppercase font-black tracking-wide",
                            isSelected
                              ? "bg-amber-400 text-slate-950"
                              : String(entry.unit_type || '').toUpperCase().includes('DRUM')
                                ? "bg-purple-100 text-purple-900 border border-purple-300"
                                : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          )}>
                            {entry.unit_type || 'BALES'}
                          </span>
                        </td>
                      )}
                      {!isUser10 && (
                        <td className={cn("px-4 text-right font-black font-mono", isSelected ? "text-amber-300 bg-[#123e24]" : "text-rose-700 bg-rose-50/30")}>
                          ₹{Number(entry.b_rate).toLocaleString()}
                        </td>
                      )}
                      <td className="px-3 text-center">
                        <div className="flex flex-col items-center justify-center gap-1 py-1">
                          {isChecked ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                                <span>Approved</span>
                                <Lock className="w-3 h-3 text-emerald-200" />
                              </span>
                              {checkerName && (
                                <span className={cn(
                                  "text-[8.5px] font-extrabold px-1.5 py-0.2 rounded tracking-tight text-center truncate max-w-[130px]",
                                  isSelected ? "bg-emerald-900 text-amber-300" : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                )}>
                                  ✓ {checkerName}
                                </span>
                              )}
                              <span className={cn(
                                "text-[7.5px] font-black uppercase tracking-widest flex items-center gap-0.5",
                                isSelected ? "text-amber-200" : "text-emerald-700"
                              )}>
                                <Lock className="w-2 h-2" /> Permanently Locked
                              </span>
                            </div>
                          ) : isRejected ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                                <X className="w-3.5 h-3.5 text-white" />
                                <span>Rejected</span>
                              </span>
                              {rejectorName && (
                                <span className={cn(
                                  "text-[8.5px] font-extrabold px-1.5 py-0.2 rounded tracking-tight text-center truncate max-w-[130px]",
                                  isSelected ? "bg-rose-950 text-rose-200" : "bg-rose-100 text-rose-900 border border-rose-200"
                                )}>
                                  By: {rejectorName}
                                </span>
                              )}
                              {entry.rejection_remarks && (
                                <span
                                  title={`Rejection reason: ${entry.rejection_remarks}`}
                                  className={cn(
                                    "text-[8.5px] font-semibold max-w-[130px] truncate underline cursor-help",
                                    isSelected ? "text-rose-200" : "text-rose-700"
                                  )}
                                >
                                  "{entry.rejection_remarks}"
                                </span>
                              )}
                              {isUser2 && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}
                                  className="mt-0.5 px-2 py-0.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[9px] rounded uppercase tracking-wide cursor-pointer shadow-xs flex items-center gap-1"
                                  title="Edit rejected entry and resubmit for approval"
                                >
                                  <Edit className="w-2.5 h-2.5" />
                                  <span>Edit & Resubmit</span>
                                </button>
                              )}
                            </div>
                          ) : isDraft ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-800 border border-slate-300 shadow-xs">
                                <FileText className="w-3 h-3 text-slate-600" />
                                <span>Draft</span>
                              </span>
                              <span className={cn(
                                "text-[8px] font-bold uppercase tracking-wider",
                                isSelected ? "text-amber-200" : "text-slate-500"
                              )}>
                                Not Submitted
                              </span>
                              {isUser2 && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}
                                  className="mt-0.5 px-2 py-0.5 bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300 font-extrabold text-[9px] rounded uppercase tracking-wide cursor-pointer flex items-center gap-1"
                                >
                                  <Edit className="w-2.5 h-2.5" />
                                  <span>Edit Draft</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            /* PENDING APPROVAL */
                            <div className="flex flex-col items-center justify-center gap-1">
                              {isResubmitted && (
                                <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-2xs">
                                  Resubmitted (v{(entry.resubmission_count || 0) + 1})
                                </span>
                              )}

                              {isUser10 ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleMarkCheck(entry); }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-all cursor-pointer"
                                    title="Review & Approve Sauda (Confirmation Dialog)"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-amber-300" />
                                    <span>Approve</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleMarkReject(entry); }}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 hover:bg-rose-600 hover:text-white border border-rose-300 shadow-xs transition-all cursor-pointer"
                                    title="Reject Sauda (Mandatory Remarks)"
                                  >
                                    <X className="w-3 h-3 text-rose-600" />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                                    <span>Pending Approval</span>
                                  </span>
                                  <span className={cn(
                                    "text-[8px] font-bold uppercase tracking-wider",
                                    isSelected ? "text-amber-200" : "text-amber-800"
                                  )}>
                                    Under Review (User 010)
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      {canSeeActions && (
                        <td className="px-3 text-center relative">
                          {isUser10 ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(entry);
                                }}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all cursor-pointer shadow-2xs inline-flex items-center justify-center",
                                  isSelected
                                    ? "bg-white/20 text-white hover:bg-white/30"
                                    : "bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-slate-900 border border-slate-300"
                                )}
                                title="View Complete Sauda Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrint(entry);
                                }}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all cursor-pointer shadow-2xs inline-flex items-center justify-center",
                                  isSelected
                                    ? "bg-white/20 text-amber-300 hover:bg-white/30"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                                )}
                                title="Print Sauda Slip"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAuditRecordId(entry.sauda_id || entry.sauda_no);
                                  setAuditModalOpen(true);
                                }}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all cursor-pointer shadow-2xs inline-flex items-center justify-center",
                                  isSelected
                                    ? "bg-white/20 text-white hover:bg-white/30"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                                )}
                                title="View Approval & Rejection Audit History"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionDropdownId(openActionDropdownId === entry.sauda_id ? null : (entry.sauda_id || null));
                                }}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 transition-all cursor-pointer shadow-xs",
                                  isSelected 
                                    ? "bg-white/20 text-white border-white/30 hover:bg-white/30" 
                                    : "bg-slate-100 text-slate-800 border-slate-300 hover:bg-amber-100 hover:border-amber-400"
                                )}
                              >
                                <span>Actions</span>
                                <ChevronDown className="w-3 h-3" />
                              </button>

                              {openActionDropdownId === entry.sauda_id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-20" 
                                    onClick={(e) => { e.stopPropagation(); setOpenActionDropdownId(null); }} 
                                  />
                                  <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-300 rounded-xl shadow-xl z-30 py-1 font-sans text-xs divide-y divide-slate-100 animate-in fade-in duration-100 text-left">
                                    {/* View Details */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenActionDropdownId(null);
                                        handleViewDetails(entry);
                                      }}
                                      className="w-full px-3 py-1.5 text-left text-slate-800 hover:bg-slate-100 font-bold flex items-center gap-2 cursor-pointer"
                                      title="View Complete Sauda Details"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                      <span>View Details</span>
                                    </button>

                                    {/* Edit / Resubmit */}
                                    {isChecked ? (
                                      <div
                                        className="w-full px-3 py-1.5 text-left text-slate-400 bg-slate-50/80 font-medium flex items-center justify-between gap-2 cursor-not-allowed"
                                        title="Permanently locked: Approved by User 010. Locked for all users."
                                      >
                                        <div className="flex items-center gap-2">
                                          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span className="text-slate-500">Edit</span>
                                        </div>
                                        <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                          <Lock className="w-2.5 h-2.5" /> Locked
                                        </span>
                                      </div>
                                    ) : isPending ? (
                                      <div
                                        className="w-full px-3 py-1.5 text-left text-slate-400 bg-slate-50/80 font-medium flex items-center justify-between gap-2 cursor-not-allowed"
                                        title="Read-only: Sauda is pending approval by User 010."
                                      >
                                        <div className="flex items-center gap-2">
                                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                          <span className="text-slate-500">Edit</span>
                                        </div>
                                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                                          In Review
                                        </span>
                                      </div>
                                    ) : isRejected ? (
                                      (isUser2 || isUserAdmin()) && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenActionDropdownId(null);
                                            handleEdit(entry);
                                          }}
                                          className="w-full px-3 py-1.5 text-left text-amber-900 bg-amber-50/50 hover:bg-amber-100 font-extrabold flex items-center gap-2 cursor-pointer"
                                          title="Correct errors and resubmit to User 010"
                                        >
                                          <Edit className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                          <span>Edit & Resubmit</span>
                                        </button>
                                      )
                                    ) : (
                                      /* Draft */
                                      (isUser2 || isUserAdmin()) && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenActionDropdownId(null);
                                            handleEdit(entry);
                                          }}
                                          className="w-full px-3 py-1.5 text-left text-slate-800 hover:bg-slate-100 font-bold flex items-center gap-2 cursor-pointer"
                                          title="Edit Draft Sauda"
                                        >
                                          <Edit className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                          <span>Edit Draft</span>
                                        </button>
                                      )
                                    )}

                                    {/* Delete */}
                                    {isChecked ? (
                                      <div
                                        className="w-full px-3 py-1.5 text-left text-slate-400 bg-slate-50/80 font-medium flex items-center justify-between gap-2 cursor-not-allowed"
                                        title="Permanently locked: Approved contracts cannot be deleted."
                                      >
                                        <div className="flex items-center gap-2">
                                          <Trash2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span className="text-slate-400">Delete</span>
                                        </div>
                                        <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded">
                                          Locked
                                        </span>
                                      </div>
                                    ) : isPending ? (
                                      <div
                                        className="w-full px-3 py-1.5 text-left text-slate-400 bg-slate-50/80 font-medium flex items-center justify-between gap-2 cursor-not-allowed"
                                        title="Cannot delete while pending approval."
                                      >
                                        <div className="flex items-center gap-2">
                                          <Trash2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span className="text-slate-400">Delete</span>
                                        </div>
                                        <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded">
                                          In Review
                                        </span>
                                      </div>
                                    ) : (
                                      (isDraft || isRejected) && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenActionDropdownId(null);
                                            handleDelete(entry.sauda_id!);
                                          }}
                                          className="w-full px-3 py-1.5 text-left text-rose-700 hover:bg-rose-50 font-bold flex items-center gap-2 cursor-pointer"
                                          title="Delete Sauda"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                          <span>Delete</span>
                                        </button>
                                      )
                                    )}

                                    {/* Audit History */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenActionDropdownId(null);
                                        setAuditRecordId(entry.sauda_id || entry.sauda_no);
                                        setAuditModalOpen(true);
                                      }}
                                      className="w-full px-3 py-1.5 text-left text-slate-800 hover:bg-slate-100 font-bold flex items-center gap-2 cursor-pointer"
                                      title="View Approval & Rejection Audit History"
                                    >
                                      <History className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                      <span>Audit History</span>
                                    </button>

                                    {/* Print */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenActionDropdownId(null);
                                        handlePrint(entry);
                                      }}
                                      className="w-full px-3 py-1.5 text-left text-slate-800 hover:bg-slate-100 font-bold flex items-center gap-2 cursor-pointer"
                                      title="Print Sauda Slip"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                      <span>Print</span>
                                    </button>

                                    {/* Mail */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenActionDropdownId(null);
                                        handleSendMail(entry);
                                      }}
                                      className="w-full px-3 py-1.5 text-left text-indigo-700 hover:bg-indigo-50 font-bold flex items-center gap-2 cursor-pointer"
                                      title="Send Mail"
                                    >
                                      <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      <span>Mail</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredSaudas.length === 0 && (
                  <tr>
                    <td colSpan={isUser10 ? 5 : 10} className="py-14 text-center text-slate-500 bg-slate-50/50">
                      <div className="flex flex-col items-center justify-center space-y-2.5">
                        <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                          <ClipboardList className="h-8 w-8 text-[#D94B5A]" />
                        </div>
                        <p className="font-bold text-sm text-slate-700">
                          {statusTab === 'pending'
                            ? "No Active Pending Saudas"
                            : "No Sauda Records Found"}
                        </p>
                        <p className="text-xs text-slate-500 max-w-md">
                          {statusTab === 'pending'
                            ? "All registered Saudas have been entered and moved to Sauda Check Point. Only uncompleted / pending Saudas will appear here."
                            : "No Sauda contracts match the selected search or date criteria."}
                        </p>
                        {statusTab === 'pending' && totalSaudas > 0 && (
                          <button
                            type="button"
                            onClick={() => setStatusTab('all')}
                            className="mt-1 px-4 py-2 bg-white border border-slate-300 hover:border-[#F7AFA8] hover:bg-emerald-50/40 rounded-xl text-xs font-bold text-[#D94B5A] transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                          >
                            <span>View All Saudas History ({totalSaudas})</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <PaginationControls
            currentPage={currentPage}
            totalItems={filteredSaudas.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />

          {/* Quick Summary Footer Bar inside Card */}
          <div className="bg-slate-50 border-t border-slate-200 p-3 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Saudas</p>
                <p className="text-xs font-black text-slate-800">{filteredSaudas.length}</p>
              </div>
              <div className="bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cumulative Weight</p>
                <p className="text-xs font-black text-slate-800 font-mono">
                  {filteredSaudas.reduce((acc, s) => acc + Number(s.total_wt_in_ton || 0), 0).toFixed(2)} Ton
                </p>
              </div>
            </div>

            <div className="bg-white px-4 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-right">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Filtered Book Value</p>
              <p className="text-xs font-black text-[#D94B5A] font-mono">
                ₹{bookTotalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {printingBook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 no-print">
          <div className="bg-[#FBCFCB] border-2 border-white border-r-gray-800 border-b-gray-800 p-1 w-96 shadow-lg">
            <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-2 py-1 flex items-center justify-between text-white font-bold text-sm">
              <span>Print Preview</span>
              <button onClick={() => setPrintingBook(false)} className="hover:bg-red-500 px-1 rounded-sm">✕</button>
            </div>
            <div className="p-6 bg-[#FBCFCB] flex flex-col items-center">
              <Printer className="w-12 h-12 text-gray-700 mb-4" />
              <p className="text-center font-bold text-sm mb-2">Print Sauda Register Book</p>
              <p className="text-center text-xs text-gray-600 mb-6">Are you sure you want to print the current register view? The view will be printed exactly as shown in the table.</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    window.print();
                    setPrintingBook(false);
                  }} 
                  className="px-6 py-1.5 bg-[#FBCFCB] border-2 border-white border-r-gray-800 border-b-gray-800 active:border-r-white active:border-b-white active:border-t-gray-800 active:border-l-gray-800 focus:outline-none focus:ring-1 focus:ring-black font-bold flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button 
                  onClick={() => setPrintingBook(false)} 
                  className="px-6 py-1.5 bg-[#FBCFCB] border-2 border-white border-r-gray-800 border-b-gray-800 active:border-r-white active:border-b-white active:border-t-gray-800 active:border-l-gray-800 focus:outline-none focus:ring-1 focus:ring-black"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAccountsModalOpen && (
        <AccountsModal 
          saudaList={saudaList}
          poList={poList}
          arrivalsList={arrivalsList}
          onClose={() => setIsAccountsModalOpen(false)}
        />
      )}

      {auditModalOpen && (
        <UniversalAuditLogModal
          isOpen={auditModalOpen}
          onClose={() => {
            setAuditModalOpen(false);
            setAuditRecordId(undefined);
          }}
          initialModule="Sauda Desk"
          initialRecordId={auditRecordId}
        />
      )}

      <SaudaImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        importCsvText={importCsvText}
        setImportCsvText={setImportCsvText}
        handleCsvImport={handleCsvImport}
        isImporting={isImporting}
        importStatusMessage={importStatusMessage}
      />

      <SaudaApprovalModal
        approvingSauda={approvingSauda}
        onClose={() => setApprovingSauda(null)}
        onConfirmApprove={handleConfirmApprove}
        isApprovingLoading={isApprovingLoading}
      />

      <SaudaRejectionModal
        rejectingSauda={rejectingSauda}
        onClose={() => {
          setRejectingSauda(null);
          setRejectionRemarksInput('');
          setRejectionError(null);
        }}
        onConfirmReject={handleConfirmReject}
        isRejectingLoading={isRejectingLoading}
        rejectionRemarksInput={rejectionRemarksInput}
        setRejectionRemarksInput={setRejectionRemarksInput}
        rejectionError={rejectionError}
        setRejectionError={setRejectionError}
      />

      <SaudaDetailsModal
        viewingDetailsSauda={viewingDetailsSauda}
        onClose={() => setViewingDetailsSauda(null)}
        isUser10={isUser10}
        isUser2={isUser2}
        isUserAdmin={isUserAdmin}
        handlePrint={handlePrint}
        setAuditRecordId={setAuditRecordId}
        setAuditModalOpen={setAuditModalOpen}
        handleEdit={handleEdit}
        handleMarkCheck={handleMarkCheck}
        handleMarkReject={handleMarkReject}
        isApprovedSauda={isApprovedSauda}
        isRejectedSauda={isRejectedSauda}
        isDraftSauda={isDraftSauda}
        isPendingUncheckedSauda={isPendingUncheckedSauda}
      />
    </LegacyLayout>
  );
}

