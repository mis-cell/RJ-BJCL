import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  Search, 
  RefreshCw, 
  MapPin, 
  CheckCircle, 
  UserCheck 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { PurchaseMaster, GroupedSupplier, BAR_COLORS } from './types';
import { PurchaseOrderSummaryMetrics } from './PurchaseOrderSummaryMetrics';

interface PurchaseOrderSummaryDashboardViewProps {
  financialYearFilter: string;
  setFinancialYearFilter: (y: string) => void;
  financialYears: string[];
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  selectedSupplier: string | null;
  setSelectedSupplier: (s: string | null) => void;
  loading: boolean;
  fetchPurchaseOrders: () => void;
  stats: {
    totalWeight: number;
    totalCount: number;
    pendingCount: number;
    averageWeight: number;
    maxWeight: number;
    maxSupplier: string;
  };
  groupedChartData: GroupedSupplier[];
  displayedDetails: PurchaseMaster[];
  handleBarClick: (data: GroupedSupplier) => void;
  hoveredBar: number | null;
  setHoveredBar: (idx: number | null) => void;
}

export const PurchaseOrderSummaryDashboardView: React.FC<PurchaseOrderSummaryDashboardViewProps> = ({
  financialYearFilter,
  setFinancialYearFilter,
  financialYears,
  searchQuery,
  setSearchQuery,
  selectedSupplier,
  setSelectedSupplier,
  loading,
  fetchPurchaseOrders,
  stats,
  groupedChartData,
  displayedDetails,
  handleBarClick,
  hoveredBar,
  setHoveredBar
}) => {
  return (
    <React.Fragment>
      {/* Upper Control Bar */}
      <div className="flex flex-wrap gap-3 items-end bg-gradient-to-r from-emerald-50 via-white to-slate-50 p-3 border border-emerald-200 shadow-sm rounded-xl">
        {/* Financial Year Filter */}
        <div className="space-y-1">
          <label
            htmlFor="financial_year_1293"
            className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wide leading-none block ml-1"
          >
            Financial Year
          </label>
          <div className="flex bg-white border border-emerald-300 rounded-lg overflow-hidden shadow-sm">
            <select
              id="financial_year_1293"
              name="financial_year"
              aria-label="Financial Year"
              value={financialYearFilter}
              onChange={(e) => {
                setFinancialYearFilter(e.target.value);
                setSelectedSupplier(null);
              }}
              className="p-2 text-[11px] font-bold outline-none w-36 bg-white text-slate-700 cursor-pointer"
            >
              <option value="ALL">-- ALL YEARS --</option>
              {financialYears
                .filter((y) => y.includes('-'))
                .map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Global Keyword Filter */}
        <div className="flex-1 space-y-1 min-w-[240px]">
          <label className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wide leading-none block ml-1">
            Active Query Radar (Supplier, Broker, Contract No.)
          </label>
          <div className="flex bg-white border border-emerald-300 rounded-lg overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-emerald-200">
            <span className="bg-emerald-50 px-2.5 flex items-center border-r border-emerald-200 text-emerald-700">
              <Search className="h-3.5 w-3.5" />
            </span>
            <input
              id="search_supplier_broker_na_1318"
              name="search_supplier_broker_na"
              aria-label="Search supplier, broker name, PO numbers..."
              className="flex-1 px-2.5 py-2 text-[11px] font-bold outline-none tracking-tight text-slate-700 placeholder:text-slate-400"
              placeholder="Search supplier, broker name, PO numbers..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedSupplier(null);
              }}
            />
          </div>
        </div>

        {/* Reset Filters / Refresh */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setFinancialYearFilter('ALL');
              setSearchQuery('');
              setSelectedSupplier(null);
            }}
            className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-[10px] uppercase border border-slate-300 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={fetchPurchaseOrders}
            disabled={loading}
            className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-[10px] uppercase rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <PurchaseOrderSummaryMetrics
        stats={stats}
        selectedSupplier={selectedSupplier}
      />

      {/* Main Charts & Drilldown section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Supplier Distribution Bar Chart */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                Supplier Procurement Volume Distribution
              </h3>
              <p className="text-[10px] text-slate-400">
                Click any bar to filter and drill down into that specific supplier
              </p>
            </div>
            {selectedSupplier && (
              <button
                type="button"
                onClick={() => setSelectedSupplier(null)}
                className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
              >
                Clear Filter ({selectedSupplier}) &times;
              </button>
            )}
          </div>

          <div className="h-64 font-mono text-[9px]">
            {groupedChartData.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-slate-400">
                <span>No purchase orders match current filters.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                <BarChart
                  data={groupedChartData.slice(0, 15)}
                  margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="supplier"
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 7.5, fill: '#64748b' }}
                  />
                  <YAxis tick={{ fontSize: 8, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toFixed(3)} MT`, 'Weight Sourced']}
                  />
                  <Bar
                    dataKey="total_contract_mt"
                    onClick={(entry) => handleBarClick(entry as any)}
                    radius={[3, 3, 0, 0]}
                    cursor="pointer"
                  >
                    {groupedChartData.slice(0, 15).map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={
                          selectedSupplier === entry.supplier
                            ? '#f59e0b'
                            : hoveredBar === idx
                            ? '#059669'
                            : BAR_COLORS[idx % BAR_COLORS.length]
                        }
                        onMouseEnter={() => setHoveredBar(idx)}
                        onMouseLeave={() => setHoveredBar(null)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Side: Quick Supplier Chips List */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 flex flex-col">
          <div className="border-b pb-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-emerald-700" />
              <span>Top Suppliers ({groupedChartData.length})</span>
            </h3>
            <p className="text-[10px] text-slate-400">Ranked by volume in MT</p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-64 space-y-1.5 pr-1">
            {groupedChartData.map((item, idx) => {
              const isSelected = selectedSupplier === item.supplier;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleBarClick(item)}
                  className={cn(
                    "w-full text-left p-2 rounded-lg border text-xs font-bold flex items-center justify-between transition-all cursor-pointer",
                    isSelected
                      ? "bg-emerald-800 text-white border-emerald-900 shadow-sm"
                      : "bg-slate-50 hover:bg-emerald-50 text-slate-800 border-slate-200"
                  )}
                >
                  <div className="truncate mr-2">
                    <span className="font-extrabold block truncate text-[11px]">
                      {item.supplier}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] block",
                        isSelected ? "text-emerald-200" : "text-slate-400"
                      )}
                    >
                      {item.orderCount} {item.orderCount === 1 ? 'Order' : 'Orders'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-black shrink-0">
                    {item.total_contract_mt.toFixed(3)} MT
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Drilldown Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex justify-between items-center border-b pb-2">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
              {selectedSupplier
                ? `Purchase Orders for: ${selectedSupplier}`
                : `All Matching Purchase Orders (${displayedDetails.length})`}
            </h3>
            <p className="text-[10px] text-slate-400">
              Contract details, weights, reference prices, and delivery schedules
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded">
            Total: {displayedDetails.reduce((sum, p) => sum + (Number(p.total_contract_mt) || 0), 0).toFixed(3)} MT
          </span>
        </div>

        <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="bg-slate-100 text-slate-800 font-bold uppercase sticky top-0 text-[10px]">
              <tr>
                <th className="p-2 border-r border-slate-200">PO No</th>
                <th className="p-2 border-r border-slate-200">Date</th>
                <th className="p-2 border-r border-slate-200">Supplier</th>
                <th className="p-2 border-r border-slate-200">Broker</th>
                <th className="p-2 border-r border-slate-200">Area</th>
                <th className="p-2 border-r border-slate-200 text-right">Mass (MT)</th>
                <th className="p-2 border-r border-slate-200 text-right">B-Rate</th>
                <th className="p-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {displayedDetails.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                displayedDetails.map((po, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2 border-r border-slate-100 font-bold text-slate-900">
                      {po.po_no}
                    </td>
                    <td className="p-2 border-r border-slate-100 font-mono text-[10px]">
                      {po.po_date ? po.po_date.substring(0, 10) : '--'}
                    </td>
                    <td className="p-2 border-r border-slate-100 font-bold text-slate-800">
                      {po.supplier || 'DIRECT'}
                    </td>
                    <td className="p-2 border-r border-slate-100">
                      {po.broker || 'DIRECT'}
                    </td>
                    <td className="p-2 border-r border-slate-100">
                      {po.area || po.arrival_area_name || '--'}
                    </td>
                    <td className="p-2 border-r border-slate-100 text-right font-mono font-bold text-emerald-800">
                      {Number(po.total_contract_mt || 0).toFixed(3)} MT
                    </td>
                    <td className="p-2 border-r border-slate-100 text-right font-mono font-bold text-indigo-900">
                      {Number(po.b_rate || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                          po.pending !== false
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        )}
                      >
                        {po.pending !== false ? 'Pending' : 'Completed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </React.Fragment>
  );
};
