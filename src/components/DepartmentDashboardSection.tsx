import React, { useState, useMemo } from "react";
import {
  PackageCheck,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  Check,
  Truck,
  X,
  Building2,
  FileText
} from "lucide-react";
import { LorryRecord, DepartmentType, UserRole } from "../pages/LorryDispatchSystem";
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

interface DepartmentDashboardSectionProps {
  lorries: LorryRecord[];
  currentUserRole: UserRole;
  onDepartmentApprove: (lorryId: string) => void;
}

export default function DepartmentDashboardSection({
  lorries,
  currentUserRole,
  onDepartmentApprove
}: DepartmentDashboardSectionProps) {
  // Department Tab Filter
  const [activeDeptTab, setActiveDeptTab] = useState<DepartmentType>("Store");

  // Selected Lorry for Detail View / Modal
  const [selectedLorryForModal, setSelectedLorryForModal] = useState<LorryRecord | null>(null);

  // Selected Lorry for Form
  const [selectedLorryId, setSelectedLorryId] = useState<string>("");

  // Search Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Processing Form State
  const [processStatus, setProcessStatus] = useState<"Unloaded" | "Loaded" | "In Progress">("Unloaded");
  const [remarks, setRemarks] = useState("");
  const [isClearForGateExit, setIsClearForGateExit] = useState(false);

  // Active Lorries for Department
  const deptLorries = useMemo(() => {
    return lorries.filter((l) => {
      const matchDept = l.department === activeDeptTab;
      const isPending = l.status !== "COMPLETED";
      return matchDept && isPending;
    });
  }, [lorries, activeDeptTab]);

  // Filtered Table Lorries
  const filteredTableLorries = useMemo(() => {
    return deptLorries.filter((l) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        l.lorryNo.toLowerCase().includes(q) ||
        l.gatePassNo.toLowerCase().includes(q) ||
        l.broker.toLowerCase().includes(q)
      );
    });
  }, [deptLorries, searchQuery]);

  // Selected Lorry Record for Form
  const activeLorry = useMemo(() => {
    return lorries.find((l) => l.id === selectedLorryId);
  }, [lorries, selectedLorryId]);

  // Select Lorry for processing
  const handleSelectLorryForProcessing = (l: LorryRecord) => {
    setSelectedLorryId(l.id);
    setRemarks(`Verified ${l.department} material receipt and unloading in yard.`);
    setIsClearForGateExit(true);
  };

  // Submit Processing Handler
  const handleSubmitProcessing = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLorryId || !activeLorry) {
      alert("Please select an active vehicle to clear.");
      return;
    }

    if (!isClearForGateExit) {
      alert("Please check 'Clear Lorry for Gate Exit' before submitting.");
      return;
    }

    onDepartmentApprove(activeLorry.id);
    alert(`Lorry ${activeLorry.lorryNo} Verified & Cleared for Main Gate Exit!`);
    setSelectedLorryId("");
    setIsClearForGateExit(false);
  };

  return (
    <div className="space-y-6 text-[#D94B5A]">
      
      {/* DEPARTMENT ROLE SELECTOR TABS */}
      <div className="flex items-center gap-2 border-b border-[#FBCFCB] pb-3 overflow-x-auto">
        {[
          { dept: "Store" as DepartmentType, label: "Store Spares Dept", color: "bg-amber-600" },
          { dept: "Finish Good" as DepartmentType, label: "Finish Good Dispatch", color: "bg-purple-700" },
          { dept: "Other" as DepartmentType, label: "Other Material Dept", color: "bg-blue-600" },
        ].map((item) => (
          <button
            key={item.dept}
            onClick={() => {
              setActiveDeptTab(item.dept);
              setSelectedLorryId("");
            }}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider font-mono transition-all cursor-pointer flex items-center gap-2 shrink-0",
              activeDeptTab === item.dept
                ? `${item.color} text-white shadow-md`
                : "bg-[#FDE7E6] text-[#D94B5A] hover:text-[#D94B5A] border border-[#FBCFCB]"
            )}
          >
            <Building2 className="w-4 h-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* TOP HEADER BANNER */}
      <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#F7AFA8] text-[#FDE7E6] rounded-2xl shrink-0">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#D94B5A] uppercase tracking-wider font-mono">
              {activeDeptTab} Department Verification Station
            </h2>
            <p className="text-xs text-[#D94B5A] font-medium">
              Verify unloading / loading clearance & authorize final Main Gate exit
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-cyan-100 border border-cyan-300 text-cyan-950 text-xs font-mono font-bold rounded-full shrink-0">
          {deptLorries.length} Lorries Pending Clearance
        </span>
      </div>

      {/* ACTIVE LORRIES TABLE VIEW (RESPONSIVE GRID) */}
      <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-3">
          <h3 className="text-sm font-black text-[#D94B5A] uppercase tracking-wider font-mono">
            Active {activeDeptTab} Lorries Table ({filteredTableLorries.length})
          </h3>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-[#D94B5A] absolute left-3 top-2.5" />
            <input
 id="search_lorry_or_pass_158" name="search_lorry_or_pass" aria-label="Search lorry or pass..."              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lorry or pass..."
              className="w-full bg-[#FDE7E6] border border-[#FBCFCB] text-xs text-[#D94B5A] font-mono pl-8 pr-3 py-1.5 rounded-xl outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-[#FBCFCB] text-[#D94B5A] uppercase text-[10px] font-mono font-black border-b border-[#FBCFCB]">
              <tr>
                <th className="py-2.5 px-3">Lorry No</th>
                <th className="py-2.5 px-3">Gate Pass</th>
                <th className="py-2.5 px-3">Party / Broker</th>
                <th className="py-2.5 px-3">In-Time</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FBCFCB]/50">
              {filteredTableLorries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#D94B5A]">
                    <Truck className="w-8 h-8 text-[#D94B5A] mx-auto mb-2 opacity-50" />
                    <p className="font-mono text-xs">No active {activeDeptTab} lorries awaiting clearance.</p>
                  </td>
                </tr>
              ) : (
                filteredTableLorries.map((l) => (
                  <tr key={l.id} className="hover:bg-[#FDE7E6] transition-colors">
                    <td className="py-3 px-3 font-black text-[#D94B5A] font-mono">{l.lorryNo}</td>
                    <td className="py-3 px-3 font-mono text-[#D94B5A]">{l.gatePassNo}</td>
                    <td className="py-3 px-3 font-medium text-[#D94B5A]">{safeStr(l.broker)}</td>
                    <td className="py-3 px-3 font-mono text-[#D94B5A] text-[11px]">{new Date(l.inTime).toLocaleTimeString("en-IN")}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold uppercase">
                        {l.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedLorryForModal(l)}
                          className="px-2.5 py-1 bg-[#FDE7E6] hover:bg-[#FBCFCB] border border-[#FBCFCB] text-[#D94B5A] text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleSelectLorryForProcessing(l)}
                          className="px-2.5 py-1 bg-[#F7AFA8] hover:bg-[#D94B5A] text-[#FDE7E6] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Process Clearance
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROCESSING FORM SECTION */}
      <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-black text-[#D94B5A] uppercase tracking-wider font-mono border-b border-[#FBCFCB] pb-2">
          Process {activeDeptTab} Clearance Sign-Off
        </h3>

        {/* SEARCHABLE DROPDOWN SELECTOR */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[#D94B5A] uppercase block">
            Select Active {activeDeptTab} Vehicle
          </label>
          <select
 id="selectedlorryid_236" name="selectedlorryid" aria-label="selectedlorryid"            value={selectedLorryId}
            onChange={(e) => {
              const l = lorries.find((x) => x.id === e.target.value);
              if (l) handleSelectLorryForProcessing(l);
              else setSelectedLorryId("");
            }}
            className="w-full bg-[#FDE7E6] border border-[#FBCFCB] text-xs font-mono font-bold text-[#D94B5A] p-3 rounded-xl outline-none focus:border-[#F7AFA8]"
          >
            <option value="">-- Choose {activeDeptTab} Vehicle --</option>
            {deptLorries.map((l) => (
              <option key={l.id} value={l.id}>
                {l.lorryNo} ({l.gatePassNo} - {l.broker})
              </option>
            ))}
          </select>
        </div>

        {/* PROCESSING FORM CARD */}
        {activeLorry && (
          <form onSubmit={handleSubmitProcessing} className="bg-[#FDE7E6] border-2 border-[#F7AFA8] p-4 rounded-2xl space-y-4 shadow-xs">
            
            {/* Header Summary Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#FDE7E6] p-3 rounded-xl border border-[#FBCFCB]">
              <div>
                <span className="text-[10px] text-[#D94B5A] font-bold block uppercase">Vehicle & Pass</span>
                <span className="font-extrabold text-[#D94B5A] font-mono">{activeLorry.lorryNo} ({activeLorry.gatePassNo})</span>
              </div>
              <div>
                <span className="text-[10px] text-[#D94B5A] font-bold block uppercase">Supplier / Party</span>
                <span className="font-extrabold text-[#D94B5A]">{safeStr(activeLorry.broker)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#D94B5A] font-bold block uppercase">Category / Quality</span>
                <span className="font-extrabold text-[#D94B5A]">{activeLorry.quality}</span>
              </div>
            </div>

            {/* Load / Unload Status Chips */}
            <div>
              <label className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">
                Department Activity Status
              </label>
              <div className="flex gap-2">
                {(["Unloaded", "Loaded", "In Progress"] as const).map((st) => (
                  <button
                    type="button"
                    key={st}
                    onClick={() => setProcessStatus(st)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      processStatus === st
                        ? "bg-[#F7AFA8] text-[#FDE7E6] shadow-xs"
                        : "bg-[#FDE7E6] text-[#D94B5A] border border-[#FBCFCB]"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Remarks Field */}
            <div>
              <label htmlFor="department_clearance_rema_303" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">
                Department Clearance Remarks
              </label>
              <textarea
 id="department_clearance_rema_303" name="department_clearance_rema" aria-label="Department Clearance Remarks"                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter verification notes..."
                className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2.5 text-xs text-[#D94B5A] outline-none"
              />
            </div>

            {/* Clearance Checkbox Card */}
            <div
              onClick={() => setIsClearForGateExit(!isClearForGateExit)}
              className={cn(
                "p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all",
                isClearForGateExit
                  ? "bg-emerald-100 border-emerald-600 text-emerald-950"
                  : "bg-[#FDE7E6] border-[#FBCFCB] text-[#D94B5A]"
              )}
            >
              <input
 id="checkbox_322" name="checkbox" aria-label="checkbox"                type="checkbox"
                checked={isClearForGateExit}
                onChange={(e) => setIsClearForGateExit(e.target.checked)}
                className="w-4 h-4 accent-[#F7AFA8]"
              />
              <span className="text-xs font-black uppercase font-mono">
                Lorry Yes Clear For Out Main Gate
              </span>
            </div>

            {/* Submission Button */}
            <button
              type="submit"
              className="w-full py-3 bg-[#F7AFA8] hover:bg-[#D94B5A] text-[#FDE7E6] font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Submit & Clear Lorry for Gate Exit</span>
            </button>
          </form>
        )}
      </div>

      {/* LORRY DETAILS MODAL DIALOG */}
      {selectedLorryForModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDE7E6] border border-[#FBCFCB] w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-4 text-[#D94B5A]">
            <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-3">
              <h3 className="text-sm font-black uppercase font-mono">
                Lorry Dispatch Details ({selectedLorryForModal.lorryNo})
              </h3>
              <button
                onClick={() => setSelectedLorryForModal(null)}
                className="p-1 hover:bg-[#FBCFCB] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[#FDE7E6] p-3 rounded-xl border border-[#FBCFCB]">
                <div>
                  <span className="text-[10px] text-[#D94B5A] font-bold block uppercase">Gate Pass No</span>
                  <span className="font-bold font-mono">{selectedLorryForModal.gatePassNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#D94B5A] font-bold block uppercase">In-Time</span>
                  <span className="font-bold">{new Date(selectedLorryForModal.inTime).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#FDE7E6] p-3 rounded-xl border border-[#FBCFCB]">
                <div>
                  <span className="text-[10px] text-[#D94B5A] font-bold block uppercase">Department</span>
                  <span className="font-bold">{selectedLorryForModal.department}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#D94B5A] font-bold block uppercase">Broker / Party</span>
                  <span className="font-bold">{safeStr(selectedLorryForModal.broker)}</span>
                </div>
              </div>

              <div className="bg-[#FBCFCB] p-3 rounded-xl border border-[#FBCFCB] space-y-1">
                <span className="text-[10px] text-[#D94B5A] font-bold block uppercase">Weighment Summary</span>
                <p className="font-mono text-xs font-bold">
                  Mill Gross: {selectedLorryForModal.millGrossWeight ? `${selectedLorryForModal.millGrossWeight} kg` : "N/A"} | Mill Tare: {selectedLorryForModal.millTareWeight ? `${selectedLorryForModal.millTareWeight} kg` : "N/A"}
                </p>
                <p className="font-mono text-xs font-bold text-emerald-800">
                  Electric Gross: {selectedLorryForModal.electricGrossWeight ? `${selectedLorryForModal.electricGrossWeight} kg` : "N/A"} | Electric Tare: {selectedLorryForModal.electricTareWeight ? `${selectedLorryForModal.electricTareWeight} kg` : "N/A"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedLorryForModal(null)}
              className="w-full py-2.5 bg-[#F7AFA8] text-[#FDE7E6] text-xs font-bold uppercase rounded-xl cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
