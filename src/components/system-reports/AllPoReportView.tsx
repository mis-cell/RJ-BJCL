import React, { useState, useMemo } from 'react';
import { Download, Search, Layers, Database, ShieldCheck, FileCheck, ArrowUpDown, Filter } from 'lucide-react';
import { SystemReportDataset, AllPoRecord } from '../../services/systemReportEngine';

interface AllPoReportViewProps {
  dataset: SystemReportDataset;
  onDrillDown?: (title: string, txns: any[]) => void;
}

export const AllPoReportView: React.FC<AllPoReportViewProps> = ({
  dataset
}) => {
  const { allPoSummary } = dataset;
  const records = allPoSummary?.records || [];

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'Sauda Desk' | 'Sauda Check Point' | 'Final PO'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [sortField, setSortField] = useState<keyof AllPoRecord>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (sourceFilter !== 'ALL' && r.sourceSection !== sourceFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPo = (r.poNo || '').toLowerCase().includes(q);
        const matchesSauda = (r.saudaNo || '').toLowerCase().includes(q);
        const matchesBroker = (r.broker || '').toLowerCase().includes(q);
        const matchesSupplier = (r.supplier || '').toLowerCase().includes(q);
        const matchesDate = (r.date || '').toLowerCase().includes(q);
        return matchesPo || matchesSauda || matchesBroker || matchesSupplier || matchesDate;
      }
      return true;
    });
  }, [records, sourceFilter, searchQuery]);

  // Sort records
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      if (sortField === 'date') {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        const diff = sortAsc ? dateA - dateB : dateB - dateA;
        if (diff !== 0) return diff;

        // Secondary sort: Sauda / PO No.
        const strA = a.saudaNo || a.poNo || '';
        const strB = b.saudaNo || b.poNo || '';
        return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
      }

      if (sortField === 'poNo' || sortField === 'saudaNo') {
        const strA = a.saudaNo || a.poNo || '';
        const strB = b.saudaNo || b.poNo || '';
        const comp = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
        if (comp !== 0) return sortAsc ? comp : -comp;

        // Secondary sort: Date
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      }

      if (sortField === 'supplier') {
        const supA = a.supplier || '';
        const supB = b.supplier || '';
        const comp = supA.localeCompare(supB, undefined, { sensitivity: 'base' });
        if (comp !== 0) return sortAsc ? comp : -comp;
        return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
      }

      if (sortField === 'broker') {
        const brkA = a.broker || '';
        const brkB = b.broker || '';
        const comp = brkA.localeCompare(brkB, undefined, { sensitivity: 'base' });
        if (comp !== 0) return sortAsc ? comp : -comp;
        return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
      }

      if (sortField === 'quantityMT') {
        const wtA = Number(a.quantityMT || 0);
        const wtB = Number(b.quantityMT || 0);
        const diff = sortAsc ? wtA - wtB : wtB - wtA;
        if (diff !== 0) return diff;
        return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
      }

      return 0;
    });
  }, [filteredRecords, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const handleSort = (field: keyof AllPoRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const exportAllCSV = () => {
    if (!filteredRecords.length) return;
    const headers = ['Date', 'Sauda / PO No.', 'Party / Supplier', 'Broker', 'Weight (MT)'];

    const rows = filteredRecords.map((r) => [
      r.date || '-',
      `"${r.saudaNo || r.poNo || '-'}"`,
      `"${r.supplier || 'Unassigned'}"`,
      `"${r.broker || 'Direct'}"`,
      (r.quantityMT || 0).toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `ALL_Sauda_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-sans">
      
      {/* SECTION 1: CONSOLIDATED SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* TOTAL ALL PO CARD */}
        <div 
          onClick={() => { setSourceFilter('ALL'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            sourceFilter === 'ALL'
              ? 'bg-slate-900 border-slate-800 text-white ring-2 ring-yellow-400'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${sourceFilter === 'ALL' ? 'text-yellow-400' : 'text-slate-500'}`}>
              ALL CONSOLIDATED PO
            </span>
            <Layers className={`w-4 h-4 ${sourceFilter === 'ALL' ? 'text-yellow-400' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <strong className="text-2xl font-black font-mono">
              {allPoSummary?.totalCount || records.length}
            </strong>
            <span className={`text-xs font-bold font-mono ${sourceFilter === 'ALL' ? 'text-slate-300' : 'text-slate-600'}`}>
              {(allPoSummary?.totalQuantityMT || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} MT
            </span>
          </div>
          <p className={`text-[10px] mt-1 ${sourceFilter === 'ALL' ? 'text-slate-400' : 'text-slate-500'}`}>
            Combined deduplicated master
          </p>
        </div>

        {/* SAUDA DESK CARD */}
        <div 
          onClick={() => { setSourceFilter('Sauda Desk'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            sourceFilter === 'Sauda Desk'
              ? 'bg-emerald-900 border-emerald-800 text-white ring-2 ring-emerald-400'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${sourceFilter === 'Sauda Desk' ? 'text-emerald-300' : 'text-slate-500'}`}>
              1. SAUDA DESK (sauda_master)
            </span>
            <Database className={`w-4 h-4 ${sourceFilter === 'Sauda Desk' ? 'text-emerald-300' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <strong className="text-2xl font-black font-mono">
              {allPoSummary?.saudaDeskCount || 0}
            </strong>
            <span className={`text-xs font-bold font-mono ${sourceFilter === 'Sauda Desk' ? 'text-emerald-200' : 'text-emerald-700'}`}>
              {(allPoSummary?.saudaDeskMT || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} MT
            </span>
          </div>
          <p className={`text-[10px] mt-1 ${sourceFilter === 'Sauda Desk' ? 'text-emerald-300' : 'text-slate-500'}`}>
            Direct Sauda Desk Deals
          </p>
        </div>

        {/* SAUDA CHECK POINT CARD */}
        <div 
          onClick={() => { setSourceFilter('Sauda Check Point'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            sourceFilter === 'Sauda Check Point'
              ? 'bg-indigo-900 border-indigo-800 text-white ring-2 ring-indigo-400'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${sourceFilter === 'Sauda Check Point' ? 'text-indigo-300' : 'text-slate-500'}`}>
              2. CHECKPOINT (sauda_check_point)
            </span>
            <ShieldCheck className={`w-4 h-4 ${sourceFilter === 'Sauda Check Point' ? 'text-indigo-300' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <strong className="text-2xl font-black font-mono">
              {allPoSummary?.checkPointCount || 0}
            </strong>
            <span className={`text-xs font-bold font-mono ${sourceFilter === 'Sauda Check Point' ? 'text-indigo-200' : 'text-indigo-700'}`}>
              {(allPoSummary?.checkPointMT || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} MT
            </span>
          </div>
          <p className={`text-[10px] mt-1 ${sourceFilter === 'Sauda Check Point' ? 'text-indigo-300' : 'text-slate-500'}`}>
            Pipeline Checkpoint Contracts
          </p>
        </div>

        {/* FINAL PO CARD */}
        <div 
          onClick={() => { setSourceFilter('Final PO'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            sourceFilter === 'Final PO'
              ? 'bg-amber-900 border-amber-800 text-white ring-2 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${sourceFilter === 'Final PO' ? 'text-amber-300' : 'text-slate-500'}`}>
              3. FINAL PO (purchase_master)
            </span>
            <FileCheck className={`w-4 h-4 ${sourceFilter === 'Final PO' ? 'text-amber-300' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <strong className="text-2xl font-black font-mono">
              {allPoSummary?.finalPoCount || 0}
            </strong>
            <span className={`text-xs font-bold font-mono ${sourceFilter === 'Final PO' ? 'text-amber-200' : 'text-amber-700'}`}>
              {(allPoSummary?.finalPoMT || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} MT
            </span>
          </div>
          <p className={`text-[10px] mt-1 ${sourceFilter === 'Final PO' ? 'text-amber-300' : 'text-slate-500'}`}>
            Executed Final Orders
          </p>
        </div>
      </div>

      {/* SECTION 2: SEARCH & FILTER ACTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        
        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by Sauda/PO No, Broker, Supplier..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 transition"
            />
          </div>

          {sourceFilter !== 'ALL' && (
            <button
              onClick={() => setSourceFilter('ALL')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <Filter className="w-3 h-3" />
              <span>Source: {sourceFilter}</span>
              <span className="text-rose-600 ml-1">×</span>
            </button>
          )}
        </div>

        {/* Export Button */}
        <button
          onClick={exportAllCSV}
          className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export ALL PO CSV</span>
        </button>
      </div>

      {/* SECTION 3: MAIN ALL PO TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider border-b border-slate-800 select-none">
                <th className="p-3 cursor-pointer hover:bg-slate-800 transition" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-slate-800 transition" onClick={() => handleSort('saudaNo')}>
                  <div className="flex items-center gap-1.5">
                    <span>Sauda / PO No.</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-slate-800 transition" onClick={() => handleSort('supplier')}>
                  <div className="flex items-center gap-1.5">
                    <span>Party / Supplier</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-slate-800 transition" onClick={() => handleSort('broker')}>
                  <div className="flex items-center gap-1.5">
                    <span>Broker</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 text-right cursor-pointer hover:bg-slate-800 transition" onClick={() => handleSort('quantityMT')}>
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Weight (MT)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800 font-medium">
              {pagedRecords.length > 0 ? (
                pagedRecords.map((r, idx) => {
                  const displayPoSauda = r.poNo && r.saudaNo && r.poNo !== r.saudaNo && r.poNo !== 'DESK' && r.poNo !== 'CHECKPOINT' && r.poNo !== 'FINAL_PO'
                    ? `${r.saudaNo} / ${r.poNo}`
                    : (r.saudaNo || r.poNo || '-');

                  return (
                    <tr 
                      key={r.id || idx}
                      className="hover:bg-slate-50/80 transition"
                    >
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {r.date || '-'}
                      </td>
                      <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                        {displayPoSauda}
                      </td>
                      <td className="p-3 font-sans font-bold text-slate-900 max-w-[220px] truncate" title={r.supplier || 'Unassigned'}>
                        {r.supplier || 'Unassigned'}
                      </td>
                      <td className="p-3 font-sans text-slate-700 max-w-[180px] truncate" title={r.broker || 'Direct'}>
                        {r.broker || 'Direct'}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        {(r.quantityMT || 0).toFixed(2)} MT
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-sans">
                    No records found for the selected filter or search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* SECTION 4: PAGINATION */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
            <span className="text-slate-500 ml-2 font-medium">
              Showing {sortedRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, sortedRecords.length)} of {sortedRecords.length} records
            </span>
          </div>

          <div className="flex items-center gap-1 font-bold">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
            >
              Prev
            </button>
            <span className="px-2 font-mono">Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
