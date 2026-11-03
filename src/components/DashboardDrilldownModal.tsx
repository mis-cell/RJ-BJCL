import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Download, 
  FileSpreadsheet, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText,
  DollarSign,
  Package,
  Layers,
  Calendar
} from 'lucide-react';
import { UnifiedContractRecord } from '../services/dashboardCalculationService';
import { formatIndianCurrency } from '../lib/utils';
import Papa from 'papaparse';

interface DashboardDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  contracts: UnifiedContractRecord[];
  initialFilter?: string;
}

export default function DashboardDrilldownModal({
  isOpen,
  onClose,
  title,
  subtitle,
  contracts = [],
  initialFilter = ''
}: DashboardDrilldownModalProps) {
  const [searchTerm, setSearchTerm] = useState(initialFilter);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SAUDA' | 'FINAL_PO' | 'PTF'>('ALL');
  const [arrivalFilter, setArrivalFilter] = useState<'ALL' | 'RECEIVED' | 'PENDING' | 'PARTIAL'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PAID' | 'PARTIALLY_PAID' | 'PENDING'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return contracts.filter(c => {
      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase().trim();
        const matchNo = (c.contractNo || '').toLowerCase().includes(q);
        const matchSupp = (c.supplier || '').toLowerCase().includes(q);
        const matchBrok = (c.broker || '').toLowerCase().includes(q);
        const matchArea = (c.area || '').toLowerCase().includes(q);
        const matchVouchers = (c.voucherNos || []).some(v => v.toLowerCase().includes(q));
        if (!matchNo && !matchSupp && !matchBrok && !matchArea && !matchVouchers) return false;
      }

      // Type Filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'SAUDA' && c.contractType !== 'SAUDA') return false;
        if (typeFilter === 'PTF' && c.contractType !== 'PTF') return false;
        if (typeFilter === 'FINAL_PO' && c.contractType !== 'FINAL_PO' && c.contractType !== 'PTF') return false;
      }

      // Arrival Filter
      if (arrivalFilter !== 'ALL' && c.arrivalStatus !== arrivalFilter) {
        return false;
      }

      // Payment Filter
      if (paymentFilter !== 'ALL' && c.paymentStatus !== paymentFilter) {
        return false;
      }

      return true;
    });
  }, [contracts, searchTerm, typeFilter, arrivalFilter, paymentFilter]);

  // Aggregate stats of current filtered records
  const stats = useMemo(() => {
    let totalWt = 0;
    let rcvdWt = 0;
    let pendWt = 0;
    let totalVal = 0;
    let paidVal = 0;
    let remVal = 0;

    filteredRecords.forEach(c => {
      totalWt += c.totalWeightMt;
      rcvdWt += c.receivedWeightMt;
      pendWt += c.pendingWeightMt;
      totalVal += c.contractValue;
      paidVal += c.paidAmount;
      remVal += c.remainingAmount;
    });

    return {
      count: filteredRecords.length,
      totalWt: Number(totalWt.toFixed(2)),
      rcvdWt: Number(rcvdWt.toFixed(2)),
      pendWt: Number(pendWt.toFixed(2)),
      totalVal: Number(totalVal.toFixed(2)),
      paidVal: Number(paidVal.toFixed(2)),
      remVal: Number(remVal.toFixed(2))
    };
  }, [filteredRecords]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredRecords.slice((safePage - 1) * pageSize, safePage * pageSize);

  // CSV Export
  const handleExportCsv = () => {
    const dataToExport = filteredRecords.map((r, i) => ({
      'S.No': i + 1,
      'Contract / P.O. No': r.contractNo,
      'Contract Type': r.contractType,
      'Date': r.contractDate,
      'Supplier': r.supplier,
      'Broker': r.broker,
      'Area': r.area || 'N/A',
      'Contract Weight (MT)': r.totalWeightMt,
      'Rate (₹/Qtl)': r.ratePerQtl,
      'Contract Value (₹)': r.contractValue,
      'Arrival Status': r.arrivalStatus,
      'Received Weight (MT)': r.receivedWeightMt,
      'Pending Weight (MT)': r.pendingWeightMt,
      'Arrival Lorry Records': r.arrivalRecordsCount,
      'Payment Status': r.paymentStatus,
      'Payable Value (₹)': r.payableValue,
      'Paid Amount (₹)': r.paidAmount,
      'Remaining Amount (₹)': r.remainingAmount,
      'Payment Vouchers': r.voucherNos.join('; ')
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/[^a-zA-Z0-9]/g, '_')}_Breakdown_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#FDE7E6] border-2 border-[#F7AFA8] rounded-2xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#F7AFA8] text-[#FDE7E6] px-5 py-3.5 flex items-center justify-between border-b border-[#FBCFCB]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-emerald-300">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-black tracking-wide flex items-center gap-2">
                <span>{title}</span>
                <span className="text-xs bg-emerald-700/80 text-white font-mono px-2 py-0.5 rounded-full border border-emerald-400/40">
                  {stats.count} Records
                </span>
              </h2>
              {subtitle && <p className="text-xs text-[#FBCFCB] font-sans mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-[#FDE7E6] text-[#D94B5A] text-xs font-bold rounded-lg hover:bg-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Export filtered records to CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#FBCFCB] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-3 bg-[#FBCFCB]/60 border-b border-[#FBCFCB] text-xs font-sans">
          <div className="bg-white/90 p-2 rounded-xl border border-[#FBCFCB] shadow-2xs">
            <div className="text-[10px] font-bold text-[#D94B5A] uppercase">Total Contracts</div>
            <div className="text-sm font-mono font-extrabold text-[#D94B5A]">{stats.count}</div>
          </div>
          <div className="bg-white/90 p-2 rounded-xl border border-[#FBCFCB] shadow-2xs">
            <div className="text-[10px] font-bold text-[#D94B5A] uppercase">Total Weight</div>
            <div className="text-sm font-mono font-extrabold text-[#D94B5A]">{stats.totalWt.toLocaleString('en-IN')} MT</div>
          </div>
          <div className="bg-white/90 p-2 rounded-xl border border-[#FBCFCB] shadow-2xs">
            <div className="text-[10px] font-bold text-[#D94B5A] uppercase">Pending Weight</div>
            <div className="text-sm font-mono font-extrabold text-amber-700">{stats.pendWt.toLocaleString('en-IN')} MT</div>
          </div>
          <div className="bg-white/90 p-2 rounded-xl border border-[#FBCFCB] shadow-2xs">
            <div className="text-[10px] font-bold text-[#D94B5A] uppercase">Contract Value</div>
            <div className="text-sm font-mono font-extrabold text-[#D94B5A]">₹{formatIndianCurrency(stats.totalVal)}</div>
          </div>
          <div className="bg-white/90 p-2 rounded-xl border border-[#FBCFCB] shadow-2xs">
            <div className="text-[10px] font-bold text-[#D94B5A] uppercase">Paid Amount</div>
            <div className="text-sm font-mono font-extrabold text-emerald-800">₹{formatIndianCurrency(stats.paidVal)}</div>
          </div>
          <div className="bg-white/90 p-2 rounded-xl border border-[#FBCFCB] shadow-2xs">
            <div className="text-[10px] font-bold text-[#D94B5A] uppercase">Remaining Amt</div>
            <div className="text-sm font-mono font-extrabold text-rose-700">₹{formatIndianCurrency(stats.remVal)}</div>
          </div>
        </div>

        {/* Filters Controls */}
        <div className="p-3 bg-[#FDE7E6] border-b border-[#FBCFCB] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-xs">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#D94B5A]" />
              <input
                type="text"
                placeholder="Search contract no, supplier, broker, voucher..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full h-8 pl-8 pr-3 bg-white border border-[#FBCFCB] rounded-xl text-xs text-[#D94B5A] placeholder-[#D94B5A]/60 focus:outline-none focus:ring-1 focus:ring-[#F7AFA8]"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as any); setCurrentPage(1); }}
              className="h-8 px-2.5 bg-white border border-[#FBCFCB] rounded-xl text-xs font-semibold text-[#D94B5A] focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="SAUDA">Sauda Only</option>
              <option value="FINAL_PO">Final P.O. / PTF</option>
            </select>

            {/* Arrival Status selector */}
            <select
              value={arrivalFilter}
              onChange={(e) => { setArrivalFilter(e.target.value as any); setCurrentPage(1); }}
              className="h-8 px-2.5 bg-white border border-[#FBCFCB] rounded-xl text-xs font-semibold text-[#D94B5A] focus:outline-none"
            >
              <option value="ALL">All Arrivals</option>
              <option value="PENDING">Pending (Un-arrived)</option>
              <option value="PARTIAL">Partially Received</option>
              <option value="RECEIVED">Fully Received</option>
            </select>

            {/* Payment Status selector */}
            <select
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value as any); setCurrentPage(1); }}
              className="h-8 px-2.5 bg-white border border-[#FBCFCB] rounded-xl text-xs font-semibold text-[#D94B5A] focus:outline-none"
            >
              <option value="ALL">All Payments</option>
              <option value="PAID">Fully Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PENDING">Unpaid / Pending</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#D94B5A]">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="h-8 px-2 bg-white border border-[#FBCFCB] rounded-xl text-xs font-semibold text-[#D94B5A] focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Main Records Table */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-[#FDE7E6] border-b border-[#FBCFCB] text-[#D94B5A] font-mono text-[10px] uppercase tracking-wider shadow-2xs">
              <tr>
                <th className="p-2.5 border-r border-[#FBCFCB] text-center w-12 font-bold">#</th>
                <th className="p-2.5 border-r border-[#FBCFCB] font-bold">Contract / P.O. No</th>
                <th className="p-2.5 border-r border-[#FBCFCB] font-bold">Type</th>
                <th className="p-2.5 border-r border-[#FBCFCB] font-bold">Date</th>
                <th className="p-2.5 border-r border-[#FBCFCB] font-bold">Supplier</th>
                <th className="p-2.5 border-r border-[#FBCFCB] font-bold">Broker</th>
                <th className="p-2.5 border-r border-[#FBCFCB] text-right font-bold">Weight (MT)</th>
                <th className="p-2.5 border-r border-[#FBCFCB] text-right font-bold">Rate (₹/Qtl)</th>
                <th className="p-2.5 border-r border-[#FBCFCB] text-right font-bold">Value (₹)</th>
                <th className="p-2.5 border-r border-[#FBCFCB] text-center font-bold">Arrival Status</th>
                <th className="p-2.5 border-r border-[#FBCFCB] text-right font-bold">Rcvd / Pend (MT)</th>
                <th className="p-2.5 border-r border-[#FBCFCB] text-right font-bold">Paid (₹)</th>
                <th className="p-2.5 border-r border-[#FBCFCB] text-right font-bold">Remaining (₹)</th>
                <th className="p-2.5 text-center font-bold">Vouchers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FBCFCB] font-sans">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, idx) => {
                  const seq = (safePage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={row.id || `${row.contractNo}-${idx}`} className="hover:bg-[#FDE7E6]/80 transition-colors">
                      <td className="p-2.5 border-r border-[#FBCFCB] text-center font-mono text-[#D94B5A]">{seq}</td>
                      <td className="p-2.5 border-r border-[#FBCFCB] font-mono font-bold text-[#D94B5A] whitespace-nowrap">
                        {row.contractNo}
                      </td>
                      <td className="p-2.5 border-r border-[#FBCFCB] whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          row.contractType === 'SAUDA' 
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}>
                          {row.contractType === 'SAUDA' ? 'Sauda' : 'Final P.O.'}
                        </span>
                      </td>
                      <td className="p-2.5 border-r border-[#FBCFCB] font-mono text-slate-700 whitespace-nowrap">
                        {row.contractDate}
                      </td>
                      <td className="p-2.5 border-r border-[#FBCFCB] font-semibold text-[#D94B5A] max-w-[180px] truncate" title={row.supplier}>
                        {row.supplier}
                      </td>
                      <td className="p-2.5 border-r border-[#FBCFCB] text-slate-600 max-w-[140px] truncate" title={row.broker}>
                        {row.broker}
                      </td>
                      <td className="p-2.5 border-r border-[#FBCFCB] text-right font-mono font-bold text-[#D94B5A] whitespace-nowrap">
                        {row.totalWeightMt.toFixed(2)}
                      </td>
                      <td className="p-2.5 border-r border-[#FBCFCB] text-right font-mono text-slate-700 whitespace-nowrap">
                        ₹{row.ratePerQtl}
                      </td>
                      <td className="p-2.5 border-r border-[#FBCFCB] text-right font-mono font-extrabold text-[#D94B5A] whitespace-nowrap">
                        ₹{formatIndianCurrency(row.contractValue)}
                      </td>
                      <td className="p-2.5 border-r border-[#FBCFCB] text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          row.arrivalStatus === 'RECEIVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : row.arrivalStatus === 'PARTIAL'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {row.arrivalStatus === 'RECEIVED' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {row.arrivalStatus === 'PARTIAL' && <Clock className="w-2.5 h-2.5" />}
                          {row.arrivalStatus === 'PENDING' && <AlertTriangle className="w-2.5 h-2.5" />}
                          {row.arrivalStatus}
                        </span>
                      </td>
                      <td className="p-2.5 border-r border-[#FBCFCB] text-right font-mono whitespace-nowrap">
                        <span className="text-emerald-700 font-bold">{row.receivedWeightMt.toFixed(2)}</span>
                        {' / '}
                        <span className={row.pendingWeightMt > 0 ? "text-amber-700 font-bold" : "text-slate-400"}>
                          {row.pendingWeightMt.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-2.5 border-r border-[#FBCFCB] text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                        {row.paidAmount > 0 ? `₹${formatIndianCurrency(row.paidAmount)}` : '-'}
                      </td>
                      <td className="p-2.5 border-r border-[#FBCFCB] text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                        {row.remainingAmount > 0 ? `₹${formatIndianCurrency(row.remainingAmount)}` : '₹0'}
                      </td>
                      <td className="p-2.5 text-center font-mono text-[10px] text-slate-600 max-w-[120px] truncate" title={row.voucherNos.join(', ')}>
                        {row.voucherNos.length > 0 ? row.voucherNos.join(', ') : '-'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-[#D94B5A] italic font-sans">
                    No matching contract records found for the applied filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        <div className="bg-[#FDE7E6] border-t border-[#FBCFCB] p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-[#D94B5A]">
          <div>
            Showing <strong className="text-[#D94B5A]">{filteredRecords.length > 0 ? (safePage - 1) * pageSize + 1 : 0}</strong> to{' '}
            <strong className="text-[#D94B5A]">{Math.min(safePage * pageSize, filteredRecords.length)}</strong> of{' '}
            <strong className="text-[#D94B5A]">{filteredRecords.length}</strong> total contracts
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 bg-white border border-[#FBCFCB] rounded-lg disabled:opacity-40 font-bold text-[#D94B5A] hover:bg-[#FBCFCB] transition-colors cursor-pointer"
            >
              Previous
            </button>
            <span className="font-bold text-[#D94B5A] px-2">
              Page {safePage} of {totalPages}
            </span>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1 bg-white border border-[#FBCFCB] rounded-lg disabled:opacity-40 font-bold text-[#D94B5A] hover:bg-[#FBCFCB] transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
