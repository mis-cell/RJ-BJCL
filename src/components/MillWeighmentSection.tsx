import React, { useState, useMemo } from "react";
import {
  Scale,
  Plus,
  Search,
  Lock,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Info,
  Truck,
  FileText
} from "lucide-react";
import { LorryRecord, MasterOptions, UserRole } from "../pages/LorryDispatchSystem";
import { cn } from "../lib/utils";

function safeStr(val: any, fallback = "N/A"): string {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }
  if (typeof val === "object") {
    if (typeof val.name === "string") return val.name;
    if (typeof val.supp_name === "string") return val.supp_name;
    if (typeof val.brok_name === "string") return val.brok_name;
    if (typeof val.supplier_name === "string") return val.supplier_name;
    if (typeof val.broker_name === "string") return val.broker_name;
    if (val.supplier) return safeStr(val.supplier, fallback);
    if (val.broker) return safeStr(val.broker, fallback);
    return fallback;
  }
  return fallback;
}

interface MillWeighmentSectionProps {
  lorries: LorryRecord[];
  masters: MasterOptions;
  currentUserRole: UserRole;
  onSaveWeighment: (
    lorryId: string,
    station: "MILL" | "ELECTRIC",
    type: "GROSS" | "TARE",
    weightKg: number
  ) => void;
  onUpdateLorryDetails?: (lorryId: string, details: Partial<LorryRecord>) => void;
}

interface GradeItem {
  id: string;
  quality: string;
  quantity: number;
  unit: "BALES" | "BAGS" | "MT" | "KGS";
}

export default function MillWeighmentSection({
  lorries,
  masters,
  currentUserRole,
  onSaveWeighment,
  onUpdateLorryDetails
}: MillWeighmentSectionProps) {
  // Screen mode: "QUEUE" (Screen 1) or "FORM" (Screen 2)
  const [currentScreen, setCurrentScreen] = useState<"QUEUE" | "FORM">("QUEUE");

  // Selected Lorry for Form
  const [selectedLorryId, setSelectedLorryId] = useState<string>("");

  // Search & Filter in Queue
  const [searchQuery, setSearchQuery] = useState("");

  // Form Section A Inputs
  const [itemDescription, setItemDescription] = useState("Raw Jute Bales");
  const [partyName, setPartyName] = useState(masters.brokers[0] || "Jute Traders India");
  const [challanNo, setChallanNo] = useState("");
  const [challanGrossWt, setChallanGrossWt] = useState<number | "">("");
  const [mokam, setMokam] = useState(masters.mokams[0] || "AMBAGAN");
  const [marka, setMarka] = useState(masters.markas[0] || "MJ");

  // Form Section B: Dynamic Grades
  const [grades, setGrades] = useState<GradeItem[]>([
    { id: "g_1", quality: masters.qualities[0] || "TD-5 Super", quantity: 100, unit: "BALES" }
  ]);

  // Form Section C: Mill Gross & Tare Weights
  const [millGrossInput, setMillGrossInput] = useState<number | "">(9800);
  const [millTareInput, setMillTareInput] = useState<number | "">(1600);

  // Active Pending Jute Lorries Queue
  const pendingJuteLorries = useMemo(() => {
    return lorries.filter((l) => l.department === "Jute" && l.status !== "COMPLETED");
  }, [lorries]);

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return pendingJuteLorries.filter((l) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        l.lorryNo.toLowerCase().includes(q) ||
        l.gatePassNo.toLowerCase().includes(q) ||
        l.broker.toLowerCase().includes(q)
      );
    });
  }, [pendingJuteLorries, searchQuery]);

  // Selected Lorry Record
  const activeLorry = useMemo(() => {
    return lorries.find((l) => l.id === selectedLorryId);
  }, [lorries, selectedLorryId]);

  // Load selected lorry into form
  const handleSelectLorryForForm = (lorry: LorryRecord) => {
    setSelectedLorryId(lorry.id);
    setPartyName(lorry.broker || masters.brokers[0] || "Jute Traders");
    setMokam(lorry.mokam || masters.mokams[0] || "AMBAGAN");
    setMarka(lorry.marka || masters.markas[0] || "MJ");
    setMillGrossInput(lorry.millGrossWeight || 9800);
    setMillTareInput(lorry.millTareWeight || 1600);
    setCurrentScreen("FORM");
  };

  // Add Grade Row
  const handleAddGrade = () => {
    setGrades((prev) => [
      ...prev,
      {
        id: "g_" + Date.now(),
        quality: masters.qualities[0] || "WN4",
        quantity: 50,
        unit: "BALES"
      }
    ]);
  };

  // Remove Grade Row
  const handleRemoveGrade = (id: string) => {
    if (grades.length <= 1) return;
    setGrades((prev) => prev.filter((g) => g.id !== id));
  };

  // Form Submit Handler
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLorryId) {
      alert("Please select or specify a Lorry first.");
      return;
    }

    const lorry = lorries.find((l) => l.id === selectedLorryId);
    if (!lorry) return;

    const isStage4 = lorry.status === "MILL_TARE_PENDING" || (lorry.electricTareWeight && lorry.electricTareWeight > 0);

    if (isStage4) {
      // Stage 4: Submit Tare
      const wt = Number(millTareInput);
      if (!wt || wt <= 0) {
        alert("Please enter a valid Mill Tare Weight in kg.");
        return;
      }
      onSaveWeighment(lorry.id, "MILL", "TARE", wt);
      alert(`Mill Tare Weight (${wt} kg) Saved Successfully for Lorry ${lorry.lorryNo}!`);
    } else {
      // Stage 1: Submit Gross
      const wt = Number(millGrossInput);
      if (!wt || wt <= 0) {
        alert("Please enter a valid Mill Gross Weight in kg.");
        return;
      }
      onSaveWeighment(lorry.id, "MILL", "GROSS", wt);
      alert(`Mill Gross Weight (${wt} kg) Saved Successfully for Lorry ${lorry.lorryNo}!`);
    }

    // Reset Form & Return to Queue
    setSelectedLorryId("");
    setCurrentScreen("QUEUE");
  };

  // Stage button label generator
  const getStageButtonLabel = (l: LorryRecord) => {
    if (!l.millGrossWeight) return "Stage 1: Enter Mill Gross Weight";
    if (!l.electricTareWeight) return "Stage 2/3: In Electric Weighbridge Stage";
    if (!l.millTareWeight) return "Stage 4: Enter Mill Tare Weight";
    return "View / Edit Mill Weighment Record";
  };

  return (
    <div className="space-y-6 text-[#D94B5A]">
      
      {/* SCREEN 1: PENDING GATE LORRIES QUEUE */}
      {currentScreen === "QUEUE" && (
        <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-5 rounded-2xl shadow-sm space-y-5">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#FBCFCB] pb-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#F7AFA8] text-[#FDE7E6] rounded-2xl shrink-0">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-black text-[#D94B5A] uppercase tracking-wider font-mono">
                  Pending Gate Lorries Queue
                </h2>
                <p className="text-xs text-[#D94B5A] font-medium">
                  {pendingJuteLorries.length} Jute Lorries waiting from Gate Entry
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (pendingJuteLorries.length > 0) {
                  handleSelectLorryForForm(pendingJuteLorries[0]);
                } else {
                  setCurrentScreen("FORM");
                }
              }}
              className="px-4 py-2.5 bg-[#F7AFA8] hover:bg-[#D94B5A] text-[#FDE7E6] font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Direct Entry</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#D94B5A] absolute left-3.5 top-3" />
            <input
 id="search_by_vehicle_number__212" name="search_by_vehicle_number_" aria-label="Search by Vehicle Number, Gate Pass, or Party Name..."              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Vehicle Number, Gate Pass, or Party Name..."
              className="w-full bg-[#FDE7E6] border border-[#FBCFCB] text-xs text-[#D94B5A] font-mono pl-10 pr-4 py-2.5 rounded-xl outline-none focus:border-[#F7AFA8]"
            />
          </div>

          {/* Lorry Queue List */}
          <div className="space-y-3">
            {filteredQueue.length === 0 ? (
              <div className="bg-[#FDE7E6] border-2 border-dashed border-[#FBCFCB] rounded-2xl p-8 text-center space-y-2 text-[#D94B5A]">
                <Scale className="w-8 h-8 text-[#D94B5A] mx-auto" />
                <h4 className="text-xs font-black uppercase text-[#D94B5A] font-mono">
                  No Jute Lorries Currently Pending Weighment
                </h4>
                <p className="text-xs">All incoming Jute dispatch records are up to date.</p>
              </div>
            ) : (
              filteredQueue.map((l) => (
                <div
                  key={l.id}
                  className="bg-[#FDE7E6] border border-[#FBCFCB] hover:border-[#F7AFA8] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-xs"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-black text-[#D94B5A] font-mono">{l.lorryNo}</span>
                      <span className="px-2.5 py-0.5 bg-[#F7AFA8]/10 text-[#D94B5A] text-xs font-mono font-bold rounded">
                        {l.gatePassNo}
                      </span>
                      <span className="px-2.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold uppercase rounded-full">
                        {l.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <p className="text-xs text-[#D94B5A]">
                      Party: <strong className="text-[#D94B5A]">{safeStr(l.broker)}</strong> | Mokam: <strong className="text-[#D94B5A]">{safeStr(l.mokam)}</strong> | Marka: <strong className="text-[#D94B5A]">{safeStr(l.marka)}</strong>
                    </p>

                    {/* Live Weighbridge Log */}
                    <div className="bg-[#FBCFCB] p-2.5 rounded-xl text-[11px] font-mono font-bold text-[#D94B5A] flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Mill Gross: <strong>{l.millGrossWeight ? `${l.millGrossWeight.toLocaleString()} kg` : "---"}</strong></span>
                      <span>Elec Gross: <strong>{l.electricGrossWeight ? `${l.electricGrossWeight.toLocaleString()} kg` : "---"}</strong></span>
                      <span>Elec Tare: <strong>{l.electricTareWeight ? `${l.electricTareWeight.toLocaleString()} kg` : "---"}</strong></span>
                      <span>Mill Tare: <strong>{l.millTareWeight ? `${l.millTareWeight.toLocaleString()} kg` : "---"}</strong></span>
                    </div>
                  </div>

                  {/* Call-to-action button */}
                  <button
                    onClick={() => handleSelectLorryForForm(l)}
                    className="px-4 py-2.5 bg-[#F7AFA8] hover:bg-[#D94B5A] text-[#FDE7E6] font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
                  >
                    <Scale className="w-4 h-4" />
                    <span>{getStageButtonLabel(l)}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SCREEN 2: PARTY CHALLAN & MILL GROSS/TARE FORM */}
      {currentScreen === "FORM" && (
        <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-5 rounded-2xl shadow-sm space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-3">
            <button
              onClick={() => setCurrentScreen("QUEUE")}
              className="px-3 py-1.5 bg-[#FDE7E6] hover:bg-[#FBCFCB] border border-[#FBCFCB] text-[#D94B5A] text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Pending Queue</span>
            </button>

            <h2 className="text-sm font-black uppercase font-mono text-[#D94B5A]">
              Party Challan & Mill Weighment Entry
            </h2>
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-6">
            
            {/* SECTION A: PARTY CHALLAN DETAILS */}
            <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-4 rounded-2xl space-y-4 shadow-xs">
              <h3 className="text-xs font-black uppercase font-mono text-[#D94B5A] border-b border-[#FBCFCB] pb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#D94B5A]" />
                Section A: Party Challan Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="select_lorry_gate_pass_309" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">
                    Select Lorry / Gate Pass *
                  </label>
                  <select
 id="select_lorry_gate_pass_309" name="select_lorry_gate_pass" aria-label="Select Lorry / Gate Pass *"                    value={selectedLorryId}
                    onChange={(e) => {
                      const l = lorries.find((x) => x.id === e.target.value);
                      if (l) handleSelectLorryForForm(l);
                    }}
                    className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2.5 text-xs text-[#D94B5A] font-mono font-bold outline-none focus:border-[#F7AFA8]"
                  >
                    <option value="">-- Select Active Jute Lorry --</option>
                    {pendingJuteLorries.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.lorryNo} ({l.gatePassNo} - {l.broker})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="item_description_330" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">
                    Item Description
                  </label>
                  <input
 id="item_description_330" name="item_description" aria-label="Item Description"                    type="text"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    placeholder="e.g. Raw Jute Bales"
                    className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2 text-xs text-[#D94B5A] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="party_name_supplier_345" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">
                    Party Name (Supplier) *
                  </label>
                  <input
 id="party_name_supplier_345" name="party_name_supplier" aria-label="Party Name (Supplier) *"                    type="text"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    list="mill-party-options"
                    placeholder="Type or select Party..."
                    className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2 text-xs text-[#D94B5A] outline-none"
                  />
                  <datalist id="mill-party-options">
                    {masters.brokers.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label htmlFor="challan_no_364" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">
                    Challan No.
                  </label>
                  <input
 id="challan_no_364" name="challan_no" aria-label="Challan No."                    type="text"
                    value={challanNo}
                    onChange={(e) => setChallanNo(e.target.value)}
                    placeholder="e.g. CH-9982"
                    className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2 text-xs text-[#D94B5A] font-mono outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="challan_gross_wt_kg_377" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">
                    Challan Gross Wt (kg)
                  </label>
                  <input
 id="challan_gross_wt_kg_377" name="challan_gross_wt_kg" aria-label="Challan Gross Wt (kg)"                    type="number"
                    value={challanGrossWt}
                    onChange={(e) => setChallanGrossWt(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g. 9800"
                    className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2 text-xs text-[#D94B5A] font-mono outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="mokam_390" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">
                    Mokam
                  </label>
                  <input
 id="mokam_390" name="mokam" aria-label="Mokam"                    type="text"
                    value={mokam}
                    onChange={(e) => setMokam(e.target.value)}
                    list="mill-mokam-options"
                    placeholder="Type or select Mokam..."
                    className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2 text-xs text-[#D94B5A] outline-none"
                  />
                  <datalist id="mill-mokam-options">
                    {masters.mokams.map((m, idx) => {
                      const val = safeStr(m);
                      return <option key={val + idx} value={val}>{val}</option>;
                    })}
                  </datalist>
                </div>
              </div>
            </div>

            {/* SECTION B: DYNAMIC GRADE DETAILS */}
            <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-4 rounded-2xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-2">
                <h3 className="text-xs font-black uppercase font-mono text-[#D94B5A]">
                  Section B: Dynamic Quality Grade Details
                </h3>
                <button
                  type="button"
                  onClick={handleAddGrade}
                  className="px-3 py-1 bg-[#F7AFA8] text-[#FDE7E6] text-xs font-bold rounded-lg cursor-pointer hover:bg-[#D94B5A] flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Grade</span>
                </button>
              </div>

              <div className="space-y-2">
                {grades.map((g, idx) => (
                  <div key={g.id} className="flex items-center gap-3 bg-[#FDE7E6] p-2.5 rounded-xl border border-[#FBCFCB]">
                    <span className="text-xs font-mono font-bold text-[#D94B5A]">#{idx + 1}</span>
                    
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <div className="relative">
                        <input
 id="select_grade_430" name="select_grade" aria-label="Select Grade..."                          type="text"
                          value={g.quality}
                          onChange={(e) => {
                            const val = e.target.value;
                            setGrades((prev) => prev.map((x) => (x.id === g.id ? { ...x, quality: val } : x)));
                          }}
                          list="mill-quality-options"
                          placeholder="Select Grade..."
                          className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-lg p-1.5 text-xs text-[#D94B5A]"
                        />
                        <datalist id="mill-quality-options">
                          {masters.qualities.map((q) => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </datalist>
                      </div>

                      <input
 id="qty_448" name="qty" aria-label="Qty"                        type="number"
                        value={g.quantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setGrades((prev) => prev.map((x) => (x.id === g.id ? { ...x, quantity: val } : x)));
                        }}
                        placeholder="Qty"
                        className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-lg p-1.5 text-xs text-[#D94B5A] font-mono"
                      />

                      <select
 id="g_unit_459" name="g_unit" aria-label="g unit"                        value={g.unit}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setGrades((prev) => prev.map((x) => (x.id === g.id ? { ...x, unit: val } : x)));
                        }}
                        className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-lg p-1.5 text-xs text-[#D94B5A] font-bold"
                      >
                        <option value="BALES">BALES</option>
                        <option value="BAGS">BAGS</option>
                        <option value="MT">MT</option>
                        <option value="KGS">KGS</option>
                      </select>
                    </div>

                    {grades.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveGrade(g.id)}
                        className="p-1.5 text-rose-700 hover:bg-rose-100 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION C: MILL WEIGHMENT (GROSS & TARE) */}
            <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-4 rounded-2xl space-y-4 shadow-xs">
              <h3 className="text-xs font-black uppercase font-mono text-[#D94B5A] border-b border-[#FBCFCB] pb-2 flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#D94B5A]" />
                Section C: Mill Scale Weighbridge Form (Gross & Tare)
              </h3>

              {/* Stage Guide Banner */}
              {(!activeLorry?.millGrossWeight) && (
                <div className="bg-amber-100 border border-amber-300 text-amber-950 p-3 rounded-xl text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-800 shrink-0" />
                  <span>
                    ℹ️ <strong>Stage 1 of 2 in Mill Weighbridge</strong>: Enter Mill Gross Weight. Mill Tare Weight will be recorded in Stage 4 after Electric Weighbridge unloading.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mill Gross Input */}
                <div>
                  <label htmlFor="mill_gross_weight_kg_513" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">
                    Mill Gross Weight (kg)
                  </label>
                  <div className="relative">
                    <Scale className="w-4 h-4 text-[#D94B5A] absolute left-3 top-3" />
                    <input
 id="mill_gross_weight_kg_513" name="mill_gross_weight_kg" aria-label="Mill Gross Weight (kg)"                      type="number"
                      disabled={!!activeLorry?.millGrossWeight && currentUserRole !== "SUPER_ADMIN"}
                      value={millGrossInput}
                      onChange={(e) => setMillGrossInput(e.target.value ? Number(e.target.value) : "")}
                      placeholder="e.g. 9800"
                      className={cn(
                        "w-full border rounded-xl pl-10 pr-3 py-2 text-sm font-mono font-bold outline-none",
                        activeLorry?.millGrossWeight
                          ? "bg-slate-200 text-slate-700 border-slate-300 cursor-not-allowed"
                          : "bg-[#FDE7E6] text-[#D94B5A] border-[#FBCFCB] focus:border-[#F7AFA8]"
                      )}
                    />
                  </div>
                  {activeLorry?.millGrossWeight && (
                    <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1 mt-1">
                      <Lock className="w-3 h-3" /> 🔒 Mill Gross Weight Recorded ({activeLorry.millGrossWeight} kg) • Locked
                    </span>
                  )}
                </div>

                {/* Mill Tare Input (Visible during Stage 4) */}
                <div>
                  <label htmlFor="mill_tare_weight_kg_541" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">
                    Mill Tare Weight (kg)
                  </label>
                  <div className="relative">
                    <Scale className="w-4 h-4 text-[#D94B5A] absolute left-3 top-3" />
                    <input
 id="mill_tare_weight_kg_541" name="mill_tare_weight_kg" aria-label="Mill Tare Weight (kg)"                      type="number"
                      disabled={!activeLorry?.millGrossWeight || (!!activeLorry?.millTareWeight && currentUserRole !== "SUPER_ADMIN")}
                      value={millTareInput}
                      onChange={(e) => setMillTareInput(e.target.value ? Number(e.target.value) : "")}
                      placeholder="e.g. 1600"
                      className={cn(
                        "w-full border rounded-xl pl-10 pr-3 py-2 text-sm font-mono font-bold outline-none",
                        !activeLorry?.millGrossWeight || activeLorry?.millTareWeight
                          ? "bg-slate-200 text-slate-700 border-slate-300 cursor-not-allowed"
                          : "bg-[#FDE7E6] text-[#D94B5A] border-[#FBCFCB] focus:border-[#F7AFA8]"
                      )}
                    />
                  </div>
                  {activeLorry?.millTareWeight && (
                    <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1 mt-1">
                      <Lock className="w-3 h-3" /> 🔒 Mill Tare Weight Recorded ({activeLorry.millTareWeight} kg) • Locked
                    </span>
                  )}
                </div>
              </div>

              {/* Calculated Mill Net Weight Summary Block */}
              {Number(millGrossInput) > 0 && Number(millTareInput) > 0 && (
                <div className="bg-emerald-100 border border-emerald-400 p-3.5 rounded-xl text-emerald-950 font-mono font-extrabold text-sm flex items-center justify-between">
                  <span>Calculated Mill Net Weight:</span>
                  <span className="text-base font-black text-emerald-900">
                    {(Number(millGrossInput) - Number(millTareInput)).toLocaleString()} KG
                  </span>
                </div>
              )}
            </div>

            {/* Submission Button */}
            <button
              type="submit"
              className="w-full py-3 bg-[#F7AFA8] hover:bg-[#D94B5A] text-[#FDE7E6] font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                {activeLorry?.status === "MILL_TARE_PENDING"
                  ? "Submit Mill Tare Weight (Stage 4)"
                  : "Submit Mill Gross Weight (Stage 1)"}
              </span>
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
