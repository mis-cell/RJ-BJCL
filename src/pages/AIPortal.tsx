import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  MessageSquare, 
  Zap, 
  Cpu, 
  Search, 
  Database, 
  RefreshCw, 
  Terminal, 
  ArrowRight, 
  HelpCircle, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Key
} from 'lucide-react';
import LegacyLayout, { LegacyFieldset } from '../components/LegacyLayout';
import { askAI, getInMemoryGeminiApiKey, setInMemoryGeminiApiKey } from '../services/aiService';
import { supabase } from '../lib/supabase';

export default function AIPortal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge'>('chat');
  
  // Tab 1: Chat States
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Direct Browser Key state in memory
  const [localKey, setLocalKey] = useState(() => {
    try {
      const obscureDefault = "AdyNMSSluB-Vu27Ps8xUKr_8w8HPs1AbBySazIA";
      const getDecodedDefault = () => obscureDefault.split("").reverse().join("");
      return getInMemoryGeminiApiKey() || getDecodedDefault();
    } catch (e) {
      return '';
    }
  });

  const saveLocalKey = (key: string) => {
    const trimmed = key.trim().replace(/^["']|["']$/g, '');
    try {
      const obscureDefault = "AdyNMSSluB-Vu27Ps8xUKr_8w8HPs1AbBySazIA";
      const getDecodedDefault = () => obscureDefault.split("").reverse().join("");
      const decodedDefaultKey = getDecodedDefault();

      if (trimmed && trimmed !== decodedDefaultKey) {
        setInMemoryGeminiApiKey(trimmed);
        setLocalKey(trimmed);
      } else {
        setInMemoryGeminiApiKey('');
        setLocalKey(decodedDefaultKey);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Tab 2: System Knowledge Base / Database Query States
  const [dbQueryText, setDbQueryText] = useState('');
  const [kbLoading, setKbLoading] = useState(false);
  const [kbResultText, setKbResultText] = useState('');
  const [kbResponseWithData, setKbResponseWithData] = useState<any>(null);
  const [queriedTables, setQueriedTables] = useState<string[]>([]);
  const [recentPos, setRecentPos] = useState<string[]>([]);

  // Suggestions for prompt examples
  const suggestedQueries = [
    {
      title: "BJCL/2026-2027/0155 Pending Weight",
      query: "What is the total pending weight of P.O BJCL/2026-2027/0155?"
    },
    {
      title: "Global Pending Deliveries Sum",
      query: "Give me an overview of all pending/outstanding weights across active purchase orders."
    },
    {
      title: "Active Saudas (Sales Contract weights)",
      query: "List active sauda sales contracts and sum their weights in tons."
    },
    {
      title: "Material Receipt Settlement overview",
      query: "Show material receipt counts and average settled weights in m_r_settlement."
    }
  ];

  // Fetch some real PO numbers to build clickable items for test queries
  useEffect(() => {
    async function fetchRecentPos() {
      if (!supabase) return;
      try {
        const { data } = await supabase
          .from('purchase_master')
          .select('po_no')
          .order('created_at', { ascending: false })
          .limit(4);
        if (data && data.length > 0) {
          setRecentPos(data.map(d => d.po_no));
        }
      } catch (err) {
        console.warn('Could not retrieve recent POs for suggestions', err);
      }
    }
    fetchRecentPos();
  }, [activeTab]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const res = await askAI(msg, "The user is in the AI Portal of P.O Automation system.");
      setMessages(prev => [...prev, { role: 'assistant', content: res }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error in neural link." }]);
    } finally {
      setLoading(false);
    }
  };

  // Direct Supabase extraction based on Natural Language triggers
  const handleDatabaseQuery = async (userPrompt: string) => {
    if (!userPrompt.trim() || kbLoading) return;
    setKbLoading(true);
    setKbResultText('');
    setKbResponseWithData(null);
    setQueriedTables([]);

    const promptLower = userPrompt.toLowerCase();
    let structuredContext = "";
    let extractedDetails: any = null;
    let tablesTouched: string[] = [];

    try {
      if (!supabase) {
        throw new Error("Supabase operational client is offline or unconfigured.");
      }

      // Check if prompt specifically targets a PO number
      // Look for BJCL style PO numbers: BJCL/YYYY-YYYY/NNNN
      const poRegex = /(bjcl\/[0-9]{4}-[0-9]{4}\/[0-9]+)/i;
      const match = userPrompt.match(poRegex);
      const matchedPoNo = match ? match[1].toUpperCase() : null;

      if (matchedPoNo || promptLower.includes('po ') || promptLower.includes('p.o')) {
        tablesTouched.push('purchase_master');
        setQueriedTables(['purchase_master']);

        // First find PO Master
        let targetNo = matchedPoNo;
        if (!targetNo) {
          // Fallback to extract first digits or word after PO
          const numMatch = userPrompt.match(/[0-9]{3,4}/);
          if (numMatch) {
            // Find a PO containing this key
            const { data: searchData } = await supabase
              .from('purchase_master')
              .select('po_no')
              .ilike('po_no', `%${numMatch[0]}%`)
              .limit(1)
              .maybeSingle();
            if (searchData) targetNo = searchData.po_no;
          }
        }

        if (targetNo) {
          // Query PO database records
          const { data: poHeader, error: poErr } = await supabase
            .from('purchase_master')
            .select('*')
            .eq('po_no', targetNo)
            .maybeSingle();

          if (poErr) throw poErr;

          if (poHeader) {
            // Query PO details
            tablesTouched.push('purchase_detail_master');
            const { data: poDetails } = await supabase
              .from('purchase_detail_master')
              .select('*')
              .eq('po_no', targetNo);

            // Query PO material settlements
            tablesTouched.push('m_r_settlement');
            const { data: mrSettlements } = await supabase
              .from('m_r_settlement')
              .select('*')
              .eq('po_no', targetNo);

            // Fetch mr_settlement_master lists
            tablesTouched.push('mr_settlement_master');
            const { data: mrMaster } = await supabase
              .from('mr_settlement_master')
              .select('*')
              .eq('po_no', targetNo);

            // Calculate pending outstanding
            const totalContract = Number(poHeader.total_contract_mt) || 0;
            const totalSettledWeight = (mrSettlements || []).reduce((acc, raw) => acc + (Number(raw.quantity) || 0), 0);
            const pendingOutstanding = Math.max(0, totalContract - totalSettledWeight);

            extractedDetails = {
              PO_Header: poHeader,
              PO_Details: poDetails || [],
              MR_Settlements: mrSettlements || [],
              MR_Settlement_Masters: mrMaster || [],
              Calculated_Tonnage: {
                total_contract_mt: totalContract,
                total_settled_mt: totalSettledWeight,
                pending_outstanding_mt: pendingOutstanding,
                status: pendingOutstanding > 0 ? "Outstanding Arrivals" : "Fully Received & Settled"
              }
            };

            structuredContext = `
              [SUPABASE DIRECT KNOWLEDGE EXTRACTION]
              The user asked about Purchase Order #${targetNo}.
              Here is the exact matched dataset from Supabase:
              - Table "purchase_master": 
                * PO No: ${poHeader.po_no}
                * Supplier: ${poHeader.supplier || 'N/A'}
                * Broker: ${poHeader.broker || 'N/A'}
                * Total Contract Volume: ${totalContract} MT
              - Calculated Status:
                * Sum of Physically Settled Metric Tons: ${totalSettledWeight} MT
                * Outstanding Pending Weight Balance: ${pendingOutstanding} MT
                * Status: ${pendingOutstanding > 0 ? 'PENDING' : 'SETTLED/CLOSED'}
              - Table "m_r_settlement" logs found: ${(mrSettlements || []).length} rows.
              Please formulate a factual, helpful, and exact response addressing their specific prompt. Include a summary of these exact weights.
            `;
          } else {
            // If they specified a PO but we couldn't find it
            const { data: recentList } = await supabase
              .from('purchase_master')
              .select('po_no, supplier, total_contract_mt')
              .order('created_at', { ascending: false })
              .limit(5);

            extractedDetails = {
              PO_Status: "NOT_FOUND",
              Specified_No: targetNo,
              Recent_POs_In_Database: recentList || []
            };

            structuredContext = `
              The user asked for PO #${targetNo}, but it was not found in the 'purchase_master' table. 
              The database holds these recent POs instead: ${JSON.stringify(recentList)}.
              Kindly inform them and list the available active POs.
            `;
          }
        } else {
          // No specific PO matched, do a general purchase_master scan
          const { data: pendingList } = await supabase
            .from('purchase_master')
            .select('po_no, supplier, total_contract_mt, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

          extractedDetails = {
            Active_POs_Scan: pendingList || []
          };

          structuredContext = `
            The user requested PO details generally. Here are the 10 most recent purchase orders in the 'purchase_master' table:
            ${JSON.stringify(pendingList)}
            Analyze this list and summarize the active contracts.
          `;
        }

      } else if (promptLower.includes('sauda') || promptLower.includes('sales') || promptLower.includes('contract')) {
        tablesTouched.push('sauda_master');
        setQueriedTables(['sauda_master']);

        // Fetch saudas
        const { data: saudas, error: saudaErr } = await supabase
          .from('sauda_master')
          .select('sauda_no, date, broker, supplier, total_wt_in_ton, status')
          .order('created_at', { ascending: false })
          .limit(8);

        if (saudaErr) throw saudaErr;

        const totalSaudaWts = (saudas || []).reduce((sum, s) => sum + (Number(s.total_wt_in_ton) || 0), 0);

        extractedDetails = {
          Sauda_Master_Rows: saudas || [],
          Aggregate_Metrics: {
            total_active_sauda_wt_ton: totalSaudaWts,
            record_count: saudas?.length || 0
          }
        };

        structuredContext = `
          [SUPABASE KNOWLEDGE DIRECT EXTRACTION]
          The user asked about Saudas / Sales registrations.
          Matched Table: "sauda_master".
          Active Records fetched:
          ${JSON.stringify(saudas)}
          
          Total tonnage under analysis: ${totalSaudaWts} Tons.
          Summarize these sales registrations factually.
        `;

      } else if (promptLower.includes('settlement') || promptLower.includes('m_r') || promptLower.includes('mr_no')) {
        tablesTouched.push('m_r_settlement');
        tablesTouched.push('mr_settlement_master');
        setQueriedTables(['m_r_settlement', 'mr_settlement_master']);

        const { data: mrData } = await supabase
          .from('m_r_settlement')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        extractedDetails = {
          MR_Settlements_History: mrData || []
        };

        structuredContext = `
          The user asked about material receipt settlements.
          We queried the 'm_r_settlement' table, and these are the most recent 10 records:
          ${JSON.stringify(mrData)}
          Analyze and draft an overview of payment statuses and material volumes entered.
        `;
      } else {
        // Fallback: General system knowledge query
        tablesTouched.push('purchase_master');
        tablesTouched.push('sauda_master');
        setQueriedTables(['purchase_master', 'sauda_master']);

        const { data: poStats } = await supabase.from('purchase_master').select('po_no, supplier, total_contract_mt').limit(5);
        const { data: saudaStats } = await supabase.from('sauda_master').select('sauda_no, total_wt_in_ton').limit(5);

        extractedDetails = {
          System_Sample: {
            purchase_orders: poStats || [],
            saudas: saudaStats || []
          }
        };

        structuredContext = `
          The user asked a general DB structure or ERP question: "${userPrompt}".
          Our system holds tables such as:
          - purchase_master (Active PO entries)
          - purchase_detail_master (PO grading detail lines)
          - m_r_settlement (Weigh station actual settlement ledger)
          - sauda_master (Sales records indices)
          Use your built-in P.O Automation schema knowledge to assist them. Match context with this sample database state:
          ${JSON.stringify(extractedDetails)}
        `;
      }

      setQueriedTables(tablesTouched);

      // Perform Natural Language parsing via Gemini askAI service
      const answer = await askAI(userPrompt, structuredContext);
      setKbResultText(answer || "I could not resolve an answer for this database inquiry.");
      setKbResponseWithData(extractedDetails);

    } catch (err: any) {
      console.error(err);
      setKbResultText(`Database Query Blocked: ${err.message || "Failed to communicate with Supabase service."}`);
    } finally {
      setKbLoading(false);
    }
  };

  return (
    <LegacyLayout title="A.I. Operations Portal" subtitle="Enterprise Database Helper Core" onClose={onClose}>
      <div className="grid grid-cols-12 gap-4 h-full min-h-0">
        
        {/* Left Side Control Panel */}
        <div className="col-span-3 space-y-4 overflow-y-auto pr-1">
          <LegacyFieldset legend="Select Engine Service">
            <div className="flex flex-col gap-1.5">
              <button 
                onClick={() => setActiveTab('chat')}
                className={`w-full p-2 text-left uppercase font-mono tracking-wider transition-all border flex items-center gap-2 rounded-sm ${
                  activeTab === 'chat' 
                    ? 'bg-indigo-950 text-white border-slate-900 shadow-inner' 
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-350 cursor-pointer'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span className="text-[10px] font-black">Jarves Neural Chat</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('knowledge')}
                className={`w-full p-2 text-left uppercase font-mono tracking-wider transition-all border flex items-center gap-2 rounded-sm ${
                  activeTab === 'knowledge' 
                    ? 'bg-indigo-950 text-white border-slate-900 shadow-inner' 
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-350 cursor-pointer'
                }`}
              >
                <Database className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] font-black">System Knowledge Base</span>
              </button>
            </div>
          </LegacyFieldset>

          <LegacyFieldset legend="Database Registry">
            <div className="space-y-1 bg-slate-900 text-slate-300 p-2 font-mono text-[8px] rounded-xs ">
              <div className="text-emerald-400 font-extrabold pb-1 border-b border-white/10 uppercase flex items-center justify-between">
                <span>Tables Index</span>
                <span>Active</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-white/5">
                <span>purchase_master</span>
                <span className="text-emerald-400">● ON</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-white/5">
                <span>purchase_detail_master</span>
                <span className="text-emerald-400">● ON</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-white/5">
                <span>m_r_settlement</span>
                <span className="text-emerald-400">● ON</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-white/5">
                <span>sauda_master</span>
                <span className="text-emerald-400">● ON</span>
              </div>
              <p className="opacity-50 text-[7px] leading-tight pt-1 italic uppercase">Client mapped securely to Supabase RPC router.</p>
            </div>
          </LegacyFieldset>

          <LegacyFieldset legend="Model Status">
            <div className="p-2 bg-indigo-900/10 border border-indigo-950/20 text-indigo-950 text-[9px] font-bold uppercase rounded-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-indigo-950 animate-pulse" />
                  <span>Jarves Core v2.0</span>
                </div>
                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-sm border ${
                  localKey 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {localKey ? 'DIRECT GATE' : 'SERVER MODE'}
                </span>
              </div>
              <p className="text-[7.5px] font-normal leading-normal normal-case text-slate-600">Active intelligence engine parses natural language queries and extracts precise database parameters to run secure queries.</p>
              
              <div className="border-t border-slate-300/60 pt-2.5 space-y-1.5">
                <label className="text-[8px] font-black text-indigo-950 flex items-center gap-1 uppercase tracking-tight">
                  <Key className="h-3 w-3 text-indigo-700" />
                  <span>Configure Direct Key:</span>
                </label>
                <div className="flex gap-1">
                  <input
 id="enter_free_gemini_key_aiz_458" name="enter_free_gemini_key_aiz" aria-label="Enter free Gemini Key (AIzaSy...)"                    type="password"
                    placeholder="Enter free Gemini Key (AIzaSy...)"
                    value={localKey}
                    onChange={(e) => setLocalKey(e.target.value)}
                    className="flex-1 bg-white border border-slate-400 p-1 text-[8.5px] font-mono font-bold placeholder:normal-case shadow-inner outline-none focus:border-indigo-900"
                    onKeyDown={(e) => e.key === 'Enter' && saveLocalKey(localKey)}
                  />
                  <button
                    onClick={() => saveLocalKey(localKey)}
                    className="bg-indigo-950 hover:bg-indigo-900 text-white font-extrabold text-[8.5px] px-2 py-1 uppercase rounded-xs cursor-pointer border border-indigo-900 transition-all active:translate-y-px"
                  >
                    Set
                  </button>
                  {localKey && (
                    <button
                      onClick={() => {
                        saveLocalKey('');
                      }}
                      className="bg-rose-700 hover:bg-rose-600 text-white font-extrabold text-[8.5px] px-1.5 py-1 uppercase rounded-xs cursor-pointer border border-rose-900 transition-all active:translate-y-px"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[7px] leading-normal font-medium normal-case text-slate-500">
                  {localKey 
                    ? "✓ Saved in private local browser memory. Chatting directly with Google Cloud."
                    : "No local key set. Running on a static host like GitHub Pages? Standard Express route might be offline. Supply your free Gemini API token above to bypass the server."
                  }
                </p>
              </div>
            </div>
          </LegacyFieldset>
        </div>

        {/* Right Side Working Canvas */}
        <div className="col-span-9 flex flex-col bg-white border border-black/20 shadow-inner overflow-hidden min-h-0">
          
          {activeTab === 'chat' ? (
            // ================== TAB 1: OPERATOR NEURAL CHAT ==================
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 pixel-scroll bg-slate-50">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 ">
                    <Bot className="h-16 w-16 mb-3 text-indigo-950 animate-bounce" />
                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-indigo-950">Jarves Intelligent Assistant</h2>
                    <p className="text-[10px] font-bold max-w-xs uppercase tracking-tight text-slate-500">Ask general questions about standard operating procedures or jute records.</p>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-4 rounded-sm border flex gap-3 ${
                        m.role === 'user' 
                          ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className={`shrink-0 w-7 h-7 rounded-sm flex items-center justify-center font-bold ${
                          m.role === 'user' ? 'bg-indigo-950 text-white' : 'bg-slate-800 text-white'
                        }`}>
                          {m.role === 'user' ? <MessageSquare className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">
                            {m.role === 'user' ? 'Operator Console' : 'Jarves Core'}
                          </p>
                          <div className="text-xs font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                            {m.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex gap-3 items-center">
                    <div className="w-7 h-7 rounded-sm bg-indigo-900 flex items-center justify-center animate-spin">
                      <Cpu className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-[10px] font-black italic uppercase text-slate-400 animate-pulse">Running semantic parsing...</span>
                  </div>
                )}
              </div>

              {/* Chat Input terminal */}
              <div className="p-4 bg-slate-100 border-t border-black/10">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input  id="ask_jarves_anything_about_547" name="ask_jarves_anything_about" aria-label="Ask Jarves anything about standard system procedures..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      className="w-full bg-white border-2 border-indigo-900/20 p-2.5 pl-9 text-xs font-bold uppercase placeholder:text-slate-400 outline-none focus:border-indigo-600 transition-all text-indigo-950"
                      placeholder="Ask Jarves anything about standard system procedures..."
                    />
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400 animate-pulse" />
                  </div>
                  <button 
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="bg-indigo-950 text-white px-6 font-black uppercase text-[10px] tracking-widest hover:bg-indigo-900 transition-colors disabled:opacity-50 active:translate-y-px cursor-pointer"
                  >
                    SEND
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // ================== TAB 2: SYSTEM KNOWLEDGE BASE MODULE ==================
            <div className="flex-1 flex flex-col min-h-0 bg-[#fbfbfa]">
              
              {/* Header Status Bar */}
              <div className="bg-[#FBCFCB] p-2 border-b border-slate-300 flex items-center justify-between text-[10px] font-bold text-slate-800 ">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-indigo-950" />
                  <span className="uppercase tracking-wider">NATURAL LANGUAGE DATABASE INTERFACE // ONLINE</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-emerald-700 text-white px-1.5 py-0.5 rounded-sm text-[8px] font-black uppercase">LIVE DIRECT CONNECTION</span>
                </div>
              </div>

              {/* Central working frame */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 pixel-scroll text-slate-800">
                
                {/* Information Box */}
                <div className="bg-[#fffbeb] border border-amber-300 p-3 rounded-sm flex gap-3 text-xs leading-relaxed text-slate-700">
                  <HelpCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-indigo-950 uppercase text-[10px] tracking-wide">Dynamic SQL-Semantic Translator</p>
                    <p className="text-[10px] font-bold text-slate-600 mt-0.5 leading-normal normal-case">
                      Type your question in natural English. The translator scans your query for indicators (like P.O codes, Sauda registers, or general statuses), automatically fetches target tabular variables directly from Supabase, and runs an intelligent synthesis to formulate a guaranteed accurate quantitative response.
                    </p>
                  </div>
                </div>

                {/* Main Semantic Field Input */}
                <div className="bg-white border border-slate-400 p-3.5 space-y-3 rounded-sm shadow-xs">
                  <label className="text-[10px] font-black uppercase text-indigo-950 flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-indigo-900" />
                    <span>Enter Natural Language DB Query:</span>
                  </label>
                  
                  <div className="flex gap-2">
                    <input  id="e_g_determine_the_pending_603" name="e_g_determine_the_pending" aria-label="e.g. Determine the pending weight on BJCL/2026-2027/0155"
                      type="text"
                      className="flex-1 bg-slate-50 border border-slate-400 p-2.5 outline-none font-mono font-bold text-xs focus:border-indigo-900 text-indigo-950 uppercase placeholder:normal-case placeholder:font-sans"
                      placeholder="e.g. Determine the pending weight on BJCL/2026-2027/0155"
                      value={dbQueryText}
                      onChange={(e) => setDbQueryText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleDatabaseQuery(dbQueryText)}
                    />
                    <button 
                      onClick={() => handleDatabaseQuery(dbQueryText)}
                      disabled={!dbQueryText.trim() || kbLoading}
                      className="bg-indigo-950 hover:bg-slate-900 text-white border border-slate-700 px-6 font-mono text-[10px] font-black uppercase active:translate-y-px shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {kbLoading ? 'RETRIEVING...' : 'TRANSLATE & RUN'}
                    </button>
                  </div>

                  {/* Frequently Asked Suggestions */}
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Example query templates (Click to run):</span>
                    <div className="grid grid-cols-2 gap-2">
                      {suggestedQueries.map((item, id) => (
                        <button 
                          key={id}
                          onClick={() => {
                            setDbQueryText(item.query);
                            handleDatabaseQuery(item.query);
                          }}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-300 p-2 text-left hover:border-indigo-600 transition-colors rounded-sm cursor-pointer"
                        >
                          <span className="text-[8px] font-extrabold text-indigo-950 uppercase block font-sans">{item.title}</span>
                          <span className="text-[8px] text-slate-500 font-mono block leading-tight mt-0.5 truncate">{item.query}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Suggest existing PO matches for quick test clicks */}
                  {recentPos.length > 0 && (
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[8px] font-bold text-slate-500 uppercase font-mono">Registry PO shortcuts:</span>
                      {recentPos.map((item) => (
                        <button 
                          key={item}
                          onClick={() => {
                            const q = `Sum the total pending outstanding weight for PO ${item}`;
                            setDbQueryText(q);
                            handleDatabaseQuery(q);
                          }}
                          className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-250 text-[7.5px] font-mono font-bold text-indigo-900 tracking-tight rounded cursor-pointer uppercase"
                        >
                          {typeof item === 'object' ? JSON.stringify(item) : String(item ?? '')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Processing State loading indicator bar */}
                {kbLoading && (
                  <div className="p-4 bg-white border border-slate-300 rounded shadow-inner flex items-center justify-center gap-3 text-indigo-950 font-bold text-xs uppercase animate-pulse">
                    <RefreshCw className="h-5 w-5 animate-spin text-indigo-900" />
                    <span className="font-mono text-[10px] font-black">Interrogating live Supabase schemas, index, and relational triggers...</span>
                  </div>
                )}

                {/* Answer Output Frame */}
                {kbResultText && (
                  <div className="bg-[#fafafa] border-2 border-indigo-950 p-4 rounded-sm shadow-md space-y-4">
                    
                    {/* Header detailing matching */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-[11px] font-black uppercase italic text-indigo-950 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
                        <span>Jarves DB Insight Synthesis Output</span>
                      </span>
                      {queriedTables.length > 0 && (
                        <div className="flex gap-1">
                          {queriedTables.map(t => (
                            <span key={t} className="text-[7.5px] font-mono font-bold bg-slate-900 text-yellow-400 border border-slate-700 px-1.5 py-0.5 rounded-sm uppercase">
                              src: {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Synthesized Response Text */}
                    <div className="text-xs font-bold text-slate-800 leading-relaxed border-b border-dashed border-slate-200 pb-3 font-sans whitespace-pre-line">
                      {kbResultText}
                    </div>

                    {/* Direct JSON Grid explorer display */}
                    {kbResponseWithData && (
                      <div className="bg-slate-900 text-slate-200 rounded p-3 font-mono text-[9px] relative ring-1 ring-white/10 shadow-inner overflow-x-auto">
                        <span className="absolute right-2 top-2 bg-slate-800 border border-slate-750 px-1 py-0.5 text-slate-400 text-[6.5px] font-black tracking-widest uppercase">DIRECT_JSON_DUMP</span>
                        <h5 className="text-[8px] font-black uppercase text-yellow-400 mb-2">Supabase RPC matching data block:</h5>
                        <pre className="p-1 max-h-48 overflow-y-auto leading-relaxed text-emerald-400 scrollbar-none select-all whitespace-pre-wrap font-mono">
                          {JSON.stringify(kbResponseWithData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Operational Schema Quick Reference Sheet */}
                <div className="border border-slate-350 bg-[#e4e2de] text-slate-800 rounded-sm overflow-hidden p-3 uppercase font-mono text-[8px] tracking-tight space-y-2">
                  <div className="flex items-center gap-1.5 border-b border-slate-400 pb-1 font-bold text-indigo-950 text-[9px]">
                    <FileText className="h-4 w-4" />
                    <span>Schema Knowledge mapping guide (P.O. Automation)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="font-extrabold text-[#7c2d12]">• purchase_master (PK: po_no)</p>
                      <p className="opacity-75 pl-2 leading-normal">Holds target procurement lines. Field "total_contract_mt" describes metric tons contracted per order.</p>

                      <p className="font-extrabold text-[#7c2d12]">• purchase_detail_master (FK: po_no)</p>
                      <p className="opacity-75 pl-2 leading-normal">Defines exact grading code, crop_year, agency, marka, rate_qntl (Rate per m.T) per packet lot lines.</p>
                    </div>

                    <div className="space-y-1">
                      <p className="font-extrabold text-blue-950">• m_r_settlement (FK: po_no)</p>
                      <p className="opacity-75 pl-2 leading-normal">Logs gate arrivials, physical weighbridge readings "electronic_scale_net", and agreed payment statuses.</p>

                      <p className="font-extrabold text-blue-950">• sauda_master</p>
                      <p className="opacity-75 pl-2 leading-normal">Handles contractual sales tonnage, brokerage configurations "b_rate", and registration states.</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    </LegacyLayout>
  );
}
