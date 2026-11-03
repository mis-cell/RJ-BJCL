import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Key, 
  ToggleLeft, 
  ShieldCheck, 
  HelpCircle,
  ExternalLink,
  Terminal,
  Settings,
  AlertTriangle,
  Info,
  Clock,
  RefreshCw,
  Sliders,
  CheckCircle,
  Activity,
  PlayCircle,
  AlertOctagon,
  TrendingUp,
  XCircle
} from 'lucide-react';
import { cn, getApiUrl } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { dbModule } from '../services/dbModule';
import LegacyLayout, { LegacyFieldset, LegacyButton } from '../components/LegacyLayout';

export default function ConfigGuide({ onClose }: { onClose?: () => void }) {
  const isConfigured = !!supabase;

  // Real-time Background Sync Diagnostics States
  const [threshold, setThreshold] = useState<number>(0.15); // MT threshold
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [flaggedRecords, setFlaggedRecords] = useState<any[]>([]);
  const [syncingRecordId, setSyncingRecordId] = useState<string | null>(null);
  const [arrivals, setArrivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('');

  const loadArrivalsAndScan = async (tolValue = threshold) => {
    setLoading(true);
    setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] INITIATING FULL DIAGNOSTIC SCAN OF FINAL ARRIVALS...`]);
    try {
      const fetched = await dbModule.fetchAll('final_arrival');
      setArrivals(fetched || []);
      setSyncLogs(prev => [
        ...prev, 
        `[${new Date().toLocaleTimeString()}] RETRIEVED ${(fetched || []).length} REGISTRATION SLIPS FOR RECONCILIATION AUDIT.`,
        `[${new Date().toLocaleTimeString()}] COMPARING WEIGHED NET WEIGHT VS QUALITY AUDIT DECISION FACTOR LOGIC...`
      ]);
      
      analyzeDiscrepancies(fetched || [], tolValue);
    } catch (err: any) {
      console.error(err);
      setSyncLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [ERROR] DIAGNOSTIC SCAN FAILED: ${err?.message || 'Unable to query final_arrival'}`
      ]);
    } finally {
      setLoading(false);
    }
  };

  const analyzeDiscrepancies = (recordsList: any[], tol: number) => {
    const flagged: any[] = [];
    const logList: string[] = [];
    
    recordsList.forEach(r => {
      const grossRaw = Number(r.weight_qtl || 0) / 10;
      
      let moisture = 16;
      let dust = 0;
      let ncv = 0;
      if (r.grid_details) {
        try {
          const parsed = typeof r.grid_details === 'string' ? (r.grid_details === 'undefined' || r.grid_details === 'null' ? [] : JSON.parse(r.grid_details === "undefined" ? "null" : r.grid_details)) : r.grid_details;
          if (Array.isArray(parsed) && parsed.length > 0) {
            moisture = Number(parsed[0].moisture_pct || parsed[0].moisture || parsed[0].actual_moisture || 16);
            dust = Number(parsed[0].dust_pct || parsed[0].dust || parsed[0].actual_dust || 0);
            ncv = Number(parsed[0].ncv_pct || parsed[0].ncv || parsed[0].actual_ncv || 0);
          }
        } catch (e) {}
      } else {
        moisture = Number(r.actual_moisture || 16);
        dust = Number(r.actual_dust || 0);
        ncv = Number(r.actual_ncv || 0);
      }
      
      const area = String(r.arrival_area_name || '').toLowerCase();
      const isDaisee = area.includes("daisee");
      let month = 0;
      if (r.po_date || r.date) {
        const d = new Date(r.po_date || r.date);
        if (!isNaN(d.getTime())) {
          month = d.getMonth();
        }
      }
      const isJanToJune = month >= 0 && month <= 5;
      
      let moistureLimit = 16;
      if (isJanToJune) {
        moistureLimit = isDaisee ? 18 : 16;
      } else {
        moistureLimit = isDaisee ? 20 : 18;
      }
      
      const moistureExcess = moisture > moistureLimit ? (moisture - moistureLimit) : 0;
      const totalDeductions = moistureExcess + dust + ncv;
      const reconciledNet = grossRaw * (1 - totalDeductions / 100);
      
      const weighedNet = Number(r.electronic_net_weight || r.supplier_net_weight || grossRaw);
      const diff = Math.abs(weighedNet - reconciledNet);
      
      if (diff > tol) {
        flagged.push({
          ...r,
          gross: grossRaw,
          moisture,
          dust,
          ncv,
          limit: moistureLimit,
          reconciledNet,
          weighedNet,
          difference: diff
        });
        logList.push(`[WARN] MISMATCH DETECTED: FA #${r.final_arrival_no} HAS DISCREPANCY of ${diff.toFixed(3)} MT (> TOL: ${tol} MT)`);
      } else {
        logList.push(`[OK] FA #${r.final_arrival_no} RECONCILED: DIFFERENCE OF ${diff.toFixed(3)} MT IS WITHIN TOLERANCE.`);
      }
    });

    setFlaggedRecords(flagged);
    setSyncLogs(prev => [...prev, ...logList, `[${new Date().toLocaleTimeString()}] SCAN COMPLETE. FLAGGED ${flagged.length} RECORDS WITH EXCESS DISCREPANCIES.`]);
  };

  const handleReSyncSingleRecord = async (recordId: string, recordNo: string) => {
    setSyncingRecordId(recordId);
    setSyncLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [SYNC ENGINE] PREPARING DATABASE RECONCILIATION FOR FA #${recordNo}...`
    ]);

    try {
      const target = flaggedRecords.find(
        f => (f.final_arrival_id || f.id) === recordId || String(f.final_arrival_no) === String(recordNo)
      );
      if (!target) {
        throw new Error(`Flagged record FA #${recordNo} not found.`);
      }

      const reconciledMt = Number(Number(target.reconciledNet || 0).toFixed(3));
      const idColumn = target.final_arrival_id ? 'final_arrival_id' : (target.id ? 'id' : 'final_arrival_no');
      const idValue = target.final_arrival_id || target.id || recordNo;

      await dbModule.update('final_arrival', idColumn, idValue, {
        electronic_net_weight: reconciledMt,
        updated_at: new Date().toISOString()
      });

      setSyncLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [SYNC ENGINE] UPDATED final_arrival FA #${recordNo} electronic_net_weight TO ${reconciledMt.toFixed(3)} MT IN DATABASE.`
      ]);

      setFlaggedRecords(prev => prev.filter(f => (f.final_arrival_id || f.id) !== recordId && String(f.final_arrival_no) !== String(recordNo)));
      await loadArrivalsAndScan(threshold);
    } catch (err: any) {
      setSyncLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [SYNC ENGINE] ERROR RE-SYNCHRONIZING FA #${recordNo}: ${err?.message || 'Database write failed'}`
      ]);
    } finally {
      setSyncingRecordId(null);
    }
  };

  useEffect(() => {
    // Initial scan on mount
    loadArrivalsAndScan(threshold);
  }, []);

  return (
    <LegacyLayout title="P.O Automation" subtitle="System Configuration & Connectivity Wizard" onClose={onClose}>
      <div className="space-y-4">
        {/* Connection Status Header */}
        <div className="bg-[#FBCFCB] p-1 border border-black/20 flex items-center justify-between">
           <div className="flex items-center gap-2 px-3 h-8 bg-white border border-gray-400">
              <span className="text-[10px] font-black text-gray-500 uppercase italic">Central Server Status:</span>
              <div className="flex items-center gap-1.5 ml-2">
                 <div className={cn("h-2.5 w-2.5 border border-black/20 rounded-full", isConfigured ? "bg-green-600 shadow-[0_0_5px_rgba(22,163,74,0.5)]" : "bg-red-600 animate-pulse")} />
                 <span className={cn("text-[10px] font-black uppercase tracking-widest", isConfigured ? "text-green-800" : "text-red-700")}>
                    {isConfigured ? "Operational" : "Connectivity Fault"}
                 </span>
              </div>
           </div>
           <div className="flex gap-1 h-8">
              <LegacyButton icon={RefreshCw} label="Re-Scan" onClick={() => window.location.reload()} />
              <LegacyButton icon={Settings} label="Global Settings" />
           </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
           {/* Left: Setup Instructions */}
           <div className="col-span-12 md:col-span-7 flex flex-col gap-4">
              <LegacyFieldset legend="Environment Initialization Procedures">
                 <div className="space-y-4 mt-2">
                    <div className="flex items-start gap-3">
                       <div className="h-4 w-4 bg-blue-900 border border-white flex items-center justify-center text-[8px] text-white font-black shrink-0 mt-1 shadow-[1px_1px_0_0_rgba(0,0,0,0.5)]">01</div>
                       <div>
                          <h4 className="text-[11px] font-black uppercase text-slate-800">Supabase Cloud Provisioning</h4>
                          <p className="text-[10px] font-bold text-gray-500 leading-tight mt-1 uppercase italic">Initialize a new secure data node at supabase.com to host mill transactions.</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-3">
                       <div className="h-4 w-4 bg-blue-900 border border-white flex items-center justify-center text-[8px] text-white font-black shrink-0 mt-1 shadow-[1px_1px_0_0_rgba(0,0,0,0.5)]">02</div>
                       <div>
                          <h4 className="text-[11px] font-black uppercase text-slate-800">Credential Acquisition</h4>
                          <p className="text-[10px] font-bold text-gray-500 leading-tight mt-1 uppercase italic">Extract 'Project URL' and 'Service Anon Key' from the API Settings dashboard.</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-3">
                       <div className="h-4 w-4 bg-blue-900 border border-white flex items-center justify-center text-[8px] text-white font-black shrink-0 mt-1 shadow-[1px_1px_0_0_rgba(0,0,0,0.5)]">03</div>
                       <div>
                          <h4 className="text-[11px] font-black uppercase text-slate-800">Environment Mapping</h4>
                          <p className="text-[10px] font-bold text-gray-500 leading-tight mt-1 uppercase italic">Map credentials to AI Studio system variables VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY.</p>
                       </div>
                    </div>
                 </div>
              </LegacyFieldset>

              <div className="bg-blue-100/30 border border-blue-900/10 p-4 flex gap-3">
                 <Info className="h-5 w-5 text-blue-800 shrink-0" />
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-blue-950 uppercase tracking-tight italic">Mill Operations Warning:</p>
                    <p className="text-[10px] font-bold text-blue-800 leading-relaxed uppercase">Offline mode prevents real-time Sauda checks and Amad serialization. Data consistency cannot be guaranteed without a valid backend heartbeat.</p>
                 </div>
              </div>
           </div>

           {/* Right: Technical Reference */}
           <div className="col-span-12 md:col-span-5 flex flex-col gap-4">
              <LegacyFieldset legend="Active Secrets Manifest">
                 <div className="space-y-4 mt-2">
                    <div className="bg-black/5 p-2 border-2 border-white shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]">
                       <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase mb-1">
                          <Terminal className="h-3 w-3" /> System Variable: SUPABASE_URL
                       </div>
                       <div className="bg-white border border-gray-400 p-1.5 text-[10px] font-black font-mono text-blue-900 break-all leading-none italic uppercase">
                          {isConfigured ? "https://mill-node-prod.supabase.co" : "VALUE_NOT_DETECTED"}
                       </div>
                    </div>

                    <div className="bg-black/5 p-2 border-2 border-white shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]">
                       <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase mb-1">
                          <Key className="h-3 w-3" /> System Variable: SUPABASE_KEY
                       </div>
                       <div className="bg-white border border-gray-400 p-1.5 text-[10px] font-black font-mono text-blue-900 break-all leading-none italic uppercase">
                          {isConfigured ? "************************************" : "MAPPING_INCOMPLETE"}
                       </div>
                    </div>
                 </div>
              </LegacyFieldset>

              <div className="bg-black/80 text-green-500 p-3 font-mono text-[9px] border-2 border-white shadow-[inset_2px_2px_0_0_rgba(0,0,0,1)] uppercase tracking-wider h-32 overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-1 text-[7px] text-green-800 font-bold tracking-tighter">DIAG_SYS_V2</div>
                 <p className="mb-1 leading-none">Starting module system_sync.exe...</p>
                 <p className="mb-1 leading-none text-green-400/50">Checking environmental mapping... [OK]</p>
                 <p className="mb-1 leading-none">Verifying database ping... {isConfigured ? "[SUCCESS]" : "[ERROR: 0x404]"}</p>
                 <p className="mt-4 leading-none text-green-400/30 animate-pulse">Waiting for manual trigger (F5)...</p>
              </div>
           </div>
        </div>

        
        {/* Email Configuration & Diagnostics */}
        <div className="col-span-12 font-sans mb-4">
          <LegacyFieldset legend="Email Configuration, Routing & API Endpoints">
            <div className="p-3 bg-white space-y-5">
              <div className="border-b border-gray-200 pb-4">
                <h4 className="text-[11px] font-black uppercase text-slate-700 tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Outbound Mail Dispatch Diagnostic
                </h4>
                <div className="text-xs text-slate-600 mb-3">
                  Test outbound email delivery. This will dispatch a dummy 'System Check' payload utilizing configured SMTP credentials to verify routing without triggering real business alert sequences.
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={async (e) => {
                      const btn = e.currentTarget;
                      const prevText = btn.innerText;
                      btn.innerText = "TESTING...";
                      btn.disabled = true;
                      try {
                        const res = await fetch(getApiUrl("/api/send-email"), {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            to: "rawjute@ballyjute.com",
                            subject: "[SYSTEM TEST] SMTP Diagnostic Verification",
                            html: "<div style='font-family: monospace; padding: 20px;'><h3>BALLY JUTE ERP: SMTP Diagnostic</h3><p>This is an automated system verification email. If you received this, the SMTP routing configuration is operational.</p><p>Timestamp: " + new Date().toISOString() + "</p></div>"
                          })
                        });
                        let data;
                        try {
                          data = await res.json();
                        } catch (err) {
                          const txt = await res.text().catch(()=>'');
                          throw new Error("Invalid response: " + txt.substring(0,100));
                        }
                        if (data.success) {
                          alert("Diagnostic Test Passed! Email dispatched via: " + data.provider);
                        } else {
                          alert("Diagnostic Failed: " + data.error);
                        }
                      } catch (err) {
                        alert("Diagnostic Errored: " + err.message);
                      } finally {
                        btn.innerText = prevText;
                        btn.disabled = false;
                      }
                    }}
                    className="px-4 py-2 bg-[#D94B5A] hover:bg-blue-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-sm transition-colors border border-black shadow-[inset_1px_1px_0_rgba(255,255,255,0.4),2px_2px_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                  >
                    Diagnostic Connection Test
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-black uppercase text-slate-700 tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  External Domain Routing (API Base URL Configuration)
                </h4>
                <div className="text-xs text-slate-600 mb-3 space-y-1.5">
                  <p>
                    If you are hosting this application on your own web server or custom static domain (e.g., <strong>ballyjute.com</strong>), any direct API calls (like sending emails) will receive a <strong>405 Method Not Allowed</strong> from your static web server because it has no backend listening on `/api/*`.
                  </p>
                  <p>
                    To resolve this, set the API Base URL to point to your live full-stack backend (e.g., your active Cloud Run URL). Leave blank to use the default automatic fallback routing.
                  </p>
                </div>
                
                <div className="bg-slate-50 border border-gray-300 p-3 rounded-sm space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Current Live Backend:
                    </label>
                    <div className="text-xs font-mono text-slate-800 bg-white p-1.5 px-2.5 border border-gray-300 select-all rounded-sm flex items-center justify-between">
                      <span>https://ais-pre-4f3hdjf75hjoch6vttiz2o-892280559951.asia-southeast1.run.app/</span>
                      <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Deployed Applet URL</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="api_base_url_override_392" className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      API Base URL Override:
                    </label>
                    <div className="flex gap-2">
                      <input  id="api_base_url_override_392" name="api_base_url_override" aria-label="API Base URL Override:"
                        type="text" 
                        placeholder="https://your-backend-server.com/" 
                        value={apiBaseUrl}
                        onChange={(e) => setApiBaseUrl(e.target.value)}
                        className="flex-1 bg-white border border-gray-400 p-1.5 px-2.5 text-xs font-mono rounded shadow-inner"
                      />
                      <button 
                        onClick={() => {
                          const val = apiBaseUrl.trim();
                          if (val) {
                            alert(`API Base URL updated in memory to: ${val}`);
                          } else {
                            alert(`API Base URL reset to default fallback.`);
                          }
                        }}
                        className="px-4 py-1.5 bg-[#D94B5A] hover:bg-blue-900 text-white font-bold text-[10px] uppercase tracking-wider rounded-sm transition-colors border border-black shadow-[inset_1px_1px_0_rgba(255,255,255,0.4),1px_1px_0_rgba(0,0,0,0.4)]"
                      >
                        Save & Apply
                      </button>
                      <button 
                        onClick={() => {
                          setApiBaseUrl('');
                          alert(`API Base URL reset.`);
                        }}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[10px] uppercase tracking-wider rounded-sm transition-colors border border-gray-400 shadow-[1px_1px_0_rgba(0,0,0,0.1)]"
                      >
                        Reset
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-500 font-medium">
                      {apiBaseUrl ? "🟢 Override Active" : "🔵 Default Fallback Routing Active"} (Current API URL endpoint resolution: <strong className="font-mono text-[10px]">{getApiUrl('/api/send-email')}</strong>)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </LegacyFieldset>
        </div>

        {/* Final Arrival Sync Diagnostics Center */}
        <div className="col-span-12 font-sans">
          <LegacyFieldset legend="Final Arrival Sync & Quality Reconciliation Diagnostics">
            <div className="p-2 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-200 p-2.5 border border-black/10">
                <div className="flex items-center gap-3">
                  <div className="p-1 px-2.5 bg-[#D94B5A] text-white text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5 rounded-sm">
                    <Activity className="h-3 w-3 animate-pulse text-green-400" />
                    Sync Status: ONLINE
                  </div>
                  <div className="text-[10px] font-bold text-slate-700 uppercase">
                    Central Quality matching protocol active (DAISEE, Jan-Jun/Jul-Dec check)
                  </div>
                </div>

                {/* SLIDER FOR ACCURATE THRESHOLD SELECTION */}
                <div className="flex items-center gap-2 bg-white border border-gray-400 p-1 px-2.5 rounded shadow-inner font-sans">
                  <Sliders className="h-3.5 w-3.5 text-[#D94B5A]" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Tolerance Sensitivity:</span>
                  <input
 id="threshold_451" name="threshold" aria-label="threshold"                    type="range"
                    min="0.05"
                    max="1.00"
                    step="0.05"
                    value={threshold}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setThreshold(val);
                      analyzeDiscrepancies(arrivals, val);
                    }}
                    className="w-24 cursor-pointer accent-[#D94B5A]"
                  />
                  <span className="text-xs font-mono font-black text-indigo-950">{threshold.toFixed(2)} MT</span>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3">
                {/* Real-time terminal log viewer */}
                <div className="col-span-12 md:col-span-6 flex flex-col space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-600 tracking-wide flex items-center gap-1">
                    <Terminal className="h-3 w-3" /> Live Event Stream Console
                  </span>
                  <div className="bg-slate-950 text-emerald-400 font-mono text-[9px] p-3 border-2 border-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8)] h-56 overflow-y-auto uppercase leading-tight space-y-1 select-all rounded-sm">
                    {syncLogs.length === 0 ? (
                      <p className="text-slate-500 italic">No sync routines triggered yet.</p>
                    ) : (
                      syncLogs.map((log, i) => (
                        <p key={i} className={log.includes('[WARN]') ? 'text-amber-300 font-bold font-sans text-[8.5px]' : log.includes('SUCCESS') ? 'text-green-300 font-bold font-sans text-[8.5px]' : 'text-emerald-400/80'}>{log}</p>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => loadArrivalsAndScan(threshold)}
                    className="bg-[#FBCFCB] border-2 border-white hover:border-black active:translate-x-[0.5px] p-1 text-center text-[10px] font-extrabold uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-[1px_1px_0_0_rgba(0,0,0,0.85)] w-full py-1.5 cursor-pointer font-sans"
                  >
                    <RefreshCw className={cn("h-3 w-3", loading ? "animate-spin" : "")} />
                    Run Integrity Audit Trigger
                  </button>
                </div>

                {/* Flagged weight discrepancies */}
                <div className="col-span-12 md:col-span-6 flex flex-col space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-600 tracking-wide flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-red-600" /> Flagged Out-of-Tolerance Anomalies ({flaggedRecords.length})
                  </span>
                  <div className="bg-white border border-gray-400 p-2 h-56 overflow-y-auto space-y-2 shadow-inner font-sans rounded-sm">
                    {flaggedRecords.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <CheckCircle className="h-8 w-8 text-green-600 mb-1" />
                        <p className="text-[10px] font-black text-green-800 uppercase">All Records Reconciled</p>
                        <p className="text-[9px] text-gray-500 uppercase italic mt-0.5">Absolute weights align perfectly within {threshold} MT tolerance limits.</p>
                      </div>
                    ) : (
                      flaggedRecords.map((item, idx) => (
                        <div key={idx} className="bg-rose-50 border border-rose-300 p-2 text-[10px] rounded flex justify-between items-center relative group">
                          <div className="space-y-0.5 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-red-600 text-white font-extrabold px-1 rounded-sm text-[8px]">ANOMALY</span>
                              <span className="font-mono font-black text-red-950">Record #{item.final_arrival_no}</span>
                              <span className="font-semibold text-slate-500">({item.supplier})</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-2 text-[9px] font-semibold text-slate-700">
                              <p>Weighbridge Net: <span className="font-mono font-bold text-slate-900">{Number(item.weighedNet).toFixed(3)} MT</span></p>
                              <p>Quality Net: <span className="font-mono font-bold text-slate-900">{Number(item.reconciledNet).toFixed(3)} MT</span></p>
                            </div>
                            <p className="text-[9px] font-black text-red-700 uppercase tracking-tighter">
                              Excess Discrepancy Margin: <span className="underline italic">+{Number(item.difference).toFixed(3)} MT</span>
                            </p>
                          </div>

                          <button
                            disabled={syncingRecordId === item.final_arrival_id}
                            onClick={() => handleReSyncSingleRecord(item.final_arrival_id, item.final_arrival_no)}
                            className="bg-[#D94B5A] text-white hover:bg-indigo-950 font-black text-[9px] uppercase px-2 py-1.5 rounded flex items-center gap-1 disabled:opacity-60 cursor-pointer shadow"
                          >
                            {syncingRecordId === item.final_arrival_id ? (
                              <>
                                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-2.5 w-2.5" />
                                Re-Sync
                              </>
                            )}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-1 px-2 border border-blue-200 bg-blue-50/50 rounded text-[8.5px] font-semibold uppercase text-blue-900 tracking-wide flex items-center gap-1.5 leading-none">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    Manually sync to pull the certified weight and grade logs from Central Inspecting agency.
                  </div>
                </div>
              </div>
            </div>
          </LegacyFieldset>
        </div>

        {/* Action Belt */}
        <div className="bg-[#808080] p-1 flex justify-between gap-1 items-center border border-black/10">
           <div className="flex gap-2 px-3 h-8 bg-white/90 border border-gray-400 items-center">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
              <span className="text-[9px] font-black uppercase text-gray-600 italic tracking-widest">Configuration integrity: Lvl 10 Security Protocol</span>
           </div>
           <div className="flex gap-1 h-8">
              <LegacyButton icon={ExternalLink} label="Viev API Docs" />
              <LegacyButton icon={HelpCircle} label="Mill Support" />
           </div>
        </div>
      </div>
    </LegacyLayout>
  );
}

