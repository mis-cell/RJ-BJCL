import React from 'react';
import { 
  FileText, 
  TrendingUp, 
  Scale, 
  Layers 
} from 'lucide-react';

interface PurchaseOrderSummaryMetricsProps {
  stats: {
    totalWeight: number;
    totalCount: number;
    pendingCount: number;
    averageWeight: number;
    maxWeight: number;
    maxSupplier: string;
  };
  selectedSupplier: string | null;
}

export const PurchaseOrderSummaryMetrics: React.FC<PurchaseOrderSummaryMetricsProps> = ({
  stats,
  selectedSupplier
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="bg-white p-3 border-2 border-gray-400 rounded-sm shadow-[2px_2px_0_0_rgba(0,0,0,0.15)] flex items-center justify-between">
        <div>
          <p className="text-[9.5px] font-bold text-gray-500 uppercase">Total Sourced (MT)</p>
          <p className="text-xl font-black text-indigo-900 mt-0.5">{stats.totalWeight.toLocaleString()} MT</p>
          <p className="text-[8.5px] text-gray-400 mt-0.5">{stats.totalCount} Purchase Orders</p>
        </div>
        <div className="h-10 w-10 bg-indigo-50 border border-indigo-200 rounded flex items-center justify-center text-indigo-700">
          <Scale className="h-5 w-5" />
        </div>
      </div>

      <div className="bg-white p-3 border-2 border-gray-400 rounded-sm shadow-[2px_2px_0_0_rgba(0,0,0,0.15)] flex items-center justify-between">
        <div>
          <p className="text-[9.5px] font-bold text-gray-500 uppercase">Pending Delivery</p>
          <p className="text-xl font-black text-amber-700 mt-0.5">{stats.pendingCount}</p>
          <p className="text-[8.5px] text-amber-600 font-semibold mt-0.5">
            {stats.totalCount > 0 ? ((stats.pendingCount / stats.totalCount) * 100).toFixed(1) : 0}% of all orders
          </p>
        </div>
        <div className="h-10 w-10 bg-amber-50 border border-amber-200 rounded flex items-center justify-center text-amber-700">
          <Layers className="h-5 w-5" />
        </div>
      </div>

      <div className="bg-white p-3 border-2 border-gray-400 rounded-sm shadow-[2px_2px_0_0_rgba(0,0,0,0.15)] flex items-center justify-between">
        <div>
          <p className="text-[9.5px] font-bold text-gray-500 uppercase">Avg Contract Size</p>
          <p className="text-xl font-black text-emerald-800 mt-0.5">{stats.averageWeight.toLocaleString()} MT</p>
          <p className="text-[8.5px] text-gray-400 mt-0.5">Per individual order</p>
        </div>
        <div className="h-10 w-10 bg-emerald-50 border border-emerald-200 rounded flex items-center justify-center text-emerald-700">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>

      <div className="bg-white p-3 border-2 border-gray-400 rounded-sm shadow-[2px_2px_0_0_rgba(0,0,0,0.15)] flex items-center justify-between">
        <div className="truncate mr-2">
          <p className="text-[9.5px] font-bold text-gray-500 uppercase">Dominant Supplier</p>
          <p className="text-sm font-black text-slate-800 mt-0.5 truncate" title={stats.maxSupplier}>
            {stats.maxSupplier}
          </p>
          <p className="text-[8.5px] text-gray-500 font-medium mt-0.5">{stats.maxWeight.toLocaleString()} MT Allocated</p>
        </div>
        <div className="h-10 w-10 bg-slate-100 border border-slate-300 rounded flex items-center justify-center text-slate-700 shrink-0">
          <FileText className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
