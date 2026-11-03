import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveAutoRefresh } from '../hooks/useLiveAutoRefresh';
import { 
  MessageSquare, 
  RefreshCw, 
  AlertCircle, 
  Search, 
  Check, 
  Clock, 
  RotateCcw, 
  Calendar, 
  X,
  FileSpreadsheet,
  Mail,
  Loader2,
  Send,
  Inbox,
  Star,
  ArrowLeft,
  CheckCircle2,
  Tag,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Link as LinkIcon,
  Unlink,
  Layers,
  ArrowRight,
  Eye
} from 'lucide-react';
import { cn, getApiUrl } from '../lib/utils';
import { getCurrentUserContext } from '../lib/permissions';
import LegacyLayout from '../components/LegacyLayout';
import { supabase } from '../lib/supabase';
import { dbModule } from '../services/dbModule';
import { PaginationControls } from '../components/PaginationControls';
import { Sauda } from '../types';
import { 
  ExtractedSmsDeal, 
  extractSmsEntities, 
  findTopSaudaMatches, 
  calculateSaudaMatch, 
  SaudaMatchResult 
} from '../lib/smsSaudaMatcher';
import SmsSaudaMatchModal from '../components/SmsSaudaMatchModal';

interface IncomingSmsItem {
  id: string;
  date: string;
  body: string;
  service_center: string;
  contact_name: string;
}

export default function SmsSaudaDesk({ onClose, onNavigate }: { onClose?: () => void; onNavigate?: (page: string) => void }) {
  // Navigation: "sms_matching" (primary) or "gmail_feed"
  const [activeView, setActiveView] = useState<'sms_matching' | 'gmail_feed'>('sms_matching');

  // Master Sauda Records loaded from Sauda Desk (The Single Source of Truth)
  const [saudaMasterList, setSaudaMasterList] = useState<Sauda[]>([]);
  const [isSaudaMasterLoading, setIsSaudaMasterLoading] = useState(false);

  // Incoming Google Sheet Raw SMS Feed
  const [googleSheetSmsData, setGoogleSheetSmsData] = useState<IncomingSmsItem[]>([]);
  const [isGoogleSheetLoading, setIsGoogleSheetLoading] = useState(false);
  const [googleSheetError, setGoogleSheetError] = useState<string | null>(null);

  // Marked SMS tracker (persisted in Supabase `sms_sauda` and localStorage)
  const [markedSmsMap, setMarkedSmsMap] = useState<Record<string, { 
    sauda_no: string; 
    sauda_id?: string;
    match_percent?: number;
    marked_by: string; 
    marked_at?: string; 
    db_id?: string;
  }>>({});

  // Active modal state for reviewing an SMS
  const [activeReviewSms, setActiveReviewSms] = useState<IncomingSmsItem | null>(null);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'MATCHED' | 'DONE' | 'NO_MATCH'>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Gmail Feed States
  const [gmailList, setGmailList] = useState<any[]>([]);
  const [isFetchingGmail, setIsFetchingGmail] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [gmailSearchTerm, setGmailSearchTerm] = useState('');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Check authorization for linking/marking SMS
  const isAuthorizedForMarkSms = () => {
    const ctx = getCurrentUserContext();
    const role = (ctx?.userRole || '').toUpperCase();
    const level = (ctx?.userLevel || '').toUpperCase();
    
    const storedUserStr = localStorage.getItem('logged_in_user') || sessionStorage.getItem('logged_in_user') || localStorage.getItem('user_master');
    let storedLevel = '';
    let storedRole = '';
    if (storedUserStr) {
      try {
        const u = JSON.parse(storedUserStr);
        storedLevel = (u.level || u.userLevel || u.user_level || '').toUpperCase();
        storedRole = (u.role || u.userRole || u.user_role || '').toUpperCase();
      } catch(e) {}
    }

    const userRole = role || storedRole;
    const userLevel = level || storedLevel;

    return (
      userRole === 'ADMIN' || userRole === 'ADMINISTRATOR' ||
      userLevel === 'ADMIN' || userLevel === 'ADMINISTRATOR' ||
      userLevel === 'L4' || userLevel === 'L5' || userLevel === 'MAX'
    );
  };

  // 1. Fetch real Sauda Desk master records
  const loadSaudaMasterRecords = async () => {
    setIsSaudaMasterLoading(true);
    try {
      let saudas: any[] = [];
      let qualities: any[] = [];

      if (supabase) {
        const [saudaRes, qualRes] = await Promise.all([
          supabase.from('sauda_master').select('*').order('date', { ascending: false }),
          supabase.from('sauda_quality_details').select('*')
        ]);
        if (saudaRes.data) saudas = saudaRes.data;
        if (qualRes.data) qualities = qualRes.data;
      }

      if (saudas.length === 0) {
        saudas = await dbModule.fetchAll('sauda_master', 'created_at', false).catch(() => []);
      }

      // Group qualities by sauda_id
      const qualMap: Record<string, any[]> = {};
      qualities.forEach(q => {
        const sId = q.sauda_id;
        if (sId) {
          if (!qualMap[sId]) qualMap[sId] = [];
          qualMap[sId].push(q);
        }
      });

      const fullSaudas: Sauda[] = saudas.map(s => ({
        ...s,
        quality_details: qualMap[s.sauda_id] || s.quality_details || []
      }));

      setSaudaMasterList(fullSaudas);
    } catch (err) {
      console.warn("Failed to load sauda master records in SmsSaudaDesk:", err);
    } finally {
      setIsSaudaMasterLoading(false);
    }
  };

  // 2. Load marked / completed SMS map keyed strictly by unique sms_id
  const loadMarkedSmsRecords = async () => {
    let loadedMap: Record<string, { 
      sauda_no: string; 
      sauda_id?: string;
      match_percent?: number;
      marked_by: string; 
      marked_at?: string; 
      db_id?: string;
    }> = {};

    const cachedMap = localStorage.getItem('sms_sauda_marked_map');
    if (cachedMap) {
      try {
        loadedMap = JSON.parse(cachedMap);
      } catch(e) {}
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('sms_sauda')
          .select('*');

        if (!error && data) {
          const freshDbMap: typeof loadedMap = {};
          data.forEach((rec: any) => {
            if ((rec.sauda_no || rec.sauda_created) && rec.sms_id) {
              freshDbMap[String(rec.sms_id)] = {
                sauda_no: rec.sauda_no,
                sauda_id: rec.sauda_id,
                match_percent: rec.match_percent || rec.match_score || 100,
                marked_by: rec.marked_by || rec.approved_by || 'Admin',
                marked_at: rec.marked_at || rec.created_at,
                db_id: rec.id
              };
            }
          });
          loadedMap = { ...loadedMap, ...freshDbMap };
        }
      } catch (err) {
        console.warn("Error loading marked SMS records from Supabase:", err);
      }
    }

    setMarkedSmsMap(loadedMap);
    localStorage.setItem('sms_sauda_marked_map', JSON.stringify(loadedMap));
  };

  // 3. Fetch Google Sheet Raw SMS Feed
  const fetchGoogleSheetSms = async () => {
    setIsGoogleSheetLoading(true);
    setGoogleSheetError(null);
    try {
      const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets/1WignMNJ2p2Qu5V34nuuthPItahIlNnQtBiJJ8KYgG9k/values/sauda!A:E?key=AIzaSyBLQaMfurS0w11dgPRPLIpUfAs6lOHRMgA");
      if (!res.ok) {
        throw new Error(`Google Sheets API responded with status ${res.status}`);
      }
      const resText = await res.text();
      let data;
      try {
        data = JSON.parse(resText);
      } catch (e) {
        throw new Error("Failed to parse Google Sheets response: " + resText.substring(0, 100));
      }
      if (data.values && data.values.length > 0) {
        let rows = data.values;
        // Skip header if present
        const firstRowHeader = (rows[0] || []).map((c: any) => String(c || '').toLowerCase()).join(' ');
        if (firstRowHeader.includes('readable_date') || firstRowHeader.includes('body') || firstRowHeader.includes('service_center')) {
          rows = rows.slice(1);
        }
        
        const parsed: IncomingSmsItem[] = rows.map((row: any, index: number) => {
          let dateVal = row[0] || '2026-07-07';
          let bodyVal = row[1] || '';
          let phoneVal = row[2] || '';
          let nameVal = row[3] || row[2] || 'Unknown Sender';

          // Handle single-line body or 3-column variations
          if (typeof row[0] === 'string' && (row[0].includes(' ') || row[0].includes('\n')) && !row[0].match(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/)) {
            bodyVal = row[0];
            phoneVal = row[1] || '';
            nameVal = row[2] || row[1] || 'Unknown Sender';
            dateVal = '2026-07-07';
          }

          return {
            id: `SHEET-SMS-${index + 1}`,
            date: dateVal,
            body: bodyVal,
            service_center: phoneVal,
            contact_name: nameVal
          };
        });
        setGoogleSheetSmsData(parsed);
      } else {
        setGoogleSheetError("No raw values found in the Google Sheet feed.");
      }
    } catch (err: any) {
      setGoogleSheetError(err.message || "Failed to query Google Sheet sensor endpoint.");
    } finally {
      setIsGoogleSheetLoading(false);
    }
  };

  // 4. Fetch Gmail emails
  const fetchEmails = async () => {
    setIsFetchingGmail(true);
    try {
      const res = await fetch(getApiUrl(`/api/emails?t=${Date.now()}`));
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.emails)) {
          setGmailList(data.emails);
        }
      }
    } catch (err) {
      console.warn("Gmail load failed:", err);
    } finally {
      setIsFetchingGmail(false);
    }
  };

  const syncGmailNow = async () => {
    setIsSyncing(true);
    try {
      await fetch(getApiUrl(`/api/sync-emails?t=${Date.now()}`), { method: 'POST' }).catch(() => {});
    } finally {
      await fetchEmails();
      setIsSyncing(false);
    }
  };

  useLiveAutoRefresh(loadSaudaMasterRecords, [], { tables: ['sauda_master', 'sauda_quality_details', 'sms_sauda'] });

  useEffect(() => {
    loadMarkedSmsRecords();
    fetchGoogleSheetSms();
    fetchEmails();
  }, []);

  // Handle Mark Done (Link SMS ↔ Sauda Master)
  const handleMarkDone = async (sms: IncomingSmsItem, selectedSauda: Sauda, matchScore: number) => {
    if (!isAuthorizedForMarkSms()) {
      alert("Access Denied: Only Admin and Level 4 users are authorized to link SMS to Sauda contracts.");
      return;
    }

    const saudaNo = selectedSauda.sauda_no || `BJCL/${selectedSauda.session || ''}`;
    const userCtx = getCurrentUserContext();
    const currentUserName = userCtx.userName || 'Admin';
    const nowIso = new Date().toISOString();

    if (!sms.id) {
      alert('Cannot link SMS: missing unique sms_id.');
      return;
    }

    try {
      let savedDbRecord: any = null;
      if (supabase) {
        // Strict SMS ID isolation: match ONLY by sms_id, never overwrite another SMS row sharing the same sauda_no
        const { data: existingById, error: lookupErr } = await supabase
          .from('sms_sauda')
          .select('id')
          .eq('sms_id', sms.id)
          .limit(1);

        if (lookupErr) {
          throw new Error(`Failed to verify existing SMS link: ${lookupErr.message}`);
        }

        const existingId = existingById && existingById.length > 0 ? existingById[0].id : null;

        const payload = {
          sms_id: sms.id,
          sauda_no: saudaNo,
          sauda_id: selectedSauda.sauda_id,
          match_percent: matchScore,
          raw_sms_body: sms.body,
          broker: selectedSauda.broker || sms.contact_name,
          supplier: selectedSauda.supplier || sms.contact_name,
          challan_supplier: selectedSauda.challan_supplier || selectedSauda.supplier || '',
          area: selectedSauda.area || 'SEMI NORTHERN',
          date: sms.date && sms.date.match(/^\d{4}-\d{2}-\d{2}$/) ? sms.date : (selectedSauda.date || '2026-07-07'),
          status: 'Active',
          sauda_created: true,
          marked_by: currentUserName,
          marked_at: nowIso,
          remarks: `[Verified Match: ${matchScore}%] ${sms.body}`
        };

        if (existingId) {
          savedDbRecord = await dbModule.update('sms_sauda', 'id', existingId, payload);
        } else {
          savedDbRecord = await dbModule.insert('sms_sauda', payload);
        }
      }

      const markInfo = {
        sauda_no: saudaNo,
        sauda_id: selectedSauda.sauda_id,
        match_percent: matchScore,
        marked_by: currentUserName,
        marked_at: nowIso,
        db_id: savedDbRecord?.id
      };

      const updatedMap = {
        ...markedSmsMap,
        [sms.id]: markInfo
      };

      setMarkedSmsMap(updatedMap);
      localStorage.setItem('sms_sauda_marked_map', JSON.stringify(updatedMap));

      window.dispatchEvent(new CustomEvent('app-data-updated', { detail: { table: 'sms_sauda' } }));
      alert(`✓ SMS #${sms.id} successfully linked to Sauda Contract #${saudaNo} (Score: ${matchScore}%)`);
    } catch (dbErr: any) {
      console.error("Failed to persist marked SMS link in Supabase:", dbErr);
      alert(`Failed to link SMS #${sms.id}: ${dbErr?.message || 'Database write failed'}`);
    }
  };

  // Handle Unmark / Reset Link (strictly isolated by sms.id)
  const handleUnmark = async (sms: IncomingSmsItem) => {
    if (!isAuthorizedForMarkSms()) {
      alert("Access Denied: Only Admin and Level 4 users are authorized to unmark this SMS.");
      return;
    }

    if (!sms.id) return;

    try {
      if (supabase) {
        await dbModule.update('sms_sauda', 'sms_id', sms.id, {
          sauda_created: false,
          sauda_no: '',
          sauda_id: null
        });
      }

      const updatedMap = { ...markedSmsMap };
      delete updatedMap[sms.id];

      setMarkedSmsMap(updatedMap);
      localStorage.setItem('sms_sauda_marked_map', JSON.stringify(updatedMap));

      window.dispatchEvent(new CustomEvent('app-data-updated', { detail: { table: 'sms_sauda' } }));
    } catch (err: any) {
      console.error("Failed to unmark SMS in Supabase:", err);
      alert(`Failed to unmark SMS #${sms.id}: ${err?.message || 'Database error'}`);
    }
  };

  // Open the Review & Match modal for an SMS
  const handleOpenReviewModal = (sms: IncomingSmsItem) => {
    setActiveReviewSms(sms);
    setIsMatchModalOpen(true);
  };

  // Compute live match statistics and annotated rows for the SMS feed
  const processedSmsList = useMemo(() => {
    return googleSheetSmsData.map(sms => {
      const markedInfo = markedSmsMap[sms.id];
      const isMarked = Boolean(markedInfo && markedInfo.sauda_no);
      
      const extracted = extractSmsEntities(
        sms.body || '',
        sms.contact_name || '',
        sms.service_center || '',
        sms.date || ''
      );

      const topMatches = findTopSaudaMatches(extracted, saudaMasterList, 1);
      const topMatch = topMatches.length > 0 ? topMatches[0] : null;

      return {
        sms,
        isMarked,
        markedInfo,
        extracted,
        topMatch
      };
    });
  }, [googleSheetSmsData, markedSmsMap, saudaMasterList]);

  // Filter and sort the processed SMS list
  const filteredProcessedList = useMemo(() => {
    return processedSmsList.filter(item => {
      const { sms, isMarked, extracted, topMatch } = item;
      const q = searchTerm.toLowerCase().trim();

      // Search matching
      if (q) {
        const matchesSearch = 
          (sms.contact_name && sms.contact_name.toLowerCase().includes(q)) ||
          (sms.service_center && sms.service_center.toLowerCase().includes(q)) ||
          (sms.body && sms.body.toLowerCase().includes(q)) ||
          (item.markedInfo?.sauda_no && item.markedInfo.sauda_no.toLowerCase().includes(q)) ||
          (topMatch?.sauda.sauda_no && topMatch.sauda.sauda_no.toLowerCase().includes(q)) ||
          (topMatch?.sauda.broker && topMatch.sauda.broker.toLowerCase().includes(q));

        if (!matchesSearch) return false;
      }

      // Status Tab filter
      if (statusFilter === 'DONE') {
        return isMarked;
      }
      if (statusFilter === 'PENDING') {
        return !isMarked;
      }
      if (statusFilter === 'MATCHED') {
        return !isMarked && topMatch && topMatch.score >= 50;
      }
      if (statusFilter === 'NO_MATCH') {
        return !isMarked && (!topMatch || topMatch.score < 50 || !extracted.isDealMessage);
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.sms.date || 0).getTime();
      const timeB = new Date(b.sms.date || 0).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [processedSmsList, searchTerm, statusFilter, sortOrder]);

  // High-level KPI Counts
  const kpiStats = useMemo(() => {
    const total = processedSmsList.length;
    const done = processedSmsList.filter(i => i.isMarked).length;
    const pending = total - done;
    const suggestedMatches = processedSmsList.filter(i => !i.isMarked && i.topMatch && i.topMatch.score >= 50).length;
    return { total, done, pending, suggestedMatches };
  }, [processedSmsList]);

  return (
    <LegacyLayout title="SMS SAUDA DESK ↔ SAUDA DESK MATCHING SYSTEM" onClose={onClose}>
      <div className="flex-1 flex flex-col min-h-0 bg-slate-100 p-3 sm:p-4 font-sans ">
        
        {/* TOP KPI STATS SUMMARY (Light & Colorful) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          
          {/* Card 1: Total Inbound SMS (Light Indigo/Blue) */}
          <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50/60 border border-blue-200 rounded-xl p-3 flex items-center justify-between shadow-xs hover:shadow-md transition-all">
            <div className="flex flex-col">
              <span className="text-blue-950 font-black text-2xl sm:text-3xl font-mono leading-none tracking-tight">
                {kpiStats.total}
              </span>
              <span className="text-blue-700 font-extrabold text-[10px] uppercase tracking-wider mt-1">
                Total Inbound SMS
              </span>
            </div>
            <div className="p-2.5 bg-blue-100/80 border border-blue-200 rounded-xl text-blue-600 shadow-xs">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>

          {/* Card 2: Pending Matching (Light Amber/Orange) */}
          <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50/60 border border-amber-200 rounded-xl p-3 flex items-center justify-between shadow-xs hover:shadow-md transition-all">
            <div className="flex flex-col">
              <span className="text-amber-950 font-black text-2xl sm:text-3xl font-mono leading-none tracking-tight">
                {kpiStats.pending}
              </span>
              <span className="text-amber-700 font-extrabold text-[10px] uppercase tracking-wider mt-1">
                Pending Verification
              </span>
            </div>
            <div className="p-2.5 bg-amber-100/80 border border-amber-200 rounded-xl text-amber-600 shadow-xs">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          {/* Card 3: Suggested Matches Found (Light Purple/Violet) */}
          <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50/60 border border-purple-200 rounded-xl p-3 flex items-center justify-between shadow-xs hover:shadow-md transition-all">
            <div className="flex flex-col">
              <span className="text-purple-950 font-black text-2xl sm:text-3xl font-mono leading-none tracking-tight">
                {kpiStats.suggestedMatches}
              </span>
              <span className="text-purple-700 font-extrabold text-[10px] uppercase tracking-wider mt-1">
                Suggested Matches (≥50%)
              </span>
            </div>
            <div className="p-2.5 bg-purple-100/80 border border-purple-200 rounded-xl text-purple-600 shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          {/* Card 4: Sauda Done & Linked (Light Emerald/Teal) */}
          <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 border border-emerald-200 rounded-xl p-3 flex items-center justify-between shadow-xs hover:shadow-md transition-all">
            <div className="flex flex-col">
              <span className="text-emerald-950 font-black text-2xl sm:text-3xl font-mono leading-none tracking-tight">
                {kpiStats.done}
              </span>
              <span className="text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider mt-1">
                Sauda Done (Linked)
              </span>
            </div>
            <div className="p-2.5 bg-emerald-100/80 border border-emerald-200 rounded-xl text-emerald-600 shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

        </div>

        {/* PRIMARY VIEW CONTENT */}
        {activeView === 'sms_matching' ? (
          <div className="flex-1 flex flex-col min-h-0 mt-3 bg-white border border-slate-350 rounded-lg p-3 shadow-xs animate-fade-in overflow-hidden">
            
            {/* TOOLBAR & SYNC CONTROLS */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#024a68] text-white rounded">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wide">
                    INCOMING SMS ↔ SAUDA DESK COMPARISON LEDGER
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Comparing against <span className="font-bold text-slate-700">{saudaMasterList.length}</span> active contracts from Sauda Desk.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Sync Google Sheets */}
                <button
                  onClick={fetchGoogleSheetSms}
                  disabled={isGoogleSheetLoading}
                  className="bg-[#024a68] hover:bg-[#035b80] disabled:opacity-50 text-white font-mono font-black text-[10px] uppercase h-8 px-3.5 rounded shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
                  title="Pull fresh SMS data from Google Sheet endpoint"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isGoogleSheetLoading && "animate-spin")} />
                  <span>{isGoogleSheetLoading ? "Syncing Feed..." : "Sync Sheet SMS"}</span>
                </button>

                {/* View Gmail Feed */}
                <button
                  onClick={() => setActiveView('gmail_feed')}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-mono font-bold text-[10px] uppercase h-8 px-3 rounded shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                  title="Switch to Gmail Inbox Feed"
                >
                  <Mail className="h-3.5 w-3.5 text-rose-600" />
                  <span>Gmail Inbox ({gmailList.filter(m => m.unread).length})</span>
                </button>
              </div>
            </div>

            {/* ERROR ALERT IF ANY */}
            {googleSheetError && (
              <div className="mt-2.5 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-800 font-mono text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span className="text-[11px] font-semibold">{googleSheetError}</span>
              </div>
            )}

            {/* FILTER TABS & SEARCH BAR */}
            <div className="bg-slate-100 border border-slate-300 p-2 mt-2.5 rounded-lg flex flex-wrap items-center justify-between gap-2.5">
              
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Quick search by Broker, Mobile, SMS text, or Sauda #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#024a68]"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'ALL SMS' },
                  { id: 'PENDING', label: 'PENDING' },
                  { id: 'MATCHED', label: 'MATCHED (≥50%)' },
                  { id: 'DONE', label: 'SAUDA DONE' },
                  { id: 'NO_MATCH', label: 'NO RELIABLE MATCH' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider rounded border cursor-pointer transition-all",
                      statusFilter === tab.id
                        ? "bg-[#024a68] border-[#024a68] text-white shadow-xs"
                        : "bg-white hover:bg-slate-50 border-slate-300 text-slate-700"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}

                <span className="text-slate-300 mx-0.5 font-mono">|</span>

                {/* Sort Order */}
                <button
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 px-2 py-1 rounded text-[9.5px] font-mono font-black uppercase cursor-pointer"
                  title="Toggle Ascending / Descending"
                >
                  {sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
                </button>

                {/* Reset Filters */}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('ALL');
                  }}
                  className="p-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 rounded cursor-pointer"
                  title="Reset Search & Filters"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

            </div>

            {/* INCOMING SMS MATCHING DATA TABLE */}
            <div className="flex-1 overflow-auto bg-white border border-slate-300 rounded-lg mt-2.5 shadow-inner">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#c2cfd6]/70 border-b-2 border-slate-400 text-slate-800 font-mono h-10 sticky top-0 z-10 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-3 border-r border-slate-300 text-[10px] text-center w-14">Row &or;</th>
                    <th className="px-3 border-r border-slate-300 text-[10px] w-24">Date</th>
                    <th className="px-4 border-r border-slate-300 text-[10px] w-48">Sender (Broker/Vyapari)</th>
                    <th className="px-4 border-r border-slate-300 text-[10px]">Raw SMS Text (Google Sheet Body)</th>
                    <th className="px-4 border-r border-slate-300 text-[10px] w-56 text-center">Match Status / Match %</th>
                    <th className="px-4 text-[10px] text-center w-48">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px] text-slate-800">
                  {isGoogleSheetLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-20 text-slate-400 font-mono">
                        <RefreshCw className="h-7 w-7 text-indigo-650 animate-spin mx-auto mb-2" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700">Connecting Google Sheet feed...</span>
                      </td>
                    </tr>
                  ) : filteredProcessedList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-slate-400 font-mono font-bold uppercase">
                        No matching SMS logs found for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProcessedList
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((item, idx) => {
                        const { sms, isMarked, markedInfo, extracted, topMatch } = item;
                        
                        let rowBg = isMarked
                          ? "bg-emerald-50/40 hover:bg-emerald-50/70"
                          : (idx % 2 === 1 ? "bg-slate-50 hover:bg-slate-100" : "bg-white hover:bg-slate-50");

                        return (
                          <tr key={sms.id} className={cn("transition-colors", rowBg)}>
                            
                            {/* 1. Row # / ID */}
                            <td className="px-3 py-2.5 border-r border-slate-200 text-center font-bold text-slate-400 align-top">
                              {sms.id.replace('SHEET-SMS-', '')}
                            </td>

                            {/* 2. Date */}
                            <td className="px-3 py-2.5 border-r border-slate-200 text-slate-700 font-semibold align-top whitespace-nowrap">
                              {sms.date}
                            </td>

                            {/* 3. Sender / Broker / Mobile */}
                            <td className="px-4 py-2.5 border-r border-slate-200 font-black text-slate-900 uppercase tracking-tight align-top">
                              <div className="flex items-center gap-1.5">
                                <span className={cn("inline-block w-2 h-2 rounded-full shrink-0", isMarked ? "bg-emerald-600" : "bg-indigo-600 animate-pulse")} />
                                <span className="truncate">{sms.contact_name}</span>
                              </div>
                              {sms.service_center && (
                                <span className="block text-[9.5px] text-slate-500 font-normal font-mono tracking-normal mt-0.5">
                                  {sms.service_center}
                                </span>
                              )}
                            </td>

                            {/* 4. Raw SMS Text Body */}
                            <td className="px-4 py-2.5 border-r border-slate-200 font-mono text-[11px] text-slate-800 leading-relaxed select-text whitespace-pre-wrap align-top">
                              <p className="line-clamp-3 hover:line-clamp-none transition-all">
                                {sms.body}
                              </p>
                              {/* Extracted badges row */}
                              {extracted.isDealMessage && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {extracted.saudaNo && (
                                    <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                      #{extracted.saudaNo}
                                    </span>
                                  )}
                                  {extracted.rate && (
                                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                      ₹{extracted.rate}
                                    </span>
                                  )}
                                  {extracted.totalUnit && (
                                    <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                      {extracted.totalUnit} Bales
                                    </span>
                                  )}
                                  {extracted.grades.length > 0 && (
                                    <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                      {extracted.grades.join(', ')}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* 5. Match Status & Confidence */}
                            <td className="px-4 py-2.5 border-r border-slate-200 text-center align-top">
                              {isMarked ? (
                                <div className="flex flex-col items-center justify-center p-1.5 bg-emerald-100 border border-emerald-300 rounded shadow-2xs">
                                  <div className="inline-flex items-center gap-1 text-emerald-900 font-black text-[9.5px] uppercase">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                                    <span>SAUDA DONE</span>
                                  </div>
                                  <span className="font-mono text-xs font-black text-emerald-950 mt-0.5">
                                    #{markedInfo?.sauda_no}
                                  </span>
                                  {markedInfo?.marked_by && (
                                    <span className="text-[9px] text-emerald-800 font-semibold mt-0.5">
                                      By: {markedInfo.marked_by}
                                    </span>
                                  )}
                                </div>
                              ) : topMatch && topMatch.score >= 50 ? (
                                <div className="flex flex-col items-center justify-center p-1.5 rounded shadow-2xs gap-0.5 border"
                                  style={{
                                    backgroundColor: topMatch.score >= 90 ? '#ecfdf5' : topMatch.score >= 75 ? '#f0f9ff' : '#fffbeb',
                                    borderColor: topMatch.score >= 90 ? '#a7f3d0' : topMatch.score >= 75 ? '#bae6fd' : '#fde68a'
                                  }}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="font-black text-[10.5px]"
                                      style={{
                                        color: topMatch.score >= 90 ? '#065f46' : topMatch.score >= 75 ? '#0369a1' : '#92400e'
                                      }}
                                    >
                                      {topMatch.score}% {topMatch.confidence.toUpperCase()} MATCH
                                    </span>
                                  </div>
                                  <span className="font-mono text-[10.5px] font-black text-slate-900">
                                    → #{topMatch.sauda.sauda_no}
                                  </span>
                                </div>
                              ) : !extracted.isDealMessage ? (
                                <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block">
                                  Insufficient Info (0%)
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block">
                                  No Reliable Match ({topMatch ? `${topMatch.score}%` : '0%'})
                                </span>
                              )}
                            </td>

                            {/* 6. Action Column */}
                            <td className="px-4 py-2.5 text-center align-top">
                              <div className="flex flex-col gap-1.5 items-center justify-center">
                                
                                {isMarked ? (
                                  <>
                                    <button
                                      onClick={() => handleOpenReviewModal(sms)}
                                      className="w-full bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-300 font-mono font-bold text-[9.5px] uppercase py-1 px-2 rounded shadow-2xs cursor-pointer flex items-center justify-center gap-1 transition-all"
                                      title="View linked Sauda details"
                                    >
                                      <Eye className="h-3 w-3 text-emerald-600" />
                                      <span>View Link</span>
                                    </button>

                                    {isAuthorizedForMarkSms() && (
                                      <button
                                        onClick={() => handleUnmark(sms)}
                                        className="text-[9px] text-slate-500 hover:text-rose-600 font-semibold underline cursor-pointer"
                                      >
                                        Unmark / Reset
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleOpenReviewModal(sms)}
                                      className="w-full bg-[#024a68] hover:bg-[#035b80] text-white font-mono font-black text-[9.5px] uppercase py-1.5 px-2 rounded shadow-xs cursor-pointer flex items-center justify-center gap-1 transition-all active:scale-95"
                                      title="Open side-by-side comparison modal"
                                    >
                                      <Sparkles className="h-3 w-3 text-amber-300" />
                                      <span>Review & Match</span>
                                    </button>

                                    {topMatch && topMatch.score >= 80 && isAuthorizedForMarkSms() && (
                                      <button
                                        onClick={() => handleMarkDone(sms, topMatch.sauda, topMatch.score)}
                                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-mono font-black text-[9px] uppercase py-1 px-2 rounded shadow-2xs cursor-pointer flex items-center justify-center gap-1 transition-all"
                                        title={`Quickly Link with Top Match #${topMatch.sauda.sauda_no}`}
                                      >
                                        <Check className="h-3 w-3" />
                                        <span>Quick Link #{topMatch.sauda.sauda_no}</span>
                                      </button>
                                    )}
                                  </>
                                )}

                              </div>
                            </td>

                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            <div className="mt-2.5">
              <PaginationControls
                currentPage={currentPage}
                totalItems={filteredProcessedList.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>

          </div>
        ) : (
          /* GMAIL FEED INBOX VIEW */
          <div className="flex-1 flex flex-col min-h-0 mt-3 bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden animate-fade-in font-sans">
            
            {/* Gmail Top Toolbar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-rose-600 text-white p-1.5 rounded-md">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs tracking-wide flex items-center gap-2">
                    BALLY JUTE GMAIL INBOX
                    <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-black select-text">
                      rawjute@ballyjute.com
                    </span>
                  </h3>
                  <p className="text-[10.5px] text-slate-500 font-semibold mt-0.5">Secure SMTP Mail Exchange & Slip Reader</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={syncGmailNow}
                  disabled={isSyncing}
                  title="Pull the latest mail from Gmail now"
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs h-9 px-4 rounded-full flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                  <span>{isSyncing ? 'Syncing…' : 'Sync Mail'}</span>
                </button>

                <button
                  onClick={() => setActiveView('sms_matching')}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs h-9 px-4 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to SMS Sauda Desk</span>
                </button>
              </div>
            </div>

            {/* Gmail Content */}
            <div className="flex-1 flex min-h-0 bg-slate-50">
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-2">
                  {gmailList.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 font-mono text-xs">
                      No emails fetched. Click "Sync Mail" to load recent messages.
                    </div>
                  ) : (
                    gmailList.map(mail => (
                      <div key={mail.id} className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors shadow-xs">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-slate-900">{mail.from}</span>
                          <span className="text-slate-400">{mail.date ? new Date(mail.date).toLocaleDateString() : ''}</span>
                        </div>
                        <h4 className="font-semibold text-slate-800 text-xs mt-1">{mail.subject || 'No Subject'}</h4>
                        <p className="text-[11px] text-slate-500 font-mono line-clamp-2 mt-1 whitespace-pre-wrap">
                          {mail.body || mail.snippet || ''}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* MODAL: SMS SAUDA ↔ SAUDA DESK SIDE-BY-SIDE MATCHING & VERIFICATION */}
        <SmsSaudaMatchModal
          isOpen={isMatchModalOpen}
          onClose={() => {
            setIsMatchModalOpen(false);
            setActiveReviewSms(null);
          }}
          sms={activeReviewSms}
          saudaMasterList={saudaMasterList}
          isMarkedDone={Boolean(activeReviewSms && (markedSmsMap[activeReviewSms.id] || (activeReviewSms.body && markedSmsMap[activeReviewSms.body.trim()])))}
          markedSaudaNo={activeReviewSms ? (markedSmsMap[activeReviewSms.id]?.sauda_no || (activeReviewSms.body ? markedSmsMap[activeReviewSms.body.trim()]?.sauda_no : undefined)) : undefined}
          markedBy={activeReviewSms ? (markedSmsMap[activeReviewSms.id]?.marked_by || (activeReviewSms.body ? markedSmsMap[activeReviewSms.body.trim()]?.marked_by : undefined)) : undefined}
          markedAt={activeReviewSms ? (markedSmsMap[activeReviewSms.id]?.marked_at || (activeReviewSms.body ? markedSmsMap[activeReviewSms.body.trim()]?.marked_at : undefined)) : undefined}
          onMarkDone={handleMarkDone}
          onUnmark={handleUnmark}
          isAuthorized={isAuthorizedForMarkSms()}
        />

      </div>
    </LegacyLayout>
  );
}
