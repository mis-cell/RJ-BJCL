import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  Search,
  Check,
  Printer,
  Download,
  Edit3,
  Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { SmsSaudaItem, SheetSmsItem } from './types';

export interface SmsSaudaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SmsSaudaModal({ isOpen, onClose }: SmsSaudaModalProps) {
  const [smsSaudaTab, setSmsSaudaTab] = useState<'sms' | 'manual'>('sms');
  const [googleSheetSmsData, setGoogleSheetSmsData] = useState<SheetSmsItem[]>([]);
  const [isGoogleSheetLoading, setIsGoogleSheetLoading] = useState(false);
  const [googleSheetError, setGoogleSheetError] = useState<string | null>(null);
  const [smsSearchTerm, setSmsSearchTerm] = useState('');
  const [smsSortOrder, setSmsSortOrder] = useState<'asc' | 'desc'>('desc');
  const [saudaSearchTerm, setSaudaSearchTerm] = useState('');
  const [smsSaudas, setSmsSaudas] = useState<SmsSaudaItem[]>([]);
  const [editingSmsSaudaId, setEditingSmsSaudaId] = useState<string | null>(null);

  // Manual form controlled states
  const [manualTrader, setManualTrader] = useState('');
  const [manualSupplier, setManualSupplier] = useState('');
  const [manualUnitType, setManualUnitType] = useState('BALES');
  const [manualStatus, setManualStatus] = useState<'Active' | 'Partial' | 'Closed'>('Active');
  const [manualGrade, setManualGrade] = useState('TD5');
  const [manualBales, setManualBales] = useState('');
  const [manualRate, setManualRate] = useState('');

  const fetchGoogleSheetSms = async () => {
    setIsGoogleSheetLoading(true);
    setGoogleSheetError(null);
    try {
      const res = await fetch(
        "https://sheets.googleapis.com/v4/spreadsheets/1WignMNJ2p2Qu5V34nuuthPItahIlNnQtBiJJ8KYgG9k/values/sauda!A:C?key=AIzaSyBLQaMfurS0w11dgPRPLIpUfAs6lOHRMgA"
      );
      if (!res.ok) {
        throw new Error(`Google Sheets API responded with status ${res.status}`);
      }
      const data = await res.json();
      if (data.values && data.values.length > 0) {
        let rows = data.values;
        if (rows[0] && rows[0][0]?.toLowerCase() === 'body') {
          rows = rows.slice(1);
        }
        
        const parsed = rows.map((row: any, index: number) => ({
          id: `SHEET-SMS-${index + 1}`,
          body: row[0] || '',
          service_center: row[1] || '',
          contact_name: row[2] || 'Unknown Sender',
          date: '2026-07-07'
        }));
        setGoogleSheetSmsData(parsed);
      } else {
        setGoogleSheetSmsData([]);
      }
    } catch (err: any) {
      console.error("Error fetching Google Sheet SMS data:", err);
      setGoogleSheetError(err.message || "Failed to load SMS data");
    } finally {
      setIsGoogleSheetLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && smsSaudaTab === 'sms') {
      fetchGoogleSheetSms();
    }
  }, [isOpen, smsSaudaTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 ">
      <div className="bg-slate-50 border border-slate-200 shadow-2xl w-full max-w-7xl flex flex-col rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 h-[92vh] max-h-[92vh]">
        
        {/* Modern Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-5 py-3.5 flex justify-between items-center border-b border-slate-800 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-xs font-black uppercase tracking-wider italic flex items-center gap-2 text-indigo-200">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              SMS Sauda Desk
            </h2>
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mt-0.5 font-sans">
              BALLY JUTE COMPANY LIMITED » SAUDA REGISTER VIEW
            </p>
          </div>
          
          {/* Window Controllers */}
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={onClose}
              title="Back to Main Dashboard"
              className="h-8 w-8 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg cursor-pointer flex items-center justify-center transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button 
              onClick={onClose}
              className="h-8 w-8 bg-red-650 hover:bg-red-700 text-white rounded-lg font-black text-xs cursor-pointer flex items-center justify-center transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Selector & Control Bar */}
        <div className="bg-white border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-sm font-sans">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setSmsSaudaTab('sms')}
              className={cn(
                "h-9 px-4 border-2 flex items-center gap-2 transition-all active:translate-x-[1px] active:translate-y-[1px] rounded-md cursor-pointer text-xs uppercase tracking-wider font-extrabold",
                smsSaudaTab === 'sms'
                  ? "bg-indigo-100 border-indigo-600 text-indigo-900 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15)]"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              <span>SMS Inbox ({googleSheetSmsData.length})</span>
            </button>

            <button
              onClick={() => setSmsSaudaTab('manual')}
              className={cn(
                "h-9 px-4 border-2 flex items-center gap-2 transition-all active:translate-x-[1px] active:translate-y-[1px] rounded-md cursor-pointer text-xs uppercase tracking-wider font-extrabold",
                smsSaudaTab === 'manual'
                  ? "bg-indigo-100 border-indigo-600 text-indigo-900 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15)]"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <PlusCircle className="h-4 w-4 text-indigo-600" />
              <span>Manual Entry Form</span>
            </button>
            
            <button 
              onClick={fetchGoogleSheetSms}
              disabled={isGoogleSheetLoading}
              className="bg-[#024a68] hover:bg-[#035b80] text-white font-mono font-black text-[10px] h-9 px-4 rounded-md shadow-sm cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isGoogleSheetLoading && "animate-spin")} />
              <span>{isGoogleSheetLoading ? "Syncing..." : "Sync Sheet Data"}</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold">
            <span className="bg-rose-50 text-rose-800 border border-rose-250 px-3 py-1 rounded-md shadow-xs">
              Total Active: {smsSaudas.filter(s => s.status === 'Active' || s.status === 'Pending').length}
            </span>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-250 px-3 py-1 rounded-md shadow-xs">
              Cumulative: ₹{smsSaudas.reduce((sum, s) => sum + (s.bales * 1.5 * s.rate), 0).toLocaleString()}
            </span>
          </div>
        </div>

        {smsSaudaTab === 'sms' ? (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 overflow-hidden">
            <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap gap-3 items-center justify-between shadow-xs">
              <div className="font-mono text-xs">
                <span className="font-black text-slate-800 tracking-wider">GOOGLE SHEETS DATA LEDGER</span>
                <span className="text-slate-300 mx-2">|</span>
                <span className="text-slate-500 font-bold text-[10px]">Sheet ID: 1WignMNJ2p2...KYgG9k (sauda)</span>
              </div>
            </div>

            {googleSheetError && (
              <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 font-sans text-xs shadow-sm animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 font-black mb-1">
                  <AlertCircle className="h-4 w-4 text-red-650" />
                  <span className="uppercase tracking-wider text-[10px]">Sheets API Synchronization Fault</span>
                </div>
                <p className="text-[11px] leading-relaxed text-red-700 font-semibold">{googleSheetError}</p>
              </div>
            )}

            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input 
                  id="quick_filter_sms_logs" 
                  name="quick_filter_sms_logs" 
                  aria-label="Quick filter SMS logs by sender name or body..."
                  type="text"
                  placeholder="Quick filter SMS logs by sender name or body..."
                  value={smsSearchTerm}
                  onChange={(e) => setSmsSearchTerm(e.target.value)}
                  className="w-full bg-white pl-9 pr-3 py-2 text-xs border border-slate-250 rounded-lg shadow-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-1 bg-white border border-slate-250 px-2.5 py-1 rounded-lg shadow-xs">
                <span className="text-[10px] font-black uppercase text-slate-500">Sort:</span>
                <span className="text-[10px] font-black text-slate-800">Date</span>
                <button
                  onClick={() => setSmsSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="ml-1 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all"
                  title="Toggle Ascending / Descending"
                >
                  {smsSortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-white border-t border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#c2cfd6]/70 border-b-2 border-slate-400 text-slate-800 font-mono h-10 sticky top-0 z-10 font-bold uppercase ">
                  <tr>
                    <th className="px-3 border-r border-slate-300 text-[10px] tracking-wide text-center w-14">Row &or;</th>
                    <th 
                      onClick={() => setSmsSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                      className="px-3 border-r border-slate-300 text-[10px] tracking-wide w-28 cursor-pointer hover:bg-slate-300/80 select-none transition-colors"
                      title="Click to sort by Date"
                    >
                      Date {smsSortOrder === 'desc' ? '↓' : '↑'}
                    </th>
                    <th className="px-4 border-r border-slate-300 text-[10px] tracking-wide w-48">Sender (Broker/Vyapari) &or;</th>
                    <th className="px-4 border-r border-slate-300 text-[10px] tracking-wide">Raw SMS Text (Google Sheet Body payload)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px] text-slate-800">
                  {isGoogleSheetLoading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-24 text-slate-400 font-mono">
                        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-2" />
                        <p className="text-xs font-black uppercase tracking-wider text-slate-700">Retrieving contract feed...</p>
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const filtered = googleSheetSmsData.filter(sms => {
                        const query = smsSearchTerm.toLowerCase();
                        return (
                          sms.contact_name.toLowerCase().includes(query) ||
                          sms.service_center.toLowerCase().includes(query) ||
                          sms.body.toLowerCase().includes(query)
                        );
                      }).sort((a, b) => {
                        const timeA = new Date(a.date || 0).getTime();
                        const timeB = new Date(b.date || 0).getTime();
                        return smsSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} className="text-center py-16 text-slate-400 font-mono font-bold uppercase">
                              No matching logs found in Google Sheets SMS feed.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((sms, index) => {
                        const rowBgClass = index % 2 === 1 ? "bg-slate-50 hover:bg-slate-100" : "bg-white hover:bg-slate-50";

                        return (
                          <tr key={sms.id} className={cn("transition-colors h-10", rowBgClass)}>
                            <td className="px-3 py-2 border-r border-slate-200 text-center font-bold text-slate-400 ">
                              {sms.id.replace('SHEET-SMS-', '')}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 text-slate-500 font-medium">{sms.date}</td>
                            <td className="px-4 py-2 border-r border-slate-200 font-black text-slate-900 uppercase tracking-tight">
                              <span className="flex items-center gap-1.5">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse shrink-0" />
                                {sms.contact_name.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-2 border-r border-slate-200 font-mono text-[11px] text-slate-700 leading-normal select-text max-w-lg truncate hover:text-slate-950" title={sms.body}>
                              {sms.body}
                            </td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 overflow-hidden">
            <div className="p-5 bg-white border-b border-slate-200 shrink-0 shadow-sm font-sans">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h4 className="text-xs font-black uppercase text-indigo-900 tracking-wider flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-indigo-600" />
                  <span>{editingSmsSaudaId ? `Modify Contract #${editingSmsSaudaId}` : "Log New Sauda Contract Booking"}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setManualTrader('');
                    setManualSupplier('');
                    setManualUnitType('BALES');
                    setManualStatus('Active');
                    setManualGrade('TD5');
                    setManualBales('');
                    setManualRate('');
                    setEditingSmsSaudaId(null);
                  }}
                  className="text-slate-500 hover:text-indigo-600 font-bold uppercase text-[10px] hover:underline cursor-pointer transition-colors"
                >
                  Reset Form Fields
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!manualTrader || Number(manualBales) <= 0 || Number(manualRate) <= 0) {
                    alert("Please fill in Vyapari name, quantity, and rate.");
                    return;
                  }

                  if (editingSmsSaudaId) {
                    setSmsSaudas(smsSaudas.map(s => s.id === editingSmsSaudaId ? {
                      ...s,
                      trader: manualTrader,
                      supplier: manualSupplier || manualTrader,
                      unitType: manualUnitType,
                      status: manualStatus,
                      grade: manualGrade,
                      bales: Number(manualBales),
                      rate: Number(manualRate)
                    } : s));
                    setEditingSmsSaudaId(null);
                  } else {
                    const newSauda: SmsSaudaItem = {
                      id: `SMS-${Math.floor(100 + Math.random() * 900)}`,
                      trader: manualTrader,
                      supplier: manualSupplier || manualTrader,
                      unitType: manualUnitType,
                      status: manualStatus,
                      grade: manualGrade,
                      bales: Number(manualBales),
                      rate: Number(manualRate),
                      date: new Date().toISOString().split('T')[0]
                    };
                    setSmsSaudas([newSauda, ...smsSaudas]);
                  }

                  setManualTrader('');
                  setManualSupplier('');
                  setManualUnitType('BALES');
                  setManualStatus('Active');
                  setManualGrade('TD5');
                  setManualBales('');
                  setManualRate('');
                }}
                className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
              >
                <div>
                  <label htmlFor="trader_vyapari" className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 tracking-wider">Trader / Vyapari</label>
                  <input 
                    id="trader_vyapari" 
                    name="trader_vyapari" 
                    aria-label="Trader / Vyapari"
                    type="text"
                    placeholder="e.g. Shiva Fibres"
                    value={manualTrader}
                    onChange={(e) => {
                      setManualTrader(e.target.value);
                      if (!manualSupplier) setManualSupplier(e.target.value);
                    }}
                    className="w-full bg-white px-3 py-2 text-xs border border-slate-250 rounded-lg shadow-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="supplier_name" className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 tracking-wider">Supplier Name</label>
                  <input 
                    id="supplier_name" 
                    name="supplier_name" 
                    aria-label="Supplier Name"
                    type="text"
                    placeholder="e.g. SELF"
                    value={manualSupplier}
                    onChange={(e) => setManualSupplier(e.target.value)}
                    className="w-full bg-white px-3 py-2 text-xs border border-slate-250 rounded-lg shadow-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="grade" className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 tracking-wider">Grade</label>
                    <select 
                      id="grade" 
                      name="grade" 
                      aria-label="Grade"
                      value={manualGrade}
                      onChange={(e) => setManualGrade(e.target.value)}
                      className="w-full bg-white px-2.5 py-2 text-[11px] border border-slate-250 rounded-lg shadow-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="TD4">TD4 (Assam)</option>
                      <option value="TD5">TD5 (Std)</option>
                      <option value="TD6">TD6 (Low)</option>
                      <option value="W4">W4 (Prem)</option>
                      <option value="W5">W5 (White)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="unit_lorry" className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 tracking-wider">Unit/Lorry</label>
                    <select 
                      id="unit_lorry" 
                      name="unit_lorry" 
                      aria-label="Unit/Lorry"
                      value={manualUnitType}
                      onChange={(e) => setManualUnitType(e.target.value)}
                      className="w-full bg-white px-2.5 py-2 text-[11px] border border-slate-250 rounded-lg shadow-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="BALES">BALES</option>
                      <option value="LORRY">LORRY</option>
                      <option value="LOOSE">LOOSE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="qty_bales" className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 tracking-wider">Qty (Bales)</label>
                    <input 
                      id="qty_bales" 
                      name="qty_bales" 
                      aria-label="Qty (Bales)"
                      type="number"
                      placeholder="150"
                      value={manualBales}
                      onChange={(e) => setManualBales(e.target.value)}
                      className="w-full bg-white px-3 py-2 text-xs border border-slate-250 rounded-lg shadow-sm font-bold text-right text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="rate_qtl" className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 tracking-wider">Rate (₹/Qtl)</label>
                    <input 
                      id="rate_qtl" 
                      name="rate_qtl" 
                      aria-label="Rate (₹/Qtl)"
                      type="number"
                      placeholder="3450"
                      value={manualRate}
                      onChange={(e) => setManualRate(e.target.value)}
                      className="w-full bg-white px-3 py-2 text-xs border border-slate-250 rounded-lg shadow-sm font-bold text-right text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-black text-[10px] uppercase h-10 rounded-lg shadow-sm border border-indigo-600 cursor-pointer flex items-center justify-center gap-1 transition-all active:scale-95"
                  >
                    <Check className="h-4 w-4" />
                    <span>{editingSmsSaudaId ? "Update" : "Save Contract"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Sauda Ledger Search and Actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3 items-center justify-between shadow-xs">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input 
                  id="search_booked_contracts" 
                  name="search_booked_contracts" 
                  aria-label="Search booked contracts..."
                  type="text"
                  placeholder="Search booked contracts..."
                  value={saudaSearchTerm}
                  onChange={(e) => setSaudaSearchTerm(e.target.value)}
                  className="w-full bg-white pl-9 pr-3 py-1.5 text-xs border border-slate-250 rounded-lg shadow-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Sauda Booking Ledger Book</title>
                            <style>
                              body { font-family: monospace; padding: 25px; line-height: 1.4; color: #111; }
                              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                              th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 11px; }
                              th { background-color: #f2f2f2; font-weight: bold; }
                              .text-right { text-align: right; }
                              .text-center { text-align: center; }
                              h2 { margin: 0; text-transform: uppercase; font-size: 16px; }
                            </style>
                          </head>
                          <body>
                            <h2>Bally Jute Company Limited</h2>
                            <h3 style="margin-top:2px;font-weight:normal;font-size:12px;">Sauda Booking Register Ledger</h3>
                            <p style="font-size:10px;color:#555;">Printed: ${new Date().toLocaleString()}</p>
                            <table>
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>ID</th>
                                  <th>Vyapari / Broker</th>
                                  <th>Grade</th>
                                  <th>Unit</th>
                                  <th class="text-right">Qty Bales</th>
                                  <th class="text-right">Rate (₹)</th>
                                  <th class="text-right">Est. Value (₹)</th>
                                  <th class="text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${smsSaudas.map((s: any) => `
                                  <tr>
                                    <td>${s.date}</td>
                                    <td>#${s.id}</td>
                                    <td><strong>${s.trader.toUpperCase()}</strong></td>
                                    <td>${s.grade}</td>
                                    <td>${s.unitType || 'BALES'}</td>
                                    <td class="text-right">${s.bales}</td>
                                    <td class="text-right">${s.rate}</td>
                                    <td class="text-right">₹${(s.bales * 1.5 * s.rate).toLocaleString()}</td>
                                    <td class="text-center">${s.status || 'Active'}</td>
                                  </tr>
                                `).join('')}
                              </tbody>
                            </table>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-mono font-bold text-[10px] h-8 px-3 rounded-lg border border-slate-250 shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  <span>Print Register</span>
                </button>

                <button
                  onClick={() => {
                    const csvRows = smsSaudas.map(s => [
                      s.date,
                      s.id,
                      s.trader,
                      s.grade,
                      s.unitType,
                      s.bales,
                      s.rate,
                      s.bales * 1.5 * s.rate,
                      s.status
                    ].join(','));
                    const csvContent = "data:text/csv;charset=utf-8,Date,ID,Trader,Grade,Unit,QtyBales,Rate,Value,Status\n" + csvRows.join('\n');
                    const link = document.createElement("a");
                    link.href = encodeURI(csvContent);
                    link.download = "sauda_bookings.csv";
                    link.click();
                  }}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-mono font-bold text-[10px] h-8 px-3 rounded-lg border border-slate-250 shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>CSV Export</span>
                </button>
              </div>
            </div>

            {/* Registered Saudas Table list */}
            <div className="flex-1 overflow-auto p-5 bg-slate-50/50">
              <div className="border border-slate-200 rounded-xl overflow-x-auto overflow-y-auto bg-white shadow-sm w-full max-w-full">
                <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
                  <thead className="bg-slate-900 border-b border-slate-800 uppercase text-white font-mono h-10 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 border-r border-slate-800 text-[10px] tracking-wider">Date</th>
                      <th className="px-4 border-r border-slate-800 text-[10px] tracking-wider">ID</th>
                      <th className="px-4 border-r border-slate-800 text-[10px] tracking-wider">Vyapari / Broker Name</th>
                      <th className="px-4 border-r border-slate-800 text-[10px] tracking-wider text-center">Grade</th>
                      <th className="px-4 border-r border-slate-800 text-[10px] tracking-wider text-center">Unit</th>
                      <th className="px-4 border-r border-slate-800 text-[10px] tracking-wider text-right">Bales</th>
                      <th className="px-4 border-r border-slate-800 text-[10px] tracking-wider text-right">Rate / Qtl</th>
                      <th className="px-4 border-r border-slate-800 text-[10px] tracking-wider text-right">Est. Value</th>
                      <th className="px-4 border-r border-slate-800 text-[10px] tracking-wider text-center">Status</th>
                      <th className="px-4 text-[10px] tracking-wider text-center font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-850">
                    {(() => {
                      const query = saudaSearchTerm.toLowerCase();
                      const filtered = smsSaudas.filter(s => 
                        s.trader.toLowerCase().includes(query) ||
                        s.id.toLowerCase().includes(query) ||
                        s.grade.toLowerCase().includes(query)
                      );

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={10} className="text-center py-10 text-slate-400">
                              No booked sauda entries found.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((s, idx) => (
                        <tr key={s.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/20"}>
                          <td className="px-4 py-2.5 border-r border-slate-100 text-slate-500 text-[10px]">{s.date}</td>
                          <td className="px-4 py-2.5 border-r border-slate-100 font-bold text-[#024a68]">#{s.id}</td>
                          <td className="px-4 py-2.5 border-r border-slate-100 font-black text-slate-900 uppercase">{s.trader}</td>
                          <td className="px-4 py-2.5 border-r border-slate-100 text-center text-amber-800 font-bold">{s.grade}</td>
                          <td className="px-4 py-2.5 border-r border-slate-100 text-center font-bold text-slate-500">{s.unitType || 'BALES'}</td>
                          <td className="px-4 py-2.5 border-r border-slate-100 text-right font-black">{s.bales}</td>
                          <td className="px-4 py-2.5 border-r border-slate-100 text-right font-black text-stone-850">₹{s.rate}</td>
                          <td className="px-4 py-2.5 border-r border-slate-100 text-right font-black text-emerald-800">₹{(s.bales * 1.5 * s.rate).toLocaleString()}</td>
                          <td className="px-4 py-2.5 border-r border-slate-100 text-center">
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2.5 py-0.5 border rounded-md shadow-xs inline-block ",
                              s.status === 'Closed' || s.status === 'Completed'
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200 animate-pulse"
                            )}>
                              {s.status === 'Closed' || s.status === 'Completed' ? 'COMPLETED' : 'PENDING'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => {
                                  setManualTrader(s.trader);
                                  setManualSupplier(s.supplier || s.trader);
                                  setManualUnitType(s.unitType || 'BALES');
                                  setManualStatus(s.status === 'Completed' ? 'Closed' : (s.status as any) || 'Active');
                                  setManualGrade(s.grade);
                                  setManualBales(String(s.bales));
                                  setManualRate(String(s.rate));
                                  setEditingSmsSaudaId(s.id);
                                }}
                                title="Edit Contract details"
                                className="text-[#024a68] hover:text-indigo-950 p-1 rounded-lg border border-slate-100 hover:border-slate-300 bg-slate-50 transition-all cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  const nextStatus = s.status === 'Closed' ? 'Active' : 'Closed';
                                  setSmsSaudas(smsSaudas.map(item => item.id === s.id ? { ...item, status: nextStatus } : item));
                                }}
                                title="Mark Completed / Toggle"
                                className="text-emerald-650 hover:text-emerald-950 p-1 rounded-lg border border-slate-100 hover:border-slate-300 bg-slate-50 transition-all cursor-pointer"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  if (confirm("Revoke this booked contract?")) {
                                    setSmsSaudas(smsSaudas.filter(item => item.id !== s.id));
                                  }
                                }}
                                title="Delete/Revoke contract"
                                className="text-red-650 hover:text-red-955 p-1 rounded-lg border border-slate-100 hover:border-red-300 bg-slate-50 transition-all cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Modern Popup Footer */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex justify-end shrink-0 shadow-sm">
          <button 
            onClick={onClose}
            className="bg-slate-850 hover:bg-slate-950 text-white font-mono font-black uppercase text-[10px] tracking-widest px-8 py-2.5 rounded-lg border border-slate-850 cursor-pointer transition-all duration-150 shadow-sm active:scale-95"
          >
            Close Register
          </button>
        </div>

      </div>
    </div>
  );
}
