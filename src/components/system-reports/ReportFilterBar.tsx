import React, { useState } from 'react';
import { Filter, Search, RotateCcw, ChevronDown, ChevronUp, Calendar, Sliders } from 'lucide-react';
import { ReportFilterCriteria, SystemReportDataset } from '../../services/systemReportEngine';

interface ReportFilterBarProps {
  filters: ReportFilterCriteria;
  masterLists: SystemReportDataset['masterLists'];
  onFilterChange: (newFilters: ReportFilterCriteria) => void;
  onReset: () => void;
  filteredCount: number;
  totalCount: number;
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  filters,
  masterLists,
  onFilterChange,
  onReset,
  filteredCount,
  totalCount
}) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const handleChange = (key: keyof ReportFilterCriteria, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value === 'ALL' || value === '' ? undefined : value
    });
  };

  return (
    <div className="bg-white border border-[#CBD5E1] rounded-xl shadow-2xs p-4 space-y-3 font-sans">
      
      {/* Primary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <label className="text-[10px] font-bold uppercase text-[#404040] mb-1 block">
            Search Keyword / ID
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search Sauda, PO, Supplier, Broker..."
              value={filters.searchQuery || ''}
              onChange={e => handleChange('searchQuery', e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:bg-white focus:border-[#D94B5A] focus:outline-none font-medium text-[#111111]"
            />
          </div>
        </div>

        {/* Date From */}
        <div>
          <label className="text-[10px] font-bold uppercase text-[#404040] mb-1 block">
            From Date
          </label>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={e => handleChange('dateFrom', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:bg-white focus:border-[#D94B5A] focus:outline-none font-medium text-[#111111]"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="text-[10px] font-bold uppercase text-[#404040] mb-1 block">
            To Date
          </label>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={e => handleChange('dateTo', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:bg-white focus:border-[#D94B5A] focus:outline-none font-medium text-[#111111]"
          />
        </div>

        {/* Financial Year */}
        <div>
          <label className="text-[10px] font-bold uppercase text-[#404040] mb-1 block">
            Financial Year
          </label>
          <select
            value={filters.financialYear || 'ALL'}
            onChange={e => handleChange('financialYear', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:bg-white focus:border-[#D94B5A] focus:outline-none font-medium text-[#111111]"
          >
            <option value="ALL">All Financial Years</option>
            {masterLists.financialYears.map(fy => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
        </div>

        {/* Month */}
        <div>
          <label className="text-[10px] font-bold uppercase text-[#404040] mb-1 block">
            Month
          </label>
          <select
            value={filters.month || 'ALL'}
            onChange={e => handleChange('month', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:bg-white focus:border-[#D94B5A] focus:outline-none font-medium text-[#111111]"
          >
            <option value="ALL">All Months</option>
            {masterLists.months.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Filter Expansion (Business & Status Dimensions) */}
      {showAdvanced && (
        <div className="pt-3 border-t border-[#E5E7EB] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 animate-in fade-in duration-150">
          {/* Broker */}
          <div>
            <label className="text-[10px] font-bold uppercase text-[#404040] mb-1 block">Broker</label>
            <select
              value={filters.broker || 'ALL'}
              onChange={e => handleChange('broker', e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:bg-white text-[#111111]"
            >
              <option value="ALL">All Brokers</option>
              {masterLists.brokers.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Supplier */}
          <div>
            <label className="text-[10px] font-bold uppercase text-[#404040] mb-1 block">Supplier</label>
            <select
              value={filters.supplier || 'ALL'}
              onChange={e => handleChange('supplier', e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:bg-white text-[#111111]"
            >
              <option value="ALL">All Suppliers</option>
              {masterLists.suppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Agency */}
          <div>
            <label className="text-[10px] font-bold uppercase text-[#404040] mb-1 block">Agency</label>
            <select
              value={filters.agency || 'ALL'}
              onChange={e => handleChange('agency', e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:bg-white text-[#111111]"
            >
              <option value="ALL">All Agencies</option>
              {masterLists.agencies.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Area */}
          <div>
            <label className="text-[10px] font-bold uppercase text-[#404040] mb-1 block">Area</label>
            <select
              value={filters.area || 'ALL'}
              onChange={e => handleChange('area', e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:bg-white text-[#111111]"
            >
              <option value="ALL">All Areas</option>
              {masterLists.areas.map(ar => (
                <option key={ar} value={ar}>{ar}</option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div>
            <label className="text-[10px] font-bold uppercase text-[#404040] mb-1 block">Grade</label>
            <select
              value={filters.grade || 'ALL'}
              onChange={e => handleChange('grade', e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:bg-white text-[#111111]"
            >
              <option value="ALL">All Grades</option>
              {masterLists.grades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Sauda Status */}
          <div>
            <label className="text-[10px] font-bold uppercase text-[#404040] mb-1 block">Operational Status</label>
            <select
              value={filters.saudaStatus || 'ALL'}
              onChange={e => handleChange('saudaStatus', e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:bg-white text-[#111111]"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING">Pending</option>
              <option value="DELAYED">Delayed / Overdue</option>
            </select>
          </div>
        </div>
      )}

      {/* Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5E7EB] text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-3 py-1.5 bg-[#FDE7E6] hover:bg-[#FBCFCB] text-[#111111] font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-[#FBCFCB]"
          >
            <Sliders className="w-3.5 h-3.5 text-[#D94B5A]" />
            <span>{showAdvanced ? 'Hide Advanced Filters' : 'More Business Filters'}</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="px-3 py-1.5 text-[#404040] hover:text-[#111111] font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#D94B5A]" />
            <span>Reset All</span>
          </button>
        </div>

        <div className="text-[#404040] font-mono text-[11px]">
          Filtered Results: <strong className="text-[#111111] font-black">{filteredCount}</strong> of {totalCount} Transactions
        </div>
      </div>

    </div>
  );
};
