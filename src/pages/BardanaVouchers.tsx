import { StockRow, SummaryModal, BulkTransferWizardModal } from "../components/bardana/BardanaModals";
import React, { useState, useEffect, useMemo } from 'react';
import PrintModal from '../components/PrintModal';
import { 
  ArrowRightLeft, 
  ArrowUpCircle, 
  RotateCcw,
  Plus,
  Search,
  Save,
  Calendar,
  Printer,
  X,
  Trash2,
  Edit,
  ChevronDown,
  Calculator,
  Database,
  Check,
  Building,
  History,
  AlertTriangle,
  ArrowLeftRight,
  BarChart3
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { cn, canDeleteData } from '../lib/utils';
import LegacyLayout, { LegacyFieldset, LegacyButton } from '../components/LegacyLayout';
import { getSupabase } from '../lib/supabase';

type VoucherType = 'issue' | 'return' | 'transfer';

export default function BardanaVouchers({ onClose }: { onClose?: () => void }) {
  const [activeType, setActiveType] = useState<VoucherType>('issue');
  const [godowns, setGodowns] = useState<{ gdn_code: string; gdn_name: string; gdn_capacity?: number; gdn_short_name?: string }[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [voucherNo, setVoucherNo] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedGodownCode, setSelectedGodownCode] = useState<string>('');
  const [selectedItemType, setSelectedItemType] = useState<string>('Jute Bales');
  const [accountName, setAccountName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [rate, setRate] = useState<number>(0);
  const [narration, setNarration] = useState<string>('');

  // Retro Submenu View state
  const [viewTab, setViewTab] = useState<'desk' | 'monitors' | 'audit'>('desk');

  // Operator & Audit Log states
  const [operatorId, setOperatorId] = useState<string>('prosunmajhi@gmail.com');
  const [audits, setAudits] = useState<any[]>([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');

  // Bulk Transfer States
  const [showBulkTransferModal, setShowBulkTransferModal] = useState<boolean>(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState<boolean>(false);
  
  const [bulkSourceCode, setBulkSourceCode] = useState<string>('');
  const [bulkDestCode, setBulkDestCode] = useState<string>('');
  const [bulkItemType, setBulkItemType] = useState<string>('Jute Bales');
  const [bulkQty, setBulkQty] = useState<number>(0);
  const [bulkRate, setBulkRate] = useState<number>(150);
  const [bulkOperator, setBulkOperator] = useState<string>('prosunmajhi@gmail.com');
  const [bulkNarration, setBulkNarration] = useState<string>('Bulk Inter-Godown Material Transfer');

  // Autocomplete state
  const [showSuppliersDropdown, setShowSuppliersDropdown] = useState<boolean>(false);

  // Modals
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [printTargetVoucher, setPrintTargetVoucher] = useState<any | null>(null);

  // Load godowns, suppliers & entries
  useEffect(() => {
    async function initData() {
      setIsLoading(true);
      try {
        const supabase = await getSupabase();
        if (supabase) {
          // Fetch Godowns
          const { data: gdnData, error: gdnError } = await supabase
            .from('godown_master')
            .select('*');
          if (!gdnError && gdnData) {
            setGodowns(gdnData);
            if (gdnData.length > 0) {
              setSelectedGodownCode(gdnData[0].gdn_code);
              setBulkSourceCode(gdnData[0].gdn_code);
              if (gdnData.length > 1) {
                setBulkDestCode(gdnData[1].gdn_code);
              } else {
                setBulkDestCode(gdnData[0].gdn_code);
              }
            }
          }

          // Fetch Suppliers for Autocomplete list
          const { data: suppData, error: suppError } = await supabase
            .from('supply_master')
            .select('supp_name');
          if (!suppError && suppData) {
            const names = Array.from(new Set(suppData.map((s: any) => s.supp_name).filter(Boolean))) as string[];
            setSuppliers(names);
          }

          // Fetch entries
          await loadEntriesFromDb();
          
          // Fetch and backfill audits
          await loadAuditsFromDb();
        }
      } catch (err: any) {
        console.error('Initialization error:', err);
        showBanner('Database initialization failure: Off-line mode active.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    initData();
  }, []);

  // Sync voucher number on voucher type change
  useEffect(() => {
    if (!editingId) {
      generateNextVoucherNo();
    }
  }, [activeType, entries, editingId]);

  // Handle hotkeys (F5, F7, F8)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        setActiveType('issue');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setActiveType('return');
      } else if (e.key === 'F8') {
        e.preventDefault();
        setActiveType('transfer');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function loadEntriesFromDb() {
    try {
      const supabase = await getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('godown_entry')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          setEntries(data);
        }
      }
    } catch (err) {
      console.error('Error loading entries:', err);
    }
  }

  // Audit load and log functions
  async function loadAuditsFromDb() {
    try {
      const supabase = await getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('godown_audit')
          .select('*')
          .order('timestamp', { ascending: false });
        if (!error && data) {
          if (data.length === 0) {
            // Seed initial records so user sees them right away
            const seedAudits = [
              {
                action_type: 'INITIAL_SEED',
                quantity: 1200,
                item_type: 'Jute Bales',
                source_ref: 'MILL SUPPLY CORP',
                dest_ref: 'MAIN GODOWN',
                voucher_no: 'AUD-001',
                operator_id: 'SYSTEM_DAEMON',
                timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
              },
              {
                action_type: 'INWARD_ENTRY',
                quantity: 450,
                item_type: 'Tossa Bags',
                source_ref: 'SHIVA TRADERS',
                dest_ref: 'GODOWN-B',
                voucher_no: 'AUD-002',
                operator_id: 'SYSTEM_DAEMON',
                timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
              },
              {
                action_type: 'OUTWARD_ENTRY',
                quantity: 180,
                item_type: 'B-Twill Bags',
                source_ref: 'MAIN GODOWN',
                dest_ref: 'MILL FLOOR-A',
                voucher_no: 'AUD-003',
                operator_id: 'prosunmajhi@gmail.com',
                timestamp: new Date(Date.now() - 3600000).toISOString()
              }
            ];
            const { error: seedErr } = await supabase.from('godown_audit').insert(seedAudits);
            if (!seedErr) {
              const { data: refetched } = await supabase
                .from('godown_audit')
                .select('*')
                .order('timestamp', { ascending: false });
              if (refetched) {
                setAudits(refetched);
                return;
              }
            }
          } else {
            setAudits(data);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Error loading audits from Supabase:', err);
    }

    setAudits([]);
  }

  async function logAuditAction(actionType: string, qty: number, typeStr: string, sRef: string, dRef: string, vNo: string, opId: string) {
    const payload = {
      action_type: actionType,
      quantity: qty,
      item_type: typeStr,
      source_ref: sRef,
      dest_ref: dRef,
      voucher_no: vNo,
      operator_id: opId || 'prosunmajhi@gmail.com',
      timestamp: new Date().toISOString()
    };

    try {
      const supabase = await getSupabase();
      if (supabase) {
        const { error } = await supabase.from('godown_audit').insert(payload);
        if (error) throw error;
        await loadAuditsFromDb();
        return;
      }
    } catch (err) {
      console.warn('Failed logging audit action to Supabase:', err);
    }

    const localPayload = { id: 'local-' + Date.now(), ...payload };
    setAudits(prev => [localPayload, ...prev]);
  }

  function showBanner(text: string, type: 'success' | 'error') {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  }

  // Calculate next voucher number
  function generateNextVoucherNo() {
    const numericVouchers = entries
      .map(e => parseInt(e.voucher_no, 10))
      .filter(n => !isNaN(n));
    const maxNumber = numericVouchers.length > 0 ? Math.max(...numericVouchers) : 123;
    setVoucherNo(String(maxNumber + 1));
  }

  // Starting Stocks Definition mapped to Godown codes
  const STARTING_STOCKS: Record<string, { jute: number; tossa: number; btwill: number }> = {
    'GDN-01': { jute: 3400, tossa: 890, btwill: 1240 },
    'GDN-02': { jute: 1200, tossa: 500, btwill: 300 },
    'GDN-03': { jute: 2500, tossa: 1000, btwill: 1500 },
  };

  // Compute stock state for every godown dynamically
  const godownsStock = useMemo(() => {
    const stocks: Record<string, { gdn_code: string; gdn_name: string; capacity: number; jute: number; tossa: number; btwill: number; total: number; utilization: number }> = {};
    
    godowns.forEach(g => {
      const start = STARTING_STOCKS[g.gdn_code] || { jute: 0, tossa: 0, btwill: 0 };
      const capacity = g.gdn_capacity ? Number(g.gdn_capacity) : 10000;
      stocks[g.gdn_code] = {
        gdn_code: g.gdn_code,
        gdn_name: g.gdn_name,
        capacity,
        jute: start.jute,
        tossa: start.tossa,
        btwill: start.btwill,
        total: 0,
        utilization: 0
      };
    });

    entries.forEach((e: any) => {
      const gCode = e.gdn_code;
      const qty = parseInt(e.quantity, 10) || 0;
      const type = e.item_type || 'Jute Bales';
      const vtype = e.voucher_type;

      if (stocks[gCode]) {
        let adj = 0;
        if (vtype === 'return') adj = qty;
        else if (vtype === 'issue') adj = -qty;
        else if (vtype === 'transfer') adj = -qty; // outward transfer

        if (type === 'Jute Bales') stocks[gCode].jute += adj;
        else if (type === 'Tossa Bags') stocks[gCode].tossa += adj;
        else if (type === 'B-Twill Bags') stocks[gCode].btwill += adj;
      }

      // Check if narration has transfer instructions indicating destination
      if (e.narration) {
        const destMatch = e.narration.match(/\[TRANSFER DEST:\s*([^\]\s]+)\]/);
        if (destMatch && destMatch[1]) {
          const destCode = destMatch[1].trim();
          if (stocks[destCode]) {
            if (type === 'Jute Bales') stocks[destCode].jute += qty;
            else if (type === 'Tossa Bags') stocks[destCode].tossa += qty;
            else if (type === 'B-Twill Bags') stocks[destCode].btwill += qty;
          }
        }
      }
    });

    Object.keys(stocks).forEach(code => {
      const s = stocks[code];
      s.total = s.jute + s.tossa + s.btwill;
      s.utilization = s.capacity > 0 ? (s.total / s.capacity) * 100 : 0;
    });

    return stocks;
  }, [godowns, entries]);

  // Aggregate global live stock
  const liveStock = useMemo(() => {
    let jute = 0;
    let tossa = 0;
    let btwill = 0;

    Object.values(godownsStock).forEach((g: any) => {
      jute += g.jute;
      tossa += g.tossa;
      btwill += g.btwill;
    });

    const estValue = (jute * 180) + (tossa * 150) + (btwill * 110);
    return { jute, tossa, btwill, estValue };
  }, [godownsStock]);

  // Save Voucher handler
  async function handleSave() {
    if (!voucherNo.trim()) {
      showBanner('Voucher No is required!', 'error');
      return;
    }
    if (!accountName.trim()) {
      showBanner('Account Name is required!', 'error');
      return;
    }
    if (quantity <= 0) {
      showBanner('Quantity must be greater than zero!', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = await getSupabase();
      if (!supabase) throw new Error('Supabase client unavailable');

      const payload = {
        voucher_no: voucherNo.trim(),
        date,
        gdn_code: selectedGodownCode || null,
        item_type: selectedItemType,
        account_name: accountName.trim().toUpperCase(),
        quantity,
        rate,
        amount: quantity * rate,
        narration: narration.trim(),
        voucher_type: activeType
      };

      const gdnName = godowns.find(g => g.gdn_code === selectedGodownCode)?.gdn_name || 'MAIN GODOWN';

      if (editingId) {
        // Update
        const { error } = await supabase
          .from('godown_entry')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;

        await logAuditAction(
          'UPDATE_VOUCHER',
          quantity,
          selectedItemType,
          gdnName,
          accountName.trim().toUpperCase(),
          voucherNo,
          operatorId
        );

        showBanner(`Voucher ${voucherNo} modified successfully.`, 'success');
      } else {
        // Insert
        const { error } = await supabase
          .from('godown_entry')
          .insert(payload);

        if (error) throw error;

        const action = activeType === 'return' ? 'INWARD_ENTRY' : activeType === 'issue' ? 'OUTWARD_ENTRY' : 'TRANSFER_OUT';
        const sourceRef = activeType === 'return' ? accountName.trim().toUpperCase() : gdnName;
        const destRef = activeType === 'return' ? gdnName : (activeType === 'transfer' ? 'TRANS_TRANSIT' : 'EXTERNAL_DISBURSEMENT');

        await logAuditAction(
          action,
          quantity,
          selectedItemType,
          sourceRef,
          destRef,
          voucherNo,
          operatorId
        );

        showBanner(`Voucher ${voucherNo} added and saved to ledger.`, 'success');
      }

      // Refresh and reset
      await loadEntriesFromDb();
      handleReset();
    } catch (err: any) {
      console.error(err);
      showBanner(`Save failed: ${err.message || err}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  // Load entry into form for editing
  function handleLoadEntry(entity: any) {
    setEditingId(entity.id);
    setVoucherNo(entity.voucher_no);
    setDate(entity.date);
    setSelectedGodownCode(entity.gdn_code || '');
    setSelectedItemType(entity.item_type || 'Jute Bales');
    setAccountName(entity.account_name);
    setQuantity(entity.quantity);
    setRate(entity.rate);
    setNarration(entity.narration || '');
    setActiveType(entity.voucher_type as VoucherType);
    showBanner(`Loaded voucher ${entity.voucher_no} for alterations.`, 'success');
  }

  // Delete Voucher
  async function handleDelete() {
    if (!canDeleteData()) {
      alert("Only Admin can delete data.");
      return;
    }
 
    if (!editingId) {
      showBanner('No voucher loaded to delete! Use the View button or the side list to load one first.', 'error');
      return;
    }

    if (!window.confirm(`Are you absolutely sure you want to permanently delete Voucher No ${voucherNo}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const supabase = await getSupabase();
      if (!supabase) throw new Error('Supabase Client unavailable');

      const rowToDelete = entries.find(e => e.id === editingId);

      const { error } = await supabase
        .from('godown_entry')
        .delete()
        .eq('id', editingId);

      if (error) throw error;

      if (rowToDelete) {
        const gdnName = godowns.find(g => g.gdn_code === rowToDelete.gdn_code)?.gdn_name || 'MAIN GODOWN';
        await logAuditAction(
          'DELETE_VOUCHER',
          rowToDelete.quantity || 0,
          rowToDelete.item_type || 'Jute Bales',
          gdnName,
          'DELETED_RECORD',
          rowToDelete.voucher_no,
          operatorId
        );
      }

      showBanner(`Voucher No ${voucherNo} successfully deleted.`, 'success');
      await loadEntriesFromDb();
      handleReset();
    } catch (err: any) {
      console.error(err);
      showBanner(`Delete failed: ${err.message || err}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setEditingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedItemType('Jute Bales');
    setAccountName('');
    setQuantity(0);
    setRate(0);
    setNarration('');
    if (godowns.length > 0) {
      setSelectedGodownCode(godowns[0].gdn_code);
    }
    generateNextVoucherNo();
  }

  const voucherTypes = [
    { id: 'issue', label: 'Issue (F5)', icon: ArrowUpCircle },
    { id: 'return', label: 'Return (F7)', icon: RotateCcw },
    { id: 'transfer', label: 'Transfer (F8)', icon: ArrowRightLeft },
  ];

  const filteredSuppliers = useMemo(() => {
    if (!accountName) return [];
    return suppliers.filter(s => s.toLowerCase().includes(accountName.toLowerCase())).slice(0, 8);
  }, [accountName, suppliers]);

  const searchFilteredEntries = useMemo(() => {
    if (!searchQuery) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(e => 
      e.voucher_no.includes(q) || 
      e.account_name.toLowerCase().includes(q) || 
      e.item_type.toLowerCase().includes(q) ||
      (e.narration && e.narration.toLowerCase().includes(q))
    );
  }, [entries, searchQuery]);

  return (
    <LegacyLayout title="P.O Automation" subtitle="Godown Master" onClose={onClose}>
      <div className="space-y-4">
        
        {/* Banner/Status notification */}
        {statusMessage && (
          <div className={cn(
            "p-2 px-4 border text-[11px] font-bold uppercase tracking-tight flex items-center justify-between shadow-sm animate-bounce",
            statusMessage.type === 'success' ? "bg-emerald-50 border-emerald-400 text-emerald-800" : "bg-rose-50 border-rose-400 text-rose-800"
          )}>
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 animate-pulse" />
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="font-extrabold hover:text-black">✖</button>
          </div>
        )}        {/* Navigation Submenu Tabs */}
        <div className="flex border-b-2 border-slate-400 bg-[#FBCFCB] p-1 gap-1  text-[10px] font-black uppercase text-[#222] tracking-tight">
          <button 
            type="button"
            onClick={() => setViewTab('desk')}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 border-2 rounded-t-sm shadow-[1px_1px_0_0_rgba(0,0,0,0.5)] active:shadow-[inset_1px_1px_0_0_rgba(0,0,0,0.5)] transition-all cursor-pointer",
              viewTab === 'desk' ? "bg-blue-900 text-white border-white font-extrabold shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4)]" : "bg-neutral-200 hover:bg-slate-300 border-slate-300"
            )}
          >
            📋 Ledger Voucher Desk
          </button>
          <button 
            type="button"
            onClick={() => setViewTab('monitors')}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 border-2 rounded-t-sm shadow-[1px_1px_0_0_rgba(0,0,0,0.5)] active:shadow-[inset_1px_1px_0_0_rgba(0,0,0,0.5)] transition-all cursor-pointer",
              viewTab === 'monitors' ? "bg-blue-900 text-white border-white font-extrabold shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4)]" : "bg-neutral-200 hover:bg-slate-300 border-slate-300"
            )}
          >
            📊 Capacity & Bottleneck Monitors
          </button>
          <button 
            type="button"
            onClick={() => setViewTab('audit')}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 border-2 rounded-t-sm shadow-[1px_1px_0_0_rgba(0,0,0,0.5)] active:shadow-[inset_1px_1px_0_0_rgba(0,0,0,0.5)] transition-all cursor-pointer",
              viewTab === 'audit' ? "bg-blue-900 text-white border-white font-extrabold shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4)]" : "bg-neutral-200 hover:bg-slate-300 border-slate-300"
            )}
          >
            🛡️ Operational Audit Trail
          </button>
        </div>

        {viewTab === 'desk' && (
          <>
            {/* Header Ribbon / Tabs */}
            <div className="flex gap-1 bg-[#808080] p-1 border border-black/10">
               {voucherTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setActiveType(type.id as VoucherType);
                      if (editingId) handleReset();
                    }}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center py-2 border-2 border-white shadow-[1px_1px_0_0_rgba(0,0,0,0.5)] active:shadow-[inset_1px_1px_0_0_rgba(0,0,0,0.5)] transition-all cursor-pointer",
                      activeType === type.id ? "bg-blue-850 text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4)]" : "bg-[#FBCFCB] text-black"
                    )}
                  >
                     <type.icon className={cn("h-4 w-4 mb-1", activeType === type.id ? "text-white" : "text-gray-600")} />
                     <span className="text-[10px] font-bold uppercase">{type.label}</span>
                  </button>
               ))}
            </div>

            <div className="grid grid-cols-12 gap-4">
               {/* Feeding Section */}
               <div className="col-span-8 flex flex-col gap-4">
                  <LegacyFieldset legend={`${activeType.toUpperCase()} Voucher Entry ${editingId ? '» [ALTERATION ON ACTIVE RECORD]' : '» [NEW ENTRY]'}`}>
                     <div className="grid grid-cols-12 gap-x-4 gap-y-3 items-center mt-2">
                        
                        <div className="col-span-4 flex items-center gap-2">
                           <label htmlFor="voucher_no_651" className="text-[10px] font-black w-24 shrink-0 font-sans text-blue-800 italic uppercase">Voucher No.</label>
                           <input  id="voucher_no_651" name="voucher_no" aria-label="Voucher No."
                             className="flex-1 bg-[#ffffd0] border border-gray-400 p-1 text-xs font-black text-center" 
                             value={voucherNo} 
                             onChange={(e) => setVoucherNo(e.target.value)}
                           />
                        </div>
                        
                        <div className="col-span-4 flex items-center gap-2">
                           <label htmlFor="date_660" className="text-[10px] font-bold w-12 shrink-0 uppercase tracking-tight">Date</label>
                           <input  id="date_660" name="date" aria-label="Date"
                             type="date" 
                             className="flex-1 bg-[#ffffd0] border border-gray-400 p-0.5 text-xs outline-none" 
                             value={date}
                             onChange={(e) => setDate(e.target.value)}
                           />
                        </div>
                        
                        <div className="col-span-4 flex items-center gap-2">
                           <label htmlFor="godown_670" className="text-[10px] font-bold w-16 shrink-0 uppercase tracking-tight">Godown</label>
                           <select  id="godown_670" name="godown" aria-label="Godown"
                             className="flex-1 bg-white border border-gray-400 p-0.5 text-xs font-bold outline-none uppercase"
                             value={selectedGodownCode}
                             onChange={(e) => setSelectedGodownCode(e.target.value)}
                           >
                             {godowns.map(gdn => (
                               <option key={gdn.gdn_code} value={gdn.gdn_code}>
                                 {gdn.gdn_name.toUpperCase()}
                               </option>
                             ))}
                             {godowns.length === 0 && <option value="">MAIN GODOWN</option>}
                           </select>
                        </div>
    
                        <div className="col-span-8 flex items-center gap-2 relative">
                           <label htmlFor="account_name_687" className="text-[10px] font-bold w-24 shrink-0 uppercase tracking-tight">Account Name</label>
                           <div className="flex-1 flex gap-px border border-gray-400 bg-white relative">
                              <input  id="account_name_687" name="account_name" aria-label="Account Name"
                                className="flex-1 text-xs px-2 py-1 outline-none font-bold uppercase" 
                                placeholder="SEARCH/ENTER SUPPLIER DETAIL OR LEDGER..." 
                                value={accountName}
                                onChange={(e) => {
                                  setAccountName(e.target.value);
                                  setShowSuppliersDropdown(true);
                                }}
                                onFocus={() => setShowSuppliersDropdown(true)}
                              />
                              <button 
                                type="button"
                                onClick={() => setShowSuppliersDropdown(!showSuppliersDropdown)}
                                className="bg-[#FBCFCB] px-2 border-l border-gray-400 cursor-pointer"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
    
                              {/* Autocomplete Dropdown list */}
                              {showSuppliersDropdown && filteredSuppliers.length > 0 && (
                                <div className="absolute top-full left-0 right-0 max-h-40 overflow-y-auto bg-white border border-slate-400 shadow-md z-45 flex flex-col divide-y divide-slate-100">
                                  {filteredSuppliers.map((sup, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        setAccountName(sup);
                                        setShowSuppliersDropdown(false);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-[10.5px] font-semibold text-slate-800 hover:bg-slate-100"
                                    >
                                      {sup}
                                    </button>
                                  ))}
                                </div>
                              )}
                           </div>
                        </div>

                        <div className="col-span-4 flex items-center gap-2">
                           <label htmlFor="operator_728" className="text-[10px] font-extrabold w-16 shrink-0 uppercase tracking-tight text-indigo-950">Operator</label>
                           <input  id="operator_728" name="operator" aria-label="Operator"
                             type="text"
                             className="flex-1 bg-[#ffffd0] border border-gray-400 p-1 text-xs outline-none uppercase font-mono font-bold" 
                             value={operatorId}
                             onChange={(e) => setOperatorId(e.target.value)}
                             placeholder="prosunmajhi@gmail.com"
                           />
                        </div>
    
                        <div className="col-span-12 grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-3">
                             <div className="flex items-center gap-2">
                                <label htmlFor="material_item_741" className="text-[10px] font-bold w-24 shrink-0 uppercase tracking-tight">Material Item</label>
                                <select
 id="material_item_741" name="material_item" aria-label="Material Item"                                  className="flex-1 bg-white border border-gray-400 p-1 text-xs font-bold outline-none"
                                  value={selectedItemType}
                                  onChange={(e) => setSelectedItemType(e.target.value)}
                                >
                                  <option value="Jute Bales">Jute Bales</option>
                                  <option value="Tossa Bags">Tossa Bags</option>
                                  <option value="B-Twill Bags">B-Twill Bags</option>
                                </select>
                             </div>
                             <div className="flex items-center gap-2">
                                <label htmlFor="quantity_bags_753" className="text-[10px] font-bold w-24 shrink-0 uppercase tracking-tight">Quantity (Bags)</label>
                                <input  id="quantity_bags_753" name="quantity_bags" aria-label="Quantity (Bags)"
                                  type="number" 
                                  className="flex-1 bg-white border border-gray-400 p-1 text-lg font-black text-right outline-none" 
                                  value={quantity}
                                  onChange={(e) => setQuantity(Number(e.target.value))}
                                  min="0"
                                />
                             </div>
                             <div className="flex items-center gap-2">
                                <label htmlFor="rate_pcs_763" className="text-[10px] font-bold w-24 shrink-0 uppercase tracking-tight">Rate / Pcs</label>
                                <input  id="rate_pcs_763" name="rate_pcs" aria-label="Rate / Pcs"
                                  type="number" 
                                  step="0.01"
                                  className="flex-1 bg-white border border-gray-400 p-1 text-lg font-black text-right outline-none" 
                                  value={rate}
                                  onChange={(e) => setRate(Number(e.target.value))}
                                  min="0"
                                />
                             </div>
                          </div>
    
                          <div>
                             <div className="bg-black/5 border-2 border-white shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)] p-4 h-full flex flex-col justify-center items-end">
                                <span className="text-[10px] font-bold uppercase text-gray-400 italic">Total Amount (Rs.)</span>
                                <span className="text-3xl font-black italic tracking-tighter text-blue-900 drop-shadow-sm">
                                  ₹ {(quantity * rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                             </div>
                          </div>
                        </div>
    
                        <div className="col-span-12 flex items-start gap-2">
                           <label htmlFor="narration_786" className="text-[10px] font-bold w-24 shrink-0 mt-1 uppercase tracking-tight">Narration</label>
                           <textarea  id="narration_786" name="narration" aria-label="Narration"
                             rows={2} 
                             className="flex-1 bg-white border border-gray-400 p-1 text-xs outline-none uppercase font-semibold" 
                             value={narration}
                             onChange={(e) => setNarration(e.target.value)}
                             placeholder="Enter descriptive transaction notes here..."
                           />
                        </div>
                     </div>
                  </LegacyFieldset>
    
                  {/* Toolbar Buttons */}
                  <div className="flex justify-center flex-wrap gap-1 pt-2">
                     <LegacyButton label="Add" icon={Plus} onClick={handleReset} />
                     <LegacyButton label="Edit" icon={Edit} onClick={() => {
                       if (entries.length > 0) {
                         handleLoadEntry(entries[0]);
                       } else {
                         showBanner('No active entries found to edit.', 'error');
                       }
                     }} />
                     <LegacyButton label="Delete" icon={Trash2} variant="danger" onClick={handleDelete} />
                     <LegacyButton label="Save" icon={Save} onClick={handleSave} active />
                     <LegacyButton label="Cancel" icon={X} onClick={handleReset} />
                     <LegacyButton label="View Logs" icon={Search} onClick={() => setShowViewModal(true)} />
                     <LegacyButton label="Summary" icon={Calculator} onClick={() => setShowSummaryModal(true)} />
                     <LegacyButton label="Bulk Transfer" icon={ArrowLeftRight} onClick={() => setShowBulkTransferModal(true)} />
                     <LegacyButton label="Print" icon={Printer} onClick={() => {
                       if (editingId) {
                         const loaded = entries.find(x => x.id === editingId);
                         setPrintTargetVoucher(loaded);
                         setShowPrintModal(true);
                       } else if (entries.length > 0) {
                         setPrintTargetVoucher(entries[0]);
                         setShowPrintModal(true);
                       } else {
                         showBanner('Please feed or select a voucher to display printable document.', 'error');
                       }
                     }} />
                     <LegacyButton label="Exit" icon={X} onClick={onClose} />
                  </div>
               </div>
    
               {/* Stock Summary Column */}
               <div className="col-span-4 flex flex-col gap-4">
                  <LegacyFieldset legend="Live Stock Position">
                     <div className="space-y-3 mt-1">
                        <StockRow label="Jute Bales" value={liveStock.jute.toLocaleString('en-IN')} />
                        <StockRow label="Tossa Bags" value={liveStock.tossa.toLocaleString('en-IN')} />
                        <StockRow label="B-Twill Bags" value={liveStock.btwill.toLocaleString('en-IN')} />
                        <div className="pt-2 border-t border-dashed border-gray-400">
                           <div className="flex justify-between items-end">
                              <span className="text-[9px] font-black text-gray-500 uppercase italic leading-none">Est. Value</span>
                              <span className="text-lg font-black text-red-850">
                                ₹ {Math.round(liveStock.estValue).toLocaleString('en-IN')}
                              </span>
                           </div>
                        </div>
                     </div>
                  </LegacyFieldset>
    
                  <LegacyFieldset legend="Recent Transactions">
                     <div className="space-y-1.5 mt-1 max-h-[220px] overflow-y-auto pr-1 divide-y divide-slate-150">
                        {entries.slice(0, 10).map((ent: any, idx: number) => {
                          const gName = godowns.find(g => g.gdn_code === ent.gdn_code)?.gdn_short_name || 'MAIN';
                          return (
                            <div 
                              key={ent.id || idx} 
                              onClick={() => handleLoadEntry(ent)}
                              className={cn(
                                "flex items-center justify-between p-1.5 hover:bg-slate-200 cursor-pointer transition-all",
                                editingId === ent.id ? "bg-slate-200 border-l-4 border-indigo-700" : "bg-white/50"
                              )}
                            >
                               <div className="flex flex-col">
                                  <span className="text-[10px] font-extrabold truncate w-[140px] uppercase text-indigo-950 font-sans ">{ent.account_name}</span>
                                  <span className="text-[8px] text-gray-500 font-bold uppercase font-mono">{ent.date} • {ent.item_type} • {gName}</span>
                               </div>
                               <div className="flex flex-col items-end shrink-0">
                                  <span className={cn(
                                    "text-[8px] font-black tracking-tight uppercase px-1 rounded-sm text-white", 
                                    ent.voucher_type === 'return' ? "bg-emerald-700" : ent.voucher_type === 'issue' ? "bg-rose-700" : "bg-blue-700"
                                  )}>
                                    {ent.voucher_type}
                                  </span>
                                  <span className="text-[10px] font-black tabular-nums text-slate-900 font-mono">{ent.quantity} Pcs</span>
                               </div>
                            </div>
                          );
                        })}
                        {entries.length === 0 && (
                          <div className="text-center p-6 text-gray-400 italic text-[10px] font-semibold">
                            No transactions found in system database.
                          </div>
                        )}
                     </div>
                  </LegacyFieldset>
               </div>
            </div>
          </>
        )}

        {viewTab === 'monitors' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#FBCFCB] p-3 border border-slate-400 rounded-sm">
              <div>
                <h3 className="text-xs font-black uppercase text-indigo-950 font-sans">Warehouse Stock & Maximum Capacity Monitors</h3>
                <p className="text-[9.5px] font-bold text-gray-500 uppercase">Live telemetry calculated relative to physical godown margins and maximum safe capacities.</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowBulkTransferModal(true)}
                className="bg-indigo-900 hover:bg-[#1a365d] text-white border-2 border-white px-4 py-2 text-[10px] font-extrabold uppercase shadow-[2px_2px_0_0_rgba(0,0,0,50%)] active:shadow-inner cursor-pointer"
              >
                🔄 Bulk Material Transfer Wizard
              </button>
            </div>

            <div className="grid grid-cols-12 gap-4">
              {/* Capacity Progress Bar Section */}
              <div className="col-span-5 flex flex-col gap-3">
                <LegacyFieldset legend="Godown Space Utilization Telemetry">
                  <div className="space-y-4 mt-1 font-sans">
                    {Object.values(godownsStock).map((gd: any) => {
                      const exceeds90 = gd.utilization > 90;
                      return (
                        <div key={gd.gdn_code} className="bg-white p-3 border border-slate-300 rounded-sm space-y-1.5 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[11px] font-extrabold text-slate-900 uppercase block">{gd.gdn_name}</span>
                              <span className="text-[8.5px] text-gray-500 font-mono font-bold uppercase">CODE: {gd.gdn_code} • LIMIT: {gd.capacity.toLocaleString('en-IN')} PCS</span>
                            </div>
                            <span className={cn(
                              "text-[10.5px] font-black font-mono",
                              exceeds90 ? "text-red-600 animate-pulse" : "text-indigo-800"
                            )}>
                              {gd.utilization.toFixed(1)}% USED
                            </span>
                          </div>

                          {/* Progress bar representing capacity */}
                          <div className="h-4 bg-slate-100 border border-slate-300 rounded-xs overflow-hidden relative">
                            <div 
                              className={cn(
                                "h-full transition-all duration-500",
                                exceeds90 ? "bg-red-600 animate-pulse" : gd.utilization > 75 ? "bg-amber-500" : "bg-emerald-600"
                              )} 
                              style={{ width: `${Math.min(gd.utilization, 100)}%` }}
                            />
                          </div>

                          {/* Stocks Breakdown */}
                          <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-dashed border-gray-200">
                            <div className="text-center bg-slate-50 border p-1 font-mono text-[9px] font-bold text-slate-700">
                              <span className="text-[7.5px] text-gray-400 block uppercase font-sans">JUTE</span>
                              {gd.jute.toLocaleString('en-IN')}
                            </div>
                            <div className="text-center bg-slate-50 border p-1 font-mono text-[9px] font-bold text-slate-700">
                              <span className="text-[7.5px] text-gray-400 block uppercase font-sans">TOSSA</span>
                              {gd.tossa.toLocaleString('en-IN')}
                            </div>
                            <div className="text-center bg-slate-50 border p-1 font-mono text-[9px] font-bold text-slate-700">
                              <span className="text-[7.5px] text-gray-400 block uppercase font-sans">B-TWILL</span>
                              {gd.btwill.toLocaleString('en-IN')}
                            </div>
                          </div>

                          {/* Critical Warnings */}
                          {exceeds90 && (
                            <div className="bg-rose-50 border border-red-350 p-1.5 text-[8.5px] text-red-700 font-black flex items-center gap-1.5 uppercase animate-pulse">
                              <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                              <span>⚠️ Bottleneck Warning: utilization exceeds safe 90% threshold!</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </LegacyFieldset>
              </div>

              {/* Dist Chart Section */}
              <div className="col-span-7 flex flex-col">
                <LegacyFieldset legend="Godown Allotment Breakdown Visualization">
                  <div className="bg-white p-2 border border-slate-355 flex flex-col justify-between items-center h-[340px] shadow-inner mt-1">
                    <span className="text-[9px] font-extrabold uppercase italic pb-1 text-slate-500">Stacked Warehouse Bag Counts for Bottleneck Auditing</span>
                    <ResponsiveContainer width="100%" height="90%" minWidth={100} minHeight={100}>
                      <BarChart data={Object.values(godownsStock).map((g: any) => ({
                        name: g.gdn_name.replace(' GODOWN', '').replace('(RAW MAIN)', '').trim(),
                        'Jute Bales': g.jute,
                        'Tossa Bags': g.tossa,
                        'B-Twill Bags': g.btwill
                      }))} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 8, fontWeight: 'bold' }} />
                        <YAxis tick={{ fontSize: 8 }} />
                        <Tooltip contentStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                        <Legend wrapperStyle={{ fontSize: 8, fontWeight: 'bold' }} />
                        <Bar dataKey="Jute Bales" stackId="a" fill="#1e3a8a" />
                        <Bar dataKey="Tossa Bags" stackId="a" fill="#059669" />
                        <Bar dataKey="B-Twill Bags" stackId="a" fill="#d97706" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </LegacyFieldset>
              </div>
            </div>
          </div>
        )}

        {viewTab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-white p-3 border border-slate-350 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="text-xs font-black uppercase text-indigo-950 font-sans flex items-center gap-1.5">
                  <History className="h-4 w-4" /> Secure Operational Audit Trail Log
                </h3>
                <p className="text-[9.5px] font-bold text-gray-500 uppercase">Tamper-evident logs recording ledger modifications, outward disbursements, inward arrivals and bulk transfers.</p>
              </div>
              
              {/* Audit Search bar */}
              <div className="w-full md:w-80 relative">
                <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <input
 id="filter_audits_by_operator_1011" name="filter_audits_by_operator" aria-label="Filter audits by operator or voucher..."                  type="text"
                  className="w-full bg-[#f8fafc] border border-gray-400 py-1 pl-8 pr-3 text-xs font-bold outline-none uppercase placeholder-gray-400"
                  placeholder="Filter audits by operator or voucher..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="border border-slate-450 bg-white overflow-hidden shadow-inner max-h-[460px] overflow-y-auto">
              <table className="w-full text-left text-[11px] border-collapse font-sans">
                <thead className="sticky top-0 bg-[#FBCFCB] text-slate-800 font-extrabold uppercase border-b border-gray-400 text-[9.5px] shadow z-10">
                  <tr>
                    <th className="p-2 border border-gray-200">Date/Time (UTC)</th>
                    <th className="p-2 border border-gray-200">Log Action</th>
                    <th className="p-2 border border-gray-200">Material Item</th>
                    <th className="p-2 border border-gray-200 text-right">Quantity</th>
                    <th className="p-2 border border-gray-200">From / Source</th>
                    <th className="p-2 border border-gray-200">To / Destination</th>
                    <th className="p-2 border border-gray-200">Voucher Ref</th>
                    <th className="p-2 border border-gray-200 font-mono">Operator ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-mono text-[10px] font-bold">
                  {audits.filter(aud => {
                    if (!auditSearchQuery) return true;
                    const q = auditSearchQuery.toLowerCase();
                    return (
                      aud.operator_id?.toLowerCase().includes(q) ||
                      aud.voucher_no?.toLowerCase().includes(q) ||
                      aud.action_type?.toLowerCase().includes(q) ||
                      aud.item_type?.toLowerCase().includes(q)
                    );
                  }).map((aud, idx) => {
                    const actionColors: Record<string, string> = {
                      'INWARD_ENTRY': 'bg-emerald-700 text-white',
                      'OUTWARD_ENTRY': 'bg-rose-700 text-white',
                      'TRANSFER_OUT': 'bg-blue-700 text-white',
                      'BULK_TRANSFER': 'bg-amber-600 text-white',
                      'UPDATE_VOUCHER': 'bg-indigo-700 text-white',
                      'DELETE_VOUCHER': 'bg-red-800 text-white',
                      'INITIAL_SEED': 'bg-slate-700 text-white',
                    };
                    return (
                      <tr key={aud.id || idx} className="hover:bg-slate-50 border-b border-gray-200 text-slate-700">
                        <td className="p-2  text-slate-500 whitespace-nowrap">
                          {new Date(aud.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                        </td>
                        <td className="p-2 ">
                          <span className={cn(
                            "text-[8px] font-black tracking-tight uppercase px-1 rounded-sm block text-center max-w-[120px] truncate",
                            actionColors[aud.action_type] || "bg-gray-600 text-white"
                          )}>
                            {aud.action_type}
                          </span>
                        </td>
                        <td className="p-2 font-sans uppercase text-[9px] text-slate-600">{aud.item_type}</td>
                        <td className="p-2 text-right text-indigo-950 font-black tabular-nums">{aud.quantity} Pcs</td>
                        <td className="p-2 font-sans uppercase text-[9px] text-slate-600 truncate max-w-[150px]">{aud.source_ref}</td>
                        <td className="p-2 font-sans uppercase text-[9px] text-slate-600 truncate max-w-[150px]">{aud.dest_ref}</td>
                        <td className="p-2 select-all text-indigo-900">{aud.voucher_no}</td>
                        <td className="p-2 font-mono text-[9px] text-slate-600">{aud.operator_id}</td>
                      </tr>
                    );
                  })}
                  {audits.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-10 font-sans text-gray-400 italic">No historical audit records found in the system ledger database.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW ARCHIVE MODAL */}
        {showViewModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
            <div className="bg-[#FBCFCB] border-2 border-white shadow-[4px_4px_10px_rgba(0,0,0,0.35)] w-full max-w-4xl rounded-sm p-4 flex flex-col h-[80vh]">
              
              <div className="flex justify-between items-center pb-2 border-b-2 border-gray-400 mb-3 shrink-0">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Database className="h-4 w-4" />
                  <span className="text-xs uppercase font-extrabold tracking-wide">Godown Ledger Archives ({searchFilteredEntries.length} Records)</span>
                </div>
                <button onClick={() => setShowViewModal(false)} className="text-xs font-black hover:bg-slate-100 p-1 border border-slate-350 bg-[#FBCFCB]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="mb-3 shrink-0">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
 id="search_ledger_entries_by__1110" name="search_ledger_entries_by_" aria-label="Search ledger entries by voucher, customer name, material type..."                    type="text"
                    className="w-full bg-white border border-gray-400 py-1.5 pl-9 pr-4 text-xs font-bold outline-none uppercase placeholder-gray-400"
                    placeholder="Search ledger entries by voucher, customer name, material type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-auto border border-gray-400 bg-white">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="sticky top-0 bg-[#FBCFCB] text-slate-800 font-extrabold uppercase border-b border-gray-400 text-[10px]  shadow">
                    <tr>
                      <th className="p-2 border border-gray-150">Voucher No</th>
                      <th className="p-2 border border-gray-150">Type</th>
                      <th className="p-2 border border-gray-150">Date</th>
                      <th className="p-2 border border-gray-150 font-bold">Godown</th>
                      <th className="p-2 border border-gray-150">Material</th>
                      <th className="p-2 border border-gray-150">Account Name</th>
                      <th className="p-2 border border-gray-150 text-right">Qty (Bags)</th>
                      <th className="p-2 border border-gray-150 text-right">Rate</th>
                      <th className="p-2 border border-gray-150 text-right">Total (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-mono text-[10px] font-bold">
                    {searchFilteredEntries.map((row) => {
                      const gName = godowns.find(g => g.gdn_code === row.gdn_code)?.gdn_name || 'MAIN GODOWN';
                      return (
                        <tr 
                          key={row.id} 
                          className="hover:bg-indigo-50 border-b border-gray-200 cursor-pointer text-slate-700" 
                          onDoubleClick={() => {
                            handleLoadEntry(row);
                            setShowViewModal(false);
                          }}
                        >
                          <td className="p-2 text-indigo-950 font-black">{row.voucher_no}</td>
                          <td className="p-2">
                            <span className={cn(
                              "text-[8px] px-1.5 py-0.5 rounded-sm text-white font-extrabold uppercase",
                              row.voucher_type === 'return' ? "bg-emerald-700" : row.voucher_type === 'issue' ? "bg-rose-700" : "bg-blue-700"
                            )}>
                              {row.voucher_type}
                            </span>
                          </td>
                          <td className="p-2">{row.date}</td>
                          <td className="p-2 uppercase font-sans text-[9px] text-slate-600">{gName}</td>
                          <td className="p-2 uppercase font-sans text-[9px] text-slate-600">{row.item_type}</td>
                          <td className="p-2 uppercase font-sans text-[9.5px] text-slate-900 truncate max-w-[150px]">{row.account_name}</td>
                          <td className="p-2 text-right">{row.quantity}</td>
                          <td className="p-2 text-right">₹{row.rate.toFixed(2)}</td>
                          <td className="p-2 text-right text-indigo-900 font-extrabold">₹{row.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                    {searchFilteredEntries.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-10 font-sans text-gray-400 italic font-bold">No matching records found in database archives.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 shrink-0 flex justify-between items-center text-[10px] font-black text-slate-600 uppercase font-sans">
                <span>**Double click any row above to load & alter details on active record**</span>
                <span className="italic">Ledger node: SUPABASE CLIENT DIRECT</span>
              </div>
            </div>
          </div>
        )}

        {/* SUMMARY & BALANCES MODAL */}
        <SummaryModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          liveStock={liveStock}
          entries={entries}
        />

        {/* PRINT INDIVIDUAL DOCKET MODAL */}
        {showPrintModal && printTargetVoucher && (
          <PrintModal
            isOpen={showPrintModal}
            onClose={() => setShowPrintModal(false)}
            title="Generate Printable Gate Pass / Delivery Docket"
          >
            {/* Printable Area */}
            <div id="printable-voucher-stage" className="bg-white border border-gray-400 p-8 text-black shadow-inner">
              {/* Mill Title */}
              <div className="text-center border-b-4 border-slate-900 pb-3">
                <h1 className="text-lg font-black tracking-tight uppercase">CHAMPDANY FIBRE TRADING LIMITED</h1>
                <p className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">Godown Operations & Material Gate Pass Management Node</p>
                <p className="text-[9px] text-gray-500 font-sans italic mt-1">Printed on: {new Date().toLocaleDateString('en-IN')}</p>
              </div>

              {/* Sub-bar */}
              <div className="my-4 flex justify-between items-center text-[10px] uppercase font-mono bg-slate-100 p-2 border">
                <div>
                  <strong>VOUCHER NO:</strong> <span className="underline">{printTargetVoucher.voucher_no}</span>
                </div>
                <div>
                  <strong>DATE:</strong> <span>{printTargetVoucher.date}</span>
                </div>
                <div>
                  <strong>TYPE:</strong> <span className="underline font-bold text-indigo-900">{printTargetVoucher.voucher_type}</span>
                </div>
              </div>

              {/* Core Voucher table */}
              <div className="border border-slate-400 my-4 text-[11px] font-mono">
                <div className="grid grid-cols-12 border-b bg-slate-50 font-bold p-1.5 uppercase">
                  <span className="col-span-8">Description Of Material</span>
                  <span className="col-span-2 text-right">Qty (Bags)</span>
                  <span className="col-span-2 text-right">Rate/Pcs</span>
                </div>
                <div className="grid grid-cols-12 p-3 min-h-[80px]">
                  <div className="col-span-8 flex flex-col gap-1.5">
                    <span className="font-bold text-slate-900 uppercase">Item: {printTargetVoucher.item_type || 'Jute Bales'}</span>
                    <span className="text-[10px] text-slate-500 uppercase">Account: {printTargetVoucher.account_name}</span>
                    <span className="text-[10px] text-slate-500 uppercase">Warehouse: {godowns.find(g => g.gdn_code === printTargetVoucher.gdn_code)?.gdn_name || 'MAIN GODOWN'}</span>
                  </div>
                  <span className="col-span-2 text-right font-bold text-slate-900">{printTargetVoucher.quantity} Bags</span>
                  <span className="col-span-2 text-right">Rs. {Number(printTargetVoucher.rate || 0).toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-12 border-t font-black p-2 bg-slate-50 uppercase justify-between">
                  <span className="col-span-8 text-right font-bold">Estimated Outlay Commercial Capital:</span>
                  <span className="col-span-4 text-right text-indigo-900 leading-none">
                    Rs. {Number(printTargetVoucher.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Narration */}
              {printTargetVoucher.narration && (
                <div className="my-3 bg-slate-50 p-2.5 rounded-sm border ">
                  <strong className="text-[10px] text-gray-500 block uppercase mb-1">Narration / Internal remarks:</strong>
                  <p className="text-[10px] text-slate-700 italic uppercase font-semibold leading-relaxed">
                    {printTargetVoucher.narration}
                  </p>
                </div>
              )}

              {/* Checkoff list */}
              <div className="pt-10 border-t border-dashed mt-12 flex justify-between items-end text-[10px] font-mono ">
                <div className="text-left">
                  <div className="h-10 border-b border-black w-36"></div>
                  <p className="mt-1.5 font-bold uppercase text-slate-700">WAREHOUSE IN-CHARGE</p>
                  <p className="text-[8.5px] text-gray-400">Stock Count Verified</p>
                </div>
                <div className="text-right">
                  <div className="h-10 border-b border-black w-36 ml-auto"></div>
                  <p className="mt-1.5 font-bold uppercase text-slate-700">AUTHORIZED ERP PASS</p>
                  <p className="text-[8.5px] text-gray-400">Ledger Update Success</p>
                </div>
              </div>

            </div>
          </PrintModal>
        )}

        {/* BULK TRANSFER WIZARD MODAL */}
        <BulkTransferWizardModal
          isOpen={showBulkTransferModal}
          onClose={() => setShowBulkTransferModal(false)}
          godowns={godowns}
          bulkSourceCode={bulkSourceCode}
          setBulkSourceCode={setBulkSourceCode}
          bulkDestCode={bulkDestCode}
          setBulkDestCode={setBulkDestCode}
          bulkItemType={bulkItemType}
          setBulkItemType={setBulkItemType}
          bulkQty={bulkQty}
          setBulkQty={setBulkQty}
          bulkRate={bulkRate}
          setBulkRate={setBulkRate}
          bulkOperator={bulkOperator}
          setBulkOperator={setBulkOperator}
          bulkNarration={bulkNarration}
          setBulkNarration={setBulkNarration}
          onAssessImpact={() => {
            if (bulkSourceCode === bulkDestCode) {
              showBanner('Source and destination godowns must be different!', 'error');
              return;
            }
            if (bulkQty <= 0) {
              showBanner('Quantity must be greater than zero!', 'error');
              return;
            }
            const sourceStock = bulkItemType === 'Jute Bales' ? godownsStock[bulkSourceCode]?.jute :
                                bulkItemType === 'Tossa Bags' ? godownsStock[bulkSourceCode]?.tossa :
                                godownsStock[bulkSourceCode]?.btwill;

            if (bulkQty > sourceStock) {
              showBanner(`Insufficient Stock! Source godown has only ${sourceStock} ${bulkItemType}.`, 'error');
              return;
            }
            setShowBulkConfirmModal(true);
          }}
        />

        {/* BULK TRANSFER CONFIRMATION DOCKET / IMPACT DIALOG */}
        {showBulkConfirmModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex justify-center items-center z-55 p-4">
            <div className="bg-[#FBCFCB] border-2 border-white shadow-[6px_6px_15px_rgba(0,0,0,0.5)] w-full max-w-xl rounded-sm p-4 text-black">
              
              <div className="flex justify-between items-center pb-2 border-b border-gray-400 mb-3 font-sans">
                <div className="flex items-center gap-1.5 font-bold text-red-900">
                  <AlertTriangle className="h-5 w-5 text-rose-700 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wide animate-pulse">PRE-TRANSFER IMPACT ASSESSMENT</span>
                </div>
              </div>

              <div className="bg-white p-3 border border-slate-350 rounded-sm space-y-4 font-sans text-xs">
                <p className="font-extrabold uppercase text-[10px] text-gray-500">
                  Reviewing the projected capacity and inventory allotment shift for <span className="text-indigo-950 font-black">{bulkQty} {bulkItemType}</span>:
                </p>

                {/* Impact Tables */}
                <div className="divide-y divide-slate-150 space-y-3">
                  
                  {/* SOURCE GODOWN */}
                  <div className="pt-2">
                    <span className="text-[10px] font-black text-rose-800 uppercase italic">SOURCE: {godowns.find(g => g.gdn_code === bulkSourceCode)?.gdn_name}</span>
                    <div className="grid grid-cols-3 gap-2 text-center mt-1.5">
                      <div className="bg-slate-50 border p-1 rounded-sm">
                        <span className="text-[7.5px] text-gray-400 block font-bold uppercase">Item Stock</span>
                        <span className="font-mono font-bold text-[10px] line-through text-slate-400 block">
                          {(bulkItemType === 'Jute Bales' ? godownsStock[bulkSourceCode]?.jute :
                            bulkItemType === 'Tossa Bags' ? godownsStock[bulkSourceCode]?.tossa :
                            godownsStock[bulkSourceCode]?.btwill).toLocaleString('en-IN')}
                        </span>
                        <span className="text-rose-700 font-mono font-black text-[11px] block">
                          » {((bulkItemType === 'Jute Bales' ? godownsStock[bulkSourceCode]?.jute :
                              bulkItemType === 'Tossa Bags' ? godownsStock[bulkSourceCode]?.tossa :
                              godownsStock[bulkSourceCode]?.btwill) - bulkQty).toLocaleString('en-IN')} Pcs
                        </span>
                      </div>

                      <div className="bg-slate-50 border p-1 rounded-sm">
                        <span className="text-[7.5px] text-gray-400 block font-bold uppercase">Total Stock</span>
                        <span className="font-mono font-bold text-[10px] line-through text-slate-400 block">
                          {godownsStock[bulkSourceCode]?.total.toLocaleString('en-IN')}
                        </span>
                        <span className="text-rose-700 font-mono font-black text-[11px] block">
                          » {(godownsStock[bulkSourceCode]?.total - bulkQty).toLocaleString('en-IN')} Pcs
                        </span>
                      </div>

                      <div className="bg-slate-50 border p-1 rounded-sm">
                        <span className="text-[7.5px] text-gray-400 block font-bold uppercase">Utilisation %</span>
                        <span className="font-mono font-bold text-[10px] line-through text-slate-400 block">
                          {godownsStock[bulkSourceCode]?.utilization.toFixed(1)}%
                        </span>
                        <span className="text-rose-700 font-mono font-black text-[11px] block">
                          » {(((godownsStock[bulkSourceCode]?.total - bulkQty) / godownsStock[bulkSourceCode]?.capacity) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DESTINATION GODOWN */}
                  <div className="pt-3">
                    <span className="text-[10px] font-black text-emerald-800 uppercase italic">DESTINATION: {godowns.find(g => g.gdn_code === bulkDestCode)?.gdn_name}</span>
                    <div className="grid grid-cols-3 gap-2 text-center mt-1.5">
                      <div className="bg-slate-50 border p-1 rounded-sm">
                        <span className="text-[7.5px] text-gray-400 block font-bold uppercase">Item Stock</span>
                        <span className="font-mono font-bold text-[10px] line-through text-slate-400 block">
                          {(bulkItemType === 'Jute Bales' ? godownsStock[bulkDestCode]?.jute :
                            bulkItemType === 'Tossa Bags' ? godownsStock[bulkDestCode]?.tossa :
                            godownsStock[bulkDestCode]?.btwill).toLocaleString('en-IN')}
                        </span>
                        <span className="text-emerald-700 font-mono font-black text-[11px] block">
                          » {((bulkItemType === 'Jute Bales' ? godownsStock[bulkDestCode]?.jute :
                              bulkItemType === 'Tossa Bags' ? godownsStock[bulkDestCode]?.tossa :
                              godownsStock[bulkDestCode]?.btwill) + bulkQty).toLocaleString('en-IN')} Pcs
                        </span>
                      </div>

                      <div className="bg-slate-50 border p-1 rounded-sm">
                        <span className="text-[7.5px] text-gray-400 block font-bold uppercase">Total Stock</span>
                        <span className="font-mono font-bold text-[10px] line-through text-slate-400 block">
                          {godownsStock[bulkDestCode]?.total.toLocaleString('en-IN')}
                        </span>
                        <span className="text-emerald-700 font-mono font-black text-[11px] block">
                          » {(godownsStock[bulkDestCode]?.total + bulkQty).toLocaleString('en-IN')} Pcs
                        </span>
                      </div>

                      <div className="bg-slate-50 border p-1 rounded-sm">
                        <span className="text-[7.5px] text-gray-400 block font-bold uppercase">Utilisation %</span>
                        <span className="font-mono font-bold text-[10px] line-through text-slate-400 block">
                          {godownsStock[bulkDestCode]?.utilization.toFixed(1)}%
                        </span>
                        <span className={cn(
                          "font-mono font-black text-[11px] block",
                          ((godownsStock[bulkDestCode]?.total + bulkQty) / godownsStock[bulkDestCode]?.capacity) * 100 > 90
                            ? "text-red-600 animate-pulse font-sans text-xs underline"
                            : "text-emerald-700"
                        )}>
                          » {(((godownsStock[bulkDestCode]?.total + bulkQty) / godownsStock[bulkDestCode]?.capacity) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Check if post-transfer exceeds 90% */}
                    {(((godownsStock[bulkDestCode]?.total + bulkQty) / godownsStock[bulkDestCode]?.capacity) * 100) > 90 && (
                      <div className="bg-rose-50 border border-red-350 p-2.5 text-[8.5px] text-red-700 font-black flex items-start gap-1.5 mt-3 uppercase animate-pulse">
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                        <div>
                          <span>⚠️ BOTTLENECK CRITICAL THRESHOLD WARNING!</span>
                          <span className="block font-bold text-gray-500 mt-0.5 normal-case">Following this transfer, destination warehouse capacity will exceed 90.0%. Safety protocols and clearance logs are required before finalizing entry.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-1.5 font-sans">
                <button
                  type="button"
                  onClick={() => setShowBulkConfirmModal(false)}
                  className="bg-neutral-200 border border-slate-400 hover:bg-neutral-300 text-slate-800 font-bold px-4 py-1.5 text-[10px] uppercase rounded-sm cursor-pointer"
                >
                  « Back
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      const supabase = await getSupabase();
                      if (!supabase) throw new Error('Supabase client unavailable');
                      
                      const batchVNo = `BT-${Date.now().toString().slice(-6)}`;
                      
                      const sourceName = godowns.find(g => g.gdn_code === bulkSourceCode)?.gdn_name || bulkSourceCode;
                      const destName = godowns.find(g => g.gdn_code === bulkDestCode)?.gdn_name || bulkDestCode;
                      
                      // Perform insert with destination in narration so godownsStock hook matches it
                      const payload = {
                        voucher_no: batchVNo,
                        date: new Date().toISOString().split('T')[0],
                        gdn_code: bulkSourceCode,
                        item_type: bulkItemType,
                        account_name: `BULK TRANSFER: ${destName.toUpperCase()}`,
                        quantity: bulkQty,
                        rate: bulkRate,
                        amount: bulkQty * bulkRate,
                        narration: `[TRANSFER DEST: ${bulkDestCode}] Bulk Inter-Godown transfer from ${sourceName} to ${destName}. Operator: ${bulkOperator}`,
                        voucher_type: 'transfer'
                      };
                      
                      const { error } = await supabase.from('godown_entry').insert(payload);
                      if (error) throw error;
                      
                      // Log to the audit trail
                      await logAuditAction(
                        'BULK_TRANSFER',
                        bulkQty,
                        bulkItemType,
                        sourceName,
                        destName,
                        batchVNo,
                        bulkOperator
                      );
                      
                      showBanner(`Bulk transfer of ${bulkQty} ${bulkItemType} completed successfully!`, 'success');
                      setShowBulkConfirmModal(false);
                      setShowBulkTransferModal(false);
                      await loadEntriesFromDb();
                    } catch (err: any) {
                      console.error(err);
                      showBanner(`Bulk transfer failed: ${err.message || err}`, 'error');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="bg-red-700 border border-red-800 hover:bg-red-850 text-white font-extrabold px-5 py-1.5 text-[10px] uppercase rounded-sm cursor-pointer shadow-sm animate-pulse"
                >
                  Disburse & Finalize Ledger ✔
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </LegacyLayout>
  );
}

