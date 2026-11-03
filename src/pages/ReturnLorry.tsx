import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  RefreshCw,
  Search,
  FileText,
  CheckCircle2,
  Scale,
  Hash,
  ArrowLeft,
  Save,
  X,
  Lock,
  Edit3,
} from 'lucide-react';
import LegacyLayout, { LegacyFieldset } from '../components/LegacyLayout';
import {
  ReturnLorryRecord,
  ReturnLorryItemRow,
  fetchAllReturnLorries,
  syncAllReturnLorriesFromInspections,
  saveReturnLorryToSaudaCheckPoint,
} from '../services/returnLorryService';
import { useLiveAutoRefresh } from '../hooks/useLiveAutoRefresh';

interface ReturnLorryProps {
  onClose?: () => void;
  selectedYear?: string;
}

export default function ReturnLorry({ onClose }: ReturnLorryProps) {
  const [records, setRecords] = useState<ReturnLorryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'register' | 'form'>('register');
  const [activeRecord, setActiveRecord] = useState<ReturnLorryRecord | null>(null);
  const [bRateInput, setBRateInput] = useState<string>('');
  const [itemRates, setItemRates] = useState<Record<number, string>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const loadRecords = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const list = await fetchAllReturnLorries();
      setRecords(list);
      if (activeRecord) {
        const updatedActive = list.find((r) => r.mr_no === activeRecord.mr_no);
        if (updatedActive) {
          setActiveRecord(updatedActive);
        }
      }
    } catch (err) {
      console.error('Failed to load Return Lorry records:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords(true);
  }, []);

  useLiveAutoRefresh(() => {
    loadRecords(false);
  }, ['return_lorry', 'material_inspection', 'sauda_check_point']);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const synced = await syncAllReturnLorriesFromInspections();
      setRecords(synced);
      showToast(
        'success',
        `Loaded ${synced.length} Mill Inspection (< 5 MT) Return Lorry record(s).`
      );
    } catch (_e) {
      showToast('error', 'Failed to refresh Mill Inspection (< 5 MT) records.');
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenRecordInForm = (rec: ReturnLorryRecord) => {
    setActiveRecord(rec);
    const initialBRate = Number(rec.b_rate) > 0 ? String(rec.b_rate) : '';
    setBRateInput(initialBRate);

    const initialRowRates: Record<number, string> = {};
    (rec.items || []).forEach((it, idx) => {
      const srl = it.srl_no || idx + 1;
      const rVal = Number(it.rate_qntl) > 0 ? String(it.rate_qntl) : initialBRate;
      initialRowRates[srl] = rVal;
    });
    setItemRates(initialRowRates);
    setViewMode('form');
  };

  const handleBRateChange = (val: string) => {
    setBRateInput(val);
    if (!activeRecord) return;
    const nextRowRates: Record<number, string> = {};
    (activeRecord.items || []).forEach((it, idx) => {
      const srl = it.srl_no || idx + 1;
      nextRowRates[srl] = val;
    });
    setItemRates(nextRowRates);
  };

  const handleItemRateChange = (srl: number, val: string, isFirstRow: boolean) => {
    setItemRates((prev) => ({
      ...prev,
      [srl]: val,
    }));
    if (isFirstRow || !bRateInput) {
      setBRateInput(val);
    }
  };

  const hasEnteredRate = useMemo(() => {
    if (Number(bRateInput) > 0) return true;
    return Object.values(itemRates).some((v) => Number(v) > 0);
  }, [bRateInput, itemRates]);

  const handleSaveToSaudaCheckPoint = async () => {
    if (!activeRecord) return;

    const numericBRate = Number(bRateInput) || 0;
    const anyRowRate = Object.values(itemRates)
      .map((v) => Number(v) || 0)
      .find((n) => n > 0) || 0;
    const finalBRate = numericBRate > 0 ? numericBRate : anyRowRate;

    if (finalBRate <= 0) {
      showToast('error', 'Please enter the Rate (Rate / Qntl or B Rate) before saving.');
      return;
    }

    setSaving(true);
    try {
      const updatedItems: ReturnLorryItemRow[] = (activeRecord.items || []).map((it, idx) => {
        const srl = it.srl_no || idx + 1;
        const rowRate = Number(itemRates[srl]) > 0 ? Number(itemRates[srl]) : finalBRate;
        return {
          ...it,
          srl_no: srl,
          rate_qntl: rowRate,
        };
      });

      const recordToSave: ReturnLorryRecord = {
        ...activeRecord,
        b_rate: finalBRate,
        items: updatedItems,
      };

      const saved = await saveReturnLorryToSaudaCheckPoint(recordToSave);
      setActiveRecord(saved);
      await loadRecords(false);

      showToast(
        'success',
        `Saved 4000-Series P.O. ${saved.new_po_no} (M.R. ${saved.mr_no}) with Rate ₹${finalBRate.toLocaleString('en-IN')} and moved to Sauda Check Point!`
      );
      setViewMode('register');
    } catch (err: any) {
      showToast('error', `Failed to save Return Lorry: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        (r.new_po_no || '').toLowerCase().includes(q) ||
        (r.reference_po_no || '').toLowerCase().includes(q) ||
        (r.mr_no || '').toLowerCase().includes(q) ||
        (r.arrival_no || '').toLowerCase().includes(q) ||
        (r.supplier || '').toLowerCase().includes(q) ||
        (r.supplier_name || '').toLowerCase().includes(q) ||
        (r.broker || '').toLowerCase().includes(q) ||
        (r.broker_name || '').toLowerCase().includes(q) ||
        (r.lorry_number || '').toLowerCase().includes(q) ||
        (r.area || '').toLowerCase().includes(q)
    );
  }, [records, searchTerm]);

  const totalWeightMt = useMemo(
    () => filteredRecords.reduce((acc, r) => acc + (Number(r.received_weight_mt) || 0), 0),
    [filteredRecords]
  );

  const savedToScpCount = useMemo(
    () => filteredRecords.filter((r) => r.saved_to_sauda_checkpoint && Number(r.b_rate) > 0).length,
    [filteredRecords]
  );

  const pendingRateCount = useMemo(
    () => filteredRecords.length - savedToScpCount,
    [filteredRecords, savedToScpCount]
  );

  // ============================================================================
  // FULL FORM VIEW — EXACT SAME-TO-SAME COPY OF SAUDA CHECK POINT ENTRY FORM
  // All fields pre-filled from Mill Inspection (< 5 MT) and non-editable,
  // EXCEPT Rate (Rate / Qntl & B Rate) which user manually inputs.
  // ============================================================================
  if (viewMode === 'form' && activeRecord) {
    const displayPoNo = hasEnteredRate || activeRecord.saved_to_sauda_checkpoint
      ? activeRecord.new_po_no
      : `${activeRecord.new_po_no} (Auto-Generated on Rate Input)`;

    const formItems: ReturnLorryItemRow[] =
      activeRecord.items && activeRecord.items.length > 0
        ? activeRecord.items
        : [
            {
              return_po_no: activeRecord.new_po_no,
              reference_po_no: activeRecord.reference_po_no,
              mr_no: activeRecord.mr_no,
              srl_no: 1,
              crop_year: '2026-27',
              grade_code: 'TD5',
              grade_name: 'TD5',
              agency_code: '',
              agency_name: '',
              marka_code: '',
              marka_name: '',
              quantity: activeRecord.total_units || 0,
              weight_mt: activeRecord.received_weight_mt || 0,
              rate_qntl: Number(bRateInput) || 0,
              premium: 0,
            },
          ];

    return (
      <LegacyLayout
        title="SAUDA CHECK POINT ENTRY (RETURN LORRY)"
        subtitle={`Mill Inspection M.R. ${activeRecord.mr_no} • 4000-Series P.O. ${activeRecord.new_po_no}`}
        onClose={() => setViewMode('register')}
      >
        <div className="flex-1 flex flex-col font-sans text-slate-800 space-y-4 w-full pb-10 text-[11px]">
          {/* Toast Notification */}
          {toast && (
            <div
              className={`px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-between shadow-sm ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : toast.type === 'error'
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-slate-500 hover:text-slate-800 font-black px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Header Bar - Same as Sauda Check Point Form (`PurchaseOrderFormView.tsx`) */}
          <div className="bg-[#D94B5A] text-white px-5 py-2.5 rounded-lg shadow-md flex flex-wrap items-center justify-between border border-[#F06D6C] gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-800/40 border border-emerald-400/40 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="bg-[#0b2415] text-amber-300 text-[10px] font-extrabold px-2 py-0 rounded border border-emerald-700/60 tracking-wider w-fit">
                  Mill Inspection (&lt; 5 MT) Return Lorry
                </span>
                <h1 className="text-base md:text-lg font-black uppercase tracking-wider text-amber-300 drop-shadow mt-0.5 leading-tight">
                  RETURN LORRY SAUDA CHECK POINT ENTRY — {activeRecord.new_po_no}
                </h1>
                <p className="text-[11px] font-bold text-amber-300 tracking-wide mt-0.5 flex flex-wrap items-center gap-1.5 leading-tight">
                  <span>Session: BJCL/{activeRecord.financial_year || '2026-2027'}/</span>
                  <span>•</span>
                  <span>Mill Inspection M.R. No: {activeRecord.mr_no}</span>
                  <span>•</span>
                  <span>Lorry: {activeRecord.lorry_number || '-'} ({Number(activeRecord.received_weight_mt || 0).toFixed(3)} MT)</span>
                </p>
              </div>
            </div>

            {/* Right Controls: Switch M.R. & Back to Register */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#0b2415]/70 px-2.5 py-1 rounded border border-emerald-400/40">
                <span className="text-[10px] font-bold text-amber-300 uppercase whitespace-nowrap">
                  M.R. (&lt; 5 MT):
                </span>
                <select
                  aria-label="Select Mill Inspection Return Lorry MR"
                  value={activeRecord.mr_no}
                  onChange={(e) => {
                    const found = records.find((r) => r.mr_no === e.target.value);
                    if (found) handleOpenRecordInForm(found);
                  }}
                  className="bg-white text-slate-900 text-xs font-bold px-2 py-0.5 rounded border border-slate-300 outline-none cursor-pointer"
                >
                  {records.map((r) => (
                    <option key={r.mr_no} value={r.mr_no}>
                      {r.mr_no} — {r.lorry_number || 'Lorry'} ({Number(r.received_weight_mt || 0).toFixed(3)} MT)
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setViewMode('register')}
                className="px-3 py-1.5 bg-[#0b2415]/80 hover:bg-[#123920] border border-emerald-400/50 rounded-md text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
                <span>Back</span>
              </button>
            </div>
          </div>

          {/* Form Body — Exact Same-to-Same Copy of Sauda Check Point Form (`PurchaseOrderFormHeader` + `PoItemsGrid`) */}
          <div className="space-y-5 w-full">
            <LegacyFieldset legend="Purchase Order Information Header">
              <div className="grid grid-cols-12 gap-x-2 gap-y-1.5">
                {/* Notice Ribbon */}
                <div className="col-span-12 mb-1 p-1.5 bg-amber-50 border border-amber-300 text-[10.5px] text-amber-950 flex flex-wrap items-center justify-between gap-2 font-semibold rounded-sm">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                    <span>
                      All fields below are pre-filled directly from <strong>Mill Inspection ({activeRecord.mr_no})</strong> and are non-editable. Only <strong>Rate</strong> is open for manual entry.
                    </span>
                  </div>
                  <span className="bg-red-800 text-white px-2 py-0.5 rounded text-[10px] font-black font-mono">
                    4000-Series P.O: {activeRecord.new_po_no}
                  </span>
                </div>

                {/* ROW 1 */}
                <div className="col-span-12 sm:col-span-6 lg:col-span-2 flex items-center gap-1">
                  <label className="whitespace-nowrap shrink-0 text-[10px] font-bold">
                    Purchase Order
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={activeRecord.purchase_order || 'FINAL PO'}
                    className="w-full bg-slate-100 border border-slate-400 p-0.5 outline-none font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-2 flex items-center gap-1 lg:pl-4">
                  <label className="min-w-[30px] font-bold">Type</label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={activeRecord.po_type || 'Normal'}
                    className="w-full bg-slate-100 border border-slate-400 p-0.5 outline-none font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-2 flex items-center gap-1 lg:pl-4">
                  <label className="whitespace-nowrap flex items-center gap-1 text-[11px] font-extrabold text-slate-500">
                    <input
                      type="checkbox"
                      disabled
                      checked={false}
                      className="w-3.5 h-3.5 cursor-not-allowed"
                    />
                    P.T.F Mode
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={activeRecord.ptf_no || ''}
                    className="flex-1 bg-slate-100 border border-slate-400 p-0.5 outline-none font-bold text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div className="lg:pl-6 col-span-12 sm:col-span-6 lg:col-span-2 flex items-center gap-1 whitespace-nowrap">
                  <label className="mr-1 min-w-[50px] font-bold">Pending</label>
                  <input
                    type="radio"
                    disabled
                    checked={true}
                    readOnly
                    className="mr-0.5 w-3 h-3 cursor-not-allowed"
                  />{' '}
                  Yes
                  <input
                    type="radio"
                    disabled
                    checked={false}
                    readOnly
                    className="ml-2 mr-0.5 w-3 h-3 cursor-not-allowed"
                  />{' '}
                  No
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-2 flex items-center gap-1">
                  <label className="whitespace-nowrap min-w-[70px] font-bold text-red-900">
                    P.O Contract
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={displayPoNo}
                    title="Auto-Generated 4000-Series P.O. Number"
                    className="flex-1 bg-red-50 border-2 border-red-600 p-0.5 outline-none font-mono font-black text-red-900 cursor-not-allowed"
                  />
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-2 flex items-center gap-1">
                  <label className="ml-0 sm:ml-2 min-w-[45px] font-bold">P.O Date</label>
                  <input
                    type="date"
                    readOnly
                    disabled
                    value={activeRecord.po_date || activeRecord.mr_date || ''}
                    className="flex-1 bg-slate-100 border border-slate-400 p-0.5 outline-none text-slate-700 font-bold cursor-not-allowed"
                  />
                </div>

                {/* ROW 2: Broker, Supplier, M.R. No */}
                <div className="col-span-12 md:col-span-6 lg:col-span-4 flex items-center gap-2">
                  <label className="w-24 sm:w-32 md:w-40 text-right shrink-0 font-bold">Broker</label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={activeRecord.broker_name || activeRecord.broker || ''}
                    className="flex-1 bg-[#FDE7E6] border border-slate-400 p-1 outline-none font-bold text-slate-900 uppercase cursor-not-allowed"
                  />
                </div>

                <div className="col-span-12 md:col-span-6 lg:col-span-4 flex items-center gap-2">
                  <label className="w-24 sm:w-32 md:w-40 text-right shrink-0 font-bold">Supplier</label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={activeRecord.supplier_name || activeRecord.supplier || ''}
                    className="flex-1 bg-[#FDE7E6] border border-slate-400 p-1 outline-none font-bold text-slate-900 uppercase cursor-not-allowed"
                  />
                </div>

                <div className="col-span-12 md:col-span-6 lg:col-span-4 flex items-center gap-2">
                  <label className="w-24 sm:w-32 md:w-36 text-right shrink-0 font-bold text-red-900">
                    M.R. No / Lorry No
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={`${activeRecord.mr_no}  |  ${activeRecord.lorry_number || '-'}`}
                    className="flex-1 bg-slate-100 border border-slate-400 p-1 outline-none font-mono font-black text-slate-900 cursor-not-allowed"
                  />
                </div>

                {/* ROW 3: Challan Supplier & Arrival Info */}
                <div className="col-span-12 md:col-span-6 lg:col-span-4 flex items-center gap-2">
                  <label className="w-24 sm:w-32 md:w-40 whitespace-nowrap text-right shrink-0 font-bold">
                    Challan Supplier
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={activeRecord.challan_supplier || activeRecord.supplier_name || ''}
                    className="flex-1 bg-[#FDE7E6] border border-slate-400 p-1 outline-none font-bold text-slate-900 uppercase cursor-not-allowed"
                  />
                </div>

                <div className="col-span-12 md:col-span-6 lg:col-span-4 flex items-center gap-2">
                  <label className="w-24 sm:w-32 md:w-40 text-right shrink-0 font-bold">
                    Arrival No / Date
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={`${activeRecord.arrival_no || activeRecord.mr_no} (${activeRecord.arrival_date || activeRecord.mr_date || '-'})`}
                    className="flex-1 bg-slate-100 border border-slate-400 p-1 outline-none font-mono font-bold text-slate-800 cursor-not-allowed"
                  />
                </div>

                <div className="col-span-12 md:col-span-6 lg:col-span-4 flex items-center gap-2">
                  <label className="w-24 sm:w-32 md:w-36 text-right shrink-0 font-bold">
                    Moist / Dust / NCV Clm
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={`M: ${activeRecord.claim_moisture || 0}% | D: ${activeRecord.claim_dust || 0}% | NCV: ${activeRecord.claim_ncv || 0}%`}
                    className="flex-1 bg-slate-100 border border-slate-400 p-1 outline-none font-mono font-bold text-slate-800 cursor-not-allowed"
                  />
                </div>

                {/* ROW 4: Area & Transportation Charges */}
                <div className="col-span-12 lg:col-span-6 flex items-center gap-2">
                  <label className="w-24 sm:w-32 md:w-40 text-right shrink-0 font-bold">Area</label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={activeRecord.area || formItems[0]?.area || ''}
                    className="flex-1 bg-[#FDE7E6] border border-slate-400 p-1 outline-none font-bold text-slate-900 uppercase cursor-not-allowed"
                  />
                </div>

                <div className="col-span-12 lg:col-span-6 flex items-center gap-2">
                  <label className="whitespace-nowrap w-24 sm:w-32 md:w-48 text-right shrink-0 font-bold">
                    Transportation Charges paid by
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={activeRecord.trans_paid_by || 'PARTY'}
                    className="w-28 bg-slate-100 border border-slate-400 p-0.5 outline-none font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>

                {/* ROW 5: Against Cancellation, Purchase Unit, Weight/Unit */}
                <div className="col-span-12 flex flex-wrap items-center gap-y-2 gap-x-4 mb-1 mt-1 font-normal">
                  <div className="flex items-center gap-2">
                    <label className="w-24 sm:w-32 md:w-40 text-right whitespace-nowrap font-bold shrink-0">
                      Against Cancellation
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.against_cancellation || 'No'}
                      className="w-16 bg-slate-100 border border-slate-400 p-0.5 text-center outline-none text-slate-700 font-semibold cursor-not-allowed"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="whitespace-nowrap font-bold">Purchase Unit</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.purchase_unit_code || '1'}
                      className="w-12 bg-slate-100 border border-slate-400 p-0.5 outline-none text-center text-slate-700 font-bold font-mono cursor-not-allowed"
                    />
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.purchase_unit_name || activeRecord.unit_name || 'BALES'}
                      className="w-24 bg-slate-100 border border-slate-400 p-0.5 outline-none text-center text-slate-700 font-bold cursor-not-allowed"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="whitespace-nowrap font-bold">Weight/Unit (Kgs.)</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.weight_unit_kgs || 147.5}
                      className="w-16 bg-slate-100 border border-slate-400 p-0.5 outline-none text-right font-bold text-slate-700 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* ROW 6: 5-Column Lorries & Weight Box */}
                <div className="col-span-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-1 border border-slate-400 p-1 bg-gray-50/50">
                  <div className="flex items-center gap-1 justify-between">
                    <label className="whitespace-nowrap pr-1 text-right w-full text-indigo-900 font-bold text-[10px]">
                      Total No of Lorries
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.total_lorries || 1}
                      className="w-12 bg-slate-100 border border-slate-400 p-0.5 outline-none text-right font-extrabold text-[#7c2d12] cursor-not-allowed"
                    />
                  </div>
                  <div className="flex items-center gap-1 justify-between">
                    <label className="whitespace-nowrap pr-1 text-right w-full text-indigo-900 font-bold text-[10px]">
                      Units / Lorry
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.units_per_lorry || activeRecord.total_units || 0}
                      className="w-16 bg-slate-100 border border-slate-400 p-0.5 outline-none text-right font-extrabold text-[#7c2d12] cursor-not-allowed"
                    />
                  </div>
                  <div className="flex items-center gap-1 justify-between">
                    <label className="whitespace-nowrap pr-1 text-right w-full text-indigo-900 font-bold text-[10px]">
                      Total Units
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.total_units || 0}
                      className="w-16 bg-slate-100 border border-slate-400 p-0.5 outline-none text-right font-extrabold text-[#7c2d12] cursor-not-allowed"
                    />
                  </div>
                  <div className="flex items-center gap-1 justify-between">
                    <label className="whitespace-nowrap pr-1 text-right w-full text-indigo-900 font-bold text-[10px]">
                      Weight/Lorry (M.Ton)
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={Number(activeRecord.received_weight_mt || 0).toFixed(3)}
                      className="w-16 bg-red-50 border border-red-400 p-0.5 outline-none text-right font-extrabold text-red-800 cursor-not-allowed"
                    />
                  </div>
                  <div className="flex items-center gap-1 justify-between col-span-2 sm:col-span-1">
                    <label className="whitespace-nowrap pr-1 text-right w-full text-indigo-900 font-bold text-[10px]">
                      Total Contract (M.Ton)
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={Number(activeRecord.received_weight_mt || 0).toFixed(3)}
                      className="w-16 bg-red-50 border border-red-400 p-0.5 outline-none text-right font-extrabold text-blue-900 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* ROW 7: Marka Type, Marka Penalty, Quantity Penalty */}
                <div className="col-span-12 grid grid-cols-12 gap-2 mb-2 mt-1">
                  <div className="col-span-12 sm:col-span-4 flex items-center gap-2">
                    <label className="w-24 text-right shrink-0 font-bold">Marka Type</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.marka_type || 'Normal'}
                      className="flex-1 bg-slate-100 border border-slate-400 p-0.5 outline-none font-bold text-slate-700 cursor-not-allowed"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-4 flex items-center gap-2">
                    <label className="w-24 sm:w-32 text-right shrink-0 font-bold">Marka Penalty</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.marka_penalty || 0}
                      className="flex-1 bg-slate-100 border border-slate-400 p-0.5 outline-none text-right font-normal text-slate-700 cursor-not-allowed"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-4 flex items-center gap-2">
                    <label className="w-24 sm:w-32 text-right shrink-0 font-bold">Quantity Penalty</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.qty_penalty || 0}
                      className="flex-1 bg-slate-100 border border-slate-400 p-0.5 outline-none text-right font-normal text-slate-700 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="col-span-12 border-b border-slate-400 mb-2"></div>

                {/* Detailed sections below divider */}
                <div className="col-span-12 grid grid-cols-12 gap-x-2 gap-y-1.5">
                  <div className="col-span-12 flex flex-wrap items-center gap-2 mt-1">
                    <label className="w-24 font-bold italic shrink-0">Delivery --&gt;From</label>
                    <input
                      type="date"
                      readOnly
                      disabled
                      value={activeRecord.delivery_from || activeRecord.arrival_date || activeRecord.mr_date || ''}
                      className="w-28 p-0.5 outline-none font-semibold border bg-[#FDE7E6] border-sky-300 text-sky-950 cursor-not-allowed"
                    />
                    <label className="mx-2 shrink-0 font-bold">To</label>
                    <input
                      type="date"
                      readOnly
                      disabled
                      value={activeRecord.delivery_to || activeRecord.unloading_date || activeRecord.mr_date || ''}
                      className="w-28 p-0.5 outline-none font-semibold border bg-[#FDE7E6] border-sky-300 text-sky-950 cursor-not-allowed"
                    />
                    <label className="ml-2 shrink-0 font-bold">Grace Days</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.grace_days ?? activeRecord.detention_days ?? 0}
                      className="w-12 p-0.5 outline-none text-right font-semibold font-mono border bg-[#FDE7E6] border-sky-300 text-sky-950 cursor-not-allowed"
                    />
                    <label className="ml-2 shrink-0 font-bold">Delivery Penalty</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.delivery_penalty ?? activeRecord.delivery_claim ?? 0}
                      className="w-16 p-0.5 outline-none text-right font-semibold font-mono border bg-[#FDE7E6] border-sky-300 text-sky-950 cursor-not-allowed"
                    />
                  </div>

                  <div className="col-span-12 lg:col-span-6 flex items-center gap-2">
                    <label className="w-24 sm:w-32 text-right shrink-0 font-bold">Contract / P.O No</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.reference_po_no || activeRecord.mill_po_no || activeRecord.mr_no}
                      className="flex-1 p-0.5 outline-none font-bold font-mono border bg-[#FDE7E6] border-sky-300 text-sky-950 cursor-not-allowed"
                    />
                  </div>

                  <div className="col-span-12 lg:col-span-6 flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <label className="w-24 text-right shrink-0 font-bold">Date</label>
                    <input
                      type="date"
                      readOnly
                      disabled
                      value={activeRecord.contract_date || activeRecord.mill_po_date || activeRecord.mr_date || ''}
                      className="w-28 p-0.5 outline-none font-semibold border bg-[#FDE7E6] border-sky-300 text-sky-950 cursor-not-allowed"
                    />
                    <label className="w-24 text-right shrink-0 font-bold">Rate Detail</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.rate_detail || ''}
                      className="flex-1 min-w-[120px] bg-slate-100 border border-slate-400 p-0.5 outline-none font-normal text-slate-700 cursor-not-allowed"
                    />
                  </div>

                  <div className="col-span-12 flex items-center gap-2">
                    <label className="w-24 sm:w-32 text-right shrink-0 font-bold">Delivery Schedule</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.delivery_schedule || ''}
                      className="flex-1 bg-slate-100 border border-slate-400 p-0.5 outline-none font-normal text-slate-700 cursor-not-allowed"
                    />
                  </div>

                  <div className="col-span-12 flex items-start gap-2">
                    <label className="w-24 sm:w-32 text-right leading-none mt-1 shrink-0 font-bold">
                      Terms &amp; Condition
                    </label>
                    <textarea
                      readOnly
                      disabled
                      value={activeRecord.terms_condition || ''}
                      className="flex-1 p-0.5 outline-none h-12 text-[10px] font-semibold border bg-[#FDE7E6] border-sky-300 text-sky-950 cursor-not-allowed"
                    />
                  </div>

                  <div className="col-span-12 flex items-center gap-2 mt-1">
                    <label className="w-24 sm:w-32 text-right shrink-0 font-bold">Remarks</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.insp_remarks || activeRecord.arrival_remarks || activeRecord.remarks || ''}
                      className="flex-1 p-0.5 outline-none font-semibold border bg-[#FDE7E6] border-sky-300 text-sky-950 cursor-not-allowed"
                    />
                  </div>

                  <div className="col-span-12 flex flex-wrap items-center gap-2 pb-1">
                    <label className="w-24 sm:w-32 text-right shrink-0 font-bold">PO Identification</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={activeRecord.po_identification || 'Direct Advance Payment'}
                      className="w-48 bg-slate-100 border border-slate-400 p-0.5 outline-none font-bold text-slate-700 cursor-not-allowed"
                    />

                    <label className="ml-0 sm:ml-4 shrink-0 font-bold">Souda Date</label>
                    <input
                      type="date"
                      readOnly
                      disabled
                      value={activeRecord.s_date || activeRecord.mr_date || ''}
                      className="w-28 p-0.5 outline-none font-semibold border bg-[#FDE7E6] border-sky-300 text-sky-950 cursor-not-allowed"
                    />

                    {/* MANUAL RATE INPUT (B Rate) */}
                    <label className="ml-0 sm:ml-4 flex items-center gap-1 shrink-0 font-black text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-400">
                      <Edit3 className="w-3 h-3 text-emerald-700" />
                      <span>B Rate (Manual Input *)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Enter Rate..."
                      value={bRateInput}
                      onChange={(e) => handleBRateChange(e.target.value)}
                      className="flex-1 min-w-[110px] p-1 outline-none text-right font-mono font-black text-sm border-2 border-emerald-600 bg-emerald-50 text-emerald-950 focus:ring-2 focus:ring-emerald-400 rounded-xs shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </LegacyFieldset>

            {/* ITEMS TABLE MATRIX — Exact Same-to-Same Copy of `PoItemsGrid.tsx` */}
            <LegacyFieldset legend="Purchase Order Details (Items Table Matrix)">
              <div className="border border-slate-400 bg-white rounded-md overflow-visible shadow-xs">
                <div className="flex items-center gap-2 p-1.5 bg-[#F7AFA8] border-b border-[#F06D6C] justify-between text-white rounded-t-md">
                  <div className="text-[10px] font-bold text-amber-300 pl-1 flex items-center gap-2">
                    <span>⚡ Pre-filled from Mill Inspection ({activeRecord.mr_no}):</span>
                    <span className="text-slate-900 bg-amber-300 px-2 py-0.5 rounded-sm font-black not-italic">
                      Input &quot;Rate / Qntl&quot; manually below, then click Save to move to Sauda Check Point
                    </span>
                  </div>
                  <div className="pr-2 text-[10px] font-black text-white font-mono">
                    Auto 4000-Series P.O: {activeRecord.new_po_no}
                  </div>
                </div>

                <div className="border border-[#F7AFA8] bg-white shadow-sm w-full text-black overflow-x-auto relative z-10">
                  <table className="w-full border-collapse text-xs">
                    <thead className="bg-[#D94B5A] text-white border-b border-[#F06D6C] select-none">
                      <tr className="divide-x divide-[#F06D6C] uppercase font-black text-white text-[10.5px] tracking-wider">
                        <th rowSpan={2} className="px-2 py-2 w-14 text-center align-middle bg-[#D94B5A]">
                          Srl. No.
                        </th>
                        <th rowSpan={2} className="px-2 py-2 w-28 text-center align-middle bg-[#D94B5A]">
                          Crop Year
                        </th>
                        <th colSpan={2} className="px-2 py-1.5 text-center bg-[#E85A5A]">
                          Grade
                        </th>
                        <th colSpan={2} className="px-2 py-1.5 text-center bg-[#E85A5A]">
                          Agency
                        </th>
                        <th colSpan={2} className="px-2 py-1.5 text-center bg-[#E85A5A]">
                          Marka
                        </th>
                        <th rowSpan={2} className="px-2 py-2 w-20 text-right align-middle bg-[#D94B5A]">
                          Qty
                        </th>
                        <th rowSpan={2} className="px-2 py-2 w-24 text-right align-middle bg-[#D94B5A]">
                          Wt (M.Ton)
                        </th>
                        <th rowSpan={2} className="px-3 py-2 w-36 text-right align-middle bg-emerald-800 text-amber-300">
                          Rate / Qntl (Input *)
                        </th>
                        <th rowSpan={2} className="px-3 py-2 w-24 text-right align-middle bg-[#D94B5A]">
                          Premium
                        </th>
                      </tr>
                      <tr className="bg-[#E85A5A] text-white divide-x divide-[#F06D6C] border-t border-[#F06D6C] text-[9.5px] font-black uppercase tracking-wider">
                        <th className="w-16 text-center py-1 px-1">Code</th>
                        <th className="w-36 text-left py-1 px-2.5">Name</th>
                        <th className="w-24 text-center py-1 px-1">Code</th>
                        <th className="w-44 text-left py-1 px-2.5">Name</th>
                        <th className="w-16 text-center py-1 px-1">Code</th>
                        <th className="w-36 text-left py-1 px-2.5">Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {formItems.map((row, index) => {
                        const srl = row.srl_no || index + 1;
                        const rowRateVal = itemRates[srl] !== undefined ? itemRates[srl] : bRateInput;
                        return (
                          <tr
                            key={`rl_item_${srl}_${index}`}
                            className="divide-x divide-slate-300 bg-[#FDE7E6]/60 font-bold"
                          >
                            <td className="px-2 py-1.5 text-center bg-slate-100 font-bold text-slate-700 font-mono">
                              {srl}
                            </td>
                            <td className="px-2 py-1.5 text-center bg-slate-100 font-mono text-slate-700">
                              <input
                                type="text"
                                readOnly
                                disabled
                                value={row.crop_year || '2026-27'}
                                className="w-full text-center bg-transparent border-none outline-none font-bold text-slate-700 cursor-not-allowed"
                              />
                            </td>
                            <td className="px-1 py-1.5 text-center bg-slate-100 font-mono text-slate-800">
                              <input
                                type="text"
                                readOnly
                                disabled
                                value={row.grade_code || row.arrival_grade || ''}
                                className="w-full text-center bg-transparent border-none outline-none font-mono font-bold text-slate-800 cursor-not-allowed"
                              />
                            </td>
                            <td className="px-2.5 py-1.5 bg-slate-100 text-slate-800">
                              <input
                                type="text"
                                readOnly
                                disabled
                                value={row.grade_name || row.arrival_grade || ''}
                                className="w-full bg-transparent border-none outline-none font-bold text-slate-800 cursor-not-allowed"
                              />
                            </td>
                            <td className="px-1 py-1.5 text-center bg-slate-100 font-mono text-slate-800">
                              <input
                                type="text"
                                readOnly
                                disabled
                                value={row.agency_code || ''}
                                className="w-full text-center bg-transparent border-none outline-none font-mono font-bold text-slate-800 cursor-not-allowed"
                              />
                            </td>
                            <td className="px-2.5 py-1.5 bg-slate-100 text-slate-800">
                              <input
                                type="text"
                                readOnly
                                disabled
                                value={row.agency_name || '-'}
                                className="w-full bg-transparent border-none outline-none font-bold text-slate-800 cursor-not-allowed"
                              />
                            </td>
                            <td className="px-1 py-1.5 text-center bg-slate-100 font-mono text-slate-800">
                              <input
                                type="text"
                                readOnly
                                disabled
                                value={row.marka_code || ''}
                                className="w-full text-center bg-transparent border-none outline-none font-mono font-bold text-slate-800 cursor-not-allowed"
                              />
                            </td>
                            <td className="px-2.5 py-1.5 bg-slate-100 text-slate-800">
                              <input
                                type="text"
                                readOnly
                                disabled
                                value={row.marka_name || '-'}
                                className="w-full bg-transparent border-none outline-none font-bold text-slate-800 cursor-not-allowed"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right bg-slate-100 font-mono text-slate-800">
                              {row.quantity || 0}
                            </td>
                            <td className="px-2 py-1.5 text-right bg-red-50 font-mono font-black text-red-800">
                              {Number(row.weight_mt || activeRecord.received_weight_mt || 0).toFixed(3)}
                            </td>
                            {/* ONLY EDITABLE FIELD IN GRID: RATE / QNTL */}
                            <td className="px-2 py-1 bg-emerald-50">
                              <input
                                type="number"
                                autoFocus={index === 0}
                                placeholder="Enter Rate..."
                                value={rowRateVal}
                                onChange={(e) => handleItemRateChange(srl, e.target.value, index === 0)}
                                className="w-full text-right bg-white border-2 border-emerald-600 px-2 py-1 rounded-xs outline-none font-black text-emerald-950 font-mono text-xs focus:ring-2 focus:ring-emerald-400"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right bg-slate-100 font-mono text-slate-700">
                              <input
                                type="number"
                                readOnly
                                disabled
                                value={Number(row.premium || 0)}
                                className="w-full text-right bg-transparent border-none outline-none font-bold text-slate-700 font-mono cursor-not-allowed"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </LegacyFieldset>

            {/* Global Actions Block inside Form — Matching `PurchaseOrderFormView.tsx` */}
            <div className="bg-white border border-slate-200 rounded-[18px] p-4 shadow-xs flex flex-wrap justify-center items-center gap-3">
              <button
                type="button"
                onClick={handleSaveToSaudaCheckPoint}
                disabled={saving}
                className="bg-[#D94B5A] hover:bg-[#B42342] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                title="Generate 4000-Series P.O. and Move to Sauda Check Point"
              >
                <Save className="w-4 h-4 text-amber-300" />
                <span>
                  {saving
                    ? 'Saving & Moving to Sauda Check Point...'
                    : `Save P.O (${activeRecord.new_po_no}) & Move to Sauda Check Point`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('register')}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-[#F7AFA8] px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <FileText className="w-4 h-4 text-slate-600" />
                <span>View All Return Lorries</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('register')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Close Form</span>
              </button>
            </div>
          </div>
        </div>
      </LegacyLayout>
    );
  }

  // ============================================================================
  // REGISTER VIEW — DATA ONLY FROM MILL INSPECTION (< 5 MT)
  // Clicking any row opens the Full Sauda Check Point Entry Form above
  // ============================================================================
  return (
    <LegacyLayout
      title="RETURN LORRY DESK"
      subtitle=""
      onClose={onClose}
    >
      <div className="w-full space-y-4 font-sans text-slate-800 pb-10">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-[#8B1D1D] via-[#A92424] to-[#7A1818] text-white px-5 py-3.5 rounded-xl shadow-md border border-red-400/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-black uppercase tracking-wider text-white">
                RETURN LORRY DESK
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filteredRecords.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenRecordInForm(filteredRecords[0])}
                className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-red-950 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>OPEN FULL SAUDA FORM</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncing}
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 border border-white/30 rounded-lg text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'REFRESH MILL INSPECTION (< 5 MT)'}</span>
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            className={`px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-between shadow-sm ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : toast.type === 'error'
                ? 'bg-red-50 border-red-300 text-red-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-500 hover:text-slate-800 font-black px-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* KPI Cards — Strictly reflecting Mill Inspection (< 5 MT) data & Sauda Check Point Save Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-red-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-red-800">
                MILL INSPECTION (&lt; 5 MT) LORRIES
              </p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{filteredRecords.length}</p>
              <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                From material_inspection (&lt; 5.000 MT)
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700">
              <Hash className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                PENDING RATE INPUT
              </p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{pendingRateCount}</p>
              <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                Click row to open form &amp; input Rate
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Edit3 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-800">
                TOTAL RETURN LORRY WT (&lt; 5 MT)
              </p>
              <p className="text-2xl font-black text-rose-700 mt-0.5">
                {totalWeightMt.toFixed(3)} <span className="text-xs font-bold">MT</span>
              </p>
              <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                From Mill Inspection Section
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
              <Scale className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                MOVED TO SAUDA CHECK POINT
              </p>
              <p className="text-2xl font-black text-emerald-700 mt-0.5">{savedToScpCount}</p>
              <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                Saved with 4000-Series P.O. &amp; Rate
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search & Instruction Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Mill Inspection (< 5 MT) by M.R. No, Lorry No, Supplier, Broker, 4000-Series P.O..."
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-red-800 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block animate-pulse" />
            <span>Click any Mill Inspection row below to open Full Sauda Form, input Rate &amp; Save to Sauda Check Point</span>
          </div>
        </div>

        {/* Register Table — Strictly Mill Inspection (< 5 MT) Data */}
        <div className="bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FCE7E6] text-[#7A1818] border-b border-red-200 text-[10px] font-black uppercase tracking-wider">
                  <th className="py-3 px-3">M.R. NO. (MILL INSP)</th>
                  <th className="py-3 px-3">M.R. DATE</th>
                  <th className="py-3 px-3">ARRIVAL NO.</th>
                  <th className="py-3 px-3">LORRY NO.</th>
                  <th className="py-3 px-3 text-right">RECD WT (&lt; 5 MT)</th>
                  <th className="py-3 px-3 text-right">CHALLAN WT</th>
                  <th className="py-3 px-3">SUPPLIER NAME</th>
                  <th className="py-3 px-3">BROKER NAME</th>
                  <th className="py-3 px-3">AREA / UNIT</th>
                  <th className="py-3 px-3">GRADES (INSP)</th>
                  <th className="py-3 px-3 text-right">RATE (₹/QTL)</th>
                  <th className="py-3 px-3">4000-SERIES P.O.</th>
                  <th className="py-3 px-3 text-center">STATUS / ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={13} className="py-10 text-center text-slate-500 font-bold">
                      Loading Mill Inspection (&lt; 5 MT) Return Lorry records...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center">
                      <div className="max-w-md mx-auto space-y-2">
                        <p className="text-sm font-black text-slate-700 uppercase">
                          No Mill Inspection (&lt; 5 MT) Return Lorry Found
                        </p>
                        <p className="text-xs text-slate-500">
                          Whenever a Mill Inspection (<code>material_inspection</code>) record has received weight under 5 MT (&lt; 5.000 MT), it appears here automatically.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => {
                    const gradesStr =
                      rec.items && rec.items.length > 0
                        ? rec.items.map((i) => i.grade_name || i.grade_code || i.arrival_grade).filter(Boolean).join(', ')
                        : '-';
                    const isSaved = Boolean(rec.saved_to_sauda_checkpoint && Number(rec.b_rate) > 0);

                    return (
                      <tr
                        key={rec.mr_no}
                        onClick={() => handleOpenRecordInForm(rec)}
                        className="hover:bg-red-50/70 transition-colors font-semibold cursor-pointer"
                      >
                        <td className="py-2.5 px-3 font-mono font-black text-slate-900 whitespace-nowrap">
                          {rec.mr_no}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {rec.mr_date || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {rec.arrival_no || rec.temporary_arrival_no || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {rec.lorry_number || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-900 border border-red-300 font-mono font-black text-[11px]">
                            {Number(rec.received_weight_mt || 0).toFixed(3)} MT
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                          {Number(rec.challan_gross_wt || rec.received_weight_mt || 0).toFixed(3)} MT
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 uppercase max-w-[180px] truncate" title={rec.supplier_name}>
                          {rec.supplier_name || rec.supplier || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700 uppercase max-w-[160px] truncate" title={rec.broker_name}>
                          {rec.broker_name || rec.broker || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                          {rec.area || '-'} ({rec.unit_name || 'BALES'})
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-purple-900 max-w-[140px] truncate" title={gradesStr}>
                          {gradesStr}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black whitespace-nowrap">
                          {Number(rec.b_rate) > 0 ? (
                            <span className="text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                              ₹{Number(rec.b_rate).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded text-[10px]">
                              Input Rate
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isSaved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-700 text-white font-mono font-black text-[11px] shadow-2xs">
                              {rec.new_po_no}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 font-mono font-bold text-[10px]">
                              {rec.new_po_no} (Pending Save)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRecordInForm(rec);
                            }}
                            className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all shadow-2xs ${
                              isSaved
                                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                : 'bg-[#D94B5A] hover:bg-[#B42342] text-white'
                            }`}
                          >
                            {isSaved ? 'Moved to Sauda (View/Edit Rate)' : 'Open Form & Input Rate'}
                          </button>
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
    </LegacyLayout>
  );
}
