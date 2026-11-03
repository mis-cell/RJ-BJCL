import React, { useState } from "react";
import {
  FileText,
  AlertCircle,
  Check,
  TrendingUp,
  BarChart2,
  Lock,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

// Mock datasets
const simpleLineData = [
  { name: "Mon", Purchase: 4000, Sauda: 2400 },
  { name: "Tue", Purchase: 3000, Sauda: 1398 },
  { name: "Wed", Purchase: 2000, Sauda: 9800 },
  { name: "Thu", Purchase: 2780, Sauda: 3908 },
  { name: "Fri", Purchase: 1890, Sauda: 4800 },
  { name: "Sat", Purchase: 2390, Sauda: 3800 },
  { name: "Sun", Purchase: 3490, Sauda: 4300 },
];

const mockPieData = [
  { name: "Category X", value: 400, color: "#ec407a" },
  { name: "Category Y", value: 300, color: "#5c6bc0" },
  { name: "Category Z", value: 300, color: "#26c6da" },
];

export default function FormsChartsTab() {
  const [activeSegment, setActiveSegment] = useState<"forms" | "charts">("forms");

  // FORM ELEMENT DEMO STATES
  const [toggleActive, setToggleActive] = useState(false);
  const [sliderVal, setSliderVal] = useState(180); // Weight Kgs
  const [poType, setPoType] = useState("Normal");

  // FORM VALIDATION DEMO STATES
  const [poNumber, setPoNumber] = useState("");
  const [poWeight, setPoWeight] = useState(180);
  const [poRate, setPoRate] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationSuccess, setValidationSuccess] = useState(false);

  const handleValidateForm = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    if (!poNumber) {
      errors.push("Purchase Order Reference identifier value is required.");
    } else if (!poNumber.startsWith("PO-")) {
      errors.push("PO Identifiers must adhere to formatting standard (start with 'PO-').");
    }
    if (poWeight < 100 || poWeight > 500) {
      errors.push("Batch shipment weights must register within safe margin (100Kg to 500Kg).");
    }
    if (poRate <= 1000) {
      errors.push("Market rate price must evaluate upwards of standard minimum (10,000 INR/m.T).");
    }

    setValidationErrors(errors);
    if (errors.length === 0) {
      setValidationSuccess(true);
      setTimeout(() => setValidationSuccess(false), 4000);
    } else {
      setValidationSuccess(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selection Category Bar */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 max-w-sm">
        <button
          onClick={() => setActiveSegment("forms")}
          className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
            activeSegment === "forms" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Form & Validation
        </button>
        <button
          onClick={() => setActiveSegment("charts")}
          className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
            activeSegment === "charts" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Charts Playground
        </button>
      </div>

      <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-6">
        
        {/* SECTION 1: FORMS & VALIDATION ELEMENTS */}
        {activeSegment === "forms" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Form Elements Showcase */}
            <div className="space-y-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Material UI Form Elements</h3>
              
              <div className="space-y-4">
                {/* Standard floating border input */}
                <div className="space-y-1">
                  <label htmlFor="shipment_code_reference_120" className="text-[10px] font-black uppercase text-slate-400">Shipment Code Reference</label>
                  <input
 id="shipment_code_reference_120" name="shipment_code_reference" aria-label="Shipment Code Reference"                    className="w-full bg-slate-50/50 border border-slate-200 focus:border-pink-500 text-slate-800 font-bold rounded-xl p-2.5 text-xs outline-none transition-all placeholder:text-slate-300"
                    placeholder="e.g. MILL-KOL-02"
                  />
                </div>

                {/* Styled Select option */}
                <div className="space-y-1">
                  <label htmlFor="purchase_order_standard_m_129" className="text-[10px] font-black uppercase text-slate-400">Purchase Order Standard Mode</label>
                  <select
 id="purchase_order_standard_m_129" name="purchase_order_standard_m" aria-label="Purchase Order Standard Mode"                    className="w-full bg-white border border-slate-200 focus:border-pink-500 rounded-xl p-2.5 text-xs font-bold outline-none cursor-pointer"
                    value={poType}
                    onChange={(e) => setPoType(e.target.value)}
                  >
                    <option value="Normal">Normal Standard Bales</option>
                    <option value="Imported">Premium Bangladeshi Fiber</option>
                    <option value="Bulk">Bulk Commodity Contract</option>
                  </select>
                </div>

                {/* Range Slider for weight */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="tactile_weight_margin_kgs_148" className="text-[10px] font-black uppercase text-slate-400">Tactile Weight Margin (Kgs)</label>
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px] text-pink-600 font-black">
                      {sliderVal} KGS
                    </span>
                  </div>
                  <input
 id="tactile_weight_margin_kgs_148" name="tactile_weight_margin_kgs" aria-label="Tactile Weight Margin (Kgs)"                    type="range"
                    min="100"
                    max="500"
                    value={sliderVal}
                    onChange={(e) => setSliderVal(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-pink-600"
                  />
                  <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase">
                    <span>Min: 100Kg</span>
                    <span>Max: 500Kg</span>
                  </div>
                </div>

                {/* Binary Checkmarks & Custom Toggle switch */}
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700">Against Cancellation Override</span>
                    <span className="text-[9px] text-slate-400">Locks other options for validated sauda rows</span>
                  </div>
                  <button
                    onClick={() => setToggleActive(!toggleActive)}
                    className={`w-11 h-6 rounded-full relative transition-all duration-300 outline-none ${
                      toggleActive ? "bg-pink-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${
                        toggleActive ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Form Validation Showcase */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Simulated Form Validation Engine</h3>
              
              <form onSubmit={handleValidateForm} className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-4">
                <div className="space-y-1">
                  <label htmlFor="po_number_adheres_to_po_x_191" className="text-[10px] font-black uppercase text-slate-400">PO Number (Adheres to PO-xxx)</label>
                  <input
 id="po_number_adheres_to_po_x_191" name="po_number_adheres_to_po_x" aria-label="PO Number (Adheres to PO-xxx)"                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold font-mono outline-none uppercase"
                    placeholder="e.g. PO-88/26"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="bale_target_weight_201" className="text-[10px] font-black uppercase text-slate-400">Bale Target weight</label>
                  <input
 id="bale_target_weight_201" name="bale_target_weight" aria-label="Bale Target weight"                    type="number"
                    value={poWeight}
                    onChange={(e) => setPoWeight(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="market_rate_price_per_m_t_211" className="text-[10px] font-black uppercase text-slate-400">Market Rate Price (per m.T)</label>
                  <input
 id="market_rate_price_per_m_t_211" name="market_rate_price_per_m_t" aria-label="Market Rate Price (per m.T)"                    type="number"
                    value={poRate}
                    onChange={(e) => setPoRate(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold outline-none"
                    placeholder="e.g. 17500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-slate-800 hover:bg-slate-950 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                >
                  DESTRUCT AUDIT SUBMIT
                </button>

                {/* Validation outcome panels */}
                {validationErrors.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl space-y-1.5 animate-in fade-in zoom-in-95 leading-tight">
                    <div className="flex items-center gap-1.5 uppercase tracking-wider text-[9px] font-black text-rose-700">
                      <AlertCircle className="h-4 w-4" />
                      <span>Form Errors Blocked submission</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                      {validationErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-wider text-center rounded-xl animate-pulse flex items-center justify-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>Validated! Submit query matches system norms.</span>
                  </div>
                )}
              </form>
            </div>

          </div>
        )}

        {/* SECTION 2: CHARTS PLAYGROUND */}
        {activeSegment === "charts" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Highly customized Recharts indicators</h3>
              <span className="text-[10px] bg-pink-100 text-pink-800 px-2.5 py-0.5 font-bold uppercase rounded-full">
                Interactive rendering mode
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Detailed Dual-line chart */}
              <div className="border border-slate-100 rounded-2xl p-4 shadow-xs bg-slate-50/10">
                <h4 className="text-sm font-bold text-slate-800 mb-2">Weekly Bales Transactions Metric</h4>
                <div className="h-64 w-full text-xs font-semibold  pr-4">
                  <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                    <LineChart data={simpleLineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Purchase" stroke="#ec407a" strokeWidth={3} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="Sauda" stroke="#5c6bc0" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar charts or custom donut rings */}
              <div className="border border-slate-100 rounded-2xl p-4 shadow-xs bg-slate-50/10">
                <h4 className="text-sm font-bold text-slate-800 mb-2">Category Comparison bar</h4>
                <div className="h-64 w-full text-xs font-semibold  pr-4">
                  <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                    <BarChart data={simpleLineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Purchase" fill="#20b2aa" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Sauda" fill="#ffd700" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
