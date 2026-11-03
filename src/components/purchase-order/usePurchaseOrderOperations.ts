import { useState } from 'react';
import { dbModule } from '../../services/dbModule';
import { poService } from '../../services/poService';
import { supabase } from '../../lib/supabase';
import { getApiUrl, canDeleteData } from '../../lib/utils';
import { getCurrentUserContext, isUserAdmin, isL5OrAdmin, isUserId2, isLevel4OrAbove } from '../../lib/permissions';
import { generatePoPdf, downloadPoPdfFile } from '../../utils/purchaseOrderPdfGenerator';
import { generatePoHtmlEmail } from './PoPrintSlipHelper';
import { EmailPreviewState } from './PoEmailPreviewModal';
import { verifyAdminOrSuperPassword, checkIsAdvancePaymentDone, checkIsSettlementDone } from '../../services/purchaseOrderAuthService';
import { BASE_RATE_APPROVAL_REQUIRED_MSG, getBaseRateApprovalState } from '../../services/sattaRateService';

interface UsePurchaseOrderOperationsProps {
  isTempPo: boolean;
  MASTER_TABLE: string;
  DETAIL_TABLE: string;
  poList: any[];
  setPoList: React.Dispatch<React.SetStateAction<any[]>>;
  brokerList: any[];
  gradeList: any[];
  agencyList: any[];
  markaList: any[];
  allPayments: any[];
  allSettlements: any[];
  fetchPosAndMasters: () => Promise<void>;
  isPoMismatchResolved: (item: any) => boolean;
  handleGlobalAdd: () => void;
  setSelectedPoNo: (val: string | null) => void;
  todayStr: string;
}

export function markPoClosedInLocalStorage(cleanPo: string, cleanSauda: string, closeRemarksPayload: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`sauda_closed_${cleanPo}`, 'true');
  localStorage.removeItem(`sauda_reopened_${cleanPo}`);
  localStorage.removeItem(`sauda_open_remarks_${cleanPo}`);
  localStorage.setItem(`sauda_close_remarks_${cleanPo}`, JSON.stringify(closeRemarksPayload));

  if (cleanSauda) {
    localStorage.setItem(`sauda_closed_${cleanSauda}`, 'true');
    localStorage.removeItem(`sauda_reopened_${cleanSauda}`);
    localStorage.removeItem(`sauda_open_remarks_${cleanSauda}`);
    localStorage.setItem(`sauda_close_remarks_${cleanSauda}`, JSON.stringify(closeRemarksPayload));
  }
}

export function usePurchaseOrderOperations({
  isTempPo,
  MASTER_TABLE,
  DETAIL_TABLE,
  poList,
  setPoList,
  brokerList,
  gradeList,
  agencyList,
  markaList,
  allPayments,
  allSettlements,
  fetchPosAndMasters,
  isPoMismatchResolved,
  handleGlobalAdd,
  setSelectedPoNo,
  todayStr
}: UsePurchaseOrderOperationsProps) {
  const [printingPo, setPrintingPo] = useState<any | null>(null);
  const [emailSendingStatus, setEmailSendingStatus] = useState<Record<string, 'idle' | 'sending' | 'success' | 'error'>>({});
  const [emailNotification, setEmailNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  } | null>(null);
  const [emailPreviewModalState, setEmailPreviewModalState] = useState<EmailPreviewState | null>(null);

  // Reopen Auth State
  const [closedNoticePo, setClosedNoticePo] = useState<any>(null);
  const [reopenAuthModalPo, setReopenAuthModalPo] = useState<any>(null);
  const [closeModalPo, setCloseModalPo] = useState<any>(null);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [reopenUsername, setReopenUsername] = useState<string>('');
  const [reopenPassword, setReopenPassword] = useState<string>('');
  const [reopenRemarks, setReopenRemarks] = useState<string>('');
  const [reopenError, setReopenError] = useState<string>('');
  const [isReopening, setIsReopening] = useState<boolean>(false);
  const [showReopenPassword, setShowReopenPassword] = useState<boolean>(false);
  const [reopenSuccessInfo, setReopenSuccessInfo] = useState<{ po: any; openRemarks: any } | null>(null);
  const [auditViewPo, setAuditViewPo] = useState<any>(null);

  // Miscellaneous Modals State
  const [consignmentLedgerPo, setConsignmentLedgerPo] = useState<any>(null);
  const [excessShortModalPo, setExcessShortModalPo] = useState<any>(null);
  const [mismatchModalPo, setMismatchModalPo] = useState<any>(null);
  const [actionMenu, setActionMenu] = useState<{ item: any; x: number; y: number } | null>(null);
  const [confirmState, setConfirmState] = useState<
    { title: string; message: string; tone: 'default' | 'danger'; confirmLabel: string; resolve: (v: boolean) => void } | null
  >(null);

  const askConfirm = (
    message: string,
    opts?: { title?: string; tone?: 'default' | 'danger'; confirmLabel?: string }
  ) => new Promise<boolean>((resolve) => setConfirmState({
    title: opts?.title || 'Please Confirm',
    message,
    tone: opts?.tone || 'default',
    confirmLabel: opts?.confirmLabel || 'Confirm',
    resolve,
  }));

  const handleSendMailPo = async (poHeader: any) => {
    const poNo = poHeader.po_no;
    if (!poNo) return;

    const brokerName = String(poHeader.broker || '').trim();
    const supplierName = String(poHeader.supplier || '').trim();

    let brokerEmail = '';
    let supplierEmail = '';

    if (supabase) {
      try {
        const { data: custData } = await supabase
          .from('customer_master')
          .select('email, firm_name, proprietor_name');

        if (custData && custData.length > 0) {
          if (brokerName) {
            const exactBroker = custData.find((c: any) => 
              (c.firm_name && c.firm_name.trim().toUpperCase() === brokerName.toUpperCase()) ||
              (c.proprietor_name && c.proprietor_name.trim().toUpperCase() === brokerName.toUpperCase())
            );
            if (exactBroker?.email && exactBroker.email.trim()) {
              brokerEmail = exactBroker.email.trim();
            } else {
              const partialBroker = custData.find((c: any) => 
                (c.firm_name && (c.firm_name.toUpperCase().includes(brokerName.toUpperCase()) || brokerName.toUpperCase().includes(c.firm_name.toUpperCase()))) ||
                (c.proprietor_name && (c.proprietor_name.toUpperCase().includes(brokerName.toUpperCase()) || brokerName.toUpperCase().includes(c.proprietor_name.toUpperCase())))
              );
              if (partialBroker?.email && partialBroker.email.trim()) {
                brokerEmail = partialBroker.email.trim();
              }
            }
          }

          if (supplierName) {
            const exactSupplier = custData.find((c: any) => 
              (c.firm_name && c.firm_name.trim().toUpperCase() === supplierName.toUpperCase()) ||
              (c.proprietor_name && c.proprietor_name.trim().toUpperCase() === supplierName.toUpperCase())
            );
            if (exactSupplier?.email && exactSupplier.email.trim()) {
              supplierEmail = exactSupplier.email.trim();
            }
          }
        }
      } catch (err) {
        console.warn("Failed to query customer_master for email:", err);
      }
    }

    if (!brokerEmail && brokerList && brokerList.length > 0 && brokerName) {
      const bMatch = brokerList.find((b: any) => 
        (b.brok_name && b.brok_name.toUpperCase() === brokerName.toUpperCase()) ||
        (b.brok_code && b.brok_code.toUpperCase() === String(poHeader.broker_code || '').toUpperCase())
      );
      if (bMatch?.email && bMatch.email.trim()) {
        brokerEmail = bMatch.email.trim();
      }
    }

    try {
      const details = await dbModule.fetchAll(DETAIL_TABLE);
      const filtered = details
        .filter((d: any) => d.po_no === poHeader.po_no)
        .sort((a: any, b: any) => (Number(a.srl_no || a.srl || 0) - Number(b.srl_no || b.srl || 0)));
      
      const isBales = (poHeader.purchase_unit_name || 'BALES') === 'BALES';
      const unitWtKgs = parseFloat(poHeader.weight_unit_kgs) || (isBales ? 147.5 : 50);
      const mappedItems = filtered.map((d: any, idx: number) => {
        const qtyVal = Number(d.quantity || d.qty || 0);
        const storedWt = Number(d.weight_mt ?? d.weight ?? 0);
        const weightVal = storedWt > 0
          ? storedWt
          : (qtyVal > 0 ? parseFloat(((qtyVal * unitWtKgs) / 1000).toFixed(3)) : 0);
        return {
          srl: idx + 1,
          crop: d.crop_year || poHeader.financial_year || '2026-27',
          grade_code: d.grade_code || '',
          grade_name: gradeList.find(g => g.grade_code === d.grade_code)?.grade_name || d.grade_code || 'STANDARD GRADE',
          agency_code: d.agency_code || '',
          agency_name: agencyList.find(a => a.agency_code === d.agency_code)?.agency_name || d.agency_code || 'MAIN AGENCY',
          marka_code: d.marka_code || '',
          marka_name: markaList.find(m => m.marka_code === d.marka_code)?.marka_name || d.marka_code || 'NORMAL GRADE',
          qty: qtyVal,
          weight: weightVal,
          rate: d.rate_qntl || 0
        };
      });

      const sumQty = mappedItems.reduce((s, it) => s + (Number(it.qty) || 0), 0);
      const sumWt = mappedItems.reduce((s, it) => s + (Number(it.weight) || 0), 0);

      const fullPo = {
        no: poHeader.po_no || '',
        ptf_no: poHeader.ptf_no || '',
        is_ptf: !!poHeader.ptf_no,
        date: poHeader.po_date || poHeader.created_at || todayStr,
        broker: poHeader.broker || 'N/A',
        supplier: poHeader.supplier || 'N/A',
        challan_supplier: poHeader.challan_supplier || 'N/A',
        area: poHeader.area || 'N/A',
        trans_paid_by: poHeader.trans_paid_by || 'PARTY',
        weight_unit_kgs: String(poHeader.weight_unit_kgs || (isBales ? '147.5' : '50')),
        against_cancellation: poHeader.against_cancellation || 'No',
        purchase_unit_name: poHeader.purchase_unit_name || 'BALES',
        total_no_of_lorries: String(poHeader.total_lorries || '0'),
        units_per_lorry: String(poHeader.units_per_lorry || '0'),
        total_units: isBales ? sumQty.toString() : String(poHeader.total_units || '0'),
        weight_per_lorry: poHeader.weight_per_lorry !== undefined && poHeader.weight_per_lorry !== null && !isNaN(Number(poHeader.weight_per_lorry)) && Number(poHeader.weight_per_lorry) > 0
          ? Number(poHeader.weight_per_lorry).toFixed(3)
          : String(poHeader.weight_per_lorry || '0.000'),
        total_contract_mt: isBales ? sumWt.toFixed(3) : String(poHeader.total_contract_mt || '0'),
        marka_type: poHeader.marka_type || 'Normal',
        marka_penalty: String(poHeader.marka_penalty || '0'),
        qty_penalty: String(poHeader.qty_penalty || '5'),
        delivery_from: poHeader.delivery_from || todayStr,
        delivery_to: poHeader.delivery_to || todayStr,
        grace_days: String(poHeader.grace_days || '0'),
        delivery_penalty: String(poHeader.delivery_penalty || '0'),
        contract_po_no: poHeader.contract_po_no || '',
        contract_date: poHeader.contract_date || todayStr,
        rate_detail: poHeader.rate_detail || '',
        delivery_schedule: poHeader.delivery_schedule || '',
        terms_condition: poHeader.terms_condition || 'Penalty Rs.5/day. Standard terms apply.',
        remarks: poHeader.remarks || 'Grade rates based on BJCL indices.',
        po_identification: poHeader.po_identification || 'Direct Advance Payment',
        b_rate: String(poHeader.b_rate || '0'),
        s_date: poHeader.s_date || todayStr,
        items: mappedItems
      };

      const emailHtml = generatePoHtmlEmail(fullPo);

      let poPdfBase64 = "";
      try {
        const poDoc = generatePoPdf(fullPo);
        poPdfBase64 = poDoc.output("datauristring").split(",")[1] || "";
      } catch (pdfErr) {
        console.error("Failed to generate PO PDF for email:", pdfErr);
      }

      const emailRecipientsList: string[] = [];
      if (brokerEmail) emailRecipientsList.push(brokerEmail);
      if (supplierEmail && !emailRecipientsList.includes(supplierEmail)) emailRecipientsList.push(supplierEmail);

      // Open Email Preview Modal with full content and live preview
      setEmailPreviewModalState({
        poHeader,
        recipientTo: emailRecipientsList.join(', '),
        recipientCc: '',
        subject: `📋 SAUDA CHECK POINT / PURCHASE ORDER: #${poHeader.po_no} - [${poHeader.broker || 'N/A'}]`,
        emailHtml,
        pdfBase64: poPdfBase64 || undefined,
        filename: `Purchase_Order_${poHeader.po_no || 'Document'}.pdf`,
        brokerEmailSuggestion: brokerEmail || undefined,
        supplierEmailSuggestion: supplierEmail || undefined
      });
    } catch (err: any) {
      console.error("Failed to prepare email preview:", err);
      setEmailNotification({
        type: 'error',
        title: 'Email Preparation Failed',
        message: `Could not load details for PO #${poNo}: ${err.message || String(err)}`
      });
    }
  };

  const handleExecuteEmailSend = async (payload: {
    to: string;
    cc: string;
    subject: string;
    html: string;
    pdfData?: string;
    filename?: string;
    poNo: string;
  }): Promise<boolean> => {
    const poNo = payload.poNo;
    setEmailSendingStatus(prev => ({ ...prev, [poNo]: 'sending' }));

    try {
      const res = await fetch(getApiUrl("/api/send-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: payload.subject,
          to: payload.to,
          cc: payload.cc || undefined,
          html: payload.html,
          filename: payload.filename || `Purchase_Order_${poNo || 'Draft'}.pdf`,
          pdfData: payload.pdfData || undefined
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
        setEmailSendingStatus(prev => ({ ...prev, [poNo]: 'success' }));
        setEmailNotification({
          type: 'success',
          title: 'Email Sent Successfully',
          message: `Email successfully dispatched to ${payload.to} for Sauda Check Point #${poNo}`
        });
        setTimeout(() => {
          setEmailSendingStatus(prev => ({ ...prev, [poNo]: 'idle' }));
        }, 3000);
        return true;
      } else {
        throw new Error(resData.error || "Failed to send email");
      }
    } catch (err: any) {
      console.error(err);
      setEmailSendingStatus(prev => ({ ...prev, [poNo]: 'error' }));
      setEmailNotification({
        type: 'error',
        title: 'Email Dispatch Failed',
        message: `Failed to send email: ${err.message || String(err)}`
      });
      setTimeout(() => {
        setEmailSendingStatus(prev => ({ ...prev, [poNo]: 'idle' }));
      }, 4000);
      throw err;
    }
  };

  const handleDeletePo = async (poNo: string) => {
    const userCtx = getCurrentUserContext();
    const isUser002Only = isUserId2(userCtx) && !isLevel4OrAbove(userCtx);
    if (isUser002Only && isTempPo) {
      alert("🔒 Access Denied: Only Level 4 users or Admin can delete saved records in Sauda Check Point.");
      return;
    }

    if (!canDeleteData()) {
      setEmailNotification({
        type: 'warning',
        title: 'Access Denied',
        message: 'Only Admin users (L5 / System Administrator) are authorized to permanently delete records.'
      });
      return;
    }
    const confirmed = await askConfirm(
      `Are you sure you want to PERMANENTLY DELETE Purchase Order ${poNo}?\nThis action will delete all items and records linked to this PO.`,
      { title: 'Permanent Delete Warning', tone: 'danger', confirmLabel: 'Delete Forever' }
    );
    if (!confirmed) return;

    try {
      if (supabase) {
        await Promise.all([
          supabase.from(DETAIL_TABLE).delete().eq('po_no', poNo),
          supabase.from(MASTER_TABLE).delete().eq('po_no', poNo),
          supabase.from('sauda_check_point_details').delete().eq('po_no', poNo),
          supabase.from('sauda_check_point').delete().eq('po_no', poNo),
          supabase.from('purchase_detail_master').delete().eq('po_no', poNo),
          supabase.from('purchase_master').delete().eq('po_no', poNo),
          supabase.from('material_mismatch').delete().eq('po_no', poNo),
          supabase.from('satta_mismatch').delete().eq('po_no', poNo),
          supabase.from('sauda_check_point_deductions').delete().eq('po_no', poNo)
        ]);
      } else {
        await Promise.all([
          dbModule.delete(DETAIL_TABLE, 'po_no', poNo).catch(() => {}),
          dbModule.delete(MASTER_TABLE, 'po_no', poNo).catch(() => {}),
          dbModule.delete('sauda_check_point_details', 'po_no', poNo).catch(() => {}),
          dbModule.delete('sauda_check_point', 'po_no', poNo).catch(() => {}),
          dbModule.delete('purchase_detail_master', 'po_no', poNo).catch(() => {}),
          dbModule.delete('purchase_master', 'po_no', poNo).catch(() => {}),
          dbModule.delete('p.o_archive', 'po_no', poNo).catch(() => {})
        ]);
      }

      const tokens = [poNo, poNo.split('/').pop() || ''].filter(Boolean);
      tokens.forEach(t => {
        const tu = t.toUpperCase();
        localStorage.removeItem(`material_resolved_${tu}`);
        localStorage.removeItem(`mismatch_resolved_${tu}`);
        localStorage.removeItem(`mismatch_cleared_${tu}`);
        localStorage.removeItem(`satta_resolved_${tu}`);
      });

      setPoList(prev => prev.filter(p => String(p.po_no).trim().toUpperCase() !== String(poNo).trim().toUpperCase()));
      handleGlobalAdd();
      setSelectedPoNo(null);

      window.dispatchEvent(new CustomEvent('app-data-updated'));
      setEmailNotification({
        type: 'success',
        title: 'Deleted Successfully',
        message: `Purchase Order ${poNo} was deleted permanently.`
      });
      await fetchPosAndMasters();
    } catch (err: any) {
      console.error("Failed to delete PO: ", err);
      setEmailNotification({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'An error occurred during deletion.'
      });
    }
  };

  const handleApproveMismatch = async (targetPo: any) => {
    if (!targetPo) return;
    const cleanPoNo = String(targetPo.po_no || targetPo.contract_po_no || '').trim().toUpperCase();
    try {
      localStorage.setItem(`pass_status_${cleanPoNo}`, 'pass');
      localStorage.setItem(`material_resolved_${cleanPoNo}`, 'true');
      localStorage.setItem(`mismatch_cleared_${cleanPoNo}`, 'true');

      if (supabase) {
        try { await supabase.from('material_inspection').update({ pass_status: 'pass', status: 'resolved' }).eq('po_no', targetPo.po_no); } catch (e) {}
        await dbModule.update('purchase_master', 'po_no', targetPo.po_no, { pass_status: 'pass', mismatch_cleared: true, workflow_stage: 'final_po' }).catch(() => {});
        await dbModule.update('sauda_check_point', 'po_no', targetPo.po_no, { pass_status: 'pass', mismatch_cleared: true, workflow_stage: 'final_po' }).catch(() => {});
      }

      setPoList(prev => prev.map(p => {
        if (p.po_no === targetPo.po_no) {
          return { ...p, pass_status: 'pass', mismatch_cleared: true, workflow_stage: 'final_po' };
        }
        return p;
      }));

      setMismatchModalPo(null);
      setEmailNotification({
        type: 'success',
        title: 'Mismatch Approved',
        message: `Mismatch Approved for Sauda #${targetPo.po_no}! Status updated to PASS. Click the green PASS button to move to Final P.O.`
      });
      await fetchPosAndMasters();
    } catch (err: any) {
      setEmailNotification({
        type: 'error',
        title: 'Approval Failed',
        message: `Failed to approve mismatch: ${err.message || err}`
      });
    }
  };

  const openReopenAuthModal = (item: any) => {
    const userCtx = getCurrentUserContext();
    setReopenAuthModalPo(item);
    setReopenUsername(userCtx?.username || 'ADMIN');
    setReopenPassword('');
    setReopenRemarks('');
    setReopenError('');
    setShowReopenPassword(false);
    setClosedNoticePo(null);
  };

  const executeReopenSauda = async () => {
    if (!reopenAuthModalPo) return;
    if (!reopenPassword.trim()) {
      setReopenError("Please enter Admin or Super User Password.");
      return;
    }
    if (!reopenRemarks.trim()) {
      setReopenError("Remarks are mandatory. Please provide a reason for reopening this Sauda.");
      return;
    }

    setIsReopening(true);
    setReopenError('');

    try {
      const auth = await verifyAdminOrSuperPassword(reopenUsername, reopenPassword);
      if (!auth.success) {
        setReopenError(auth.error || "Invalid Admin or Super User Password.");
        setIsReopening(false);
        return;
      }

      const verifiedUser = auth.user;
      const nowIso = new Date().toISOString();
      const formattedTime = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const cleanPo = String(reopenAuthModalPo.po_no || '').trim().toUpperCase();
      const cleanSauda = String(reopenAuthModalPo.sauda_no || reopenAuthModalPo.contract_po_no || '').trim().toUpperCase();

      let existingOpenRemarks: any = reopenAuthModalPo.open_remarks;
      if (typeof existingOpenRemarks === 'string') {
        try { existingOpenRemarks = JSON.parse(existingOpenRemarks); } catch (e) {}
      }
      const history = Array.isArray(existingOpenRemarks?.history) ? [...existingOpenRemarks.history] : [];
      if (existingOpenRemarks?.opened_by) {
        history.push({
          remarks: existingOpenRemarks.remarks,
          opened_by: existingOpenRemarks.opened_by,
          opened_at: existingOpenRemarks.opened_at || existingOpenRemarks.timestamp,
          formatted_time: existingOpenRemarks.formatted_time
        });
      }

      const openRemarksPayload = {
        remarks: reopenRemarks.trim(),
        opened_by: verifiedUser.username || reopenUsername.trim().toUpperCase() || 'ADMIN',
        user_id: verifiedUser.user_id || 'admin',
        user_role: verifiedUser.role || 'ADMIN',
        timestamp: nowIso,
        opened_at: nowIso,
        formatted_time: formattedTime,
        history: history.length > 0 ? history : undefined
      };

      const reopenDbPayload = {
        is_closed: false,
        is_reopened: true,
        pending: true,
        status: 'open',
        open_remarks: openRemarksPayload
      };

      const updatedRows: any[] = [];
      try {
        const r1 = await dbModule.update('sauda_check_point', 'po_no', reopenAuthModalPo.po_no, reopenDbPayload);
        if (r1) updatedRows.push(r1);
      } catch (_e) {}
      try {
        const r2 = await dbModule.update('purchase_master', 'po_no', reopenAuthModalPo.po_no, reopenDbPayload);
        if (r2) updatedRows.push(r2);
      } catch (_e) {}
      if (reopenAuthModalPo.sauda_no || reopenAuthModalPo.po_no) {
        try {
          const r3 = await dbModule.update('sauda_master', 'sauda_no', reopenAuthModalPo.sauda_no || reopenAuthModalPo.po_no, reopenDbPayload);
          if (r3) updatedRows.push(r3);
        } catch (_e) {}
      }

      if (updatedRows.length === 0) {
        throw new Error(`Database update failed: no authoritative record found for PO #${reopenAuthModalPo.po_no}.`);
      }

      localStorage.setItem(`sauda_reopened_${cleanPo}`, 'true');
      localStorage.removeItem(`sauda_closed_${cleanPo}`);
      localStorage.removeItem(`sauda_cancelled_${cleanPo}`);
      localStorage.setItem(`sauda_open_remarks_${cleanPo}`, JSON.stringify(openRemarksPayload));
      if (cleanSauda) {
        localStorage.setItem(`sauda_reopened_${cleanSauda}`, 'true');
        localStorage.removeItem(`sauda_closed_${cleanSauda}`);
        localStorage.removeItem(`sauda_cancelled_${cleanSauda}`);
        localStorage.setItem(`sauda_open_remarks_${cleanSauda}`, JSON.stringify(openRemarksPayload));
      }

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('sauda_status_changed', {
        detail: {
          po_no: reopenAuthModalPo.po_no,
          sauda_no: reopenAuthModalPo.sauda_no,
          status: 'reopened',
          open_remarks: openRemarksPayload
        }
      }));

      setEmailNotification({
        type: 'success',
        title: 'Sauda Reopened',
        message: `Sauda #${reopenAuthModalPo.po_no} reopened by ${openRemarksPayload.opened_by}. Status is now OPEN.`
      });

      await fetchPosAndMasters();

      const targetItem = {
        ...reopenAuthModalPo,
        is_closed: false,
        is_reopened: true,
        pending: true,
        status: 'open',
        open_remarks: openRemarksPayload
      };

      setReopenSuccessInfo({
        po: targetItem,
        openRemarks: openRemarksPayload
      });

      setReopenAuthModalPo(null);
      setIsReopening(false);
    } catch (err: any) {
      console.error("Reopen Sauda error:", err);
      setReopenError(err.message || String(err));
      setIsReopening(false);
    }
  };

  const handleCancelSauda = async (item: any) => {
    const userCtx = getCurrentUserContext();
    const userRole = String(userCtx?.userRole || (userCtx as any)?.role || '').toUpperCase();
    const userLevel = String(userCtx?.userLevel || (userCtx as any)?.level || '').toUpperCase();
    const isAuthorized = isUserAdmin(userCtx) || userRole === 'ADMIN' || userRole === 'ADMINISTRATOR' || 
                         isL5OrAdmin() || userLevel === 'L4' || userLevel === 'L5' || userLevel === 'MAX' ||
                         Boolean((userCtx as any)?.isAdmin);

    if (!isAuthorized) {
      setEmailNotification({
        type: 'warning',
        title: 'Access Denied',
        message: 'Only an Admin or Level 4 User can Cancel a Sauda.'
      });
      return;
    }

    const isCurrentlyCancelled = item.status === 'cancelled';
    const cleanPo = String(item.po_no || '').trim().toUpperCase();
    const cleanSauda = String(item.sauda_no || item.contract_po_no || '').trim().toUpperCase();

    if (isCurrentlyCancelled) {
      const confirmRestore = await askConfirm(
        `Do you want to RESTORE cancelled Sauda / P.O #${item.po_no} back to Active status?`,
        { title: 'Restore Sauda', confirmLabel: 'Restore Sauda' }
      );
      if (!confirmRestore) return;

      try {
        const restoredRows: any[] = [];
        try {
          const r1 = await dbModule.update('sauda_check_point', 'po_no', item.po_no, { status: 'pending', pending: true, is_closed: false });
          if (r1) restoredRows.push(r1);
        } catch (_e) {}
        try {
          const r2 = await dbModule.update('purchase_master', 'po_no', item.po_no, { status: 'pending', pending: true, is_closed: false });
          if (r2) restoredRows.push(r2);
        } catch (_e) {}
        if (item.sauda_no || item.po_no) {
          try {
            const r3 = await dbModule.update('sauda_master', 'sauda_no', item.sauda_no || item.po_no, { status: 'active', is_closed: false });
            if (r3) restoredRows.push(r3);
          } catch (_e) {}
        }

        if (restoredRows.length === 0) {
          throw new Error(`Restore failed: no authoritative database record updated for PO #${item.po_no}.`);
        }

        localStorage.removeItem(`sauda_cancelled_${cleanPo}`);
        localStorage.removeItem(`sauda_closed_${cleanPo}`);
        if (cleanSauda) {
          localStorage.removeItem(`sauda_cancelled_${cleanSauda}`);
          localStorage.removeItem(`sauda_closed_${cleanSauda}`);
        }

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('sauda_status_changed', { detail: { po_no: item.po_no, status: 'pending' } }));
        setEmailNotification({
          type: 'success',
          title: 'Sauda Restored',
          message: `Sauda #${item.po_no} has been restored to Active status.`
        });
        await fetchPosAndMasters();
      } catch (e: any) {
        setEmailNotification({ type: 'error', title: 'Restore Failed', message: e.message || String(e) });
      }
      return;
    }

    // Cancel Sauda
    const confirmed = await askConfirm(
      `Are you sure you want to CANCEL Sauda / P.O #${item.po_no}?\n\nCancelled Saudas will be marked as Cancelled (Void) and cannot accept any arrivals in Temporary Arrival.`,
      { title: 'Cancel Sauda Confirmation', tone: 'danger', confirmLabel: 'Cancel Sauda' }
    );
    if (!confirmed) return;

    try {
      const cancelDbPayload = { status: 'cancelled', pending: false, is_closed: true, is_reopened: false, open_remarks: null };
      const cancelledRows: any[] = [];
      try {
        const r1 = await dbModule.update('sauda_check_point', 'po_no', item.po_no, cancelDbPayload);
        if (r1) cancelledRows.push(r1);
      } catch (_e) {}
      try {
        const r2 = await dbModule.update('purchase_master', 'po_no', item.po_no, cancelDbPayload);
        if (r2) cancelledRows.push(r2);
      } catch (_e) {}
      if (item.sauda_no || item.po_no) {
        try {
          const r3 = await dbModule.update('sauda_master', 'sauda_no', item.sauda_no || item.po_no, { status: 'cancelled', is_closed: true, is_reopened: false, open_remarks: null });
          if (r3) cancelledRows.push(r3);
        } catch (_e) {}
      }

      if (cancelledRows.length === 0) {
        throw new Error(`Cancel failed: no authoritative database record updated for PO #${item.po_no}.`);
      }

      localStorage.setItem(`sauda_cancelled_${cleanPo}`, 'true');
      localStorage.setItem(`sauda_closed_${cleanPo}`, 'true');
      localStorage.removeItem(`sauda_reopened_${cleanPo}`);
      localStorage.removeItem(`sauda_open_remarks_${cleanPo}`);
      if (cleanSauda) {
        localStorage.setItem(`sauda_cancelled_${cleanSauda}`, 'true');
        localStorage.setItem(`sauda_closed_${cleanSauda}`, 'true');
        localStorage.removeItem(`sauda_reopened_${cleanSauda}`);
        localStorage.removeItem(`sauda_open_remarks_${cleanSauda}`);
      }

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('sauda_status_changed', { detail: { po_no: item.po_no, status: 'cancelled' } }));

      setEmailNotification({
        type: 'info',
        title: 'Sauda Cancelled',
        message: `Sauda #${item.po_no} has been cancelled successfully.`
      });

      await fetchPosAndMasters();
    } catch (err: any) {
      console.error("Failed to cancel sauda:", err);
      setEmailNotification({
        type: 'error',
        title: 'Cancel Failed',
        message: 'Failed to cancel sauda: ' + (err.message || String(err))
      });
    }
  };

  const handleCloseSauda = async (item: any) => {
    const userCtx = getCurrentUserContext();
    const userRole = String(userCtx?.userRole || (userCtx as any)?.role || '').toUpperCase();
    const userLevel = String(userCtx?.userLevel || (userCtx as any)?.level || '').toUpperCase();
    const isAuthorized = isUserAdmin(userCtx) || userRole === 'ADMIN' || userRole === 'ADMINISTRATOR' || 
                         isL5OrAdmin() || userLevel === 'L4' || userLevel === 'L5' || userLevel === 'MAX' ||
                         Boolean((userCtx as any)?.isAdmin);

    if (!isAuthorized) {
      setEmailNotification({
        type: 'warning',
        title: 'Access Denied',
        message: 'Only an Admin or Level 4 User can manually Close a Purchase Order.'
      });
      return;
    }

    setCloseModalPo(item);
  };

  const executeCloseSauda = async (remarks: string) => {
    if (!closeModalPo) return;
    setIsClosing(true);

    try {
      const userCtx = getCurrentUserContext();
      const currentUserName = userCtx?.userName || userCtx?.username || 'ADMIN';
      const currentUserRole = userCtx?.userRole || 'L4';
      const nowIso = new Date().toISOString();
      const formattedTime = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const cleanPo = String(closeModalPo.po_no || '').trim().toUpperCase();
      const cleanSauda = String(closeModalPo.sauda_no || closeModalPo.contract_po_no || '').trim().toUpperCase();

      const closeRemarksPayload = {
        remarks: (remarks || '').trim() || 'Closed manually by Level 4 / Admin',
        closed_by: currentUserName,
        user_role: currentUserRole,
        timestamp: nowIso,
        closed_at: nowIso,
        formatted_time: formattedTime
      };

      const closeDbPayload = {
        is_closed: true,
        is_reopened: false,
        pending: false,
        status: 'closed',
        open_remarks: null,
        close_remarks: closeRemarksPayload
      };

      await dbModule.executeTransaction(async (client) => {
        const { error: e1 } = await client.from('sauda_check_point').update(closeDbPayload).eq('po_no', closeModalPo.po_no);
        const { error: e2 } = await client.from('purchase_master').update(closeDbPayload).eq('po_no', closeModalPo.po_no);
        if (closeModalPo.sauda_no) {
          await client.from('sauda_master').update(closeDbPayload).eq('sauda_no', closeModalPo.sauda_no);
        }
        if (e1 || e2) throw e1 || e2;
      });

      markPoClosedInLocalStorage(cleanPo, cleanSauda, closeRemarksPayload);

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('sauda_status_changed', {
        detail: {
          po_no: closeModalPo.po_no,
          sauda_no: closeModalPo.sauda_no,
          status: 'closed',
          close_remarks: closeRemarksPayload
        }
      }));

      setEmailNotification({
        type: 'info',
        title: 'P.O Closed',
        message: `Purchase Order #${closeModalPo.po_no} is now CLOSED. It will not accept any MR in Temporary Arrival.`
      });

      setCloseModalPo(null);
      setIsClosing(false);
      await fetchPosAndMasters();
    } catch (err: any) {
      console.error("Failed to close sauda:", err);
      setEmailNotification({
        type: 'error',
        title: 'Operation Failed',
        message: 'Failed to close purchase order: ' + (err.message || String(err))
      });
      setIsClosing(false);
    }
  };

  const handlePassToFinal = async (item: any) => {
    const brState = await getBaseRateApprovalState();
    if (!brState.isApproved) {
      alert(BASE_RATE_APPROVAL_REQUIRED_MSG);
      return;
    }

    const isResolved = isPoMismatchResolved(item);
    if (!isResolved && (item.workflow_stage === 'mismatch' || item.stage === 'mismatch' || item.pass_status === 'mismatch' || (item.mismatch_fields && item.mismatch_fields.length > 0))) {
      setEmailNotification({
        type: 'warning',
        title: 'Dispute Resolution Required',
        message: `PO #${item.po_no || item.ptf_no} has an unresolved material/satta mismatch. It is not eligible for Final P.O until cleared in the Mismatch Section.`
      });
      return;
    }

    const isPaymentDone = checkIsAdvancePaymentDone(item, allPayments) || item.has_payment_done;
    const isSettlementDone = checkIsSettlementDone(item, allSettlements) || item.has_settlement_done || item.status === 'settled';

    let confirmMsg = `Move ${item.po_no} from Sauda Check Point to Final P.O?`;
    if (!isPaymentDone && !isSettlementDone) {
      confirmMsg = `Advance Payment & Settlement are pending for PO #${item.po_no}.\n\nDo you want to Pass and transfer this P.O directly to Final P.O?`;
    } else if (!isPaymentDone) {
      confirmMsg = `Advance Payment is pending for PO #${item.po_no}.\n\nDo you want to Pass and transfer this P.O to Final P.O?`;
    } else if (!isSettlementDone) {
      confirmMsg = `Account Settlement is pending for PO #${item.po_no}.\n\nDo you want to Pass and transfer this P.O to Final P.O?`;
    }

    const ok = await askConfirm(
      confirmMsg,
      { title: 'Pass → Final P.O', confirmLabel: 'Pass to Final P.O' }
    );
    if (!ok) return;

    try {
      const cleanPoNo = String(item.po_no || item.contract_po_no || '').trim().toUpperCase();
      const poSuffix = cleanPoNo.split('/').pop() || '';
      const saudaNo = String(item.sauda_no || item.po_contract || item.contract_no || '').trim().toUpperCase();
      const saudaSuffix = saudaNo.split('/').pop() || '';
      const allTokens = [cleanPoNo, poSuffix, saudaNo, saudaSuffix].filter(Boolean);

      const VALID_PURCHASE_MASTER_COLS = [
        'financial_year', 'purchase_order', 'po_type', 'ptf_no', 'pending', 'po_no', 'po_date',
        'broker', 'supplier', 'challan_supplier', 'area', 'trans_paid_by', 'weight_unit_kgs',
        'against_cancellation', 'purchase_unit_code', 'purchase_unit_name', 'total_lorries',
        'units_per_lorry', 'total_units', 'weight_per_lorry', 'total_contract_mt', 'marka_type',
        'marka_penalty', 'qty_penalty', 'delivery_from', 'delivery_to', 'grace_days', 'delivery_penalty',
        'contract_po_no', 'contract_date', 'rate_detail', 'delivery_schedule', 'terms_condition',
        'remarks', 'po_identification', 'b_rate', 's_date', 'status'
      ];

      if (supabase) {
        const { data: scpHeader } = await supabase.from('sauda_check_point').select('*').eq('po_no', item.po_no).maybeSingle();
        let saudaHeader: any = null;
        if (!scpHeader && saudaNo) {
          const { data: sData } = await supabase.from('sauda_master').select('*').or(`sauda_no.eq.${saudaNo},session.eq.${item.po_no}`).maybeSingle();
          saudaHeader = sData;
        }

        const source = scpHeader || saudaHeader || item;
        
        let { data: scpDetails } = await supabase.from('sauda_check_point_details').select('*').eq('po_no', item.po_no);
        if ((!scpDetails || scpDetails.length === 0) && (saudaNo || item.po_no)) {
          const { data: sqDetails } = await supabase.from('sauda_quality_details').select('*').or(`sauda_no.eq.${saudaNo || ''},sauda_id.eq.${source?.sauda_id || ''}`);
          if (sqDetails && sqDetails.length > 0) {
            scpDetails = sqDetails;
          }
        }
        
        const rawPayload: Record<string, any> = {
          financial_year: source?.financial_year || item?.financial_year || '2026-2027',
          purchase_order: 'FINAL PO',
          po_type: source?.po_type || item?.po_type || 'Normal',
          ptf_no: source?.ptf_no || item?.ptf_no || null,
          pending: true,
          po_no: item.po_no || source?.po_no || source?.session,
          po_date: source?.date || source?.po_date || item.po_date || item.date || new Date().toISOString().split('T')[0],
          broker: source?.broker || item.broker || '',
          supplier: source?.supplier || item.supplier || '',
          challan_supplier: source?.challan_supplier || item.challan_supplier || source?.supplier || item.supplier || '',
          area: source?.area || item.area || '',
          trans_paid_by: source?.trans_paid_by || item.trans_paid_by || null,
          weight_unit_kgs: source?.weight_unit_kgs || item.weight_unit_kgs || null,
          against_cancellation: source?.against_cancellation || item.against_cancellation || 'No',
          purchase_unit_code: source?.purchase_unit_code || item.purchase_unit_code || null,
          purchase_unit_name: source?.purchase_unit_name || source?.unit_type || item.purchase_unit_name || item.unit_type || 'BALES',
          total_lorries: source?.total_lorries || source?.no_of_lorries || item.total_lorries || item.no_of_lorries || 1,
          units_per_lorry: source?.units_per_lorry || item.units_per_lorry || null,
          total_units: source?.total_units || source?.total_unit || item.total_units || item.total_unit || 0,
          weight_per_lorry: source?.weight_per_lorry || source?.wt_per_lorry || item.weight_per_lorry || null,
          total_contract_mt: source?.total_contract_mt || source?.total_wt_in_ton || item.total_contract_mt || item.total_wt_in_ton || 0,
          marka_type: source?.marka_type || item.marka_type || null,
          marka_penalty: source?.marka_penalty || item.marka_penalty || 0,
          qty_penalty: source?.qty_penalty || item.qty_penalty || 5,
          delivery_from: item.delivery_from || source?.delivery_from || source?.shipment_date || item.shipment_date || null,
          delivery_to: item.delivery_to || source?.delivery_to || source?.shipment_date || item.shipment_date || null,
          grace_days: item.grace_days ?? source?.grace_days ?? source?.shipment_days ?? 0,
          delivery_penalty: source?.delivery_penalty || source?.shipment_penalty || item.delivery_penalty || 0,
          contract_po_no: source?.contract_po_no || item.contract_po_no || '',
          contract_date: source?.contract_date || source?.date || item.contract_date || null,
          rate_detail: source?.rate_detail || item.rate_detail || '',
          delivery_schedule: source?.delivery_schedule || item.delivery_schedule || '',
          terms_condition: source?.terms_condition || item.terms_condition || 'Standard penalty Rs.5/day. Standard terms apply.',
          remarks: source?.remarks || item.remarks || '',
          po_identification: source?.po_identification || item.po_identification || 'Direct Advance Payment',
          b_rate: source?.b_rate || item.b_rate || 0,
          s_date: source?.s_date || source?.b_date || item.s_date || null,
          status: 'final'
        };

        const poPayload: Record<string, any> = {};
        for (const col of VALID_PURCHASE_MASTER_COLS) {
          if (rawPayload[col] !== undefined) {
            poPayload[col] = rawPayload[col];
          }
        }
        
        await dbModule.upsert('purchase_master', poPayload, 'po_no');
        
        if (scpDetails && scpDetails.length > 0) {
          const isBales = (rawPayload.purchase_unit_name || 'BALES') === 'BALES';
          const detailRows = scpDetails.map((d: any, idx: number) => {
            const rawGrade = d.grade_code || d.quality || d.grade || '';
            const rawAgency = d.agency_code || d.agency || '';
            const rawMarka = d.marka_code || d.marka || '';

            const gMatch = gradeList.find(g => g.grade_code === rawGrade || g.grade_name?.trim().toUpperCase() === rawGrade?.trim().toUpperCase());
            const aMatch = agencyList.find(a => a.agency_code === rawAgency || a.agency_name?.trim().toUpperCase() === rawAgency?.trim().toUpperCase());
            const mMatch = markaList.find(m => m.marka_code === rawMarka || m.marka_name?.trim().toUpperCase() === rawMarka?.trim().toUpperCase());

            const qty = Number(d.quantity || d.qty || 0);
            const wt = d.weight_mt || d.weight || (isBales ? parseFloat(((qty * 147.5) / 1000).toFixed(3)) : 0);
            const rate = Number(d.rate_qntl || d.rate || d.rs || 0);

            return {
              po_no: item.po_no,
              srl_no: d.srl_no || (idx + 1),
              crop_year: d.crop_year || d.crop || '2026-27',
              grade_code: gMatch ? gMatch.grade_code : (rawGrade || ''),
              agency_code: aMatch ? aMatch.agency_code : (rawAgency || ''),
              marka_code: mMatch ? mMatch.marka_code : (rawMarka || ''),
              quantity: qty,
              weight_mt: Number(wt),
              rate_qntl: rate,
              premium: Number(d.premium || 0),
              grade_name: gMatch ? gMatch.grade_name : (d.grade_name || rawGrade || ''),
              agency_name: aMatch ? aMatch.agency_name : (d.agency_name || rawAgency || ''),
              marka_name: mMatch ? mMatch.marka_name : (d.marka_name || rawMarka || '')
            };
          });
          await supabase.from('purchase_detail_master').delete().eq('po_no', item.po_no);
          for (const row of detailRows) {
            await dbModule.insert('purchase_detail_master', row).catch(() => {});
          }
        }
        
        await supabase.from('sauda_check_point_details').delete().eq('po_no', item.po_no);
        await supabase.from('sauda_check_point').delete().eq('po_no', item.po_no);

        try {
          await dbModule.update('material_mismatch', 'po_no', item.po_no, { status: 'resolved', approved_by: 'Admin L5', remarks: 'Passed to Final P.O' }).catch(() => {});
          await dbModule.update('satta_mismatch', 'po_no', item.po_no, { status: 'resolved', approved_by: 'Admin L5', remarks: 'Passed to Final P.O' }).catch(() => {});
          if (saudaNo) {
            await dbModule.update('satta_mismatch', 'sauda_no', saudaNo, { status: 'resolved', approved_by: 'Admin L5', remarks: 'Passed to Final P.O' }).catch(() => {});
            await dbModule.update('sauda_master', 'sauda_no', saudaNo, { mismatch_cleared: true, satta_dispute_approved: true }).catch(() => {});
            await dbModule.update('sms_sauda', 'sauda_no', saudaNo, { mismatch_cleared: true, satta_dispute_approved: true }).catch(() => {});
          }
        } catch (_ignore) {}
      } else {
        await dbModule.insert('purchase_master', {
          ...item,
          status: 'final',
          pending: true,
          mismatch_cleared: true,
          satta_dispute_approved: true
        }).catch(() => {});
        await dbModule.delete('sauda_check_point', 'po_no', item.po_no).catch(() => {
          return dbModule.update('sauda_check_point', 'po_no', item.po_no, { status: 'final', mismatch_cleared: true });
        });
      }

      allTokens.forEach(t => {
        try {
          localStorage.setItem(`material_resolved_${t.toUpperCase()}`, 'true');
          localStorage.setItem(`satta_resolved_${t.toUpperCase()}`, 'true');
          localStorage.setItem(`material_resolved_MIS-${t.toUpperCase()}`, 'true');
        } catch (_e) {}
      });

      window.dispatchEvent(new CustomEvent('app-data-updated'));
      window.dispatchEvent(new CustomEvent('mismatch_resolved', { detail: { poNo: item.po_no } }));

      setEmailNotification({
        type: 'success',
        title: 'Moved to Final P.O',
        message: `PO #${item.po_no} successfully passed to Final P.O!`
      });
      await fetchPosAndMasters();
    } catch (e: any) {
      setEmailNotification({
        type: 'error',
        title: 'Final P.O Transfer Failed',
        message: 'Failed to move to Final P.O: ' + (e.message || 'Database error.')
      });
    }
  };

  const handlePrintPo = async (poHeader: any) => {
    try {
      const filtered = await poService.fetchPoDetails(DETAIL_TABLE, poHeader.po_no);
      
      const isBales = (poHeader.purchase_unit_name || 'BALES') === 'BALES';
      const unitWtKgs = parseFloat(poHeader.weight_unit_kgs) || (isBales ? 147.5 : 50);
      const mappedItems = filtered.map((d: any, idx: number) => {
        const qtyVal = Number(d.qty || d.quantity || 0);
        const storedWt = Number(d.weight ?? d.weight_mt ?? 0);
        const weightVal = storedWt > 0
          ? storedWt
          : (qtyVal > 0 ? parseFloat(((qtyVal * unitWtKgs) / 1000).toFixed(3)) : 0);
        return {
          srl: idx + 1,
          crop: d.crop || d.crop_year || poHeader.financial_year || '2026-27',
          grade_code: d.grade_code || '',
          grade_name: gradeList.find(g => g.grade_code === d.grade_code)?.grade_name || d.grade_name || d.grade_code || 'STANDARD GRADE',
          agency_code: d.agency_code || '',
          agency_name: agencyList.find(a => a.agency_code === d.agency_code)?.agency_name || d.agency_name || d.agency_code || 'MAIN AGENCY',
          marka_code: d.marka_code || '',
          marka_name: markaList.find(m => m.marka_code === d.marka_code)?.marka_name || d.marka_name || d.marka_code || 'NORMAL GRADE',
          qty: qtyVal,
          weight: weightVal,
          rate: d.rate || d.rate_qntl || 0
        };
      });

      const sumQty = mappedItems.reduce((s, it) => s + (Number(it.qty) || 0), 0);
      const sumWt = mappedItems.reduce((s, it) => s + (Number(it.weight) || 0), 0);

      const fullPo = {
        no: poHeader.po_no || '',
        ptf_no: poHeader.ptf_no || '',
        is_ptf: !!poHeader.ptf_no,
        date: poHeader.po_date || poHeader.created_at || todayStr,
        broker: poHeader.broker || 'N/A',
        supplier: poHeader.supplier || 'N/A',
        challan_supplier: poHeader.challan_supplier || 'N/A',
        area: poHeader.area || 'N/A',
        trans_paid_by: poHeader.trans_paid_by || 'PARTY',
        weight_unit_kgs: String(poHeader.weight_unit_kgs || (isBales ? '147.5' : '50')),
        against_cancellation: poHeader.against_cancellation || 'No',
        purchase_unit_name: poHeader.purchase_unit_name || 'BALES',
        total_no_of_lorries: String(poHeader.total_lorries || '0'),
        units_per_lorry: String(poHeader.units_per_lorry || '0'),
        total_units: (poHeader.total_units !== undefined && poHeader.total_units !== null && Number(poHeader.total_units) > 0)
          ? String(poHeader.total_units)
          : (sumQty > 0 ? sumQty.toString() : String(poHeader.total_units || '0')),
        weight_per_lorry: poHeader.weight_per_lorry !== undefined && poHeader.weight_per_lorry !== null && !isNaN(Number(poHeader.weight_per_lorry)) && Number(poHeader.weight_per_lorry) > 0
          ? Number(poHeader.weight_per_lorry).toFixed(3)
          : String(poHeader.weight_per_lorry || '0.000'),
        total_contract_mt: (poHeader.total_contract_mt !== undefined && poHeader.total_contract_mt !== null && Number(poHeader.total_contract_mt) > 0)
          ? Number(poHeader.total_contract_mt).toFixed(3)
          : (sumWt > 0 ? sumWt.toFixed(3) : String(poHeader.total_contract_mt || '0')),
        marka_type: poHeader.marka_type || 'Normal',
        marka_penalty: String(poHeader.marka_penalty || '0'),
        qty_penalty: String(poHeader.qty_penalty || '5'),
        delivery_from: poHeader.delivery_from || todayStr,
        delivery_to: poHeader.delivery_to || todayStr,
        grace_days: String(poHeader.grace_days || '0'),
        delivery_penalty: String(poHeader.delivery_penalty || '0'),
        contract_po_no: poHeader.contract_po_no || '',
        contract_date: poHeader.contract_date || todayStr,
        rate_detail: poHeader.rate_detail || '',
        delivery_schedule: poHeader.delivery_schedule || '',
        terms_condition: poHeader.terms_condition || 'Penalty Rs.5/day. Standard terms apply.',
        remarks: poHeader.remarks || 'Grade rates based on BJCL indices.',
        po_identification: poHeader.po_identification || 'Direct Advance Payment',
        b_rate: String(poHeader.b_rate || '0'),
        s_date: poHeader.s_date || todayStr,
        items: mappedItems
      };

      setPrintingPo(fullPo);
    } catch(err: any) {
      alert("Failed to compile print receipt: " + err.message);
    }
  };

  const handleDownloadPoPdf = async (poHeader: any) => {
    try {
      const filtered = await poService.fetchPoDetails(DETAIL_TABLE, poHeader.po_no);
      
      const isBales = (poHeader.purchase_unit_name || 'BALES') === 'BALES';
      const unitWtKgs = parseFloat(poHeader.weight_unit_kgs) || (isBales ? 147.5 : 50);
      const mappedItems = filtered.map((d: any, idx: number) => {
        const qtyVal = Number(d.qty || d.quantity || 0);
        const storedWt = Number(d.weight ?? d.weight_mt ?? 0);
        const weightVal = storedWt > 0
          ? storedWt
          : (qtyVal > 0 ? parseFloat(((qtyVal * unitWtKgs) / 1000).toFixed(3)) : 0);
        return {
          srl: idx + 1,
          crop: d.crop || d.crop_year || poHeader.financial_year || '2026-27',
          grade_code: d.grade_code || '',
          grade_name: gradeList.find(g => g.grade_code === d.grade_code)?.grade_name || d.grade_name || d.grade_code || 'STANDARD GRADE',
          agency_code: d.agency_code || '',
          agency_name: agencyList.find(a => a.agency_code === d.agency_code)?.agency_name || d.agency_name || d.agency_code || 'MAIN AGENCY',
          marka_code: d.marka_code || '',
          marka_name: markaList.find(m => m.marka_code === d.marka_code)?.marka_name || d.marka_name || d.marka_code || 'NORMAL GRADE',
          qty: qtyVal,
          weight: weightVal,
          rate: d.rate || d.rate_qntl || 0
        };
      });

      const sumQty = mappedItems.reduce((s, it) => s + (Number(it.qty) || 0), 0);
      const sumWt = mappedItems.reduce((s, it) => s + (Number(it.weight) || 0), 0);

      const fullPo = {
        no: poHeader.po_no || '',
        ptf_no: poHeader.ptf_no || '',
        is_ptf: !!poHeader.ptf_no,
        date: poHeader.po_date || poHeader.created_at || todayStr,
        broker: poHeader.broker || 'N/A',
        supplier: poHeader.supplier || 'N/A',
        challan_supplier: poHeader.challan_supplier || 'N/A',
        area: poHeader.area || 'N/A',
        trans_paid_by: poHeader.trans_paid_by || 'PARTY',
        weight_unit_kgs: String(poHeader.weight_unit_kgs || (isBales ? '147.5' : '50')),
        against_cancellation: poHeader.against_cancellation || 'No',
        purchase_unit_name: poHeader.purchase_unit_name || 'BALES',
        total_no_of_lorries: String(poHeader.total_lorries || '0'),
        units_per_lorry: String(poHeader.units_per_lorry || '0'),
        total_units: (poHeader.total_units !== undefined && poHeader.total_units !== null && Number(poHeader.total_units) > 0)
          ? String(poHeader.total_units)
          : (isBales && sumQty > 0 ? sumQty.toString() : String(poHeader.total_units || '0')),
        weight_per_lorry: poHeader.weight_per_lorry !== undefined && poHeader.weight_per_lorry !== null && !isNaN(Number(poHeader.weight_per_lorry)) && Number(poHeader.weight_per_lorry) > 0
          ? Number(poHeader.weight_per_lorry).toFixed(3)
          : String(poHeader.weight_per_lorry || '0.000'),
        total_contract_mt: (poHeader.total_contract_mt !== undefined && poHeader.total_contract_mt !== null && Number(poHeader.total_contract_mt) > 0)
          ? Number(poHeader.total_contract_mt).toFixed(3)
          : (isBales && sumWt > 0 ? sumWt.toFixed(3) : String(poHeader.total_contract_mt || '0')),
        marka_type: poHeader.marka_type || 'Normal',
        marka_penalty: String(poHeader.marka_penalty || '0'),
        qty_penalty: String(poHeader.qty_penalty || '5'),
        delivery_from: poHeader.delivery_from || todayStr,
        delivery_to: poHeader.delivery_to || todayStr,
        grace_days: String(poHeader.grace_days || '0'),
        delivery_penalty: String(poHeader.delivery_penalty || '0'),
        contract_po_no: poHeader.contract_po_no || '',
        contract_date: poHeader.contract_date || todayStr,
        rate_detail: poHeader.rate_detail || '',
        delivery_schedule: poHeader.delivery_schedule || '',
        terms_condition: poHeader.terms_condition || 'Penalty Rs.5/day. Standard terms apply.',
        remarks: poHeader.remarks || 'Grade rates based on BJCL indices.',
        po_identification: poHeader.po_identification || 'Direct Advance Payment',
        b_rate: String(poHeader.b_rate || '0'),
        s_date: poHeader.s_date || todayStr,
        items: mappedItems
      };

      downloadPoPdfFile(fullPo);
    } catch(err: any) {
      alert("Failed to compile print receipt: " + err.message);
    }
  };

  const getMismatchReasonText = (item: any, matchResults: Record<string, any>) => {
    if (item.mismatch_fields && item.mismatch_fields.length > 0) {
      return item.mismatch_fields.join(", ");
    }
    if (item.mismatch_reason) return item.mismatch_reason;
    const mr = matchResults[item.po_no] || matchResults[item.contract_po_no];
    if (mr && mr.mismatches && mr.mismatches.length > 0) {
      return mr.mismatches.map((m: any) => m.mismatchLabel || m.field || 'Quality/Rate Variation').join(", ");
    }
    return "Rate difference or Quality variation detected between Sauda & Material Arrival.";
  };

  return {
    printingPo,
    setPrintingPo,
    emailSendingStatus,
    emailNotification,
    setEmailNotification,
    emailPreviewModalState,
    setEmailPreviewModalState,
    handleExecuteEmailSend,
    closedNoticePo,
    setClosedNoticePo,
    closeModalPo,
    setCloseModalPo,
    executeCloseSauda,
    isClosing,
    reopenAuthModalPo,
    setReopenAuthModalPo,
    reopenUsername,
    setReopenUsername,
    reopenPassword,
    setReopenPassword,
    reopenRemarks,
    setReopenRemarks,
    reopenError,
    setReopenError,
    isReopening,
    showReopenPassword,
    setShowReopenPassword,
    reopenSuccessInfo,
    setReopenSuccessInfo,
    auditViewPo,
    setAuditViewPo,
    consignmentLedgerPo,
    setConsignmentLedgerPo,
    excessShortModalPo,
    setExcessShortModalPo,
    mismatchModalPo,
    setMismatchModalPo,
    actionMenu,
    setActionMenu,
    confirmState,
    setConfirmState,
    handleSendMailPo,
    handleDeletePo,
    handleApproveMismatch,
    openReopenAuthModal,
    executeReopenSauda,
    handleCancelSauda,
    handleCloseSauda,
    handlePassToFinal,
    handlePrintPo,
    handleDownloadPoPdf,
    getMismatchReasonText
  };
}
