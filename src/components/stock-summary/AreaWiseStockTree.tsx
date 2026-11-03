import React from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  RefreshCw, 
  Edit, 
  Trash2 
} from 'lucide-react';
import { cn, canDeleteData } from '../../lib/utils';
import { TreeHierarchyMode } from './types';

export interface AreaWiseStockTreeProps {
  filteredSavedStocks: any[];
  treeHierarchyMode: TreeHierarchyMode;
  setTreeHierarchyMode: (mode: TreeHierarchyMode) => void;
  expandedAreas: Record<string, boolean>;
  setExpandedAreas: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedGrades: Record<string, boolean>;
  setExpandedGrades: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedGradesTop: Record<string, boolean>;
  setExpandedGradesTop: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedAreasSub: Record<string, boolean>;
  setExpandedAreasSub: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selectedStockId: string | null;
  setSelectedStockId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onNewRecord: () => void;
  onExportCSV: () => void;
  onPrintSlip: () => void;
  onReload: () => void;
  onEdit: (record: any) => void;
  onDelete: (id: string, name: string) => void;
}

export const AreaWiseStockTree: React.FC<AreaWiseStockTreeProps> = ({
  filteredSavedStocks,
  treeHierarchyMode,
  setTreeHierarchyMode,
  expandedAreas,
  setExpandedAreas,
  expandedGrades,
  setExpandedGrades,
  expandedGradesTop,
  setExpandedGradesTop,
  expandedAreasSub,
  setExpandedAreasSub,
  selectedStockId,
  setSelectedStockId,
  searchQuery,
  setSearchQuery,
  onNewRecord,
  onExportCSV,
  onPrintSlip,
  onReload,
  onEdit,
  onDelete
}) => {
  return (
    <div className="space-y-3">
      {/* Action Toolbar */}
      <div className="flex items-center gap-2 w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 shadow-sm">
        {/* New Record */}
        <button
          onClick={onNewRecord}
          className="h-8 px-3.5 bg-[#F7AFA8] hover:bg-[#D94B5A] text-white rounded-md text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 stroke-[3]" />
          New Opening Record
        </button>

        {/* Export */}
        <button
          onClick={onExportCSV}
          title="Download active ledger records as CSV format"
          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Export CSV
        </button>

        {/* Print */}
        <button
          onClick={onPrintSlip}
          className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5 text-slate-600" />
          Print Slip
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 mx-0.5" />

        {/* Search */}
        <div className="flex items-center flex-1 min-w-0 h-8 bg-slate-50 border border-slate-300 rounded-md overflow-hidden focus-within:border-[#F7AFA8] focus-within:ring-1 focus-within:ring-[#F7AFA8]/20 transition-all">
          <div className="flex items-center justify-center w-8 h-full bg-slate-100 border-r border-slate-200 shrink-0">
            <Search className="h-3.5 w-3.5 text-slate-500" />
          </div>

          <input
            id="searchquery_1518"
            name="searchquery"
            aria-label="searchquery"
            className="flex-1 min-w-0 h-full bg-transparent px-2.5 text-[11px] font-semibold text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="Search opening ledger latest stock (e.g. Forbesganj, TD-5, Godown)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="h-full px-2 text-[9px] font-extrabold uppercase text-red-600 hover:bg-red-50 border-l border-slate-200 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Reload */}
        <button
          onClick={onReload}
          className="h-8 px-3 bg-slate-700 hover:bg-slate-800 text-white rounded-md text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
          title="Reload records"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reload
        </button>
      </div>

      {/* Area-Wise / Grade-Wise Simple Stock Display Tree */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-3 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-[#D94B5A] text-white flex items-center justify-center font-black text-xs">
              {treeHierarchyMode === 'area_grade' ? '📍' : '🏷️'}
            </span>
            <div>
              <h3 className="text-xs font-black uppercase text-indigo-950">
                {treeHierarchyMode === 'area_grade' 
                  ? 'Area Wise & Grade Wise Stock Inventory (Godown Breakdown)' 
                  : 'Grade Wise & Area Wise Stock Inventory (Godown Breakdown)'}
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase">
                {treeHierarchyMode === 'area_grade' 
                  ? 'Click on [+] to expand Area, then Grade to view Godowns' 
                  : 'Click on [+] to expand Grade, then Area to view Godowns'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200">
              <button
                type="button"
                onClick={() => setTreeHierarchyMode('area_grade')}
                className={cn(
                  "px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer",
                  treeHierarchyMode === 'area_grade' ? "bg-[#D94B5A] text-white shadow-xs" : "text-slate-600 hover:bg-slate-200"
                )}
              >
                📍 Area → Grade
              </button>
              <button
                type="button"
                onClick={() => setTreeHierarchyMode('grade_area')}
                className={cn(
                  "px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer",
                  treeHierarchyMode === 'grade_area' ? "bg-[#D94B5A] text-white shadow-xs" : "text-slate-600 hover:bg-slate-200"
                )}
              >
                🏷️ Grade → Area
              </button>
            </div>

            <button 
              onClick={() => {
                if (treeHierarchyMode === 'area_grade') {
                  const allAreas: Record<string, boolean> = {};
                  const allGrades: Record<string, boolean> = {};
                  filteredSavedStocks.forEach(r => {
                    const area = (r.area || 'UNASSIGNED').toUpperCase();
                    const grade = (r.grade || 'UNASSIGNED').toUpperCase();
                    allAreas[area] = true;
                    allGrades[`${area}__${grade}`] = true;
                  });
                  setExpandedAreas(allAreas);
                  setExpandedGrades(allGrades);
                } else {
                  const allGradesTop: Record<string, boolean> = {};
                  const allAreasSub: Record<string, boolean> = {};
                  filteredSavedStocks.forEach(r => {
                    const grade = (r.grade || 'UNASSIGNED').toUpperCase();
                    const area = (r.area || 'UNASSIGNED').toUpperCase();
                    allGradesTop[grade] = true;
                    allAreasSub[`${grade}__${area}`] = true;
                  });
                  setExpandedGradesTop(allGradesTop);
                  setExpandedAreasSub(allAreasSub);
                }
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-black uppercase cursor-pointer transition-colors"
            >
              Expand All
            </button>
            <button 
              onClick={() => {
                if (treeHierarchyMode === 'area_grade') {
                  setExpandedAreas({});
                  setExpandedGrades({});
                } else {
                  setExpandedGradesTop({});
                  setExpandedAreasSub({});
                }
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-black uppercase cursor-pointer transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>

        {filteredSavedStocks.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs font-bold uppercase">
            No stock inventory records found. Click "New Opening Record" above to add stock.
          </div>
        ) : (
          <div className="space-y-2.5">
            {treeHierarchyMode === 'area_grade' ? (() => {
              const tree: Record<string, Record<string, any[]>> = {};
              filteredSavedStocks.forEach(r => {
                const area = (r.area || 'GENERAL AREA').toUpperCase();
                const grade = (r.grade || 'GENERAL GRADE').toUpperCase();
                if (!tree[area]) tree[area] = {};
                if (!tree[area][grade]) tree[area][grade] = [];
                tree[area][grade].push(r);
              });

              return Object.entries(tree).map(([area, gradesMap]) => {
                const isAreaExpanded = !!expandedAreas[area];
                const areaTotalQty = Object.values(gradesMap).reduce((sum, records) => sum + records.reduce((s, r) => s + (Number(r.quantity) || 0), 0), 0);
                const areaTotalWt = Object.values(gradesMap).reduce((sum, records) => sum + records.reduce((s, r) => s + (Number(r.weight) || 0), 0), 0);

                return (
                  <div key={area} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                    {/* Area Header Row */}
                    <div 
                      onClick={() => setExpandedAreas(prev => ({ ...prev, [area]: !prev[area] }))}
                      className="flex items-center justify-between px-3.5 py-3 bg-slate-50 hover:bg-slate-100 cursor-pointer select-none transition-colors border-b border-slate-200"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded bg-[#D94B5A] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                          {isAreaExpanded ? '-' : '+'}
                        </span>
                        <span className="text-xs font-black uppercase text-indigo-950 tracking-wide">
                          📍 Area: {area}
                        </span>
                        <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {Object.keys(gradesMap).length} Grades
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono font-black text-slate-800">
                        <span>Total Qty: <span className="text-indigo-950">{areaTotalQty.toLocaleString()} Bales</span></span>
                        <span>Total Wt: <span className="text-teal-700">{(areaTotalWt * 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} KG</span></span>
                      </div>
                    </div>

                    {/* Grades under Area */}
                    {isAreaExpanded && (
                      <div className="p-3 space-y-2 bg-slate-50/60">
                        {Object.entries(gradesMap).map(([grade, records]) => {
                          const gradeKey = `${area}__${grade}`;
                          const isGradeExpanded = !!expandedGrades[gradeKey];
                          const gradeTotalQty = records.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
                          const gradeTotalWt = records.reduce((s, r) => s + (Number(r.weight) || 0), 0);

                          return (
                            <div key={grade} className="border border-indigo-100 rounded-md overflow-hidden bg-white ml-4 shadow-xs">
                              {/* Grade Header Row */}
                              <div 
                                onClick={() => setExpandedGrades(prev => ({ ...prev, [gradeKey]: !prev[gradeKey] }))}
                                className="flex items-center justify-between px-3 py-2 bg-indigo-50/60 hover:bg-indigo-100/60 cursor-pointer select-none transition-colors border-b border-indigo-100"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-4 h-4 rounded bg-indigo-700 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                                    {isGradeExpanded ? '-' : '+'}
                                  </span>
                                  <span className="text-[11px] font-black uppercase text-indigo-950 tracking-wide">
                                    🏷️ Grade: {grade}
                                  </span>
                                  <span className="text-[8px] font-bold text-indigo-700 bg-white border border-indigo-200 px-1.5 py-0.5 rounded">
                                    {records.length} Godowns
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-[11px] font-mono font-black text-slate-800">
                                  <span>Qty: <span className="text-indigo-950">{gradeTotalQty.toLocaleString()}</span></span>
                                  <span>Wt: <span className="text-teal-700">{(gradeTotalWt * 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} KG</span></span>
                                </div>
                              </div>

                              {/* Godowns & Stock Records under Grade */}
                              {isGradeExpanded && (
                                <div className="p-2 space-y-1.5 bg-white ml-4">
                                  <div className="text-[9px] font-black uppercase text-slate-400 px-2 pb-1 border-b border-slate-100 grid grid-cols-12 gap-2">
                                    <span className="col-span-3">Godown / Warehouse</span>
                                    <span className="col-span-2">Date</span>
                                    <span className="col-span-2 text-center">JCI</span>
                                    <span className="col-span-2 text-right">Quantity</span>
                                    <span className="col-span-2 text-right">Weight (KG)</span>
                                    <span className="col-span-1 text-center">Action</span>
                                  </div>
                                  {records.map((r, ri) => (
                                    <div 
                                      key={r.id || ri}
                                      onClick={() => setSelectedStockId(r.id || null)}
                                      className={cn(
                                        "grid grid-cols-12 gap-2 items-center px-2 py-1.5 rounded text-[10px] font-bold transition-all cursor-pointer",
                                        selectedStockId === r.id ? "bg-indigo-950 text-white" : "hover:bg-slate-100 text-slate-800"
                                      )}
                                    >
                                      <span className="col-span-3 font-black uppercase truncate flex items-center gap-1.5">
                                        <span>📦</span> {r.godown || '-'}
                                      </span>
                                      <span className="col-span-2 font-mono text-slate-500">
                                        {r.opening_date || '-'}
                                      </span>
                                      <span className="col-span-2 text-center">
                                        <span className={cn(
                                          "px-1.5 py-0.5 rounded text-[8px] font-black uppercase",
                                          (r.jci || '').toUpperCase() === 'YES' ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                                        )}>
                                          {r.jci || 'No'}
                                        </span>
                                      </span>
                                      <span className="col-span-2 text-right font-mono font-black text-indigo-900">
                                        {r.quantity || 0} Bales
                                      </span>
                                      <span className="col-span-2 text-right font-mono font-black text-teal-700">
                                        {(Number(r.weight || 0) * 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} KG
                                      </span>
                                      <span className="col-span-1 flex items-center justify-center gap-1">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); onEdit(r); }}
                                          className="p-1 hover:bg-blue-100 rounded text-blue-700 cursor-pointer"
                                          title="Edit Record"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={(e) => { 
                                            e.stopPropagation(); 
                                            if (canDeleteData() && confirm("Are you sure you want to delete this opening stock record?")) {
                                              onDelete(r.id, `${r.grade} @ ${r.godown}`);
                                            }
                                          }}
                                          className="p-1 hover:bg-red-100 rounded text-red-600 cursor-pointer"
                                          title="Delete Record"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })() : (() => {
              const tree: Record<string, Record<string, any[]>> = {};
              filteredSavedStocks.forEach(r => {
                const grade = (r.grade || 'GENERAL GRADE').toUpperCase();
                const area = (r.area || 'GENERAL AREA').toUpperCase();
                if (!tree[grade]) tree[grade] = {};
                if (!tree[grade][area]) tree[grade][area] = [];
                tree[grade][area].push(r);
              });

              return Object.entries(tree).map(([grade, areasMap]) => {
                const isGradeExpanded = !!expandedGradesTop[grade];
                const gradeTotalQty = Object.values(areasMap).reduce((sum, records) => sum + records.reduce((s, r) => s + (Number(r.quantity) || 0), 0), 0);
                const gradeTotalWt = Object.values(areasMap).reduce((sum, records) => sum + records.reduce((s, r) => s + (Number(r.weight) || 0), 0), 0);

                return (
                  <div key={grade} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                    {/* Grade Header Row */}
                    <div 
                      onClick={() => setExpandedGradesTop(prev => ({ ...prev, [grade]: !prev[grade] }))}
                      className="flex items-center justify-between px-3.5 py-3 bg-slate-50 hover:bg-slate-100 cursor-pointer select-none transition-colors border-b border-slate-200"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded bg-[#D94B5A] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                          {isGradeExpanded ? '-' : '+'}
                        </span>
                        <span className="text-xs font-black uppercase text-indigo-950 tracking-wide">
                          🏷️ Grade: {grade}
                        </span>
                        <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {Object.keys(areasMap).length} Areas
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono font-black text-slate-800">
                        <span>Total Qty: <span className="text-indigo-950">{gradeTotalQty.toLocaleString()} Bales</span></span>
                        <span>Total Wt: <span className="text-teal-700">{(gradeTotalWt * 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} KG</span></span>
                      </div>
                    </div>

                    {/* Areas under Grade */}
                    {isGradeExpanded && (
                      <div className="p-3 space-y-2 bg-slate-50/60">
                        {Object.entries(areasMap).map(([area, records]) => {
                          const areaKey = `${grade}__${area}`;
                          const isAreaExpanded = !!expandedAreasSub[areaKey];
                          const areaTotalQty = records.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
                          const areaTotalWt = records.reduce((s, r) => s + (Number(r.weight) || 0), 0);

                          return (
                            <div key={area} className="border border-indigo-100 rounded-md overflow-hidden bg-white ml-4 shadow-xs">
                              {/* Area Header Row */}
                              <div 
                                onClick={() => setExpandedAreasSub(prev => ({ ...prev, [areaKey]: !prev[areaKey] }))}
                                className="flex items-center justify-between px-3 py-2 bg-indigo-50/60 hover:bg-indigo-100/60 cursor-pointer select-none transition-colors border-b border-indigo-100"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-4 h-4 rounded bg-indigo-700 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                                    {isAreaExpanded ? '-' : '+'}
                                  </span>
                                  <span className="text-[11px] font-black uppercase text-indigo-950 tracking-wide">
                                    📍 Area: {area}
                                  </span>
                                  <span className="text-[8px] font-bold text-indigo-700 bg-white border border-indigo-200 px-1.5 py-0.5 rounded">
                                    {records.length} Godowns
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-[11px] font-mono font-black text-slate-800">
                                  <span>Qty: <span className="text-indigo-950">{areaTotalQty.toLocaleString()}</span></span>
                                  <span>Wt: <span className="text-teal-700">{(areaTotalWt * 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} KG</span></span>
                                </div>
                              </div>

                              {/* Godowns & Stock Records under Area */}
                              {isAreaExpanded && (
                                <div className="p-2 space-y-1.5 bg-white ml-4">
                                  <div className="text-[9px] font-black uppercase text-slate-400 px-2 pb-1 border-b border-slate-100 grid grid-cols-12 gap-2">
                                    <span className="col-span-3">Godown / Warehouse</span>
                                    <span className="col-span-2">Date</span>
                                    <span className="col-span-2 text-center">JCI</span>
                                    <span className="col-span-2 text-right">Quantity</span>
                                    <span className="col-span-2 text-right">Weight (KG)</span>
                                    <span className="col-span-1 text-center">Action</span>
                                  </div>
                                  {records.map((r, ri) => (
                                    <div 
                                      key={r.id || ri}
                                      onClick={() => setSelectedStockId(r.id || null)}
                                      className={cn(
                                        "grid grid-cols-12 gap-2 items-center px-2 py-1.5 rounded text-[10px] font-bold transition-all cursor-pointer",
                                        selectedStockId === r.id ? "bg-indigo-950 text-white" : "hover:bg-slate-100 text-slate-800"
                                      )}
                                    >
                                      <span className="col-span-3 font-black uppercase truncate flex items-center gap-1.5">
                                        <span>📦</span> {r.godown || '-'}
                                      </span>
                                      <span className="col-span-2 font-mono text-slate-500">
                                        {r.opening_date || '-'}
                                      </span>
                                      <span className="col-span-2 text-center">
                                        <span className={cn(
                                          "px-1.5 py-0.5 rounded text-[8px] font-black uppercase",
                                          (r.jci || '').toUpperCase() === 'YES' ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                                        )}>
                                          {r.jci || 'No'}
                                        </span>
                                      </span>
                                      <span className="col-span-2 text-right font-mono font-black text-indigo-900">
                                        {r.quantity || 0} Bales
                                      </span>
                                      <span className="col-span-2 text-right font-mono font-black text-teal-700">
                                        {(Number(r.weight || 0) * 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} KG
                                      </span>
                                      <span className="col-span-1 flex items-center justify-center gap-1">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); onEdit(r); }}
                                          className="p-1 hover:bg-blue-100 rounded text-blue-700 cursor-pointer"
                                          title="Edit Record"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={(e) => { 
                                            e.stopPropagation(); 
                                            if (canDeleteData() && confirm("Are you sure you want to delete this opening stock record?")) {
                                              onDelete(r.id, `${r.grade} @ ${r.godown}`);
                                            }
                                          }}
                                          className="p-1 hover:bg-red-100 rounded text-red-600 cursor-pointer"
                                          title="Delete Record"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
