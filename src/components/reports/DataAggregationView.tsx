import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';

interface DataAggregationViewProps {
  poData: any[];
  saudaData: any[];
  poDetails: any[];
}

export const DataAggregationView: React.FC<DataAggregationViewProps> = ({
  poData,
  saudaData,
  poDetails
}) => {
  const [activeAggReportKey, setActiveAggReportKey] = useState<string>('monthly_po_summary');
  const [aggSearchTerm, setAggSearchTerm] = useState<string>('');

  const computedAggReport = useMemo(() => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let summary: string = "";

    switch (activeAggReportKey) {
      case 'monthly_po_summary': {
        headers = ["Month-Year", "Total Contract Count", "Total Contract Volume (MT)", "Avg Contract Weight (MT)", "Total Est. Units", "Unique Suppliers", "Unique Brokers"];
        
        const groups: Record<string, { key: string; count: number; weight: number; units: number; suppliers: Set<string>; brokers: Set<string> }> = {};
        
        poData.forEach(p => {
          if (!p.po_date) return;
          const d = new Date(p.po_date);
          if (isNaN(d.getTime())) return;
          const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const label = `${mNames[d.getMonth()]} ${d.getFullYear()}`;
          const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          
          if (!groups[sortKey]) {
            groups[sortKey] = { key: label, count: 0, weight: 0, units: 0, suppliers: new Set(), brokers: new Set() };
          }
          
          const grp = groups[sortKey];
          grp.count++;
          
          let wt = 0;
          const details = poDetails.filter(dt => dt.po_no === p.po_no);
          if (details.length > 0) {
            wt = details.reduce((sum, dLine) => sum + (Number(dLine.weight_mt) || Number(dLine.weight) || 0), 0);
          }
          if (wt === 0) wt = Number(p.total_contract_mt) || 0;
          if (wt === 0) {
            const unitsVal = Number(p.total_units) || (Number(p.total_lorries) * Number(p.units_per_lorry)) || 0;
            wt = (unitsVal * (Number(p.weight_unit_kgs) || 50)) / 1000;
          }
          grp.weight += wt;
          grp.units += Number(p.total_units) || 0;
          if (p.supplier) grp.suppliers.add(p.supplier.trim().toUpperCase());
          if (p.broker) grp.brokers.add(p.broker.trim().toUpperCase());
        });
        
        const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        rows = sortedKeys.map(k => {
          const g = groups[k];
          return [
            g.key,
            g.count.toString(),
            g.weight.toFixed(2),
            g.count > 0 ? (g.weight / g.count).toFixed(2) : "0.00",
            g.units.toString(),
            g.suppliers.size.toString(),
            g.brokers.size.toString()
          ];
        });
        
        const totWeight = Object.values(groups).reduce((s, g) => s + g.weight, 0);
        summary = `Analyzed ${poData.length} total purchase contracts across ${sortedKeys.length} historical months. Global Volume: ${totWeight.toFixed(2)} MT.`;
        break;
      }
      
      case 'yearly_po_summary': {
        headers = ["Financial Year", "Total Contracts Owned", "Total Sourced Weight (MT)", "Avg Contract Weight (MT)", "Total Units", "Unique Suppliers Count", "Unique Brokers Count"];
        
        const groups: Record<string, { key: string; count: number; weight: number; units: number; suppliers: Set<string>; brokers: Set<string> }> = {};
        
        poData.forEach(p => {
          let finYear = p.financial_year || '';
          if (!finYear && p.po_date) {
            const yr = new Date(p.po_date).getFullYear();
            finYear = `${yr}-${yr + 1}`;
          }
          if (!finYear) finYear = "Historical/Unassigned";
          
          if (!groups[finYear]) {
            groups[finYear] = { key: finYear, count: 0, weight: 0, units: 0, suppliers: new Set(), brokers: new Set() };
          }
          
          const grp = groups[finYear];
          grp.count++;
          
          let wt = 0;
          const details = poDetails.filter(dt => dt.po_no === p.po_no);
          if (details.length > 0) {
            wt = details.reduce((sum, dLine) => sum + (Number(dLine.weight_mt) || Number(dLine.weight) || 0), 0);
          }
          if (wt === 0) wt = Number(p.total_contract_mt) || 0;
          if (wt === 0) {
            const unitsVal = Number(p.total_units) || (Number(p.total_lorries) * Number(p.units_per_lorry)) || 0;
            wt = (unitsVal * (Number(p.weight_unit_kgs) || 50)) / 1000;
          }
          grp.weight += wt;
          grp.units += Number(p.total_units) || 0;
          if (p.supplier) grp.suppliers.add(p.supplier.trim().toUpperCase());
          if (p.broker) grp.brokers.add(p.broker.trim().toUpperCase());
        });
        
        const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        rows = sortedKeys.map(k => {
          const g = groups[k];
          return [
            g.key,
            g.count.toString(),
            g.weight.toFixed(2),
            g.count > 0 ? (g.weight / g.count).toFixed(2) : "0.00",
            g.units.toString(),
            g.suppliers.size.toString(),
            g.brokers.size.toString()
          ];
        });
        
        const totWeight = Object.values(groups).reduce((s, g) => s + g.weight, 0);
        summary = `Sourced ${poData.length} records. Total Contract Volume: ${totWeight.toFixed(2)} MT across ${sortedKeys.length} financial years.`;
        break;
      }
      
      case 'monthly_sauda_summary': {
        headers = ["Month-Year", "Total Sauda Contracts", "Total Weight (MT)", "Total Lorries Allocated", "Total Sauda Value (Rs.)", "Avg Rate (Rs./MT)", "Unique Brokers", "Unique Suppliers"];
        
        const groups: Record<string, { key: string; count: number; weight: number; lorries: number; value: number; suppliers: Set<string>; brokers: Set<string> }> = {};
        
        saudaData.forEach(s => {
          if (!s.date) return;
          const d = new Date(s.date);
          if (isNaN(d.getTime())) return;
          const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const label = `${mNames[d.getMonth()]} ${d.getFullYear()}`;
          const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          
          if (!groups[sortKey]) {
            groups[sortKey] = { key: label, count: 0, weight: 0, lorries: 0, value: 0, suppliers: new Set(), brokers: new Set() };
          }
          
          const grp = groups[sortKey];
          grp.count++;
          grp.weight += Number(s.total_wt_in_ton) || 0;
          grp.lorries += Number(s.no_of_lorries) || Number(s.total_lorry) || 0;
          grp.value += Number(s.total_value) || (Number(s.b_rate) * Number(s.total_wt_in_ton) * 10) || 0;
          
          if (s.supplier) grp.suppliers.add(s.supplier.trim().toUpperCase());
          if (s.broker) grp.brokers.add(s.broker.trim().toUpperCase());
        });
        
        const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        rows = sortedKeys.map(k => {
          const g = groups[k];
          return [
            g.key,
            g.count.toString(),
            g.weight.toFixed(2),
            g.lorries.toString(),
            Math.round(g.value).toLocaleString('en-IN'),
            g.weight > 0 ? Math.round(g.value / g.weight).toString() : "0",
            g.brokers.size.toString(),
            g.suppliers.size.toString()
          ];
        });
        
        const totWeight = Object.values(groups).reduce((s, g) => s + g.weight, 0);
        summary = `Analyzed ${saudaData.length} Sauda dispatches. Global Traded Volume: ${totWeight.toFixed(2)} MT across ${sortedKeys.length} months.`;
        break;
      }
      
      case 'yearly_sauda_summary': {
        headers = ["Financial Year", "Total Sauda Contracts", "Total Weight Sold (MT)", "Total Lorries Used", "Total Sauda Value (Rs.)", "Avg Rate (Rs./MT)", "Unique Brokers", "Unique Suppliers"];
        
        const groups: Record<string, { key: string; count: number; weight: number; lorries: number; value: number; suppliers: Set<string>; brokers: Set<string> }> = {};
        
        saudaData.forEach(s => {
          let finYear = s.financial_year || '';
          if (!finYear && s.date) {
            const yr = new Date(s.date).getFullYear();
            finYear = `${yr}-${yr + 1}`;
          }
          if (!finYear) finYear = "Historical/Unassigned";
          
          if (!groups[finYear]) {
            groups[finYear] = { key: finYear, count: 0, weight: 0, lorries: 0, value: 0, suppliers: new Set(), brokers: new Set() };
          }
          
          const grp = groups[finYear];
          grp.count++;
          grp.weight += Number(s.total_wt_in_ton) || 0;
          grp.lorries += Number(s.no_of_lorries) || Number(s.total_lorry) || 0;
          grp.value += Number(s.total_value) || (Number(s.b_rate) * Number(s.total_wt_in_ton) * 10) || 0;
          
          if (s.supplier) grp.suppliers.add(s.supplier.trim().toUpperCase());
          if (s.broker) grp.brokers.add(s.broker.trim().toUpperCase());
        });
        
        const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        rows = sortedKeys.map(k => {
          const g = groups[k];
          return [
            g.key,
            g.count.toString(),
            g.weight.toFixed(2),
            g.lorries.toString(),
            Math.round(g.value).toLocaleString('en-IN'),
            g.weight > 0 ? Math.round(g.value / g.weight).toString() : "0",
            g.brokers.size.toString(),
            g.suppliers.size.toString()
          ];
        });
        
        const totWeight = Object.values(groups).reduce((s, g) => s + g.weight, 0);
        summary = `Sourced ${saudaData.length} records. Total Sauda Weight: ${totWeight.toFixed(2)} MT across ${sortedKeys.length} financial master years.`;
        break;
      }
      
      case 'po_broker_distribution': {
        headers = ["Broker Name", "Total Purchase Orders", "Total Sourced Tons (MT)", "Avg Lease Size (MT)", "Percentage Share (%)"];
        
        const groups: Record<string, { count: number; weight: number }> = {};
        let grandTotalWt = 0;
        
        poData.forEach(p => {
          const bName = (p.broker || 'DIRECT / UNASSIGNED').trim().toUpperCase();
          if (!groups[bName]) groups[bName] = { count: 0, weight: 0 };
          
          let wt = 0;
          const details = poDetails.filter(dt => dt.po_no === p.po_no);
          if (details.length > 0) {
            wt = details.reduce((sum, dLine) => sum + (Number(dLine.weight_mt) || Number(dLine.weight) || 0), 0);
          }
          if (wt === 0) wt = Number(p.total_contract_mt) || 0;
          if (wt === 0) {
            const unitsVal = Number(p.total_units) || (Number(p.total_lorries) * Number(p.units_per_lorry)) || 0;
            wt = (unitsVal * (Number(p.weight_unit_kgs) || 50)) / 1000;
          }
          groups[bName].count++;
          groups[bName].weight += wt;
          grandTotalWt += wt;
        });
        
        rows = Object.keys(groups)
          .map(b => {
            const g = groups[b];
            return [
              b,
              g.count.toString(),
              g.weight.toFixed(2),
              g.count > 0 ? (g.weight / g.count).toFixed(2) : "0.00",
              grandTotalWt > 0 ? ((g.weight / grandTotalWt) * 100).toFixed(1) + "%" : "0.0%"
            ];
          })
          .sort((a, b) => Number(b[2]) - Number(a[2]));
        
        summary = `Sourced volume split across ${rows.length} unique active PO brokers.`;
        break;
      }

      case 'po_supplier_distribution': {
        headers = ["Supplier Name", "Total Purchase Orders", "Total Sourced Tons (MT)", "Avg Tons per Order", "Percentage Share (%)"];
        
        const groups: Record<string, { count: number; weight: number }> = {};
        let grandTotalWt = 0;
        
        poData.forEach(p => {
          const sName = (p.supplier || 'DIRECT / UNASSIGNED').trim().toUpperCase();
          if (!groups[sName]) groups[sName] = { count: 0, weight: 0 };
          
          let wt = 0;
          const details = poDetails.filter(dt => dt.po_no === p.po_no);
          if (details.length > 0) {
            wt = details.reduce((sum, dLine) => sum + (Number(dLine.weight_mt) || Number(dLine.weight) || 0), 0);
          }
          if (wt === 0) wt = Number(p.total_contract_mt) || 0;
          if (wt === 0) {
            const unitsVal = Number(p.total_units) || (Number(p.total_lorries) * Number(p.units_per_lorry)) || 0;
            wt = (unitsVal * (Number(p.weight_unit_kgs) || 50)) / 1000;
          }
          groups[sName].count++;
          groups[sName].weight += wt;
          grandTotalWt += wt;
        });
        
        rows = Object.keys(groups)
          .map(s => {
            const g = groups[s];
            return [
              s,
              g.count.toString(),
              g.weight.toFixed(2),
              g.count > 0 ? (g.weight / g.count).toFixed(2) : "0.00",
              grandTotalWt > 0 ? ((g.weight / grandTotalWt) * 100).toFixed(1) + "%" : "0.0%"
            ];
          })
          .sort((a, b) => Number(b[2]) - Number(a[2]));
        
        summary = `PO sourcing split across ${rows.length} unique active suppliers.`;
        break;
      }

      case 'sauda_broker_distribution': {
        headers = ["Broker Name", "Total Sauda Contracts", "Total Weight Traded (MT)", "Total Value (Rs.)", "Avg Rate (Rs./MT)", "Percentage Share (%)"];
        
        const groups: Record<string, { count: number; weight: number; value: number }> = {};
        let grandTotalWt = 0;
        
        saudaData.forEach(s => {
          const bName = (s.broker || 'DIRECT / UNASSIGNED').trim().toUpperCase();
          if (!groups[bName]) groups[bName] = { count: 0, weight: 0, value: 0 };
          
          const wt = Number(s.total_wt_in_ton) || 0;
          const val = Number(s.total_value) || (Number(s.b_rate) * Number(s.total_wt_in_ton) * 10) || 0;
          
          groups[bName].count++;
          groups[bName].weight += wt;
          groups[bName].value += val;
          grandTotalWt += wt;
        });
        
        rows = Object.keys(groups)
          .map(b => {
            const g = groups[b];
            return [
              b,
              g.count.toString(),
              g.weight.toFixed(2),
              Math.round(g.value).toLocaleString('en-IN'),
              g.weight > 0 ? Math.round(g.value / g.weight).toString() : "0",
              grandTotalWt > 0 ? ((g.weight / grandTotalWt) * 100).toFixed(1) + "%" : "0.0%"
            ];
          })
          .sort((a, b) => Number(b[2]) - Number(a[2]));
        
        summary = `Sauda outbound volumes handled by ${rows.length} specialized brokers.`;
        break;
      }

      case 'sauda_supplier_distribution': {
        headers = ["Supplier Name", "Total Sauda Contracts", "Total Weight Traded (MT)", "Total Value (Rs.)", "Avg Rate (Rs./MT)", "Percentage Share (%)"];
        
        const groups: Record<string, { count: number; weight: number; value: number }> = {};
        let grandTotalWt = 0;
        
        saudaData.forEach(s => {
          const sName = (s.supplier || 'DIRECT / UNASSIGNED').trim().toUpperCase();
          if (!groups[sName]) groups[sName] = { count: 0, weight: 0, value: 0 };
          
          const wt = Number(s.total_wt_in_ton) || 0;
          const val = Number(s.total_value) || (Number(s.b_rate) * Number(s.total_wt_in_ton) * 10) || 0;
          
          groups[sName].count++;
          groups[sName].weight += wt;
          groups[sName].value += val;
          grandTotalWt += wt;
        });
        
        rows = Object.keys(groups)
          .map(s => {
            const g = groups[s];
            return [
              s,
              g.count.toString(),
              g.weight.toFixed(2),
              Math.round(g.value).toLocaleString('en-IN'),
              g.weight > 0 ? Math.round(g.value / g.weight).toString() : "0",
              grandTotalWt > 0 ? ((g.weight / grandTotalWt) * 100).toFixed(1) + "%" : "0.0%"
            ];
          })
          .sort((a, b) => Number(b[2]) - Number(a[2]));
        
        summary = `Sauda order split across ${rows.length} buyer suppliers.`;
        break;
      }

      case 'po_area_sourcing': {
        headers = ["Sourcing Area / Region", "Total Contracts", "Total Contract Volume (MT)", "Avg Contract MT", "Unique Active Brokers"];
        
        const groups: Record<string, { count: number; weight: number; brokers: Set<string> }> = {};
        
        poData.forEach(p => {
          const area = (p.area || 'DIRECT SOURCING').trim().toUpperCase();
          if (!groups[area]) groups[area] = { count: 0, weight: 0, brokers: new Set() };
          
          let wt = 0;
          const details = poDetails.filter(dt => dt.po_no === p.po_no);
          if (details.length > 0) {
            wt = details.reduce((sum, dLine) => sum + (Number(dLine.weight_mt) || Number(dLine.weight) || 0), 0);
          }
          if (wt === 0) wt = Number(p.total_contract_mt) || 0;
          if (wt === 0) {
            const unitsVal = Number(p.total_units) || (Number(p.total_lorries) * Number(p.units_per_lorry)) || 0;
            wt = (unitsVal * (Number(p.weight_unit_kgs) || 50)) / 1000;
          }
          groups[area].count++;
          groups[area].weight += wt;
          if (p.broker) groups[area].brokers.add(p.broker.trim().toUpperCase());
        });
        
        rows = Object.keys(groups)
          .map(ar => {
            const g = groups[ar];
            return [
              ar,
              g.count.toString(),
              g.weight.toFixed(2),
              g.count > 0 ? (g.weight / g.count).toFixed(2) : "0.00",
              g.brokers.size.toString()
            ];
          })
          .sort((a, b) => Number(b[2]) - Number(a[2]));
        
        summary = `Sourcing distributions and regional yields across ${rows.length} stations.`;
        break;
      }

      case 'sauda_transport_logistics': {
        headers = ["Month-Year", "Total Truck Dispatches", "Total Volume Sold (MT)", "Avg Load/Truck (MT)", "Total Value Settle (Rs.)"];
        
        const groups: Record<string, { count: number; weight: number; value: number; lorries: number }> = {};
        
        saudaData.forEach(s => {
          if (!s.date) return;
          const d = new Date(s.date);
          if (isNaN(d.getTime())) return;
          const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const label = `${mNames[d.getMonth()]} ${d.getFullYear()}`;
          const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          
          if (!groups[sortKey]) {
            groups[sortKey] = { count: 0, weight: 0, value: 0, lorries: 0 };
          }
          
          const grp = groups[sortKey];
          grp.count++;
          grp.weight += Number(s.total_wt_in_ton) || 0;
          grp.lorries += Number(s.no_of_lorries) || Number(s.total_lorry) || 0;
          grp.value += Number(s.total_value) || (Number(s.b_rate) * Number(s.total_wt_in_ton) * 10) || 0;
        });
        
        const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        rows = sortedKeys.map(k => {
          const g = groups[k];
          const mName = k.split('-')[1];
          const yearStr = k.split('-')[0];
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const label = `${monthNames[parseInt(mName) - 1]} ${yearStr}`;
          
          return [
            label,
            g.lorries.toString(),
            g.weight.toFixed(2),
            g.lorries > 0 ? (g.weight / g.lorries).toFixed(2) : "0.00",
            Math.round(g.value).toLocaleString('en-IN')
          ];
        });
        
        summary = `Historical logistics and fleet capacity audit covering ${rows.length} months.`;
        break;
      }
    }

    if (aggSearchTerm.trim() !== '') {
      const term = aggSearchTerm.toLowerCase();
      rows = rows.filter(row => {
        return row.some(cell => cell.toLowerCase().includes(term));
      });
    }

    return { headers, rows, summary };
  }, [activeAggReportKey, poData, saudaData, poDetails, aggSearchTerm]);

  const handleExportAggCSV = () => {
    const reportName = activeAggReportKey.toUpperCase().replace(/\s+/g, '_');
    const filename = `Historical_Aggregation_${reportName}.csv`;
    const headersStr = computedAggReport.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
    const rowsStr = computedAggReport.rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','));
    const csvContent = [headersStr, ...rowsStr].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportButtons = [
    { key: 'monthly_po_summary', label: '1. PO Month-Wise Summary' },
    { key: 'yearly_po_summary', label: '2. PO Year-Wise Summary' },
    { key: 'monthly_sauda_summary', label: '3. Sauda Month-Wise Summary' },
    { key: 'yearly_sauda_summary', label: '4. Sauda Year-Wise Summary' },
    { key: 'po_broker_distribution', label: '5. PO Broker Share' },
    { key: 'po_supplier_distribution', label: '6. PO Supplier Share' },
    { key: 'sauda_broker_distribution', label: '7. Sauda Broker Share' },
    { key: 'sauda_supplier_distribution', label: '8. Sauda Supplier Share' },
    { key: 'po_area_sourcing', label: '9. PO Sourcing Regions' },
    { key: 'sauda_transport_logistics', label: '10. Sauda Transit Logistics' }
  ];

  return (
    <div className="bg-slate-50 border border-slate-200 shadow-sm p-4 space-y-4 rounded-xl">
      {/* Header Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 border border-slate-200 shadow-sm rounded-lg">
        <div>
          <h3 className="text-sm font-black uppercase text-emerald-800 tracking-wide">
            Multi-Module ERP Historical Data Aggregator
          </h3>
          <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-wide">
            Queries real-time data from database, aggregates master lists, and formats 10 specialized reports.
          </p>
        </div>

        <div className="flex items-end gap-3">
          {/* Search Box */}
          <div className="flex flex-col">
            <label
              htmlFor="agg-report-search"
              className="text-[8px] font-black text-slate-500 uppercase tracking-wider ml-1 mb-1"
            >
              Filter Records
            </label>
            <input
              name="filter_records"
              aria-label="Filter Records"
              id="agg-report-search"
              type="text"
              placeholder="Search result rows..."
              value={aggSearchTerm}
              onChange={(e) => setAggSearchTerm(e.target.value)}
              className="bg-slate-50 text-[10px] border border-slate-300 px-3 py-2 w-48 font-semibold rounded-md text-slate-800 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-400"
            />
          </div>

          {/* Export CSV Button */}
          <div>
            <button
              id="download-agg-csv"
              onClick={handleExportAggCSV}
              className="bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-800 shadow-sm text-[10px] font-black uppercase px-4 py-2 flex items-center gap-2 tracking-wide cursor-pointer rounded-md transition-all active:scale-[0.98]"
            >
              📥 Export Active to CSV
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Reports List Left Sidebar */}
        <div className="md:col-span-1 space-y-1.5 bg-white p-3 border border-slate-200 shadow-sm rounded-lg">
          <p className="text-[9px] font-black uppercase text-emerald-800 tracking-wider mb-3 border-b border-slate-200 pb-2">
            Suite 10 Aggregated Reports
          </p>

          {reportButtons.map((it) => (
            <button
              id={`agg-report-btn-${it.key}`}
              key={it.key}
              onClick={() => {
                setActiveAggReportKey(it.key);
                setAggSearchTerm('');
              }}
              className={cn(
                "w-full text-left font-black uppercase tracking-wide text-[9px] px-3 py-2 transition-all rounded-md border cursor-pointer",
                activeAggReportKey === it.key
                  ? "bg-emerald-700 border-emerald-700 text-white shadow-sm"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800"
              )}
            >
              {it.label}
            </button>
          ))}
        </div>

        {/* Active Report Table Right Column */}
        <div className="md:col-span-3 space-y-3">
          {/* Meta Statement */}
          <div className="bg-white border border-slate-200 px-3 py-2.5 text-[10px] font-bold text-slate-600 flex justify-between items-center rounded-lg shadow-sm">
            <span>{computedAggReport.summary}</span>
            <span className="text-[8px] font-black tracking-wide bg-emerald-50 text-emerald-700 px-2 py-1 border border-emerald-200 rounded-md">
              ACTIVE REPORT STATUS: LIVE
            </span>
          </div>

          {/* Grid Table Container */}
          <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto min-h-[350px] rounded-lg">
            <table className="w-full text-left text-[10px] font-bold border-collapse min-w-[800px]">
              <thead className="bg-emerald-700 text-white uppercase tracking-wider sticky top-0">
                <tr>
                  {computedAggReport.headers.map((h, idx) => (
                    <th
                      key={idx}
                      className="px-3 py-2.5 border-r border-emerald-600 font-black uppercase text-[9px] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {computedAggReport.rows.length > 0 ? (
                  computedAggReport.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-emerald-50/60 transition-colors"
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3 py-2 border-r border-slate-100 font-mono text-slate-700 whitespace-nowrap"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={computedAggReport.headers.length}
                      className="px-3 py-16 text-center text-slate-400 italic"
                    >
                      No matching aggregates found. Make sure data is seeded in purchase_master and sauda_master.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
