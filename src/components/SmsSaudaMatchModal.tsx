import React, { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Tag, 
  Building2, 
  IndianRupee, 
  Layers, 
  Truck, 
  MapPin, 
  Calendar, 
  FileText, 
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Sauda } from '../types';
import { 
  ExtractedSmsDeal, 
  extractSmsEntities, 
  findTopSaudaMatches, 
  calculateSaudaMatch, 
  SaudaMatchResult 
} from '../lib/smsSaudaMatcher';

interface SmsSaudaMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sms: {
    id: string;
    date?: string;
    body?: string;
    service_center?: string;
    contact_name?: string;
  } | null;
  saudaMasterList: Sauda[];
  isMarkedDone: boolean;
  markedSaudaNo?: string;
  markedBy?: string;
  markedAt?: string;
  onMarkDone: (sms: any, selectedSauda: Sauda, matchScore: number) => Promise<void>;
  onUnmark: (sms: any) => Promise<void>;
  isAuthorized: boolean;
}

export default function SmsSaudaMatchModal({
  isOpen,
  onClose,
  sms,
  saudaMasterList,
  isMarkedDone,
  markedSaudaNo,
  markedBy,
  markedAt,
  onMarkDone,
  onUnmark,
  isAuthorized
}: SmsSaudaMatchModalProps) {
  if (!isOpen || !sms) return null;

  const [manualSearch, setManualSearch] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [expandedComparisons, setExpandedComparisons] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract deal tokens from the active SMS
  const extractedDeal: ExtractedSmsDeal = useMemo(() => {
    return extractSmsEntities(
      sms.body || '',
      sms.contact_name || '',
      sms.service_center || '',
      sms.date || ''
    );
  }, [sms]);

  // Rank top automated matches from saudaMasterList
  const topMatches: SaudaMatchResult[] = useMemo(() => {
    return findTopSaudaMatches(extractedDeal, saudaMasterList, 6);
  }, [extractedDeal, saudaMasterList]);

  // If user enters manual search query, search all saudaMasterList
  const searchedSaudas: SaudaMatchResult[] = useMemo(() => {
    if (!manualSearch.trim()) return topMatches;
    const q = manualSearch.toLowerCase().trim();
    const filtered = saudaMasterList.filter(s => {
      return (
        (s.sauda_no && s.sauda_no.toLowerCase().includes(q)) ||
        (s.session && s.session.toLowerCase().includes(q)) ||
        (s.broker && s.broker.toLowerCase().includes(q)) ||
        (s.supplier && s.supplier.toLowerCase().includes(q)) ||
        (s.area && s.area.toLowerCase().includes(q)) ||
        (s.b_rate && String(s.b_rate).includes(q))
      );
    });

    return filtered.slice(0, 8).map(s => calculateSaudaMatch(extractedDeal, s));
  }, [manualSearch, saudaMasterList, extractedDeal, topMatches]);

  // Currently linked Sauda record if any
  const linkedSaudaRecord = useMemo(() => {
    if (!markedSaudaNo) return null;
    return saudaMasterList.find(s => 
      s.sauda_no === markedSaudaNo || 
      (s.session && s.session.includes(markedSaudaNo))
    ) || null;
  }, [markedSaudaNo, saudaMasterList]);

  // Default select the top candidate if available
  const activeCandidate = useMemo(() => {
    if (selectedCandidateId) {
      return searchedSaudas.find(m => (m.sauda.sauda_id || m.sauda.sauda_no) === selectedCandidateId) || null;
    }
    if (searchedSaudas.length > 0) {
      return searchedSaudas[0];
    }
    return null;
  }, [selectedCandidateId, searchedSaudas]);

  const toggleExpand = (id: string) => {
    setExpandedComparisons(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirmMatch = async (candidate: SaudaMatchResult) => {
    if (!isAuthorized) {
      alert("Access Denied: Only Admin and Level 4 users are authorized to link and mark SMS as Sauda Done.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onMarkDone(sms, candidate.sauda, candidate.score);
      onClose();
    } catch (e: any) {
      alert("Failed to mark done: " + (e.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetLink = async () => {
    if (!isAuthorized) {
      alert("Access Denied: Only Admin and Level 4 users are authorized to unmark this SMS.");
      return;
    }
    if (confirm("Are you sure you want to unmark / unlink this SMS from the Sauda Desk record?")) {
      setIsSubmitting(true);
      try {
        await onUnmark(sms);
        onClose();
      } catch (e: any) {
        alert("Failed to unmark: " + (e.message || e));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#024a68] via-[#035b80] to-[#0b3346] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xs border border-white/20">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-wide font-mono uppercase">
                  SMS Sauda ↔ Sauda Desk Match System
                </h2>
                {isMarkedDone ? (
                  <span className="bg-emerald-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> SAUDA DONE
                  </span>
                ) : (
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
                    Pending Verification
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-200 mt-0.5 font-medium">
                Incoming SMS message token extraction, intelligent comparison, and official Sauda contract linking.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* MODAL BODY (2 COLUMNS) */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden bg-slate-100 divide-y lg:divide-y-0 lg:divide-x divide-slate-300">
          
          {/* LEFT COLUMN: INCOMING SMS & EXTRACTED TOKENS (5 COLS) */}
          <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto bg-slate-50/80">
            
            {/* Sender & Date Bar */}
            <div className="bg-white border border-slate-300 rounded-lg p-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                  <span className="text-xs font-black text-slate-900 uppercase font-mono tracking-tight">
                    {sms.contact_name || 'Unknown Broker'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-600 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded">
                  <Calendar className="h-3 w-3 text-slate-500" />
                  <span>{sms.date || 'Today'}</span>
                </div>
              </div>

              {sms.service_center && (
                <div className="text-[11px] text-slate-600 font-mono font-medium flex items-center gap-1.5 mb-2">
                  <span className="text-slate-400 font-bold">Sender Mobile:</span>
                  <span className="font-bold text-slate-800">{sms.service_center}</span>
                </div>
              )}

              {/* Deal Status Tag */}
              <div className="mt-1">
                {extractedDeal.isDealMessage ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-[10.5px] font-black uppercase tracking-wide">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Valid Sauda Deal Information Detected</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-300 rounded text-amber-900 text-[10.5px] font-black uppercase tracking-wide">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    <span>{extractedDeal.confidenceReason || 'Insufficient Sauda Information'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Raw SMS Text Display */}
            <div className="bg-white border border-slate-300 rounded-lg p-3.5 shadow-xs flex-1 flex flex-col min-h-[140px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-600" />
                  <span>Raw Incoming SMS Text</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {sms.body?.length || 0} chars
                </span>
              </div>
              <div className="flex-1 bg-slate-900 text-slate-100 rounded-md p-3 font-mono text-[11px] leading-relaxed select-text whitespace-pre-wrap overflow-y-auto border border-slate-700 shadow-inner max-h-48">
                {sms.body || 'No text payload received.'}
              </div>
            </div>

            {/* Smart Deal Entity Breakdown */}
            <div className="bg-white border border-slate-300 rounded-lg p-3.5 shadow-xs">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 font-mono block mb-2.5 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-indigo-600" />
                <span>Extracted Deal Parameters</span>
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Sauda / Order #</span>
                  <span className="font-black text-indigo-900 text-[11px]">
                    {extractedDeal.saudaNo ? `#${extractedDeal.saudaNo}` : '—'}
                  </span>
                </div>

                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Broker / Sender</span>
                  <span className="font-bold text-slate-900 text-[11px] truncate block" title={extractedDeal.broker}>
                    {extractedDeal.broker || '—'}
                  </span>
                </div>

                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Book Rate (₹/Qtl)</span>
                  <span className="font-black text-emerald-800 text-[11px]">
                    {extractedDeal.rate ? `₹${extractedDeal.rate.toLocaleString()}` : '—'}
                    {extractedDeal.secondaryRate ? ` / ₹${extractedDeal.secondaryRate.toLocaleString()}` : ''}
                  </span>
                </div>

                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Quantity / Unit</span>
                  <span className="font-bold text-slate-900 text-[11px]">
                    {extractedDeal.totalUnit ? `${extractedDeal.totalUnit} Bales` : ''} 
                    {extractedDeal.noOfLorries ? ` (${extractedDeal.noOfLorries} Lorry)` : ''}
                    {!extractedDeal.totalUnit && !extractedDeal.noOfLorries ? '—' : ''}
                  </span>
                </div>

                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Quality / Grade</span>
                  <span className="font-black text-amber-900 text-[11px]">
                    {extractedDeal.grades.length > 0 ? extractedDeal.grades.join(', ') : '—'}
                  </span>
                </div>

                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Area / Center</span>
                  <span className="font-bold text-slate-800 text-[11px]">
                    {extractedDeal.area || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Currently Linked Sauda Information if Done */}
            {isMarkedDone && markedSaudaNo && (
              <div className="bg-emerald-50 border-2 border-emerald-400 rounded-lg p-3 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black uppercase text-emerald-900 flex items-center gap-1.5 font-mono">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Linked to Sauda Contract #{markedSaudaNo}</span>
                  </span>
                </div>
                {markedBy && (
                  <p className="text-[10px] text-emerald-800 font-medium font-mono">
                    Verified By: <span className="font-bold">{markedBy}</span> {markedAt ? `on ${new Date(markedAt).toLocaleDateString()}` : ''}
                  </p>
                )}
                {isAuthorized && (
                  <button
                    onClick={handleResetLink}
                    disabled={isSubmitting}
                    className="mt-2.5 w-full bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-mono text-[10px] font-black uppercase py-1.5 rounded cursor-pointer transition-all shadow-2xs"
                  >
                    Unmark / Reset Link
                  </button>
                )}
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: MATCHING CANDIDATES FROM SAUDA DESK (7 COLS) */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col gap-3 overflow-y-auto bg-white">
            
            {/* Search Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
                  <span>Sauda Desk Candidates</span>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {searchedSaudas.length} suggested
                  </span>
                </h3>
                <p className="text-[10.5px] text-slate-500 font-medium">
                  Automated comparison against real records in <span className="font-bold text-slate-700 font-mono">sauda_master</span>.
                </p>
              </div>

              {/* Manual search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Sauda Desk records..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs border border-slate-300 rounded font-medium text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Candidates List */}
            {searchedSaudas.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-xl my-4">
                <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-black uppercase text-slate-600 font-mono">No Matching Sauda Contracts Found</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                  Try searching manually by Sauda Number, Broker, or Rate in the search bar above.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchedSaudas.map((cand, idx) => {
                  const s = cand.sauda;
                  const candKey = s.sauda_id || s.sauda_no || `cand-${idx}`;
                  const isSelected = (activeCandidate?.sauda.sauda_id || activeCandidate?.sauda.sauda_no) === candKey;
                  const isExpanded = Boolean(expandedComparisons[candKey]);
                  const isCurrentlyLinked = markedSaudaNo === s.sauda_no;

                  let scoreBadgeColor = "bg-slate-100 text-slate-700 border-slate-300";
                  if (cand.confidence === 'strong') {
                    scoreBadgeColor = "bg-emerald-100 text-emerald-900 border-emerald-400";
                  } else if (cand.confidence === 'likely') {
                    scoreBadgeColor = "bg-sky-100 text-sky-900 border-sky-400";
                  } else if (cand.confidence === 'possible') {
                    scoreBadgeColor = "bg-amber-100 text-amber-900 border-amber-400";
                  }

                  return (
                    <div 
                      key={candKey}
                      className={cn(
                        "border rounded-xl p-3.5 transition-all shadow-xs",
                        isCurrentlyLinked ? "border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-400/20" :
                        isSelected ? "border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-400/30" : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      {/* Top Candidate Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 font-mono tracking-tight">
                            Sauda #{s.sauda_no}
                          </span>
                          {s.session && (
                            <span className="text-[10px] font-bold text-slate-500 font-mono">
                              ({s.session})
                            </span>
                          )}
                          {isCurrentlyLinked && (
                            <span className="bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono">
                              Currently Linked
                            </span>
                          )}
                        </div>

                        {/* Match Score Badge */}
                        <div className="flex items-center gap-2">
                          <div className={cn("px-2.5 py-0.5 rounded-full border text-xs font-mono font-black flex items-center gap-1.5 shadow-2xs", scoreBadgeColor)}>
                            <span>Match: {cand.score}%</span>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">
                              ({cand.confidence.toUpperCase()})
                            </span>
                          </div>

                          <button
                            onClick={() => handleConfirmMatch(cand)}
                            disabled={isSubmitting}
                            className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-mono font-black text-[10px] uppercase px-3 py-1 rounded shadow-2xs cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            <span>{isCurrentlyLinked ? 'Re-confirm Link' : 'Select & Link'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Candidate Key Details Summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-mono">
                        <div>
                          <span className="text-[9.5px] text-slate-400 font-bold block uppercase">Date</span>
                          <span className="font-semibold text-slate-700">{s.date || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-400 font-bold block uppercase">Broker</span>
                          <span className="font-black text-slate-900 truncate block">{s.broker || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-400 font-bold block uppercase">B. Rate</span>
                          <span className="font-black text-emerald-800">
                            {s.b_rate ? `₹${s.b_rate.toLocaleString()}` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-400 font-bold block uppercase">Quantity</span>
                          <span className="font-bold text-slate-800">
                            {s.total_unit || 0} Bales ({s.no_of_lorries || 1} L)
                          </span>
                        </div>
                      </div>

                      {/* Matched Summary Tokens */}
                      {cand.matchedSummary.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {cand.matchedSummary.map((item, mIdx) => (
                            <span key={mIdx} className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Check className="h-2.5 w-2.5 text-emerald-600" />
                              <span>{item}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expandable Field-by-Field Comparison */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => toggleExpand(candKey)}
                          className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 font-mono flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Field-by-Field Comparison' : 'View Field-by-Field Comparison'}</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 overflow-x-auto bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <table className="w-full text-left text-[10.5px] font-mono">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[9px] font-black">
                                  <th className="pb-1">Field</th>
                                  <th className="pb-1">SMS Value</th>
                                  <th className="pb-1">Sauda Desk Record</th>
                                  <th className="pb-1 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/60 text-slate-800">
                                {cand.fieldComparisons.map((fc, fcIdx) => (
                                  <tr key={fcIdx} className="py-1">
                                    <td className="py-1 font-bold text-slate-600">{fc.label}</td>
                                    <td className="py-1 text-slate-900 font-medium">{fc.smsVal}</td>
                                    <td className="py-1 font-bold text-slate-900">{fc.saudaVal}</td>
                                    <td className="py-1 text-center">
                                      {fc.status === 'match' ? (
                                        <span className="inline-flex items-center gap-0.5 text-emerald-700 font-black text-[9px] bg-emerald-100 px-1.5 py-0.5 rounded">
                                          <Check className="h-2.5 w-2.5 stroke-[3]" /> Match
                                        </span>
                                      ) : fc.status === 'diff' ? (
                                        <span className="inline-flex items-center gap-0.5 text-amber-800 font-black text-[9px] bg-amber-100 px-1.5 py-0.5 rounded">
                                          <AlertCircle className="h-2.5 w-2.5" /> Diff
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 font-medium text-[9px]">
                                          — Not in SMS
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-300 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono font-medium">
            Authorized roles: <span className="font-bold text-slate-700">Admin & Level 4</span>. Linking does not overwrite master Sauda data.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 font-mono font-bold text-xs rounded text-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
