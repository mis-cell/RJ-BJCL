import React from 'react';
import { Filter, RotateCcw, Calendar, Search, Building2, User, MapPin } from 'lucide-react';

export interface ReportFilters {
  financialYear: string;
  month: string;
  startDate: string;
  endDate: string;
  supplier: string;
  broker: string;
  area: string;
  grade: string;
  status: string;
  searchTerm: string;
  contractType?: 'ALL' | 'SAUDA' | 'PTF';
}

export type FilterState = ReportFilters;

interface ReportFilterBarProps {
  filters: ReportFilters;
  onFilterChange: React.Dispatch<React.SetStateAction<ReportFilters>>;
  suppliers: string[];
  brokers: string[];
  areas: string[];
  financialYears?: string[];
  grades?: string[];
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  filters,
  onFilterChange,
  suppliers,
  brokers,
  areas,
  financialYears = [],
  grades = [],
}) => {
  const updateField = (key: keyof ReportFilters, val: string) => {
    onFilterChange(prev => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      financialYear: 'ALL',
      month: 'ALL',
      startDate: '',
      endDate: '',
      supplier: 'ALL',
      broker: 'ALL',
      area: 'ALL',
      grade: 'ALL',
      status: 'ALL',
      searchTerm: '',
      contractType: 'ALL'
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-md">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Comprehensive Analytics Filter & Slicers
            </h4>
            <p className="text-[10px] text-slate-500 font-medium">
              Multi-dimensional slicing by FY, Date, Supplier, Broker, Area, Grade, and Lifecycle Status
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-3 py-1.5 rounded-md border border-slate-200 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Filters
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {/* Search Input */}
        <div className="col-span-2">
          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">
            Global Search
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Sauda/PO #, Supplier, Broker, Area..."
              value={filters.searchTerm}
              onChange={(e) => updateField('searchTerm', e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Financial Year */}
        <div>
          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">
            Financial Year
          </label>
          <select
            value={filters.financialYear}
            onChange={(e) => updateField('financialYear', e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:border-emerald-500 outline-none"
          >
            <option value="ALL">All FYs</option>
            {financialYears.length > 0 ? (
              financialYears.map(fy => (
                <option key={fy} value={fy}>{fy}</option>
              ))
            ) : (
              <>
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
              </>
            )}
          </select>
        </div>

        {/* Contract Type (Sauda vs PTF) */}
        <div>
          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">
            Contract Type
          </label>
          <select
            value={filters.contractType || 'ALL'}
            onChange={(e) => updateField('contractType', e.target.value as any)}
            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:border-emerald-500 outline-none"
          >
            <option value="ALL">All (Sauda + PTF)</option>
            <option value="SAUDA">Sauda Only</option>
            <option value="PTF">PTF Only</option>
          </select>
        </div>

        {/* Supplier */}
        <div>
          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">
            Supplier
          </label>
          <select
            value={filters.supplier}
            onChange={(e) => updateField('supplier', e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:border-emerald-500 outline-none"
          >
            <option value="ALL">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Broker */}
        <div>
          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">
            Broker
          </label>
          <select
            value={filters.broker}
            onChange={(e) => updateField('broker', e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:border-emerald-500 outline-none"
          >
            <option value="ALL">All Brokers</option>
            {brokers.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Area */}
        <div>
          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">
            Area / Region
          </label>
          <select
            value={filters.area}
            onChange={(e) => updateField('area', e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:border-emerald-500 outline-none"
          >
            <option value="ALL">All Sourcing Areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
