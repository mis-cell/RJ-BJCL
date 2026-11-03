import React, { useState, useEffect, useRef } from 'react';
import LegacyLayout from '../components/LegacyLayout';
import MaterialIssueEntry from '../components/MaterialIssueEntry';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { enforceEditOrDeletePermission } from '../lib/permissions';
import { dbModule } from '../services/dbModule';
import { screenDraftService } from '../services/screenDraftService';
import { supabase } from '../lib/supabase';
import PrintModal from '../components/PrintModal';
import { DEFAULT_DEPARTMENTS } from '../utils/materialIssueConstants';
import { MaterialIssuePrintSlip } from '../components/material-issue/MaterialIssuePrintSlip';
import { MaterialIssueRegisterView } from '../components/material-issue/MaterialIssueRegisterView';

export default function MaterialIssue({ 
  onSave, 
  onCancel, 
  setCurrentPage, 
  closePage, 
  embedded = false 
}: { 
  onSave?: (d: any) => void; 
  onCancel?: () => void; 
  setCurrentPage?: (p: any) => void; 
  closePage?: (p: any, d?: any) => void; 
  embedded?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // View States for Dashboard
  const [viewState, setViewState] = useState<'list' | 'entry'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [savedDetails, setSavedDetails] = useState<any[]>([]);
  const [savedIssues, setSavedIssues] = useState<any[]>([]);

  // 100-rows per page pagination
  const [listCurrentPage, setListCurrentPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(100);

  useEffect(() => {
    setListCurrentPage(1);
  }, [searchQuery, startDateFilter, endDateFilter]);

  // Main Form State
  const [formData, setFormData] = useState({
    financial_year: '2026-2027',
    issue_no: '',
    date: new Date().toISOString().split('T')[0],
    issue_type: 'factory Issue',
    mill_shift: 'A',
    department: 'BATCHING',
    department_code: 'BATCHING',
    department_location: 'FLOOR A',
    godown: 'N/A',
    godown_code: 'N/A',
    godown_location: 'N/A',
    stock_group: 'RAW JUTE',
    remarks: '',
    grade_name: '',
    unit: '',
    quantity: '',
    weight_mt: '',
    challan_no: '',
    gate_pass_no: '',
    lorry_number: '',
    party_name: '',
    destination_godown: '',
    requisition_no: '',
    issued_by: '',
    received_by: '',
    stack_no: '',
    jci: 'No',
    batch_order: '',
    requisition_date: new Date().toISOString().split('T')[0],
    issued_for: 'MAIN MILL'
  });

  const [issueRoute, setIssueRoute] = useState<'godown' | 'mill' | 'factory' | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [godownRecords, setGodownRecords] = useState<any[]>([]);
  const [departmentRecords, setDepartmentRecords] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalIssueNo, setOriginalIssueNo] = useState<string | null>(null);

  // Prefill Integration States
  const [finalArrivals, setFinalArrivals] = useState<any[]>([]);
  const [showPrintView, setShowPrintView] = useState(false);

  // Auto-save key mapping
  useKeyboardNavigation(containerRef, () => {
    if (viewState === 'entry') {
      handleSave();
    }
  });

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const fetchArrivalsAndStocks = async () => {
    try {
      if (supabase) {
        const [arrivalsRes, poRes, issuesRes] = await Promise.all([
          supabase.from('final_arrival').select('*').order('date', { ascending: false }).limit(100),
          supabase.from('purchase_master').select('po_no, party_name, broker_name'),
          supabase.from('mill_issue_master').select('requisition_no')
        ]);

        if (!arrivalsRes.error && arrivalsRes.data) {
          const issuedRequisitions = new Set((issuesRes.data || []).map((i: any) => i.requisition_no).filter(Boolean));
          const enrichedArrivals = arrivalsRes.data.map(arrival => {
            const matchedPo = poRes.data?.find(po => po.po_no === arrival.po_no);
            return {
              ...arrival,
              is_issued: issuedRequisitions.has(arrival.final_arrival_no),
              supplier: arrival.supplier || matchedPo?.party_name || '',
              broker: arrival.broker || matchedPo?.broker_name || ''
            };
          });
          setFinalArrivals(enrichedArrivals);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch final_arrival records for prefill:", e);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const records = await dbModule.fetchAll('mill_issue_master', 'date', false);
      setSavedIssues(records || []);
      try {
        const details = await dbModule.fetchAll('mill_issue_detail');
        setSavedDetails(details || []);
      } catch (e) {
        console.warn("Failed to fetch detail records:", e);
        setSavedDetails([]);
      }
    } catch (err: any) {
      console.warn("Failed to fetch historic records:", err);
      setSavedIssues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchArrivalsAndStocks();
  }, []);

  useEffect(() => {
    const fetchMastersAndPrepopulate = async () => {
      try {
        let list: any[] = [];
        if (supabase) {
          const { data, error } = await supabase.from('godown_master').select('*');
          if (!error && data) {
            list = data;
          }
        }
        if (!list || list.length === 0) {
          list = await dbModule.fetchAll('godown_master');
        }
        let parsedGodowns = [];
        if (list && list.length > 0) {
          parsedGodowns = list.map((g: any) => ({
            gdn_code: g.gdn_code,
            gdn_name: g.gdn_name,
            location: g.location || g.gdn_location || ''
          }));
        } else {
          parsedGodowns = [
            { gdn_code: 'GDN-01', gdn_name: 'MAIN GODOWN', location: 'MAIN WAREHOUSE' },
            { gdn_code: 'GDN-02', gdn_name: 'GODOWN-B', location: 'EAST SHED' },
            { gdn_code: 'GDN-03', gdn_name: 'GDW-A (RAW MAIN)', location: 'NORTH WAREHOUSE' }
          ];
        }
        setGodownRecords(parsedGodowns);
      } catch (e) {
        console.warn("Failed to load godowns from master:", e);
      }

      try {
        const deptList = await dbModule.fetchAll('department_master');
        let parsedDepts = [];
        if (deptList && deptList.length > 0) {
          parsedDepts = deptList.map((d: any) => ({
            dept_code: d.dept_code,
            dept_name: d.dept_name,
            location: d.location || ''
          }));
        } else {
          parsedDepts = DEFAULT_DEPARTMENTS.map(name => ({
            dept_code: name.replace(/[^A-Z0-9]/g, '').substring(0, 15).toUpperCase() || 'DEPT-NEW',
            dept_name: name,
            location: 'MAIN PLANT'
          }));
        }
        setDepartmentRecords(parsedDepts);
      } catch (e) {
        console.warn("Failed to load departments from master:", e);
      }
    };
    fetchMastersAndPrepopulate();
  }, []);

  const handleNew = () => {
    setFormData({
      financial_year: '2026-2027',
      issue_no: '',
      date: new Date().toISOString().split('T')[0],
      issue_type: 'factory Issue',
      mill_shift: 'A',
      department: 'BATCHING',
      department_code: 'BATCHING',
      department_location: 'FLOOR A',
      godown: 'N/A',
      godown_code: 'N/A',
      godown_location: 'N/A',
      stock_group: 'RAW JUTE',
      remarks: '',
      grade_name: '',
      unit: '',
      quantity: '',
      weight_mt: '',
      challan_no: '',
      gate_pass_no: '',
      lorry_number: '',
      party_name: '',
      destination_godown: '',
      requisition_no: '',
      issued_by: '',
      received_by: '',
      stack_no: '',
      jci: 'No',
      batch_order: '',
      requisition_date: new Date().toISOString().split('T')[0],
      issued_for: 'MAIN MILL'
    });
    setItems([]);
    setIssueRoute(null);
    setIsEditMode(false);
    setOriginalIssueNo(null);
    setValidationErrors({});
    showToast("Form initialized. Choose an issue route to proceed.");
  };

  const handleSave = async () => {
    if (!issueRoute) {
      showToast("Please choose an issue route before saving.");
      return;
    }

    const errors: Record<string, string> = {};

    if (!formData.financial_year?.trim()) {
      errors.financial_year = "Financial Year cannot be blank.";
    }
    if (!formData.issue_no?.trim()) {
      errors.issue_no = "Voucher Number cannot be blank.";
    }
    if (!formData.date?.trim()) {
      errors.date = "Voucher Date cannot be blank.";
    }

    if (items.length === 0) {
      showToast("Submission blocked: Please add at least one detail row to the allocation grid.");
      return;
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      showToast("Submission blocked: Please correct the highlighted errors.");
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    if (isEditMode && !enforceEditOrDeletePermission("Edit")) {
      return;
    }

    setValidationErrors({});
    setLoading(true);
    try {
      let masterPayload: any = {
        financial_year: formData.financial_year,
        issue_no: formData.issue_no,
        date: formData.date,
        issue_type: issueRoute === 'mill' ? 'SELL' : issueRoute.toUpperCase(),
        remarks: formData.remarks,
        issued_by: formData.issued_by,
        received_by: formData.received_by
      };

      if (issueRoute === 'godown') {
        masterPayload.godown = formData.godown || 'MAIN GODOWN';
        masterPayload.stack_no = formData.stack_no;
        masterPayload.requisition_no = formData.requisition_no;
        masterPayload.department = formData.department || 'N/A';
      } else if (issueRoute === 'mill') {
        masterPayload.requisition_no = formData.requisition_no;
        masterPayload.jci = formData.jci;
        masterPayload.batch_order = formData.batch_order;
        masterPayload.mill_shift = formData.mill_shift;
        masterPayload.department = formData.department || 'BATCHING';
        masterPayload.godown = formData.godown || 'MAIN GODOWN';
        masterPayload.destination_godown = formData.destination_godown || '';
        masterPayload.party_name = formData.party_name || 'BALLY JUTE COMPANY LIMITED';
      } else if (issueRoute === 'factory') {
        masterPayload.requisition_no = formData.requisition_no;
        masterPayload.requisition_date = formData.requisition_date;
        masterPayload.godown = formData.godown || 'MAIN GODOWN';
        masterPayload.issued_for = formData.issued_for;
        masterPayload.batch_order = formData.batch_order;
        masterPayload.lorry_number = formData.lorry_number;
        masterPayload.department = formData.issued_for || 'BATCHING';
      }

      const sqlVal = (v: any) => {
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return isFinite(v) ? String(v) : '0';
        return `'${String(v).replace(/'/g, "''")}'`;
      };

      if (isEditMode && originalIssueNo) {
        try {
          const masterCols = Object.keys(masterPayload);
          const updateSet = masterCols.map(k => `${k} = ${sqlVal(masterPayload[k])}`).join(', ');
          const txQueries: string[] = [
            `UPDATE mill_issue_master SET ${updateSet} WHERE issue_no = ${sqlVal(originalIssueNo)};`,
            `DELETE FROM mill_issue_detail WHERE issue_no = ${sqlVal(originalIssueNo)};`
          ];
          for (const it of items) {
            txQueries.push(
              `INSERT INTO mill_issue_detail (issue_no, srl, crop, grade_name, marka, qty, weight_kgs, area, agency, code, batch_name, unit, place, itg_no, rate, location_dest) VALUES (${sqlVal(formData.issue_no)}, ${Number(it.srl) || 1}, ${sqlVal(it.crop || '2025-26')}, ${sqlVal(it.grade_name || '')}, ${sqlVal(it.marka || '')}, ${Number(it.qty || 0)}, ${Number(it.weight_kgs || 0)}, ${sqlVal(it.area || '')}, ${sqlVal(it.agency || '')}, ${sqlVal(it.code || '')}, ${sqlVal(it.batch_name || '')}, ${sqlVal(it.unit || 'BALES')}, ${sqlVal(it.place || '')}, ${sqlVal(it.itg_no || '')}, ${Number(it.rate || 0)}, ${sqlVal(it.location_dest || '')});`
            );
          }
          await dbModule.executeTransaction(txQueries);
        } catch (_txErr) {
          await dbModule.update('mill_issue_master', 'issue_no', originalIssueNo, masterPayload);
          await dbModule.delete('mill_issue_detail', 'issue_no', originalIssueNo);

          for (const it of items) {
            await dbModule.insert('mill_issue_detail', {
              issue_no: formData.issue_no,
              srl: Number(it.srl),
              crop: it.crop || '2025-26',
              grade_name: it.grade_name || '',
              marka: it.marka || '',
              qty: Number(it.qty || 0),
              weight_kgs: Number(it.weight_kgs || 0),
              area: it.area || '',
              agency: it.agency || '',
              code: it.code || '',
              batch_name: it.batch_name || '',
              unit: it.unit || 'BALES',
              place: it.place || '',
              itg_no: it.itg_no || '',
              rate: Number(it.rate || 0),
              location_dest: it.location_dest || ''
            });
          }
        }

        setIsEditMode(true);
        setOriginalIssueNo(formData.issue_no);
        showToast(`Material Issue Voucher "${formData.issue_no}" successfully updated!`);
      } else {
        const allMasters = await dbModule.fetchAll('mill_issue_master').catch(() => []);
        const isDuplicate = allMasters.some((m: any) => m.issue_no.trim().toUpperCase() === formData.issue_no.trim().toUpperCase());
        if (isDuplicate) {
          setValidationErrors(prev => ({
            ...prev,
            issue_no: `Voucher number "${formData.issue_no}" already exists in records. Please change or edit the number.`
          }));
          showToast("Saving failed: Duplicate voucher number.");
          setLoading(false);
          if (containerRef.current) {
            containerRef.current.scrollIntoView({ behavior: 'smooth' });
          }
          return;
        }

        try {
          const masterCols = Object.keys(masterPayload);
          const masterVals = masterCols.map(k => sqlVal(masterPayload[k]));
          const txQueries: string[] = [
            `INSERT INTO mill_issue_master (${masterCols.join(', ')}) VALUES (${masterVals.join(', ')});`
          ];
          for (const it of items) {
            txQueries.push(
              `INSERT INTO mill_issue_detail (issue_no, srl, crop, grade_name, marka, qty, weight_kgs, area, agency, code, batch_name, unit, place, itg_no, rate, location_dest) VALUES (${sqlVal(formData.issue_no)}, ${Number(it.srl) || 1}, ${sqlVal(it.crop || '2025-26')}, ${sqlVal(it.grade_name || '')}, ${sqlVal(it.marka || '')}, ${Number(it.qty || 0)}, ${Number(it.weight_kgs || 0)}, ${sqlVal(it.area || '')}, ${sqlVal(it.agency || '')}, ${sqlVal(it.code || '')}, ${sqlVal(it.batch_name || '')}, ${sqlVal(it.unit || 'BALES')}, ${sqlVal(it.place || '')}, ${sqlVal(it.itg_no || '')}, ${Number(it.rate || 0)}, ${sqlVal(it.location_dest || '')});`
            );
          }
          await dbModule.executeTransaction(txQueries);
        } catch (_txErr) {
          await dbModule.insert('mill_issue_master', masterPayload);

          for (const it of items) {
            await dbModule.insert('mill_issue_detail', {
              issue_no: formData.issue_no,
              srl: Number(it.srl),
              crop: it.crop || '2025-26',
              grade_name: it.grade_name || '',
              marka: it.marka || '',
              qty: Number(it.qty || 0),
              weight_kgs: Number(it.weight_kgs || 0),
              area: it.area || '',
              agency: it.agency || '',
              code: it.code || '',
              batch_name: it.batch_name || '',
              unit: it.unit || 'BALES',
              place: it.place || '',
              itg_no: it.itg_no || '',
              rate: Number(it.rate || 0),
              location_dest: it.location_dest || ''
            });
          }
        }

        setIsEditMode(true);
        setOriginalIssueNo(formData.issue_no);
        showToast(`Material Issue Voucher "${formData.issue_no}" successfully saved!`);
      }

      screenDraftService.clearDraft('material_issue_form');
      screenDraftService.clearDraft('material_issue_items');
      handleNew();
      await fetchRecords();
      setViewState('list');
      onSave?.(formData);
    } catch (err: any) {
      console.error("Error saving Material Issue voucher:", err);
      alert(`Database Operation Failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const loadIssueIntoForm = async (masterRecord: any) => {
    setLoading(true);
    try {
      const allDetails = await dbModule.fetchAll('mill_issue_detail');
      const filtered = allDetails.filter((d: any) => d.issue_no === masterRecord.issue_no);
      filtered.sort((a: any, b: any) => a.srl - b.srl);

      const matchedGdn = godownRecords.find(g => 
        (g.gdn_name || '').toUpperCase() === (masterRecord.godown || '').toUpperCase() || 
        (g.gdn_code || '').toUpperCase() === (masterRecord.godown || '').toUpperCase()
      );
      const matchedDept = departmentRecords.find(d => 
        (d.dept_name || '').toUpperCase() === (masterRecord.department || '').toUpperCase() || 
        (d.dept_code || '').toUpperCase() === (masterRecord.department || '').toUpperCase()
      );

      let rRoute: 'godown' | 'mill' | 'factory' = 'factory';
      const ty = (masterRecord.issue_type || '').toUpperCase();
      if (ty === 'GODOWN') rRoute = 'godown';
      else if (ty === 'MILL' || ty === 'SELL') rRoute = 'mill';
      else rRoute = 'factory';

      setIssueRoute(rRoute);

      setFormData({
        financial_year: masterRecord.financial_year || '2026-2027',
        issue_no: masterRecord.issue_no,
        date: masterRecord.date,
        issue_type: masterRecord.issue_type || 'FACTORY ISSUE',
        mill_shift: masterRecord.mill_shift || 'A',
        department: masterRecord.department || 'BATCHING',
        department_code: matchedDept ? matchedDept.dept_code : `DEPT-${(masterRecord.department || '').replace(/[^A-Za-z0-9]/g, '').substring(0, 8).toUpperCase()}`,
        department_location: matchedDept ? (matchedDept.location || '') : '',
        godown: masterRecord.godown || 'N/A',
        godown_code: matchedGdn ? matchedGdn.gdn_code : `GDN-${(masterRecord.godown || '').replace(/[^A-Za-z0-9]/g, '').substring(0, 8).toUpperCase()}`,
        godown_location: matchedGdn ? (matchedGdn.location || matchedGdn.gdn_location || '') : '',
        stock_group: masterRecord.stock_group || 'RAW JUTE',
        remarks: masterRecord.remarks || '',
        grade_name: masterRecord.grade_name || '',
        unit: masterRecord.unit || '',
        quantity: masterRecord.quantity !== null && masterRecord.quantity !== undefined ? masterRecord.quantity.toString() : '',
        weight_mt: masterRecord.weight_mt !== null && masterRecord.weight_mt !== undefined ? masterRecord.weight_mt.toString() : '',
        challan_no: masterRecord.challan_no || '',
        gate_pass_no: masterRecord.gate_pass_no || '',
        lorry_number: masterRecord.lorry_number || '',
        party_name: masterRecord.party_name || '',
        destination_godown: masterRecord.destination_godown || '',
        requisition_no: masterRecord.requisition_no || '',
        issued_by: masterRecord.issued_by || '',
        received_by: masterRecord.received_by || '',
        stack_no: masterRecord.stack_no || '',
        jci: masterRecord.jci || 'No',
        batch_order: masterRecord.batch_order || '',
        requisition_date: masterRecord.requisition_date || new Date().toISOString().split('T')[0],
        issued_for: masterRecord.issued_for || 'MAIN MILL'
      });

      const mappedDetails = filtered.map((d: any, idx: number) => ({
        srl: d.srl || (idx + 1),
        crop: d.crop || '2025-26',
        grade_name: d.grade_name || 'TD5',
        marka: d.marka || 'NO MARK',
        qty: Number(d.qty || 0),
        weight_kgs: Number(d.weight_kgs || 0),
        area: d.area || '',
        agency: d.agency || '',
        code: d.code || '',
        batch_name: d.batch_name || d.batch || '',
        unit: d.unit || 'BALES',
        place: d.place || '',
        itg_no: d.itg_no || '',
        rate: Number(d.rate || 0),
        location_dest: d.location_dest || ''
      }));

      setItems(mappedDetails);
      setIsEditMode(true);
      setOriginalIssueNo(masterRecord.issue_no);
      setViewState('entry');
      showToast(`Voucher "${masterRecord.issue_no}" loaded successfully.`);
    } catch (err: any) {
      console.error("Failed to load details for issue voucher:", err);
      alert("Error loading details from database.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreparePrint = async (record: any) => {
    setLoading(true);
    try {
      const allDetails = await dbModule.fetchAll('mill_issue_detail');
      const filtered = allDetails.filter((d: any) => d.issue_no === record.issue_no);
      filtered.sort((a: any, b: any) => a.srl - b.srl);

      const matchedGdn = godownRecords.find(g => 
        (g.gdn_name || '').toUpperCase() === (record.godown || '').toUpperCase() || 
        (g.gdn_code || '').toUpperCase() === (record.godown || '').toUpperCase()
      );
      const matchedDept = departmentRecords.find(d => 
        (d.dept_name || '').toUpperCase() === (record.department || '').toUpperCase() || 
        (d.dept_code || '').toUpperCase() === (record.department || '').toUpperCase()
      );

      setFormData(prev => ({
        ...prev,
        financial_year: record.financial_year || '2026-2027',
        issue_no: record.issue_no,
        date: record.date,
        issue_type: record.issue_type || 'FACTORY ISSUE',
        mill_shift: record.mill_shift || 'A',
        department: record.department,
        department_code: matchedDept ? matchedDept.dept_code : `DEPT-${(record.department || '').replace(/[^A-Za-z0-9]/g, '').substring(0, 8).toUpperCase()}`,
        department_location: matchedDept ? (matchedDept.location || '') : '',
        godown: record.godown,
        godown_code: matchedGdn ? matchedGdn.gdn_code : `GDN-${(record.godown || '').replace(/[^A-Za-z0-9]/g, '').substring(0, 8).toUpperCase()}`,
        godown_location: matchedGdn ? (matchedGdn.location || matchedGdn.gdn_location || '') : '',
        stock_group: record.stock_group || 'RAW JUTE',
        remarks: record.remarks || '',
        grade_name: record.grade_name || '',
        unit: record.unit || '',
        quantity: record.quantity !== null && record.quantity !== undefined ? record.quantity.toString() : '',
        weight_mt: record.weight_mt !== null && record.weight_mt !== undefined ? record.weight_mt.toString() : '',
        challan_no: record.challan_no || '',
        gate_pass_no: record.gate_pass_no || '',
        lorry_number: record.lorry_number || '',
        party_name: record.party_name || '',
        destination_godown: record.destination_godown || '',
        requisition_no: record.requisition_no || '',
        issued_by: record.issued_by || '',
        received_by: record.received_by || ''
      }));
      setItems(filtered);
      setShowPrintView(true);
    } catch (e) {
      console.error("Failed to load details for print:", e);
      alert("Error loading details from database.");
    } finally {
      setLoading(false);
    }
  };

  const handleDashboardDelete = async (issueNo: string) => {
    if (!enforceEditOrDeletePermission("Delete")) return;
    const conf = window.confirm(`CRITICAL DELETION:\nAre you sure you want to permanently erase the Material Issue Voucher "${issueNo}"? This action cannot be undone!`);
    if (!conf) return;

    setLoading(true);
    try {
      const esc = (v: string) => `'${v.replace(/'/g, "''")}'`;
      try {
        await dbModule.executeTransaction([
          `DELETE FROM mill_issue_detail WHERE issue_no = ${esc(issueNo)};`,
          `DELETE FROM mill_issue_master WHERE issue_no = ${esc(issueNo)};`
        ]);
      } catch (_txErr) {
        await dbModule.delete('mill_issue_detail', 'issue_no', issueNo);
        await dbModule.delete('mill_issue_master', 'issue_no', issueNo);
      }
      showToast(`Voucher "${issueNo}" deleted successfully.`);
      await fetchRecords();
      if (selectedRecordId === issueNo) setSelectedRecordId(null);
    } catch (err: any) {
      console.error("Failed to delete voucher:", err);
      alert(`Deletion Failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const filteredRecordsList = savedIssues.filter(record => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || (
        (record.issue_no || '').toLowerCase().includes(q) ||
        (record.department || '').toLowerCase().includes(q) ||
        (record.godown || '').toLowerCase().includes(q) ||
        (record.destination_godown || '').toLowerCase().includes(q) ||
        (record.requisition_no || '').toLowerCase().includes(q) ||
        (record.issue_type || '').toLowerCase().includes(q) ||
        (record.stock_group || '').toLowerCase().includes(q) ||
        (record.remarks || '').toLowerCase().includes(q)
      );

      let matchDateRange = true;
      if (startDateFilter && record.date) {
        matchDateRange = matchDateRange && (record.date >= startDateFilter);
      }
      if (endDateFilter && record.date) {
        matchDateRange = matchDateRange && (record.date <= endDateFilter);
      }

      return matchSearch && matchDateRange;
    });

    if (filteredRecordsList.length === 0) {
      alert("No records found to export.");
      return;
    }

    const headers = [
      "Voucher Date",
      "Issue No",
      "Department",
      "Destination Godown",
      "Source P.O. Number",
      "Stock Group",
      "Issue Type",
      "Total Bales",
      "Total Weight (KGS)",
      "Total Weight (MT)",
      "Remarks"
    ];

    const rows = filteredRecordsList.map(r => {
      const rDetails = savedDetails.filter(d => d.issue_no === r.issue_no);
      const bales = rDetails.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
      const weightKgs = rDetails.reduce((sum, item) => sum + (Number(item.weight_kgs) || 0), 0);
      const weightMt = weightKgs / 1000;

      return [
        r.date || '',
        r.issue_no || '',
        r.department || '',
        r.destination_godown || r.godown || '',
        r.requisition_no || '',
        r.stock_group || '',
        r.issue_type || '',
        bales,
        weightKgs,
        weightMt.toFixed(3),
        (r.remarks || '').replace(/"/g, '""')
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Material_Issues_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFormCancel = () => {
    if (viewState === 'entry') {
      setViewState('list');
      handleNew();
    } else {
      onCancel?.();
    }
  };

  if (viewState === 'list') {
    const listContent = (
      <MaterialIssueRegisterView
        savedIssues={savedIssues}
        savedDetails={savedDetails}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        startDateFilter={startDateFilter}
        setStartDateFilter={setStartDateFilter}
        endDateFilter={endDateFilter}
        setEndDateFilter={setEndDateFilter}
        selectedRecordId={selectedRecordId}
        setSelectedRecordId={setSelectedRecordId}
        loading={loading}
        successToast={successToast}
        setSuccessToast={setSuccessToast}
        listCurrentPage={listCurrentPage}
        listPageSize={listPageSize}
        setListCurrentPage={setListCurrentPage}
        setListPageSize={setListPageSize}
        fetchRecords={fetchRecords}
        handleExportCSV={handleExportCSV}
        handleNew={handleNew}
        setViewState={setViewState}
        loadIssueIntoForm={loadIssueIntoForm}
        handlePreparePrint={handlePreparePrint}
        handleDashboardDelete={handleDashboardDelete}
      />
    );

    return (
      <>
        {embedded ? (
          listContent
        ) : (
          <LegacyLayout 
            title="Issue"
            subtitle=""
            onClose={handleFormCancel}
            onMaximize={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              } else {
                document.documentElement.requestFullscreen().catch(() => {});
              }
            }}
          >
            {listContent}
          </LegacyLayout>
        )}
        <PrintModal
          isOpen={showPrintView}
          onClose={() => setShowPrintView(false)}
          title={`MATERIAL ISSUE VOUCHER - ${formData?.issue_no || ''}`}
        >
          <MaterialIssuePrintSlip 
            master={formData} 
            details={items} 
          />
        </PrintModal>
      </>
    );
  }

  return (
    <>
      <MaterialIssueEntry
        formData={formData}
        setFormData={setFormData}
        items={items}
        setItems={setItems}
        issueRoute={issueRoute}
        setIssueRoute={setIssueRoute}
        finalArrivals={finalArrivals}
        godownRecords={godownRecords}
        isEditMode={isEditMode}
        validationErrors={validationErrors}
        setValidationErrors={setValidationErrors}
        handleSave={handleSave}
        handleFormCancel={handleFormCancel}
        showToast={showToast}
        successToast={successToast}
        setSuccessToast={setSuccessToast}
        containerRef={containerRef}
        setCurrentPage={setCurrentPage}
        closePage={closePage}
        embedded={embedded}
      />
      
      <PrintModal
        isOpen={showPrintView}
        onClose={() => setShowPrintView(false)}
        title={`MATERIAL ISSUE VOUCHER - ${formData?.issue_no || ''}`}
      >
        <MaterialIssuePrintSlip 
          master={formData} 
          details={items} 
        />
      </PrintModal>
    </>
  );
}
