import React, { useState, useEffect, useMemo } from 'react';
import { useLiveAutoRefresh } from '../hooks/useLiveAutoRefresh';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Save, 
  X, 
  Printer, 
  FileText, 
  TrendingUp,
  DollarSign,
  RefreshCcw,
  Download,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Wallet,
  BookOpen,
  ArrowLeft,
  Clock,
  Filter,
  Calendar,
  Layers,
  Users,
  AlertCircle
} from 'lucide-react';
import LegacyLayout from '../components/LegacyLayout';
import { supabase } from '../lib/supabase';
import { dbModule } from '../services/dbModule';
import { cn, formatIndianCurrency } from '../lib/utils';
import { PaginationControls } from '../components/PaginationControls';
import { enforceEditOrDeletePermission } from '../lib/permissions';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PaymentMaster {
  payment_id?: string;
  voucher_no: string;
  payment_date: string;
  mr_no: string;
  po_no: string;
  po_date: string;
  sett_date: string;
  po_type: string;
  broker: string;
  supplier: string;
  party_id: string;
  party_name: string;
  chn_supplier: string;
  lorry_number: string;
  arrival_no: string;
  arrival_date: string;
  arival_apmc_fees: number;
  remarks: string;
  payable_amt: number;
  payable_bill_no: string;
  payable_bill_date: string;
  total_amount: number;
  paid_amount: number;
  payment_mode: string;
  bank_name: string;
  reference_no: string;
  status: string;
  payment_status: string;
  advance_payment_done?: string;
  advance_payment_from?: string;
  payment_settlementdate?: string;
  tenor?: string;
  repayment_date?: string;
}

export interface PaymentDetailColumn {
  col_index: number;
  grade: string;
  area: string;
  agency: string;
  marka_crop: string;
  quantity: number;
  arr_qty_wt: number;
  rate_value: number;
  amount?: number;
}

const emptyDetailColumn = (index: number): PaymentDetailColumn => ({
  col_index: index,
  grade: '',
  area: '',
  agency: '',
  marka_crop: '',
  quantity: 0,
  arr_qty_wt: 0,
  rate_value: 0
});

const initialMaster = (): PaymentMaster => ({
  voucher_no: `ADV-${Date.now().toString().slice(-6)}`,
  payment_date: new Date().toISOString().split('T')[0],
  mr_no: '',
  po_no: '',
  po_date: '',
  sett_date: new Date().toISOString().split('T')[0],
  po_type: 'Standard',
  broker: '',
  supplier: '',
  party_id: '',
  party_name: '',
  chn_supplier: '',
  lorry_number: '',
  arrival_no: '',
  arrival_date: '',
  arival_apmc_fees: 0,
  remarks: '',
  payable_amt: 0,
  payable_bill_no: '',
  payable_bill_date: '',
  total_amount: 0,
  paid_amount: 0,
  payment_mode: 'RXIL',
  bank_name: '',
  reference_no: '',
  status: 'completed',
  payment_status: 'Paid',
  advance_payment_done: 'Yes',
  advance_payment_from: '2',
  payment_settlementdate: new Date().toISOString().split('T')[0],
  tenor: '30',
  repayment_date: ''
});

export default function PaymentModule({ onClose }: { onClose?: () => void }) {
  const [viewMode, setViewMode] = useState<'dashboard' | 'entry' | 'ledger'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [partyFilter, setPartyFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState('All');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Main payment state
  const [paymentList, setPaymentList] = useState<PaymentMaster[]>([]);
  const [masterData, setMasterData] = useState<PaymentMaster>(initialMaster());
  const [detailCols, setDetailCols] = useState<PaymentDetailColumn[]>([
    emptyDetailColumn(1), emptyDetailColumn(2), emptyDetailColumn(3), emptyDetailColumn(4)
  ]);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const initPage = async () => {
    setLoading(true);
    try {
      let payData: any[] = [];
      if (supabase) {
        const { data } = await supabase
          .from('payment_master')
          .select('*')
          .order('created_at', { ascending: false });
        if (data) payData = data;
      }
      
      const localPay = await dbModule.fetchAll('payment_master').catch(() => []);
      if (localPay && localPay.length > 0) {
        const map = new Map();
        payData.forEach(p => map.set(p.voucher_no, p));
        localPay.forEach(p => { if (!map.has(p.voucher_no)) map.set(p.voucher_no, p); });
        payData = Array.from(map.values());
      }
      setPaymentList(payData);
    } catch (e) {
      console.error("Error loading page payments layout:", e);
    } finally {
      setLoading(false);
    }
  };

  useLiveAutoRefresh(initPage, [], { tables: ['payment_master'] });

  useEffect(() => {
    initPage();
  }, []);

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>, currentData: PaymentMaster) => {
    const mode = e.target.value;
    let fromVal = '1'; 
    if (mode === 'RXIL') fromVal = '2';
    if (mode === 'TReDS') fromVal = '3';
    if (mode === 'Mart') fromVal = '4';

    setMasterData({
      ...currentData,
      payment_mode: mode,
      advance_payment_from: fromVal
    });
  };

  const handleTenorChange = (e: React.ChangeEvent<HTMLInputElement>, currentData: PaymentMaster) => {
    const tenorDays = Number(e.target.value) || 0;
    if (currentData.payment_settlementdate) {
      const settleDate = new Date(currentData.payment_settlementdate);
      settleDate.setDate(settleDate.getDate() + tenorDays);
      
      const yyyy = settleDate.getFullYear();
      const mm = String(settleDate.getMonth() + 1).padStart(2, '0');
      const dd = String(settleDate.getDate()).padStart(2, '0');

      setMasterData({
        ...currentData,
        tenor: e.target.value,
        repayment_date: `${yyyy}-${mm}-${dd}`
      });
    } else {
      setMasterData({ ...currentData, tenor: e.target.value });
    }
  };
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(null);
  /* const filteredPayments = useMemo(() => {
    return paymentList.filter(p => {
      const matchesSearch = !searchFilter.trim() || 
        (p.party_name || p.supplier || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (p.mr_no || '').toLowerCase().includes(searchFilter.toLowerCase());
      
      const matchesParty = partyFilter === 'All' || (p.party_name || p.supplier) === partyFilter;
      const matchesMode = modeFilter === 'All' || p.advance_payment_from === modeFilter;
      
      return matchesSearch && matchesParty && matchesMode;
    });
  }, [paymentList, searchFilter, partyFilter, modeFilter]); */
  /* const filteredPayments = useMemo(() => {
    return paymentList.filter(p => {
      const matchesSearch =
        !searchFilter.trim() ||
        (p.party_name || p.supplier || '')
          .toLowerCase()
          .includes(searchFilter.toLowerCase()) ||
        (p.mr_no || '')
          .toLowerCase()
          .includes(searchFilter.toLowerCase());

      const matchesParty =
        partyFilter === 'All' ||
        (p.party_name || p.supplier) === partyFilter;

      const matchesMode =
        modeFilter === 'All' ||
        p.advance_payment_from === modeFilter;

      // Month filter
      const matchesMonth =
        selectedMonth === null ||
        (
          p.repayment_date &&
          new Date(p.repayment_date).getMonth() === selectedMonth &&
          new Date(p.repayment_date).getFullYear() === selectedYear
        );

      return (
        matchesSearch &&
        matchesParty &&
        matchesMode &&
        matchesMonth
      );
    });
    }, [
    paymentList,
    searchFilter,
    partyFilter,
    modeFilter,
    selectedMonth,
    selectedYear
  ]); */
  //const matchesYear = p.repayment_date && new Date(p.repayment_date).getFullYear() === selectedYear;
  const filteredPayments = useMemo(() => {
    return paymentList.filter(p => {

      const matchesSearch =
        !searchFilter.trim() ||
        (p.party_name || p.supplier || '')
          .toLowerCase()
          .includes(searchFilter.toLowerCase()) ||
        (p.mr_no || '')
          .toLowerCase()
          .includes(searchFilter.toLowerCase());

      const matchesParty =
        partyFilter === 'All' ||
        (p.party_name || p.supplier) === partyFilter;

      const matchesMode =
        modeFilter === 'All' ||
        p.advance_payment_from === modeFilter;

      // YEAR FILTER
      const matchesYear =
        p.repayment_date &&
        new Date(p.repayment_date).getFullYear() === selectedYear;

      // MONTH FILTER
      const matchesMonth =
        selectedMonth === null ||
        (
          p.repayment_date &&
          new Date(p.repayment_date).getMonth() === selectedMonth
        );

      return (
        matchesSearch &&
        matchesParty &&
        matchesMode &&
        matchesYear &&
        matchesMonth
      );
    });
  }, [
    paymentList,
    searchFilter,
    partyFilter,
    modeFilter,
    selectedMonth,
    selectedYear
  ]);



  // Derived high fidelity KPI values from the modern MIS spec
  const metrics = useMemo(() => {
    const totalAdvancePaid = filteredPayments.reduce((sum, p) => sum + (Number(p.paid_amount || 0)), 0);
    const totalTransactions = filteredPayments.length;
    const uniqueParties = new Set(filteredPayments.map(p => p.party_name || p.supplier).filter(Boolean)).size;
    const pendingAdvance = filteredPayments.reduce((sum, p) => sum + (Math.max(0, Number(p.payable_amt || 0) - Number(p.paid_amount || 0))), 0);

    return {
      totalAdvancePaid: totalAdvancePaid || 0,
      totalTransactions: totalTransactions || 0,
      uniqueParties: uniqueParties || 0,
      pendingAdvance: pendingAdvance || 0
    };
  }, [filteredPayments]);

  const uniquePartyOptions = useMemo(() => {
    return Array.from(new Set(paymentList.map(p => p.party_name || p.supplier).filter(Boolean))).sort();
  }, [paymentList]);

  //Export csv
  const handleExportCsv = () => {
    if (filteredPayments.length === 0) {
      alert("No payment records to export.");
      return;
    }

    const headers = [
      'M.R No',
      'Supplier Name',
      'Advance Done',
      'Payable Amount',
      'Paid Amount',
      'Pending Amount',
      'Payment From',
      'Payment Settle date',
      'Tenor',
      'Re-Payment Date'
    ];

    const tableData = filteredPayments.map(p => {
      const payablep = Number(p.payable_amt || p.total_amount || 0);
      const paidp = Number(p.paid_amount || 0);
      const pendingp = payablep - paidp;

      const isAdvanceYesp =
        (p.advance_payment_done || 'No').toLowerCase() === 'yes';

      const advance_payment_fromp = p.advance_payment_from || '';

      const paymentFrom =
        advance_payment_fromp === '' || advance_payment_fromp === '1'
          ? 'FROM BANK'
          : advance_payment_fromp === '2'
          ? 'RXIL'
          : advance_payment_fromp === '3'
          ? 'TReDS'
          : advance_payment_fromp === '4'
          ? 'Invoice Mart'
          : '';

      return [
        p.mr_no || '',
        p.party_name || p.supplier || '',
        isAdvanceYesp ? 'YES' : 'NO',
        payablep.toFixed(2),
        paidp.toFixed(2),
        pendingp.toFixed(2),
        paymentFrom,
        p.payment_settlementdate
          ? new Date(p.payment_settlementdate).toLocaleDateString('en-IN')
          : '',
        p.tenor || '',
        p.repayment_date
          ? new Date(p.repayment_date).toLocaleDateString('en-IN')
          : ''
      ];
    });

    // Escape CSV values
    const escapeCsvValue = (value) => {
      const stringValue = String(value ?? '');

      if (
        stringValue.includes(',') ||
        stringValue.includes('"') ||
        stringValue.includes('\n')
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    };

    // Create CSV
    const csvContent = [
      headers.map(escapeCsvValue).join(','),
      ...tableData.map(row =>
        row.map(escapeCsvValue).join(',')
      )
    ].join('\r\n');

    // Add BOM for proper Excel UTF-8 support
    const blob = new Blob(
      ['\uFEFF' + csvContent],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `Treds_Records_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // Export PDF Ledger / Summary
  const handleExportPdf = () => {
    if (filteredPayments.length === 0) {
      alert("No payment records to export.");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Treds Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    const tableData = filteredPayments.map(p => {
      const payablep = Number(p.payable_amt || p.total_amount || 0);
      const paidp = Number(p.paid_amount || 0);
      const pendingp = payablep - paidp;

      const isAdvanceYesp =
        (p.advance_payment_done || 'No').toLowerCase() === 'yes';

      const advance_payment_fromp = p.advance_payment_from || '';

      return [
        p.mr_no,
        p.party_name || p.supplier || '',
        isAdvanceYesp ? 'YES' : 'NO',
        formatIndianCurrency(payablep),
        formatIndianCurrency(paidp),
        formatIndianCurrency(pendingp),

        advance_payment_fromp === '' || advance_payment_fromp === '1'
          ? 'FROM BANK'
          : advance_payment_fromp === '2'
          ? 'RXIL'
          : advance_payment_fromp === '3'
          ? 'TReDS'
          : advance_payment_fromp === '4'
          ? 'Invoice Mart'
          : '',

        p.payment_settlementdate
          ? new Date(p.payment_settlementdate).toLocaleDateString('en-IN')
          : '',

        p.tenor || '',

        p.repayment_date
          ? new Date(p.repayment_date).toLocaleDateString('en-IN')
          : '',
      ];
    });

    autoTable(doc, {
      startY: 28,
      head: [['M.R No', 'Supplier Name', 'Advance Done', 'Payable Amount', 'Paid Amount', 'Pending Amount', 'Payment From', 'Payment Settle date','Tenor','Re-Payment Date']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save('Treds_Records.pdf');
  };
  
  const monthlyTransactions = Array.from({ length: 12 }, (_, monthIndex) => {
    return filteredPayments.filter((payment) => {
      if (!payment.repayment_date) return false;

      const date = new Date(payment.repayment_date);

      return (
        date.getFullYear() === selectedYear &&
        date.getMonth() === monthIndex
      );
    }).length;
  });
 

  return (
    <LegacyLayout
      title="Advance Payment Dashboard"
      subtitle="Bally Jute Mill MIS Dashboard — Real-time Financial Control & Tokenization Register"
      onClose={onClose}
    >
      {/* FILTER TOPBAR BAR */}
      
      <div className="bg-gradient-to-r from-[#D94B5A] via-[#F7AFA8] to-[#F7AFA8] p-4 rounded-xl border border-[#FBCFCB] shadow-md flex flex-wrap items-center justify-between gap-4 mb-4">

        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">

          <div className="flex items-end gap-2">

            {/* Year Dropdown */}
            <div className="flex flex-col min-w-[110px]">

              <label className="text-[12px] font-bold text-[#FDE7E6] uppercase tracking-wider mb-1">
                Year
              </label>

              <select
  value={selectedYear}
  onChange={(e) => {
    setSelectedYear(Number(e.target.value));
    setSelectedMonth(null);
  }}
  className="border border-[#b9ceb1] rounded-lg px-2 py-1.5 bg-[#dce8d6] text-xs font-semibold text-[#244b2c] outline-none focus:ring-2 focus:ring-[#D94B5A]/40 focus:border-[#D94B5A] transition-all"
>
                {Array.from({ length: 10 }, (_, index) => 2026 + index).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

            </div>


            {/* Date Range */}
            <div className="flex flex-col min-w-[160px]">

              <label className="text-[12px] font-bold text-[#FDE7E6] uppercase tracking-wider mb-1">
                Date Range
              </label>

              <div className="flex items-center gap-1 border border-[#b9ceb1] rounded-lg px-2 py-1.5 bg-[#dce8d6] text-xs font-semibold text-[#244b2c]">

                <Calendar className="w-3.5 h-3.5 text-[#4b7658]" />

                <span>
                  01 Jan {selectedYear} — 31 Dec {selectedYear}
                </span>

              </div>

            </div>

          </div>


          {/* Party Group */}
          <div className="flex flex-col min-w-[180px]">

            <label className="text-[12px] font-bold text-[#FDE7E6] uppercase tracking-wider mb-1">
              Party Group
            </label>

            <select
              value={partyFilter}
              onChange={e => setPartyFilter(e.target.value)}
              className="border border-[#b9ceb1] bg-[#dce8d6] rounded-lg px-2 py-1.5 text-xs font-bold text-[#244b2c] outline-none focus:ring-2 focus:ring-[#D94B5A]/40 focus:border-[#D94B5A] transition-all"
            >
              <option value="All">All Parties</option>

              {uniquePartyOptions.map(pt => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}

            </select>

          </div>


          {/* Payment Mode */}
          <div className="flex flex-col min-w-[180px]">

            <label className="text-[12px] font-bold text-[#FDE7E6] uppercase tracking-wider mb-1">
              Payment Mode
            </label>

            <select
              value={modeFilter}
              onChange={e => setModeFilter(e.target.value)}
              className="border border-[#b9ceb1] bg-[#dce8d6] rounded-lg px-2 py-1.5 text-xs font-bold text-[#244b2c] outline-none focus:ring-2 focus:ring-[#D94B5A]/40 focus:border-[#D94B5A] transition-all"
            >
              <option value="All">All (Trade / Invoice Mart / RXIL)</option>
              <option value="1">From Bank</option>
              <option value="2">RXIL</option>
              <option value="3">TReDS</option>
              <option value="4">Invoice Mart</option>
            </select>

          </div>

        </div>


        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4">

          <div className="flex items-center gap-2">

            {/* Export CSV */}
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 text-xs font-bold text-[#D94B5A] bg-[#FDE7E6] hover:bg-[#e4c65c] border border-[#b89425] rounded-lg flex items-center gap-1.5 transition-all duration-200 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>


            {/* Export PDF */}
            <button
              onClick={handleExportPdf}
              className="px-3 py-1.5 text-xs font-bold text-[#D94B5A] bg-[#FDE7E6] hover:bg-[#e4c65c] border border-[#b89425] rounded-lg flex items-center gap-1.5 transition-all duration-200 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </button>


            {/* Refresh */}
            <button
              onClick={initPage}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-bold text-[#D94B5A] bg-[#FDE7E6] hover:bg-[#e4c65c] border border-[#b89425] rounded-lg flex items-center gap-1.5 transition-all duration-200 shadow-sm"
              title="Refresh Table"
            >
              <RefreshCcw
                className={cn(
                  "w-4 h-4",
                  loading && "animate-spin text-[#D94B5A]"
                )}
              />
            </button>

          </div>

        </div>

      </div>

      {/* METRIC KPI TILES SECTION */}
      {viewMode === 'dashboard' && (
        <div className="space-y-4">
          
          <div className="space-y-3">
            {/* Main Summary Cards */}
            <div className="bg-gradient-to-br from-[#e8eee2] via-[#dfe8d9] to-[#d4e1ce] rounded-2xl p-3 border border-[#cbdac4] shadow-[0_4px_16px_rgba(23,76,44,0.06)]">

              {/* ================= SUMMARY CARDS ================= */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

                {/* Total Advance Paid - Green */}
                <div className="group relative overflow-hidden bg-gradient-to-br from-[#e8f5e9] to-[#c8e6c9] px-3 py-3 rounded-xl border border-[#a5c9a8] shadow-[0_3px_12px_rgba(23,76,44,0.06)] flex items-center justify-between min-w-0 hover:border-[#D94B5A]/40 hover:shadow-[0_8px_20px_rgba(23,76,44,0.12)] transition-all duration-300">

                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#D94B5A] to-[#4d8a5c]" />

                  <div className="min-w-0 pl-1">
                    <span className="text-[9px] uppercase tracking-wide font-extrabold text-[#4f7054] block truncate">
                      Total Advance Paid
                    </span>

                    <h3 className="text-base font-black text-[#17351f] mt-0.5 truncate">
                      ₹ {metrics.totalAdvancePaid.toLocaleString('en-IN')}
                    </h3>
                  </div>

                  <div className="p-2 bg-[#b7d8ba] rounded-lg text-[#D94B5A] shrink-0 group-hover:bg-[#D94B5A] group-hover:text-white transition-all duration-300 shadow-sm">
                    <FileText className="w-4 h-4" />
                  </div>

                </div>


                {/* Total Transactions - Blue */}
                <div className="group relative overflow-hidden bg-gradient-to-br from-[#e3f2f8] to-[#c5e1eb] px-3 py-3 rounded-xl border border-[#a9cbd7] shadow-[0_3px_12px_rgba(30,90,110,0.06)] flex items-center justify-between min-w-0 hover:border-[#28718a]/40 hover:shadow-[0_8px_20px_rgba(40,113,138,0.12)] transition-all duration-300">

                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#17617a] to-[#3c8990]" />

                  <div className="min-w-0 pl-1">
                    <span className="text-[9px] uppercase tracking-wide font-extrabold text-[#527784] block truncate">
                      Total Transactions
                    </span>

                    <h3 className="text-base font-black text-[#173b42] mt-0.5">
                      {metrics.totalTransactions}
                    </h3>
                  </div>

                  <div className="p-2 bg-[#b8dce5] rounded-lg text-[#286b78] shrink-0 group-hover:bg-[#286b78] group-hover:text-white transition-all duration-300 shadow-sm">
                    <FileText className="w-4 h-4" />
                  </div>

                </div>


                {/* Total Parties - Purple */}
                <div className="group relative overflow-hidden bg-gradient-to-br from-[#f0eafa] to-[#ddd3ef] px-3 py-3 rounded-xl border border-[#c9b9df] shadow-[0_3px_12px_rgba(90,70,130,0.06)] flex items-center justify-between min-w-0 hover:border-[#7565a5]/40 hover:shadow-[0_8px_20px_rgba(80,70,130,0.12)] transition-all duration-300">

                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#66539a] to-[#8b72b8]" />

                  <div className="min-w-0 pl-1">
                    <span className="text-[9px] uppercase tracking-wide font-extrabold text-[#75678d] block truncate">
                      Total Parties
                    </span>

                    <h3 className="text-base font-black text-[#302d4b] mt-0.5">
                      {metrics.uniqueParties}
                    </h3>
                  </div>

                  <div className="p-2 bg-[#d3c7e7] rounded-lg text-[#7565a5] shrink-0 group-hover:bg-[#7565a5] group-hover:text-white transition-all duration-300 shadow-sm">
                    <Users className="w-4 h-4" />
                  </div>

                </div>


                {/* Pending Advance - Gold */}
                <div className="group relative overflow-hidden bg-gradient-to-br from-[#fff8df] to-[#f1e3b5] px-3 py-3 rounded-xl border border-[#dfce96] shadow-[0_3px_12px_rgba(176,138,34,0.06)] flex items-center justify-between min-w-0 hover:border-[#d4af37]/60 hover:shadow-[0_8px_20px_rgba(176,138,34,0.14)] transition-all duration-300">

                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#d4af37] to-[#b78b24]" />

                  <div className="min-w-0 pl-1">
                    <span className="text-[9px] uppercase tracking-wide font-extrabold text-[#8d7947] block truncate">
                      Pending Advance
                    </span>

                    <h3 className="text-base font-black text-[#493c1e] mt-0.5 truncate">
                      ₹ {metrics.pendingAdvance.toLocaleString('en-IN')}
                    </h3>
                  </div>

                  <div className="p-2 bg-[#ead9a5] rounded-lg text-[#a47d19] shrink-0 group-hover:bg-[#d4af37] group-hover:text-white transition-all duration-300 shadow-sm">
                    <Clock className="w-4 h-4" />
                  </div>

                </div>

              </div>

              {/* Month Cards */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 mt-3">

                {[
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec",
                ]
                  .map((month, index) => ({ month, index }))
                  .filter(({ index }) => monthlyTransactions[index] > 0)
                  .map(({ month, index }) => (

                    <div
                      key={month}
                      onClick={() =>
                        setSelectedMonth(
                          selectedMonth === index ? null : index
                        )
                      }
                      className={`group relative overflow-hidden px-2 py-3 rounded-xl border text-center min-w-0 cursor-pointer transition-all duration-300 ${
                        selectedMonth === index
                          ? "border-[#D94B5A] bg-gradient-to-br from-[#D94B5A] via-[#205b35] to-[#347346] shadow-[0_6px_16px_rgba(23,76,44,0.25)] scale-[1.02]"
                          : "border-[#b8cdb0] bg-gradient-to-br from-[#dce8d5] to-[#cbdcc4] hover:from-[#d1e3cb] hover:to-[#bdd2b5] hover:border-[#8eaf8b] hover:shadow-[0_5px_14px_rgba(23,76,44,0.14)]"
                      }`}
                    >

                      {/* Top Accent */}
                      <div
                        className={`absolute top-0 left-0 right-0 h-0.5 ${
                          selectedMonth === index
                            ? "bg-[#e4c65c]"
                            : "bg-[#aec5a6] group-hover:bg-[#D94B5A]"
                        }`}
                      />

                      {/* Month */}
                      <span
                        className={`text-[10px] uppercase tracking-wide font-extrabold block ${
                          selectedMonth === index
                            ? "text-[#f4d76a]"
                            : "text-[#466b4b]"
                        }`}
                      >
                        {month}
                      </span>

                      {/* Count */}
                      <h3
                        className={`text-xl font-black mt-1 leading-tight ${
                          selectedMonth === index
                            ? "text-white"
                            : "text-[#17351f]"
                        }`}
                      >
                        {monthlyTransactions[index]}
                      </h3>

                      {/* Label */}
                      <span
                        className={`text-[9px] font-semibold ${
                          selectedMonth === index
                            ? "text-[#e1eadf]"
                            : "text-[#6b8870]"
                        }`}
                      >
                        Transactions
                      </span>

                    </div>

                  ))}

              </div>

            </div>

          </div>

          {/* MAIN DATATABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="relative min-w-[260px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Supplier Name, M.R No..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={initPage} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600">
                  <RefreshCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] uppercase font-black text-slate-600">
                    <th className="p-2.5">M.R No</th>
                    <th className="p-2.5">Supplier</th>
                    <th className="p-2.5 text-center">Advance Done</th>
                    <th className="p-2.5 text-right">Payable Amount</th>
                    <th className="p-2.5 text-right">Paid Amount</th>
                    <th className="p-2.5 text-right">Pending Amount</th>
                    <th className="p-2.5 text-right">Payment From</th>
                    <th className="p-2.5">Payment Settle date</th>
                    <th className="p-2.5">Tenor</th>
                    <th className="p-2.5">Re-Payment Date </th>
                    {/* <th className="p-2.5 text-center">Actions</th> */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPayments.length > 0 ? (
                    filteredPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((p, idx) => {
                      const payable = Number(p.payable_amt || p.total_amount || 0);
                      const paid = Number(p.paid_amount || 0);
                      const pending = payable - paid;
                      const isAdvanceYes = (p.advance_payment_done || 'No').toLowerCase() === 'yes';
                      const advance_payment_from = p.advance_payment_from || '';
                      return (
                        <tr key={p.payment_id || p.voucher_no || idx} className="hover:bg-purple-50/40 transition-colors">
                          <td className="p-2.5 font-mono text-slate-600">
                            <div className="text-[11px] font-bold text-slate-700">{p.mr_no || '-'}</div>
                            {p.po_no && <div className="text-[9px] text-slate-400">P.O: {p.po_no}</div>}
                          </td>
                          
                          <td className="p-2.5 font-semibold text-slate-800">
                            {p.party_name || p.supplier || '-'}
                          </td>
                          
                          <td className="p-2.5 text-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border inline-flex items-center gap-1",
                              isAdvanceYes
                                ? "bg-green-100 text-green-900 border-green-300"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            )}>
                              {isAdvanceYes ? 'YES' : 'NO'}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-700">
                            {formatIndianCurrency(payable)}
                          </td>
                          <td className="p-2.5 text-right font-extrabold text-emerald-700">
                            {formatIndianCurrency(paid)}
                          </td>
                          <td className="p-2.5 text-right">
                            {pending > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                {formatIndianCurrency(pending)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                ₹0 (Cleared)
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {(advance_payment_from === '' || advance_payment_from ==='1') &&(
                              <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">FROM BANK</span>
                            )}
                            {advance_payment_from ==='2' &&(
                              <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">RXIL</span>
                            )}
                            {advance_payment_from ==='3' &&(
                              <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">TReDS</span>
                            )}
                            {advance_payment_from ==='4' &&(
                              <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Invoice Mart</span>
                            )} 
                          </td>
                          <td className="p-2.5 font-medium text-slate-600 text-center">
                            {p.payment_settlementdate ? new Date(p.payment_settlementdate).toLocaleDateString('en-IN') : '-'}
                          </td>
                          <td className="p-2.5 font-medium text-slate-600 text-center">
                            {p.tenor }
                          </td>
                          <td className="p-2.5 font-medium text-slate-600 text-center">
                            {p.repayment_date ? new Date(p.repayment_date).toLocaleDateString('en-IN') : '-'}
                          </td>
                          {/* <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEditPayment(p)}
                                className="px-2 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                              >
                                Payment Check
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedLedgerParty(p.party_name || p.supplier || '');
                                  setViewMode('ledger');
                                }}
                                className="px-2 py-1 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors"
                                title="View Party Ledger"
                              >
                                Ledger
                              </button>
                              <button
                                onClick={() => handleDeletePayment(p.voucher_no)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button> 
                            </div>
                          </td> */}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 italic text-xs">
                        No payment records found in `payment_master`. Click "New Payment Voucher" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
          </div>
        </div>
      )}

      {/* ENTRY SHEET SHEET */}
      {viewMode === 'entry' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Advance Token Disbursal Configuration</h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border">
              Ref: {masterData.voucher_no}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-500 mb-1">Voucher No *</label>
              <input
                type="text"
                value={masterData.voucher_no}
                onChange={e => setMasterData({ ...masterData, voucher_no: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 mb-1">Disbursal Date *</label>
              <input
                type="date"
                value={masterData.payment_date}
                onChange={e => setMasterData({ ...masterData, payment_date: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 mb-1">Supplier Party Account *</label>
              <input
                type="text"
                value={masterData.party_name}
                onChange={e => setMasterData({ ...masterData, party_name: e.target.value, supplier: e.target.value })}
                placeholder="Type Supplier Name"
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 mb-1">Platform Token Route</label>
              <select
                value={masterData.payment_mode}
                onChange={e => handleModeChange(e, masterData)}
                className="w-full p-2 border border-slate-200 rounded-lg font-bold"
              >
                <option value="RXIL">RXIL Token Platform</option>
                <option value="Trade Invoice">Trade Invoice standard</option>
                <option value="Mart">Invoice Mart Portal</option>
                <option value="TReDS">TReDS Hub Network</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">Full Gross Amount (₹)</label>
              <input
                type="number"
                value={masterData.payable_amt}
                onChange={e => setMasterData({ ...masterData, payable_amt: Number(e.target.value) })}
                className="w-full p-2 font-black text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Disbursed Advance (₹)</label>
              <input
                type="number"
                value={masterData.paid_amount}
                onChange={e => setMasterData({ ...masterData, paid_amount: Number(e.target.value) })}
                className="w-full p-2 font-black text-sm border border-slate-200 rounded-lg bg-emerald-50/50 text-emerald-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Tenor Maturity (Days)</label>
              <input
                type="number"
                value={masterData.tenor}
                onChange={e => handleTenorChange(e, masterData)}
                placeholder="e.g. 30, 45, 60"
                className="w-full p-2 border border-slate-200 rounded-lg font-bold font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => { setViewMode('dashboard'); setMasterData(initialMaster()); }}
              className="px-4 py-2 border rounded-lg text-xs font-bold hover:bg-slate-50 text-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  if (supabase) {
                    await supabase.from('payment_master').insert([masterData]);
                  }
                  await dbModule.upsert('payment_master', masterData).catch(() => {});
                  setShowSuccessAnim(true);
                  setTimeout(() => {
                    setShowSuccessAnim(false);
                    initPage();
                    setViewMode('dashboard');
                  }, 1200);
                } catch (err) {
                  setErrorMessage("Error executing transaction token block injection mapping code sync.");
                } finally {
                  setLoading(false);
                }
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-xs"
            >
              Commit Disbursal Token
            </button>
          </div>
        </div>
      )}
    </LegacyLayout>
  );
}
